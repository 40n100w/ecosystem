import test from "node:test";
import assert from "node:assert/strict";
import {
  categories,
  entities,
  relationships,
  featuredIds,
} from "../src/data/ecosystem.js";

const entityById = new Map(entities.map((entity) => [entity.id, entity]));
const categoryIds = new Set(categories.map((category) => category.id));

function nonemptyString(value, field) {
  assert.equal(typeof value, "string", `${field} must be a string`);
  assert.ok(value.trim().length > 0, `${field} must not be empty`);
}

test("the ecosystem has unique categories and entities with complete display metadata", () => {
  assert.equal(
    categoryIds.size,
    categories.length,
    "Category IDs must be unique",
  );
  assert.equal(entityById.size, entities.length, "Entity IDs must be unique");
  assert.ok(categories.length > 0);
  assert.ok(entities.length > categories.length);
  for (const category of categories) {
    for (const field of ["id", "label", "color", "description"]) {
      nonemptyString(category[field], `category ${category.id}.${field}`);
    }
  }
  for (const entity of entities) {
    for (const field of [
      "id",
      "name",
      "category",
      "tagline",
      "description",
      "website",
      "initials",
      "color",
    ]) {
      nonemptyString(entity[field], `entity ${entity.id}.${field}`);
    }
    assert.ok(
      categoryIds.has(entity.category),
      `${entity.id} references an unknown category`,
    );
    assert.ok(Array.isArray(entity.tags), `${entity.id} needs searchable tags`);
    for (const tag of entity.tags) nonemptyString(tag, `${entity.id} tag`);
  }
});

test("all seven ecosystem layers contain entities", () => {
  assert.deepEqual([...categoryIds].sort(), [
    "applications",
    "companies",
    "hardware",
    "infrastructure",
    "models",
    "research",
    "tools",
  ]);
  for (const category of categories) {
    assert.ok(
      entities.some((entity) => entity.category === category.id),
      `${category.label} must not be empty`,
    );
  }
});

test("every entity has a usable secure source link", () => {
  for (const entity of entities) {
    const website = new URL(entity.website);
    assert.equal(website.protocol, "https:", `${entity.id} must link to HTTPS`);
    assert.ok(
      website.hostname.includes("."),
      `${entity.id} must have a real hostname`,
    );
    assert.equal(
      website.username,
      "",
      `${entity.id} must not embed credentials`,
    );
    assert.equal(
      website.password,
      "",
      `${entity.id} must not embed credentials`,
    );
  }
});

test("relationships connect existing entities without self-links or duplicates", () => {
  assert.ok(relationships.length > 0, "The map needs real connections");
  const keys = new Set();
  for (const relation of relationships) {
    assert.ok(
      entityById.has(relation.source),
      `Unknown source ${relation.source}`,
    );
    assert.ok(
      entityById.has(relation.target),
      `Unknown target ${relation.target}`,
    );
    assert.notEqual(
      relation.source,
      relation.target,
      `Self-link on ${relation.source}`,
    );
    nonemptyString(relation.label, `${relation.source} relationship label`);
    const key = `${relation.source}:${relation.target}:${relation.label}`;
    assert.ok(!keys.has(key), `Duplicate relationship ${key}`);
    keys.add(key);
  }
});

test("the default map references unique entities and spans the ecosystem", () => {
  assert.ok(featuredIds.length > 0);
  assert.equal(
    new Set(featuredIds).size,
    featuredIds.length,
    "Featured IDs must be unique",
  );
  for (const id of featuredIds)
    assert.ok(entityById.has(id), `Unknown featured entity ${id}`);
  const featuredCategories = new Set(
    featuredIds.map((id) => entityById.get(id).category),
  );
  for (const id of categoryIds)
    assert.ok(featuredCategories.has(id), `Default map omits ${id}`);
  const connectedIds = new Set(
    relationships.flatMap(({ source, target }) => [source, target]),
  );
  for (const id of featuredIds)
    assert.ok(connectedIds.has(id), `${id} has no connection to explore`);
});
