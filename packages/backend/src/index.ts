import { app } from "./app";
import { runMigrations } from "./db";

const PORT = 3001;

// 启动前执行数据库迁移（建表 / 更新 schema），确保数据库结构最新
runMigrations();

const server = Bun.serve({
	port: PORT,
	fetch: app.fetch,
});

console.log(`Listening on ${server.url}`);
