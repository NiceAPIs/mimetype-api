import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import { buildApp } from "../src/app.js";
import { getMagika } from "../src/services/magika.js";

// Sample file contents for testing
const PNG_HEADER = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49,
  0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06,
  0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44,
  0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, 0x0d,
  0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42,
  0x60, 0x82,
]);

const PDF_HEADER = Buffer.from("%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\ntrailer\n<<\n/Root 1 0 R\n>>\n%%EOF");

const TEXT_CONTENT = Buffer.from("Hello, this is a plain text file.\nWith multiple lines.\n");

const JSON_CONTENT = Buffer.from('{"name": "test", "value": 123}');

let app;

before(async () => {
  // Pre-load Magika
  await getMagika();
  app = buildApp();
  await app.ready();
});

after(async () => {
  await app.close();
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
    assert.strictEqual(response.statusCode, 200, `Unexpected response: ${JSON.stringify(body)}`);
    assert.strictEqual(body.valid, true);
    assert.strictEqual(body.detectedType, "png");
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

  it("should return 400 for invalid URLs", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/detect-url?url=not-a-valid-url",
    });

    assert.strictEqual(response.statusCode, 400);
    const body = JSON.parse(response.body);
    assert.ok(body.message.includes("Invalid URL"));
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

  it("should return 400 for blocked URLs", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/validate-url?url=http://localhost/test&types=txt",
    });

    assert.strictEqual(response.statusCode, 400);
    const body = JSON.parse(response.body);
    assert.ok(body.message.includes("Blocked hostname"));
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
});
