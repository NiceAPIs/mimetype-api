import typesRoute from "./types.js";
import detectRoute from "./detect.js";
import detectUrlRoute from "./detect-url.js";
import validateRoute from "./validate.js";
import validateUrlRoute from "./validate-url.js";
import healthRoute from "./health.js";

export default async function (fastify) {
  fastify.register(typesRoute);
  fastify.register(detectRoute);
  fastify.register(detectUrlRoute);
  fastify.register(validateRoute);
  fastify.register(validateUrlRoute);
  fastify.register(healthRoute);
}
