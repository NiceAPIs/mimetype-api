import { getMagika } from "../services/magika.js";

const errorSchema = {
  type: "object",
  properties: {
    error: { type: "string" },
    message: { type: "string" },
  },
};

const schema = {
  summary: "Detect file type",
  description: "Analyzes binary content and returns the detected file type using Magika deep learning model. Send file as binary body.",
  tags: ["detection"],
  response: {
    200: {
      description: "Successful detection",
      type: "object",
      properties: {
        type: { type: "string", description: "Detected file type (e.g., png, pdf)" },
        isText: { type: "boolean", description: "Whether the file is text-based" },
        confidence: { type: "number", description: "Confidence score (0-1)" },
        details: {
          type: "object",
          properties: {
            dlPrediction: { type: "string", nullable: true, description: "Raw deep learning prediction" },
            overwriteReason: { type: "string", nullable: true, description: "Reason if prediction was overwritten" },
          },
        },
      },
      example: {
        type: "png",
        isText: false,
        confidence: 0.99,
        details: {
          dlPrediction: "png",
          overwriteReason: null,
        },
      },
    },
    400: {
      description: "Bad request - empty body",
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
