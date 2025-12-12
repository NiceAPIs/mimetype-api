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
  querystring: {
    type: "object",
    required: ["url"],
    properties: {
      url: { type: "string", minLength: 1 },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        url: { type: "string" },
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
  const { url } = request.query;

  let data;
  try {
    data = await secureFetch(url);
  } catch (err) {
    return reply.status(400).send({
      error: "Fetch failed",
      message: err.message,
    });
  }

  const magika = await getMagika();
  const result = await magika.identifyBytes(data);

  if (result.status !== "ok") {
    return reply.status(422).send({
      error: "Detection failed",
      message: `Magika returned status: ${result.status}`,
    });
  }

  return {
    url,
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
  fastify.get("/detect-url", { schema }, handler);
}
