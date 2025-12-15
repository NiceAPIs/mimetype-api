import { isMagikaLoaded } from "../services/magika.js";

const schema = {
  summary: "Health check",
  description: "Returns the health status of the API",
  tags: ["info"],
  response: {
    200: {
      description: "API is healthy",
      type: "object",
      properties: {
        status: { type: "string", description: "Health status" },
        magikaLoaded: { type: "boolean", description: "Whether Magika model is loaded" },
      },
      example: {
        status: "ok",
        magikaLoaded: true,
      },
    },
  },
};

async function handler() {
  return {
    status: "ok",
    magikaLoaded: isMagikaLoaded(),
  };
}

export default async function (fastify) {
  fastify.get("/health", { schema }, handler);
}
