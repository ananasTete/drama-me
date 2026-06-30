import { app } from "./app";

const PORT = 3001;

const server = Bun.serve({
	port: PORT,
	fetch: app.fetch,
});

console.log(`Listening on ${server.url}`);
