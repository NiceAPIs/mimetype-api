import Fastify from "fastify";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import routes from "./routes/index.js";

export async function buildApp(options = {}) {
  const MAX_FILE_SIZE =
    parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024;

  const app = Fastify({
    logger: options.logger ?? false,
    bodyLimit: MAX_FILE_SIZE,
  });

  // OpenAPI documentation
  await app.register(swagger, {
    openapi: {
      info: {
        title: "Mimetype API",
        description: "REST API for file type detection using Google Magika (deep learning)",
        version: "1.0.0",
      },
      servers: [
        {
          url: "http://localhost:3000",
          description: "Local development server",
        },
      ],
      tags: [
        { name: "detection", description: "File type detection endpoints" },
        { name: "validation", description: "File type validation endpoints" },
        { name: "info", description: "Information endpoints" },
      ],
    },
    transform: ({ schema, url, route, swaggerObject }) => {
      const transformed = { ...schema };
      // Add binary body for POST routes that need file upload
      if (route.method === "POST" && (url === "/detect" || url === "/validate")) {
        transformed.body = {
          type: "string",
          format: "binary",
          description: "File content as binary data",
        };
        transformed.consumes = ["application/octet-stream"];
      }
      return { schema: transformed, url };
    },
  });

  await app.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: false,
    },
  });

  // Parser for binary content
  app.addContentTypeParser("*", { parseAs: "buffer" }, (req, body, done) => {
    done(null, body);
  });

  // Register routes
  await app.register(routes);

  // 404 handler
  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      error: "Not found",
      message: `Route ${request.method} ${request.url} not found`,
      availableEndpoints: [
        "GET /types - List all supported file types",
        "POST /detect - Detect file type from binary content",
        "GET /detect-url?url=... - Detect file type from URL",
        "POST /validate?types=png,jpg - Validate file matches expected type(s)",
        "GET /validate-url?url=...&types=png,jpg - Validate file from URL",
        "GET /health - Health check",
        "GET /docs - OpenAPI documentation",
      ],
    });
  });

  return app;
}
