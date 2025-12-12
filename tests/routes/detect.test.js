import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { getApp, closeApp, PNG_HEADER, PDF_HEADER, JSON_CONTENT } from "../helpers.js";

let app;

before(async () => {
  app = await getApp();
});

after(async () => {
  await closeApp();
});

describe("POST /detect", () => {
  it("should detect PNG files", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/detect",
      body: PNG_HEADER,
      headers: {
        "content-type": "application/octet-stream",
      },
    });

    assert.strictEqual(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.strictEqual(body.type, "png");
    assert.strictEqual(body.isText, false);
    assert.ok(body.confidence > 0);
  });

  it("should detect PDF files", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/detect",
      body: PDF_HEADER,
      headers: {
        "content-type": "application/octet-stream",
      },
    });

    assert.strictEqual(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.strictEqual(body.type, "pdf");
    assert.strictEqual(body.isText, false);
  });

  it("should detect JSON files", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/detect",
      body: JSON_CONTENT,
      headers: {
        "content-type": "application/octet-stream",
      },
    });

    assert.strictEqual(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.strictEqual(body.type, "json");
    assert.strictEqual(body.isText, true);
  });

  it("should return details object", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/detect",
      body: PNG_HEADER,
      headers: {
        "content-type": "application/octet-stream",
      },
    });

    assert.strictEqual(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.ok("details" in body);
    assert.ok("dlPrediction" in body.details);
    assert.ok("overwriteReason" in body.details);
  });

  it("should return 400 for empty body", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/detect",
      body: Buffer.alloc(0),
      headers: {
        "content-type": "application/octet-stream",
      },
    });

    assert.strictEqual(response.statusCode, 400);
    const body = JSON.parse(response.body);
    assert.strictEqual(body.error, "Bad request");
  });
});
