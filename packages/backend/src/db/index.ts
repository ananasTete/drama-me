import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import * as schema from "./schema";

// 数据库文件放在 backend 包根目录（已被 .gitignore 忽略）
const dbPath = `${import.meta.dir}/../../app.db`;
const sqlite = new Database(dbPath);
// 节点与连线依赖级联删除和同画布复合外键，连接建立后必须显式开启。
sqlite.exec("PRAGMA foreign_keys = ON;");
// 锁等待：并发或 watch 热重载时，遇到锁最多等 5 秒，避免立即报 SQLITE_BUSY
sqlite.exec("PRAGMA busy_timeout = 5000;");
// WAL 模式：提升并发读写性能，SQLite 官方推荐配置
sqlite.exec("PRAGMA journal_mode = WAL;");

export const db = drizzle(sqlite, { schema });
export type DB = typeof db;
export { schema };

// 启动时执行数据库迁移（幂等，已应用的迁移会自动跳过）
// 迁移文件在 ./drizzle，由 `drizzle-kit generate` 生成并提交到 git
// 流程：改 schema.ts → `drizzle-kit generate` 生成新迁移 → 重启自动应用
export function runMigrations() {
	migrate(db, { migrationsFolder: `${import.meta.dir}/../../drizzle` });
}
