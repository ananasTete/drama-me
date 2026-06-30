import { Hono } from "hono";
import { cors } from "hono/cors";
import { health } from "./routes/health";

const app = new Hono().route("/api", health);

export type AppType = typeof app;
export { app };
