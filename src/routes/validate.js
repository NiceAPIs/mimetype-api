import { getMagika } from "../services/magika.js";

const errorSchema = {
  type: "object",
  properties: {
    error: { type: "string" },
    message: { type: "string" },
  },
};

const schema = {
  summary: "Validate file type",
  description: "Checks if a file matches one of the expected types. Send file as binary body.",
  tags: ["validation"],
  querystring: {
    type: "object",
    required: ["types"],
    properties: {
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
        valid: { type: "boolean", description: "Whether file matches expected types" },
        detectedType: { type: "string", description: "Actual detected type" },
        expectedTypes: { type: "array", items: { type: "string" }, description: "List of expected types" },
        confidence: { type: "number", description: "Confidence score (0-1)" },
      },
      example: {
        valid: true,
        detectedType: "png",
        expectedTypes: ["png", "jpeg", "gif"],
        confidence: 0.99,
      },
    },
    400: {
      description: "Bad request - missing body or unknown types",
      ...errorSchema,
    },
    422: {
      description: "Detection failed",
      ...errorSchema,
    },
  },
};

async function handler(request, reply) {
  if (!request.body || request.body.length === 0) {
    return reply.status(400).send({
      error: "Bad request",
      message: "Request body is required. Send the file content as binary data.",
    });
  }

  const typesList = request.query.types
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

  const knownTypes = new Set(Object.keys(magika.cts_infos));
  const unknownTypes = typesList.filter((t) => !knownTypes.has(t));
  if (unknownTypes.length > 0) {
    return reply.status(400).send({
      error: "Bad request",
      message: `Unknown type(s): ${unknownTypes.join(", ")}`,
    });
  }

  const data = Buffer.isBuffer(request.body)
    ? request.body
    : Buffer.from(request.body);
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
    valid: isValid,
    detectedType,
    expectedTypes: typesList,
    confidence: result.prediction.score,
  };
}

export default async function (fastify) {
  fastify.post("/validate", { schema }, handler);
}
