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

describe("GET /health", () => {
  it("should return health status", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    assert.strictEqual(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.strictEqual(body.status, "ok");
    assert.strictEqual(body.magikaLoaded, true);
  });
});
