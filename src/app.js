import Fastify from "fastify";
import routes from "./routes/index.js";

export function buildApp(options = {}) {
  const MAX_FILE_SIZE =
    parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024;

  const app = Fastify({
    logger: options.logger ?? false,
    bodyLimit: MAX_FILE_SIZE,
  });

  // Parser for binary content
  app.addContentTypeParser("*", { parseAs: "buffer" }, (req, body, done) => {
    done(null, body);
  });

  // Register routes
  app.register(routes);

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
      ],
    });
  });

  return app;
}
