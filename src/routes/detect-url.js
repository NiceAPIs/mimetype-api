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
  summary: "Detect file type from URL",
  description: "Fetches content from a URL and detects its file type. Includes SSRF protection.",
  tags: ["detection"],
  querystring: {
    type: "object",
    required: ["url"],
    properties: {
      url: {
        type: "string",
        minLength: 1,
        description: "URL to fetch and analyze (e.g., https://example.com/image.png)",
      },
    },
  },
  response: {
    200: {
      description: "Successful detection",
      type: "object",
      properties: {
        url: { type: "string", description: "The analyzed URL" },
        type: { type: "string", description: "Detected file type" },
        isText: { type: "boolean", description: "Whether the file is text-based" },
        confidence: { type: "number", description: "Confidence score (0-1)" },
        details: {
          type: "object",
          properties: {
            dlPrediction: { type: "string", nullable: true },
            overwriteReason: { type: "string", nullable: true },
          },
        },
      },
      example: {
        url: "https://example.com/image.png",
        type: "png",
        isText: false,
        confidence: 0.99,
        details: { dlPrediction: "png", overwriteReason: null },
      },
    },
    400: {
      description: "Bad request - invalid URL or blocked by SSRF protection",
      ...errorSchema,
    },
    422: {
      description: "Detection failed",
      ...errorSchema,
    },
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
