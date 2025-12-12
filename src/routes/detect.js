import { getMagika } from "../services/magika.js";

const errorSchema = {
  type: "object",
  properties: {
    error: { type: "string" },
    message: { type: "string" },
  },
};

const schema = {
  response: {
    200: {
      type: "object",
      properties: {
        type: { type: "string" },
        isText: { type: "boolean" },
        confidence: { type: "number" },
        details: {
          type: "object",
          properties: {
            dlPrediction: { type: "string", nullable: true },
            overwriteReason: { type: "string", nullable: true },
          },
        },
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

  const magika = await getMagika();
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

  return {
    type: result.prediction.output.label,
    isText: result.prediction.output.is_text,
    confidence: result.prediction.score,
    details: {
      dlPrediction: result.prediction.dl?.label || null,
      overwriteReason: result.prediction.overwrite_reason || null,
    },
  };
}

export default async function (fastify) {
  fastify.post("/detect", { schema }, handler);
}
