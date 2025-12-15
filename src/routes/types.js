import { getMagika } from "../services/magika.js";

const schema = {
  summary: "List supported file types",
  description: "Returns all file types that can be detected by Magika",
  tags: ["info"],
  response: {
    200: {
      description: "List of supported types",
      type: "object",
      properties: {
        count: { type: "integer", description: "Total number of supported types" },
        types: {
          type: "array",
          items: {
            type: "object",
            properties: {
              label: { type: "string", description: "Type identifier (e.g., png, pdf, javascript)" },
              isText: { type: "boolean", description: "Whether this type is text-based" },
            },
          },
        },
      },
      example: {
        count: 353,
        types: [
          { label: "png", isText: false },
          { label: "javascript", isText: true },
        ],
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
