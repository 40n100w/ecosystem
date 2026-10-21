import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

// Serve only built files at the same URL prefix as GitHub Pages. No Vite
// dev server or HTML fallback can hide a missing production asset here.
test("the production site loads and works at its GitHub Pages path", async () => {
  const root = path.resolve("dist");
  const base = process.env.PAGES_BASE_PATH || "/ecosystem/";
  assert.ok(base.startsWith("/") && base.endsWith("/"));
  const types = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript",
    ".css": "text/css",
    ".svg": "image/svg+xml",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
  };
  const server = createServer(async (request, response) => {
    const pathname = new URL(request.url, "http://localhost").pathname;
    if (!pathname.startsWith(base)) {
      response.writeHead(404).end();
      return;
    }
    const filename = path.resolve(
      root,
      decodeURIComponent(pathname.slice(base.length)) || "index.html",
    );
    if (!filename.startsWith(`${root}${path.sep}`)) {
      response.writeHead(404).end();
      return;
    }
    try {
      const file = await readFile(filename);
      response
        .writeHead(200, {
          "Content-Type":
            types[path.extname(filename)] || "application/octet-stream",
        })
        .end(file);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  let browser;
  try {
    browser = await chromium.launch({
      executablePath:
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
        (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
      args: ["--no-sandbox"],
    });
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("response", (response) => {
      if (response.status() >= 400)
        errors.push(`${response.status()} ${response.url()}`);
    });
    page.on("requestfailed", (request) =>
      errors.push(`${request.url()}: ${request.failure()?.errorText}`),
    );
    const url = `http://127.0.0.1:${server.address().port}${base}`;
    const response = await page.goto(url);
    assert.equal(response.status(), 200);
    await page
      .getByRole("heading", { name: "AI ecosystem", exact: true })
      .waitFor();
    await page.getByLabel("AI ecosystem map", { exact: true }).waitFor();
    await page
      .getByRole("textbox", { name: "News headline or excerpt" })
      .fill("NVIDIA announces new GPUs");
    await page
      .getByRole("button", { name: "Find entities", exact: true })
      .click();
    await page
      .getByRole("complementary", { name: "NVIDIA details", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Two-step relationships", exact: true })
      .click();
    await page
      .getByLabel("AI ecosystem map", { exact: true })
      .getByRole("button", { name: "Explore CoreWeave", exact: true })
      .waitFor();
    const favicon = await page.request.get(new URL("favicon.svg", url).href);
    assert.equal(favicon.status(), 200);
    assert.match(favicon.headers()["content-type"], /image\/svg/);
    await page.evaluate(() => document.fonts.ready);
    assert.deepEqual(
      errors,
      [],
      "the production page must not have missing assets or JavaScript errors",
    );
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
