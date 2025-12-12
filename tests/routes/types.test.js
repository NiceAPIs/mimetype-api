import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { getApp, closeApp } from "../helpers.js";

let app;

before(async () => {
  app = await getApp();
});

after(async () => {
  await closeApp();
});

describe("GET /types", () => {
  it("should return list of supported types", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/types",
    });

    assert.strictEqual(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.ok(body.count > 0);
    assert.ok(Array.isArray(body.types));
    assert.ok(body.types.length > 0);

    // Check structure of type object
    const firstType = body.types[0];
    assert.ok("label" in firstType);
    assert.ok("isText" in firstType);
  });

  it("should include common types", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/types",
    });

    const body = JSON.parse(response.body);
    const labels = body.types.map((t) => t.label);

    assert.ok(labels.includes("png"));
    assert.ok(labels.includes("pdf"));
    assert.ok(labels.includes("json"));
    assert.ok(labels.includes("javascript"));
  });

  it("should return types sorted alphabetically", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/types",
    });

    const body = JSON.parse(response.body);
    const labels = body.types.map((t) => t.label);
    const sorted = [...labels].sort((a, b) => a.localeCompare(b));

    assert.deepStrictEqual(labels, sorted);
  });
});
