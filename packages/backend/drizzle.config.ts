import { defineConfig } from "drizzle-kit";

// Drizzle Kit 配置：管理数据库 schema 迁移
// - schema: Drizzle schema 定义文件（唯一真相源）
// - out: 生成的迁移 SQL 文件输出目录（提交到 git，记录 schema 演进历史）
// - dialect: sqlite，配合 bun:sqlite 运行时使用
export default defineConfig({
	schema: "./src/db/schema.ts",
	out: "./drizzle",
	dialect: "sqlite",
	dbCredentials: {
		url: "./app.db",
	},
});
