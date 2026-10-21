import { test, expect } from "@playwright/test";

async function openDirectory(page) {
  await page
    .getByRole("button", { name: "Directory view", exact: true })
    .click();
}

async function assertNoHorizontalOverflow(page) {
  const measurements = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(measurements.content).toBeLessThanOrEqual(measurements.viewport + 1);
}

test("directory search opens details and follows a model connection", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await openDirectory(page);
  const search = page.getByRole("textbox", {
    name: "Search the ecosystem",
    exact: true,
  });
  await search.fill("OpenAI");
  await page
    .getByRole("button", { name: "Explore OpenAI", exact: true })
    .click();
  const details = page.getByRole("complementary", {
    name: "OpenAI details",
    exact: true,
  });
  await expect(details).toBeVisible();
  await expect(
    details
      .getByRole("link")
      .filter({ hasText: /website|openai.com|visit/i })
      .first(),
  ).toHaveAttribute("href", /^https:\/\/(?:www\.)?openai\.com(?:\/|$)/);
  await details
    .getByRole("button", { name: "Explore GPT", exact: true })
    .click();
  await expect(
    page.getByRole("complementary", { name: "GPT details", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Close details", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "Close details", exact: true })
    .click();
  await expect(
    page.getByRole("complementary", { name: / details$/ }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Directory view", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(search).toHaveValue("OpenAI");
  await search.fill("no-such-entity-9f82");
  await expect(
    page.getByText("No connections found", { exact: true }),
  ).toBeVisible();
  await search.fill("");
  await expect(
    page.getByRole("button", { name: "Explore OpenAI", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("category filtering limits the directory and reset restores companies", async ({
  page,
}) => {
  await page.goto("/");
  await openDirectory(page);
  await page
    .getByRole("button", { name: "Filter by Models", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Explore GPT", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Explore OpenAI", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Explore NVIDIA", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Show all categories", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Explore OpenAI", exact: true }),
  ).toBeVisible();
});

test("saved entities persist across reload and can be removed from the collection", async ({
  page,
}) => {
  await page.goto("/");
  await openDirectory(page);
  await page
    .getByRole("button", { name: "Explore OpenAI", exact: true })
    .click();
  await page
    .getByRole("complementary", { name: "OpenAI details", exact: true })
    .getByRole("button", { name: "Save OpenAI", exact: true })
    .click();
  await expect(
    page
      .getByRole("complementary", { name: "OpenAI details", exact: true })
      .getByRole("button", { name: "Unsave OpenAI", exact: true }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "Saved collection", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Explore OpenAI", exact: true })
    .click();
  await expect(
    page
      .getByRole("complementary", { name: "OpenAI details", exact: true })
      .getByRole("button", { name: "Unsave OpenAI", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("complementary", { name: "OpenAI details", exact: true })
    .getByRole("button", { name: "Unsave OpenAI", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Close details", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Explore OpenAI", exact: true }),
  ).toHaveCount(0);
});

test("map controls work and the map opens an entity without runtime errors", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByLabel("AI ecosystem map", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect(page.locator(".zoom-controls")).toContainText("125%");
  await page.getByRole("button", { name: "Zoom out", exact: true }).click();
  await expect(page.locator(".zoom-controls")).toContainText("100%");
  const initialTransform = await page
    .locator(".map-world")
    .getAttribute("style");
  const canvas = await page
    .getByLabel("AI ecosystem map", { exact: true })
    .boundingBox();
  await page.mouse.move(canvas.x + 10, canvas.y + 10);
  await page.mouse.down();
  await page.mouse.move(canvas.x + 60, canvas.y + 50, { steps: 5 });
  await page.mouse.up();
  await expect(page.locator(".map-world")).not.toHaveAttribute(
    "style",
    initialTransform,
  );
  await page.getByRole("button", { name: "Reset map", exact: true }).click();
  await page
    .getByRole("button", { name: "Explore OpenAI", exact: true })
    .click();
  await expect(
    page.getByRole("complementary", { name: "OpenAI details", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("mobile navigation, filtering, and entity details fit the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await assertNoHorizontalOverflow(page);
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to ecosystem" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Open navigation", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Filter by Models", exact: true })
    .click();
  await openDirectory(page);
  await page
    .getByRole("textbox", { name: "Search the ecosystem", exact: true })
    .fill("GPT");
  await page.getByRole("button", { name: "Explore GPT", exact: true }).click();
  await expect(
    page.getByRole("complementary", { name: "GPT details", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Close details", exact: true }),
  ).toBeFocused();
  await assertNoHorizontalOverflow(page);
  await page
    .getByRole("button", { name: "Close details", exact: true })
    .click();
  await assertNoHorizontalOverflow(page);
});

test("headline entities open a directed neighborhood that expands by two steps", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "News headline or excerpt", exact: true })
    .fill("NVIDIA and Microsoft expand AI infrastructure");
  await page
    .getByRole("button", { name: "Find entities", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Focus on NVIDIA", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Focus on Microsoft", exact: true }),
  ).toBeVisible();

  const map = page.getByLabel("AI ecosystem map", { exact: true });
  const details = page.getByRole("complementary", {
    name: "NVIDIA details",
    exact: true,
  });
  await expect(details).toBeVisible();
  for (const name of ["NVIDIA", "NVIDIA GPUs", "CUDA"]) {
    await expect(
      map.getByRole("button", { name: `Explore ${name}`, exact: true }),
    ).toBeVisible();
  }
  await expect(
    map.getByRole("button", { name: "Explore OpenAI", exact: true }),
  ).toHaveCount(0);
  await expect(
    map.getByRole("button", { name: "Explore CoreWeave", exact: true }),
  ).toHaveCount(0);
  await expect(
    map.getByText("Develops", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    details.getByRole("button", { name: "Explore NVIDIA GPUs", exact: true }),
  ).toContainText(/NVIDIA\s+develops\s+NVIDIA GPUs/i);
  await expect(
    map.getByRole("button", { name: "Explore MLCommons", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("combobox", { name: "Relationship scope", exact: true }),
  ).toHaveValue("operational");
  await expect(
    details
      .getByRole("link")
      .filter({ hasText: /website|visit/i })
      .first(),
  ).toHaveAttribute("href", /^https:\/\/(?:www\.)?nvidia\.com\//);

  await page
    .getByRole("button", { name: "Two-step relationships", exact: true })
    .click();
  await expect(
    map.getByRole("button", { name: "Explore CoreWeave", exact: true }),
  ).toBeVisible();
  await expect(
    map.getByRole("button", { name: "Explore AMD", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("combobox", { name: "Relationship scope", exact: true })
    .selectOption("all");
  for (const name of ["MLCommons", "AMD"]) {
    await expect(
      map.getByRole("button", { name: `Explore ${name}`, exact: true }),
    ).toBeVisible();
  }
  await expect(
    details.getByRole("button", { name: "Explore MLCommons", exact: true }),
  ).toContainText(/MLCommons\s+includes as a member\s+NVIDIA/i);
  await expect(
    map.getByRole("button", { name: "Explore OpenAI", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Close details", exact: true })
    .click();
  await expect(
    map.getByRole("button", { name: "Explore OpenAI", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("the map stays interactive beside an entity's details", async ({
  page,
}) => {
  await page.goto("/");
  const map = page.getByLabel("AI ecosystem map", { exact: true });
  await map
    .getByRole("button", { name: "Explore NVIDIA", exact: true })
    .click();
  await expect(
    page.getByRole("complementary", { name: "NVIDIA details", exact: true }),
  ).toBeVisible();
  await map.getByRole("button", { name: "Explore CUDA", exact: true }).click();
  await expect(
    page.getByRole("complementary", { name: "CUDA details", exact: true }),
  ).toBeVisible();
  await expect(
    map.getByRole("button", { name: "Explore PyTorch", exact: true }),
  ).toBeVisible();
  await expect(
    map.getByRole("button", { name: "Explore OpenAI", exact: true }),
  ).toHaveCount(0);
});

test("unmatched headlines do not invent entities or match names inside other words", async ({
  page,
}) => {
  await page.goto("/");
  const headline = page.getByRole("textbox", {
    name: "News headline or excerpt",
    exact: true,
  });
  const submit = page.getByRole("button", {
    name: "Find entities",
    exact: true,
  });
  await headline.fill("NVIDIA announces a new GPU");
  await submit.click();
  await expect(
    page.getByRole("complementary", { name: "NVIDIA details", exact: true }),
  ).toBeVisible();
  await headline.fill("A local bakery is adding a new delivery route");
  await submit.click();
  await expect(
    page.getByText("No matching entities in this dataset.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /^Focus on / })).toHaveCount(0);
  await expect(
    page.getByRole("complementary", { name: / details$/ }),
  ).toHaveCount(0);
  await headline.fill("metadata processing improves");
  await submit.click();
  await expect(
    page.getByText("No matching entities in this dataset.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Focus on Meta", exact: true }),
  ).toHaveCount(0);
  await headline.fill("Meta publishes a model");
  await submit.click();
  await expect(
    page.getByRole("button", { name: "Focus on Meta", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("complementary", { name: "Meta details", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Clear news context", exact: true })
    .click();
  await expect(headline).toHaveValue("");
  await expect(
    page.getByRole("complementary", { name: / details$/ }),
  ).toHaveCount(0);
});

test("Escape dismisses the top overlay before clearing the selected entity", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByLabel("AI ecosystem map", { exact: true })
    .getByRole("button", { name: "Explore NVIDIA", exact: true })
    .click();
  const details = page.getByRole("complementary", {
    name: "NVIDIA details",
    exact: true,
  });
  await expect(details).toBeVisible();

  await page
    .getByRole("button", { name: "How to use & data coverage", exact: true })
    .click();
  const about = page.getByRole("dialog", { name: "About Atlas", exact: true });
  await expect(about).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(about).toHaveCount(0);
  await expect(details).toBeVisible();

  const filters = page.getByRole("button", {
    name: "Filter categories",
    exact: true,
  });
  await filters.click();
  await expect(filters).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.getByRole("button", { name: "Dismiss filters", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(filters).toHaveAttribute("aria-expanded", "false");
  await expect(
    page.getByRole("button", { name: "Dismiss filters", exact: true }),
  ).toHaveCount(0);
  await expect(details).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(details).toHaveCount(0);
});
