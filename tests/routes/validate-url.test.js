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

describe("GET /validate-url", () => {
  it("should return 400 for missing url parameter", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/validate-url?types=txt",
    });

    assert.strictEqual(response.statusCode, 400);
  });

  it("should return 400 for missing types parameter", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/validate-url?url=https://example.com/test.txt",
    });

    assert.strictEqual(response.statusCode, 400);
  });

  it("should return 400 for blocked URLs (localhost)", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/validate-url?url=http://localhost/test&types=txt",
    });

    assert.strictEqual(response.statusCode, 400);
    const body = JSON.parse(response.body);
    assert.ok(body.message.includes("Blocked hostname"));
  });

  it("should return 400 for blocked URLs (private IP)", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/validate-url?url=http://10.0.0.1/test&types=txt",
    });

    assert.strictEqual(response.statusCode, 400);
    const body = JSON.parse(response.body);
    assert.strictEqual(body.error, "Fetch failed");
  });

  it("should return 400 for unknown types", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/validate-url?url=https://example.com/test&types=unknowntype",
    });

    assert.strictEqual(response.statusCode, 400);
    const body = JSON.parse(response.body);
    assert.ok(body.message.includes("Unknown type"));
  });

  it("should return 400 for invalid URLs", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/validate-url?url=not-valid&types=txt",
    });

    assert.strictEqual(response.statusCode, 400);
    const body = JSON.parse(response.body);
    assert.ok(body.message.includes("Invalid URL"));
  });

  it("should validate type from public URL", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/validate-url?url=https://www.google.com/robots.txt&types=txt",
    });

    assert.strictEqual(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.ok("valid" in body);
    assert.ok("detectedType" in body);
    assert.ok("expectedTypes" in body);
    assert.ok("confidence" in body);
    assert.strictEqual(body.url, "https://www.google.com/robots.txt");
  });
});
