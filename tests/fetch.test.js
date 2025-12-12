import { describe, it } from "node:test";
import assert from "node:assert";
import {
  isBlockedIP,
  isBlockedHostname,
  secureFetch,
} from "../src/services/fetch.js";

describe("isBlockedIP", () => {
  it("should block localhost IPs", () => {
    assert.strictEqual(isBlockedIP("127.0.0.1"), true);
    assert.strictEqual(isBlockedIP("127.0.0.2"), true);
    assert.strictEqual(isBlockedIP("127.255.255.255"), true);
  });

  it("should block private class A IPs (10.x.x.x)", () => {
    assert.strictEqual(isBlockedIP("10.0.0.1"), true);
    assert.strictEqual(isBlockedIP("10.255.255.255"), true);
  });

  it("should block private class B IPs (172.16-31.x.x)", () => {
    assert.strictEqual(isBlockedIP("172.16.0.1"), true);
    assert.strictEqual(isBlockedIP("172.31.255.255"), true);
    // 172.15.x.x should NOT be blocked
    assert.strictEqual(isBlockedIP("172.15.0.1"), false);
    // 172.32.x.x should NOT be blocked
    assert.strictEqual(isBlockedIP("172.32.0.1"), false);
  });

  it("should block private class C IPs (192.168.x.x)", () => {
    assert.strictEqual(isBlockedIP("192.168.0.1"), true);
    assert.strictEqual(isBlockedIP("192.168.255.255"), true);
  });

  it("should block link-local/metadata IPs (169.254.x.x)", () => {
    assert.strictEqual(isBlockedIP("169.254.169.254"), true);
    assert.strictEqual(isBlockedIP("169.254.0.1"), true);
  });

  it("should block carrier-grade NAT IPs (100.64-127.x.x)", () => {
    assert.strictEqual(isBlockedIP("100.64.0.1"), true);
    assert.strictEqual(isBlockedIP("100.127.255.255"), true);
  });

  it("should block IPv6 loopback", () => {
    assert.strictEqual(isBlockedIP("::1"), true);
  });

  it("should block IPv6 link-local", () => {
    assert.strictEqual(isBlockedIP("fe80::1"), true);
    assert.strictEqual(isBlockedIP("FE80::1"), true);
  });

  it("should block IPv6 unique local", () => {
    assert.strictEqual(isBlockedIP("fc00::1"), true);
    assert.strictEqual(isBlockedIP("fd00::1"), true);
  });

  it("should allow public IPs", () => {
    assert.strictEqual(isBlockedIP("8.8.8.8"), false);
    assert.strictEqual(isBlockedIP("1.1.1.1"), false);
    assert.strictEqual(isBlockedIP("142.250.185.78"), false);
  });
});

describe("isBlockedHostname", () => {
  it("should block localhost", () => {
    assert.strictEqual(isBlockedHostname("localhost"), true);
    assert.strictEqual(isBlockedHostname("LOCALHOST"), true);
    assert.strictEqual(isBlockedHostname("LocalHost"), true);
  });

  it("should block Google metadata hostnames", () => {
    assert.strictEqual(isBlockedHostname("metadata.google.internal"), true);
    assert.strictEqual(isBlockedHostname("metadata.goog"), true);
  });

  it("should block subdomains of blocked hostnames", () => {
    assert.strictEqual(isBlockedHostname("sub.localhost"), true);
    assert.strictEqual(isBlockedHostname("foo.metadata.google.internal"), true);
  });

  it("should allow public hostnames", () => {
    assert.strictEqual(isBlockedHostname("google.com"), false);
    assert.strictEqual(isBlockedHostname("example.com"), false);
    assert.strictEqual(isBlockedHostname("api.github.com"), false);
  });

  it("should not block hostnames containing blocked words", () => {
    assert.strictEqual(isBlockedHostname("notlocalhost.com"), false);
    assert.strictEqual(isBlockedHostname("mylocalhost.example.com"), false);
  });
});

describe("secureFetch", () => {
  it("should reject invalid URLs", async () => {
    await assert.rejects(secureFetch("not-a-url"), {
      message: "Invalid URL format",
    });
  });

  it("should reject non-HTTP protocols", async () => {
    await assert.rejects(secureFetch("ftp://example.com/file.txt"), {
      message: "Protocol not allowed: ftp:",
    });

    await assert.rejects(secureFetch("file:///etc/passwd"), {
      message: "Protocol not allowed: file:",
    });
  });

  it("should reject localhost URLs", async () => {
    await assert.rejects(secureFetch("http://localhost/test"), {
      message: "Blocked hostname: localhost",
    });

    await assert.rejects(secureFetch("http://localhost:8080/test"), {
      message: "Blocked hostname: localhost",
    });
  });

  it("should reject metadata URLs", async () => {
    await assert.rejects(secureFetch("http://metadata.google.internal/"), {
      message: "Blocked hostname: metadata.google.internal",
    });
  });

  it("should fetch valid public URLs", async () => {
    const buffer = await secureFetch(
      "https://www.google.com/robots.txt"
    );
    assert.ok(Buffer.isBuffer(buffer));
    assert.ok(buffer.length > 0);
  });
});
