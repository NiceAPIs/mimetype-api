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

describe("404 handler", () => {
  it("should return 404 for unknown routes", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/unknown-route",
    });

    assert.strictEqual(response.statusCode, 404);
    const body = JSON.parse(response.body);
    assert.strictEqual(body.error, "Not found");
    assert.ok(Array.isArray(body.availableEndpoints));
  });

  it("should return 404 for unknown methods on existing routes", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: "/types",
    });

    assert.strictEqual(response.statusCode, 404);
  });

  it("should include list of available endpoints", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/not-a-real-endpoint",
    });

    assert.strictEqual(response.statusCode, 404);
    const body = JSON.parse(response.body);
    assert.ok(body.availableEndpoints.length > 0);
    assert.ok(body.availableEndpoints.some((e) => e.includes("/types")));
    assert.ok(body.availableEndpoints.some((e) => e.includes("/detect")));
    assert.ok(body.availableEndpoints.some((e) => e.includes("/validate")));
    assert.ok(body.availableEndpoints.some((e) => e.includes("/health")));
  });
});
