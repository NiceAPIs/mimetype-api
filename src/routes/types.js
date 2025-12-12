import { getMagika } from "../services/magika.js";

const schema = {
  response: {
    200: {
      type: "object",
      properties: {
        count: { type: "integer" },
        types: {
          type: "array",
          items: {
            type: "object",
            properties: {
              label: { type: "string" },
              isText: { type: "boolean" },
            },
          },
        },
      },
    },
  },
};

async function handler(request, reply) {
  const magika = await getMagika();
  const types = Object.entries(magika.cts_infos).map(([label, info]) => ({
    label,
    isText: info.is_text,
  }));

  types.sort((a, b) => a.label.localeCompare(b.label));

  return { count: types.length, types };
}

export default async function (fastify) {
  fastify.get("/types", { schema }, handler);
}
