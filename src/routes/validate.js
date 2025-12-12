import { getMagika } from "../services/magika.js";

const errorSchema = {
  type: "object",
  properties: {
    error: { type: "string" },
    message: { type: "string" },
  },
};

const schema = {
  querystring: {
    type: "object",
    required: ["types"],
    properties: {
      types: { type: "string", minLength: 1 },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        valid: { type: "boolean" },
        detectedType: { type: "string" },
        expectedTypes: { type: "array", items: { type: "string" } },
        confidence: { type: "number" },
      },
    },
    400: errorSchema,
    422: errorSchema,
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
