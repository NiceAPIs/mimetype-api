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

describe("GET /detect-url", () => {
  it("should return 400 for missing url parameter", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/detect-url",
    });

    assert.strictEqual(response.statusCode, 400);
  });

  it("should return 400 for blocked URLs (localhost)", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/detect-url?url=http://localhost/test",
    });

    assert.strictEqual(response.statusCode, 400);
    const body = JSON.parse(response.body);
    assert.strictEqual(body.error, "Fetch failed");
    assert.ok(body.message.includes("Blocked hostname"));
  });

  it("should return 400 for blocked URLs (private IP)", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/detect-url?url=http://192.168.1.1/test",
    });

    assert.strictEqual(response.statusCode, 400);
    const body = JSON.parse(response.body);
    assert.strictEqual(body.error, "Fetch failed");
  });

  it("should return 400 for blocked URLs (metadata)", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/detect-url?url=http://169.254.169.254/latest/meta-data",
    });

    assert.strictEqual(response.statusCode, 400);
    const body = JSON.parse(response.body);
    assert.strictEqual(body.error, "Fetch failed");
  });

  it("should return 400 for invalid URLs", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/detect-url?url=not-a-valid-url",
    });

    assert.strictEqual(response.statusCode, 400);
    const body = JSON.parse(response.body);
    assert.ok(body.message.includes("Invalid URL"));
  });

  it("should return 400 for non-HTTP protocols", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/detect-url?url=ftp://example.com/file.txt",
    });

    assert.strictEqual(response.statusCode, 400);
    const body = JSON.parse(response.body);
    assert.ok(body.message.includes("Protocol not allowed"));
  });

  it("should detect type from public URL", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/detect-url?url=https://www.google.com/robots.txt",
    });

    assert.strictEqual(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.ok(body.type);
    assert.ok("isText" in body);
    assert.ok("confidence" in body);
    assert.strictEqual(body.url, "https://www.google.com/robots.txt");
  });
});
