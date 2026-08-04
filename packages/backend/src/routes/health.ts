import { HealthResponseSchema } from "@drama-me/shared";
import { Hono } from "hono";

const health = new Hono().get("/health", (c) => {
	const data = HealthResponseSchema.parse({
		status: "ok",
		timestamp: new Date().toISOString(),
	});
	return c.json(data);
});

export { health };
