import { buildApp } from "./app.js";
import { getMagika } from "./services/magika.js";

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024;

const app = buildApp({ logger: true });

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
