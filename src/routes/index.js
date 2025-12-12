import typesRoute from "./types.js";
import detectRoute from "./detect.js";
import validateRoute from "./validate.js";
import healthRoute from "./health.js";

export default async function (fastify) {
  fastify.register(typesRoute);
  fastify.register(detectRoute);
  fastify.register(validateRoute);
  fastify.register(healthRoute);
}
