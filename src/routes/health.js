import { isMagikaLoaded } from "../services/magika.js";

const schema = {
  response: {
    200: {
      type: "object",
      properties: {
        status: { type: "string" },
        magikaLoaded: { type: "boolean" },
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
