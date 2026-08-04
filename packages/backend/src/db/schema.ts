import { relations } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// ──────────────────────────────────────────────
// Better Auth 核心表
// 字段名（camelCase）与 better-auth 期望一致，由 phoneNumber 插件和 socialProviders 使用。
// 这些表由 better-auth 在首次启动时自动创建（自动迁移）。
// ──────────────────────────────────────────────

/**
 * 用户表
 * 手机号 / Google 登录首次验证通过后自动创建记录（自动注册）。
 */
export const user = sqliteTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: integer("emailVerified", { mode: "boolean" })
		.notNull()
		.default(false),
	image: text("image"),
	// phoneNumber 插件新增：手机号 + 是否已验证
	phoneNumber: text("phoneNumber").unique(),
	phoneNumberVerified: integer("phoneNumberVerified", {
		mode: "boolean",
	}).default(false),
	createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
	updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

/**
 * 会话表（有状态 session）
 * 每次登录创建一条；token 通过 HttpOnly cookie 下发。
 * 默认 7 天有效，剩余 < 1 天时滚动续期（updateAge）。
 */
export const session = sqliteTable("session", {
	id: text("id").primaryKey(),
	userId: text("userId")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	token: text("token").notNull().unique(),
	expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
	ipAddress: text("ipAddress"),
	userAgent: text("userAgent"),
	createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
	updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

/**
 * 账号表（多登录方式关联同一用户）
 * 一个 user 可有多条 account：手机号（providerId=phoneNumber）/ Google（providerId=google）等。
 */
export const account = sqliteTable("account", {
	id: text("id").primaryKey(),
	userId: text("userId")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	accountId: text("accountId").notNull(),
	providerId: text("providerId").notNull(),
	accessToken: text("accessToken"),
	refreshToken: text("refreshToken"),
	accessTokenExpiresAt: integer("accessTokenExpiresAt", { mode: "timestamp" }),
	refreshTokenExpiresAt: integer("refreshTokenExpiresAt", {
		mode: "timestamp",
	}),
	scope: text("scope"),
	idToken: text("idToken"),
	password: text("password"),
	createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
	updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

/**
 * 验证表（存 OTP 等临时验证记录，自动过期）
 */
export const verification = sqliteTable("verification", {
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
	createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
	updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

// ──────────────────────────────────────────────
// 关系定义（供 drizzle 关联查询使用）
// ──────────────────────────────────────────────
export const userRelations = relations(user, ({ many }) => ({
	sessions: many(session),
	accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
	user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
	user: one(user, { fields: [account.userId], references: [user.id] }),
}));
// Drizzle schema placeholder — tables will be added as needed.
