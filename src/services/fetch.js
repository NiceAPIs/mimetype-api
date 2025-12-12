import { URL } from "node:url";
import dns from "node:dns/promises";

const FETCH_TIMEOUT = parseInt(process.env.FETCH_TIMEOUT) || 10000;
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024;
const MAX_REDIRECTS = 5;

// Private/internal IP ranges to block
const BLOCKED_IP_PATTERNS = [
  /^127\./,                      // Loopback
  /^10\./,                       // Private class A
  /^172\.(1[6-9]|2[0-9]|3[01])\./, // Private class B
  /^192\.168\./,                 // Private class C
  /^169\.254\./,                 // Link-local / Cloud metadata
  /^0\./,                        // Current network
  /^100\.(6[4-9]|[7-9][0-9]|1[0-2][0-9])\./,  // Carrier-grade NAT
  /^192\.0\.0\./,                // IETF protocol assignments
  /^192\.0\.2\./,                // TEST-NET-1
  /^198\.51\.100\./,             // TEST-NET-2
  /^203\.0\.113\./,              // TEST-NET-3
  /^224\./,                      // Multicast
  /^240\./,                      // Reserved
  /^255\.255\.255\.255$/,        // Broadcast
  /^::1$/,                       // IPv6 loopback
  /^fe80:/i,                     // IPv6 link-local
  /^fc00:/i,                     // IPv6 unique local
  /^fd00:/i,                     // IPv6 unique local
];

// Blocked hostnames
const BLOCKED_HOSTNAMES = [
  "localhost",
  "metadata.google.internal",
  "metadata.goog",
];

export function isBlockedIP(ip) {
  return BLOCKED_IP_PATTERNS.some((pattern) => pattern.test(ip));
}

export function isBlockedHostname(hostname) {
  const lower = hostname.toLowerCase();
  return BLOCKED_HOSTNAMES.some(
    (blocked) => lower === blocked || lower.endsWith(`.${blocked}`)
  );
}

async function resolveAndValidate(hostname) {
  // Check hostname blocklist
  if (isBlockedHostname(hostname)) {
    throw new Error(`Blocked hostname: ${hostname}`);
  }

  // Resolve DNS and check IPs
  try {
    const addresses = await dns.resolve4(hostname);
    for (const ip of addresses) {
      if (isBlockedIP(ip)) {
        throw new Error(`Blocked IP address: ${ip}`);
      }
    }
  } catch (err) {
    if (err.code === "ENOTFOUND") {
      throw new Error(`DNS resolution failed for: ${hostname}`);
    }
    if (err.message.startsWith("Blocked")) {
      throw err;
    }
    // Try IPv6
    try {
      const addresses = await dns.resolve6(hostname);
      for (const ip of addresses) {
        if (isBlockedIP(ip)) {
          throw new Error(`Blocked IP address: ${ip}`);
        }
      }
    } catch {
      throw new Error(`DNS resolution failed for: ${hostname}`);
    }
  }
}

export async function secureFetch(urlString) {
  // Parse and validate URL
  let url;
  try {
    url = new URL(urlString);
  } catch {
    throw new Error("Invalid URL format");
  }

  // Only allow HTTP(S)
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error(`Protocol not allowed: ${url.protocol}`);
  }

  // Validate hostname/IP
  await resolveAndValidate(url.hostname);

  // Fetch with timeout and redirect limit
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(url.toString(), {
      signal: controller.signal,
      redirect: "manual",
      headers: {
        "User-Agent": "MimetypeAPI/1.0",
      },
    });

    // Handle redirects manually to validate each hop
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) {
        throw new Error("Redirect without location header");
      }
      // Recursive call with redirect counting would be needed for full impl
      // For simplicity, we follow one level manually
      throw new Error(
        `Redirects not followed for security. Final URL: ${location}`
      );
    }

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
    }

    // Check content-length if available
    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_FILE_SIZE) {
      throw new Error(
        `File too large: ${contentLength} bytes (max: ${MAX_FILE_SIZE})`
      );
    }

    // Read body with size limit
    const reader = response.body.getReader();
    const chunks = [];
    let totalSize = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalSize += value.length;
      if (totalSize > MAX_FILE_SIZE) {
        reader.cancel();
        throw new Error(`File too large (max: ${MAX_FILE_SIZE} bytes)`);
      }
      chunks.push(value);
    }

    // Concatenate chunks into a single Buffer
    const buffer = Buffer.concat(chunks);
    return buffer;
  } finally {
    clearTimeout(timeout);
  }
}
