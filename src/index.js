import Fastify from "fastify";
import routes from "./routes/index.js";
import { getMagika } from "./services/magika.js";

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024;

const app = Fastify({
  logger: true,
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
      "POST /validate?types=png,jpg - Validate file matches expected type(s)",
      "GET /health - Health check",
    ],
  });
});

async function start() {
  try {
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
