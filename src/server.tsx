import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { logger } from "hono/logger";
import { routes } from "./routes.tsx";

const app = new Hono();

app.use("/styles/*", serveStatic({ root: "./public/" }));
app.use("*", logger());

routes(app);

export default {
  port: process.env.PORT || 1234,
  fetch: app.fetch,
};
