import { getMagika } from "../services/magika.js";
import { secureFetch } from "../services/fetch.js";

const errorSchema = {
  type: "object",
  properties: {
    error: { type: "string" },
    message: { type: "string" },
  },
};

const schema = {
  summary: "Validate file type from URL",
  description: "Fetches content from a URL and validates it matches expected types. Includes SSRF protection.",
  tags: ["validation"],
  querystring: {
    type: "object",
    required: ["url", "types"],
    properties: {
      url: {
        type: "string",
        minLength: 1,
        description: "URL to fetch and validate (e.g., https://example.com/image.png)",
      },
      types: {
        type: "string",
        minLength: 1,
        description: "Comma-separated list of expected types (e.g., png,jpeg,gif)",
      },
    },
  },
  response: {
    200: {
      description: "Validation result",
      type: "object",
      properties: {
        url: { type: "string", description: "The analyzed URL" },
        valid: { type: "boolean", description: "Whether file matches expected types" },
        detectedType: { type: "string", description: "Actual detected type" },
        expectedTypes: { type: "array", items: { type: "string" }, description: "List of expected types" },
        confidence: { type: "number", description: "Confidence score (0-1)" },
      },
      example: {
        url: "https://example.com/image.png",
        valid: true,
        detectedType: "png",
        expectedTypes: ["png", "jpeg", "gif"],
        confidence: 0.99,
      },
    },
    400: {
      description: "Bad request - invalid URL, blocked by SSRF, or unknown types",
      ...errorSchema,
    },
    422: {
      description: "Detection failed",
      ...errorSchema,
    },
  },
};

async function handler(request, reply) {
  const { url, types } = request.query;

  const typesList = types
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0);

  if (typesList.length === 0) {
    return reply.status(400).send({
      error: "Bad request",
      message: "At least one type must be specified",
    });
  }

  const magika = await getMagika();

  // Validate requested types
  const knownTypes = new Set(Object.keys(magika.cts_infos));
  const unknownTypes = typesList.filter((t) => !knownTypes.has(t));
  if (unknownTypes.length > 0) {
    return reply.status(400).send({
      error: "Bad request",
      message: `Unknown type(s): ${unknownTypes.join(", ")}`,
    });
  }

  let data;
  try {
    data = await secureFetch(url);
  } catch (err) {
    return reply.status(400).send({
      error: "Fetch failed",
      message: err.message,
    });
  }

  const result = await magika.identifyBytes(data);

  if (result.status !== "ok") {
    return reply.status(422).send({
      error: "Detection failed",
      message: `Magika returned status: ${result.status}`,
    });
  }

  const detectedType = result.prediction.output.label;
  const isValid = typesList.includes(detectedType);

  return {
    url,
    valid: isValid,
    detectedType,
    expectedTypes: typesList,
    confidence: result.prediction.score,
  };
}

export default async function (fastify) {
  fastify.get("/validate-url", { schema }, handler);
}
