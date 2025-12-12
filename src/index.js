import Fastify from "fastify";
import { MagikaNode } from "magika";

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024; // 10 MB par défaut

// Instance Magika (singleton)
let magika = null;

async function getMagika() {
  if (!magika) {
    magika = new MagikaNode();
    await magika.load();
  }
  return magika;
}

// Création de l'application Fastify
const app = Fastify({
  logger: true,
  bodyLimit: MAX_FILE_SIZE,
});

// Parser pour le contenu binaire
app.addContentTypeParser("*", { parseAs: "buffer" }, (req, body, done) => {
  done(null, body);
});

// Schémas de réponse
const errorSchema = {
  type: "object",
  properties: {
    error: { type: "string" },
    message: { type: "string" },
  },
};

const typeSchema = {
  type: "object",
  properties: {
    label: { type: "string" },
    isText: { type: "boolean" },
  },
};

// GET /types - Liste des types supportés par Magika
app.get(
  "/types",
  {
    schema: {
      response: {
        200: {
          type: "object",
          properties: {
            count: { type: "integer" },
            types: {
              type: "array",
              items: typeSchema,
            },
          },
        },
      },
    },
  },
  async (request, reply) => {
    const m = await getMagika();
    const types = Object.entries(m.cts_infos).map(([label, info]) => ({
      label,
      isText: info.is_text,
    }));

    types.sort((a, b) => a.label.localeCompare(b.label));

    return { count: types.length, types };
  }
);

// POST /detect - Détecte le type d'un document
app.post(
  "/detect",
  {
    schema: {
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
    },
  },
  async (request, reply) => {
    if (!request.body || request.body.length === 0) {
      return reply.status(400).send({
        error: "Bad request",
        message: "Request body is required. Send the file content as binary data.",
      });
    }

    const m = await getMagika();
    const data = Buffer.isBuffer(request.body)
      ? request.body
      : Buffer.from(request.body);
    const result = await m.identifyBytes(data);

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
);

// POST /validate - Valide si un document correspond à un type donné
app.post(
  "/validate",
  {
    schema: {
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
    },
  },
  async (request, reply) => {
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

    const m = await getMagika();

    // Vérifier que les types demandés sont valides
    const knownTypes = new Set(Object.keys(m.cts_infos));
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
    const result = await m.identifyBytes(data);

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
);

// GET /health - Health check
app.get(
  "/health",
  {
    schema: {
      response: {
        200: {
          type: "object",
          properties: {
            status: { type: "string" },
            magikaLoaded: { type: "boolean" },
          },
        },
      },
    },
  },
  async () => {
    return {
      status: "ok",
      magikaLoaded: magika !== null,
    };
  }
);

// 404 handler
app.setNotFoundHandler((request, reply) => {
  reply.status(404).send({
    error: "Not found",
    message: `Route ${request.method} ${request.url} not found`,
    availableEndpoints: [
      "GET /types - List all supported file types",
      "POST /detect - Detect file type from binary content",
      "POST /validate?types=png,jpg - Validate file matches expected type(s)",
      "GET /health - Health check",
    ],
  });
});

// Démarrage du serveur
async function start() {
  try {
    // Pré-charger Magika au démarrage
    await getMagika();
    app.log.info("Magika loaded successfully");

    await app.listen({ port: PORT, host: HOST });
    app.log.info(`Max file size: ${MAX_FILE_SIZE} bytes`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
