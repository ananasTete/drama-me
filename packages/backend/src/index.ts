import { app } from "./app";
import { db, runMigrations } from "./db";
import { removeExpiredCanvasMutationReceipts } from "./services/canvas-document";

const PORT = 3001;

// 启动前执行数据库迁移（建表 / 更新 schema），确保数据库结构最新
runMigrations();
removeExpiredCanvasMutationReceipts(db);

const server = Bun.serve({
	port: PORT,
	fetch: app.fetch,
});

console.log(`Listening on ${server.url}`);
