import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { getApp, closeApp, PNG_HEADER, PDF_HEADER } from "../helpers.js";

let app;

before(async () => {
  app = await getApp();
});

after(async () => {
  await closeApp();
});

describe("POST /validate", () => {
  it("should validate PNG against png type", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/validate?types=png",
      body: PNG_HEADER,
      headers: {
        "content-type": "application/octet-stream",
      },
    });

    assert.strictEqual(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.strictEqual(body.valid, true);
    assert.strictEqual(body.detectedType, "png");
    assert.deepStrictEqual(body.expectedTypes, ["png"]);
  });

  it("should validate PNG against multiple image types", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/validate",
      query: { types: "png,jpeg,gif" },
      body: PNG_HEADER,
      headers: {
        "content-type": "application/octet-stream",
      },
    });

    const body = JSON.parse(response.body);
    assert.strictEqual(response.statusCode, 200);
    assert.strictEqual(body.valid, true);
    assert.strictEqual(body.detectedType, "png");
    assert.deepStrictEqual(body.expectedTypes, ["png", "jpeg", "gif"]);
  });

  it("should reject PNG when expecting PDF", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/validate?types=pdf",
      body: PNG_HEADER,
      headers: {
        "content-type": "application/octet-stream",
      },
    });

    assert.strictEqual(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.strictEqual(body.valid, false);
    assert.strictEqual(body.detectedType, "png");
  });

  it("should validate PDF against pdf type", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/validate?types=pdf",
      body: PDF_HEADER,
      headers: {
        "content-type": "application/octet-stream",
      },
    });

    assert.strictEqual(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.strictEqual(body.valid, true);
    assert.strictEqual(body.detectedType, "pdf");
  });

  it("should return confidence score", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/validate?types=png",
      body: PNG_HEADER,
      headers: {
        "content-type": "application/octet-stream",
      },
    });

    assert.strictEqual(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.ok("confidence" in body);
    assert.ok(body.confidence >= 0 && body.confidence <= 1);
  });

  it("should return 400 for missing types parameter", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/validate",
      body: PNG_HEADER,
      headers: {
        "content-type": "application/octet-stream",
      },
    });

    assert.strictEqual(response.statusCode, 400);
  });

  it("should return 400 for unknown types", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/validate?types=unknowntype",
      body: PNG_HEADER,
      headers: {
        "content-type": "application/octet-stream",
      },
    });

    assert.strictEqual(response.statusCode, 400);
    const body = JSON.parse(response.body);
    assert.ok(body.message.includes("Unknown type"));
  });

  it("should return 400 for empty body", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/validate?types=png",
      body: Buffer.alloc(0),
      headers: {
        "content-type": "application/octet-stream",
      },
    });

    assert.strictEqual(response.statusCode, 400);
  });

  it("should handle case-insensitive types", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/validate?types=PNG",
      body: PNG_HEADER,
      headers: {
        "content-type": "application/octet-stream",
      },
    });

    assert.strictEqual(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.strictEqual(body.valid, true);
  });
});
