import test from "node:test";
import assert from "node:assert/strict";
import { entities, relationships } from "../src/data/ecosystem.js";
import {
  findMentionedEntities,
  getNeighborhood,
  isOperationalRelationship,
} from "../src/lib/graph.js";

const ids = (items) => items.map(({ id }) => id);
const nodes = ["a", "b", "c", "d", "e", "unrelated"].map((id) => ({ id }));
const edges = [
  { source: "a", target: "b", label: "Develops" },
  { source: "c", target: "a", label: "Supports" },
  { source: "b", target: "d", label: "Uses" },
  { source: "d", target: "c", label: "Works with" },
  { source: "d", target: "e", label: "Supports" },
  { source: "missing", target: "a", label: "Invalid" },
];

test("direct neighborhoods include incoming and outgoing connections without unrelated entries", () => {
  const neighborhood = getNeighborhood("a", nodes, edges);
  assert.deepEqual(ids(neighborhood.entities), ["a", "b", "c"]);
  assert.deepEqual(
    [...neighborhood.distances],
    [
      ["a", 0],
      ["b", 1],
      ["c", 1],
    ],
  );
  assert.deepEqual(neighborhood.relationships, [edges[0], edges[1]]);
  assert.equal(neighborhood.relationships[1], edges[1]);
  assert.deepEqual(neighborhood.paths.get("a"), []);
  assert.equal(neighborhood.paths.get("c")[0], edges[1]);
  assert.equal(neighborhood.paths.get("c")[0].source, "c");
});

test("two-step discovery preserves shortest paths through a cycle and stops at the depth limit", () => {
  const neighborhood = getNeighborhood("a", nodes, edges, 2);
  assert.deepEqual(ids(neighborhood.entities), ["a", "b", "c", "d"]);
  assert.equal(neighborhood.distances.get("d"), 2);
  assert.deepEqual(neighborhood.paths.get("d"), [edges[0], edges[2]]);
  assert.equal(neighborhood.paths.get("d")[0], edges[0]);
  assert.equal(neighborhood.paths.get("d")[1], edges[2]);
  assert.deepEqual(neighborhood.relationships, edges.slice(0, 4));
  assert.equal(neighborhood.distances.has("e"), false);
  assert.equal(neighborhood.distances.has("missing"), false);
});

test("invalid focus returns an empty neighborhood and requested depth is limited to two", () => {
  const missing = getNeighborhood("missing", nodes, edges, 2);
  assert.deepEqual(missing.entities, []);
  assert.deepEqual(missing.relationships, []);
  assert.equal(missing.distances.size, 0);
  assert.equal(missing.paths.size, 0);
  assert.deepEqual(ids(getNeighborhood("a", nodes, edges, 99).entities), [
    "a",
    "b",
    "c",
    "d",
  ]);
  assert.deepEqual(ids(getNeighborhood("a", nodes, edges, 0).entities), [
    "a",
    "b",
    "c",
  ]);
});

test("the real dataset discovers products and indirect users without changing edge direction", () => {
  const neighborhood = getNeighborhood("nvidia", entities, relationships, 2);
  assert.ok(neighborhood.entities.some(({ id }) => id === "nvidia-gpu"));
  for (const edge of neighborhood.relationships)
    assert.ok(relationships.includes(edge));
  for (const [id, path] of neighborhood.paths) {
    assert.equal(path.length, neighborhood.distances.get(id));
    assert.ok(path.length <= 2);
  }
});

test("headline mentions preserve text order, recognize aliases and case, and deduplicate", () => {
  const result = findMentionedEntities(
    "nViDiA expands supply as Google and OpenAI compete. NVIDIA shares rise.",
    entities,
  );
  assert.deepEqual(ids(result), ["nvidia", "google-deepmind", "openai"]);
  assert.equal(
    result[0],
    entities.find(({ id }) => id === "nvidia"),
  );
  assert.deepEqual(
    ids(
      findMentionedEntities("HuggingFace works with Azure and AWS", entities),
    ),
    ["hugging-face", "azure-ai", "amazon"],
  );
});

test("word boundaries prevent short-name and embedded-name false matches", () => {
  assert.deepEqual(
    findMentionedEntities(
      "metadata and alternative AI approaches, GPTish, ChatGPTish, and nvidias",
      entities,
    ),
    [],
  );
  assert.deepEqual(
    ids(
      findMentionedEntities("ChatGPT uses GPT; Meta discusses AI.", entities),
    ),
    ["chatgpt", "gpt", "meta"],
  );
  assert.deepEqual(
    findMentionedEntities(
      "The command moves the cursor on a runway in a modal window.",
      entities,
    ),
    [],
  );
  assert.deepEqual(
    ids(
      findMentionedEntities(
        "Cursor adds AI features; the cursor moves.",
        entities,
      ),
    ),
    ["cursor"],
  );
});

test("longer product mentions take precedence over overlapping company names", () => {
  assert.deepEqual(
    ids(
      findMentionedEntities(
        "NVIDIA GPUs support Google TPU alternatives and Hugging Face Hub",
        entities,
      ),
    ),
    ["nvidia-gpu", "google-tpu", "hf-hub"],
  );
  assert.deepEqual(
    ids(findMentionedEntities("Google DeepMind updates Gemini", entities)),
    ["google-deepmind", "gemini"],
  );
});

test("bare Mistral and DeepSeek select companies while explicit model references select families", () => {
  assert.deepEqual(
    ids(
      findMentionedEntities("Mistral and DeepSeek announce funding", entities),
    ),
    ["mistral-ai", "deepseek-company"],
  );
  assert.deepEqual(
    ids(
      findMentionedEntities(
        "Mistral models compete with DeepSeek models",
        entities,
      ),
    ),
    ["mistral-models", "deepseek-models"],
  );
  assert.deepEqual(
    ids(
      findMentionedEntities(
        "Mistral’s models compete with DeepSeek-R1",
        entities,
      ),
    ),
    ["mistral-models", "deepseek-models"],
  );
  assert.deepEqual(
    ids(
      findMentionedEntities(
        "DeepSeek models and DeepSeek are distinct entries",
        entities,
      ),
    ),
    ["deepseek-models", "deepseek-company"],
  );
});

test("missing text and unknown headlines produce no inferred entities", () => {
  assert.deepEqual(findMentionedEntities(null, entities), []);
  assert.deepEqual(findMentionedEntities("  ", entities), []);
  assert.deepEqual(
    findMentionedEntities("An unlisted startup secures seed funding", entities),
    [],
  );
});

test("operational relationships exclude contextual links while retaining active products and infrastructure", () => {
  const excluded = [
    "Originally developed",
    "Contributed to",
    "Incubated",
    "Includes as a member",
    "Researchers publish on",
    "Authors share preprints on",
  ];
  for (const label of excluded)
    assert.equal(isOperationalRelationship({ label }), false);
  for (const label of [
    "Develops",
    "Provides compute for",
    "Supported by",
    "Uses for research",
    "Published on",
    "Publishes models on",
  ]) {
    assert.equal(isOperationalRelationship({ label }), true);
  }
  const operational = getNeighborhood(
    "nvidia",
    entities,
    relationships.filter(isOperationalRelationship),
    2,
  );
  const operationalIds = new Set(ids(operational.entities));
  for (const id of ["nvidia-gpu", "cuda", "coreweave", "azure-ai", "pytorch"]) {
    assert.ok(operationalIds.has(id), `Missing operational connection: ${id}`);
  }
  assert.equal(operationalIds.has("mlcommons"), false);
  assert.equal(operationalIds.has("amd"), false);
  const allIds = new Set(
    ids(getNeighborhood("nvidia", entities, relationships, 2).entities),
  );
  assert.ok(allIds.has("mlcommons"));
  assert.ok(allIds.has("amd"));
});
