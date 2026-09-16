import {
	CURRENT_CANVAS_SCHEMA_VERSION,
	type CanvasImageNodeData,
	type CanvasTextNodeData,
	type CanvasVideoNodeData,
	type CanvasViewport,
	EMPTY_CANVAS_VIEWPORT,
} from "@drama-me/shared";
import { relations, sql } from "drizzle-orm";
import {
	check,
	foreignKey,
	index,
	integer,
	real,
	sqliteTable,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";

type CanvasNodeData =
	| CanvasTextNodeData
	| CanvasImageNodeData
	| CanvasVideoNodeData;

// ──────────────────────────────────────────────
// Better Auth 核心表
// 字段名（camelCase）与 better-auth 期望一致，由 phoneNumber 插件和 socialProviders 使用。
// 这些表由 better-auth 在首次启动时自动创建（自动迁移）。
// ──────────────────────────────────────────────

/**
 * 用户表
 * 账号密码登录：账号映射为 email 存储；Google 登录可选。
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

/**
 * 画布表只保存文档级字段；节点和连线拆表存储，避免局部修改时重写整份图。
 */
export const canvas = sqliteTable(
	"canvas",
	{
		id: text("id").primaryKey(),
		ownerId: text("ownerId")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		viewport: text("viewport", { mode: "json" })
			.$type<CanvasViewport>()
			.notNull()
			.default(EMPTY_CANVAS_VIEWPORT),
		// SQLite 以 0 / 1 存布尔值；默认关闭，保证旧画布迁移后的行为不变。
		snapToGrid: integer("snapToGrid", { mode: "boolean" })
			.notNull()
			.default(false),
		schemaVersion: integer("schemaVersion")
			.notNull()
			.default(CURRENT_CANVAS_SCHEMA_VERSION),
		// 乐观锁：内容保存成功后 +1；仅更新 viewport 时不改
		revision: integer("revision").notNull().default(1),
		createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
		updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
	},
	(table) => [
		index("canvas_ownerId_updatedAt_idx").on(table.ownerId, table.updatedAt),
		check("canvas_schema_version_positive", sql`${table.schemaVersion} >= 1`),
		check("canvas_revision_positive", sql`${table.revision} >= 1`),
	],
);

export const canvasNode = sqliteTable(
	"canvasNode",
	{
		id: text("id").primaryKey(),
		canvasId: text("canvasId")
			.notNull()
			.references(() => canvas.id, { onDelete: "cascade" }),
		type: text("type", { enum: ["text", "image", "video"] }).notNull(),
		positionX: real("positionX").notNull(),
		positionY: real("positionY").notNull(),
		width: real("width").notNull(),
		height: real("height").notNull(),
		zIndex: integer("zIndex").notNull(),
		locked: integer("locked", { mode: "boolean" }).notNull(),
		data: text("data", { mode: "json" }).$type<CanvasNodeData>().notNull(),
	},
	(table) => [
		index("canvasNode_canvasId_idx").on(table.canvasId),
		uniqueIndex("canvasNode_canvasId_id_unique").on(table.canvasId, table.id),
		check(
			"canvasNode_type_valid",
			sql`${table.type} IN ('text', 'image', 'video')`,
		),
		check("canvasNode_width_positive", sql`${table.width} > 0`),
		check("canvasNode_height_positive", sql`${table.height} > 0`),
	],
);

export const canvasEdge = sqliteTable(
	"canvasEdge",
	{
		id: text("id").primaryKey(),
		canvasId: text("canvasId")
			.notNull()
			.references(() => canvas.id, { onDelete: "cascade" }),
		sourceNodeId: text("sourceNodeId").notNull(),
		targetNodeId: text("targetNodeId").notNull(),
		sourceHandle: text("sourceHandle", { enum: ["left", "right"] }).notNull(),
		targetHandle: text("targetHandle", { enum: ["left", "right"] }).notNull(),
		type: text("type", { enum: ["default"] }).notNull(),
	},
	(table) => [
		index("canvasEdge_canvasId_idx").on(table.canvasId),
		foreignKey({
			columns: [table.canvasId, table.sourceNodeId],
			foreignColumns: [canvasNode.canvasId, canvasNode.id],
			name: "canvasEdge_sourceNode_fk",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.canvasId, table.targetNodeId],
			foreignColumns: [canvasNode.canvasId, canvasNode.id],
			name: "canvasEdge_targetNode_fk",
		}).onDelete("cascade"),
		check(
			"canvasEdge_sourceHandle_valid",
			sql`${table.sourceHandle} IN ('left', 'right')`,
		),
		check(
			"canvasEdge_targetHandle_valid",
			sql`${table.targetHandle} IN ('left', 'right')`,
		),
		check("canvasEdge_type_valid", sql`${table.type} = 'default'`),
	],
);

/** 成功 mutation 的回执，用于在响应丢失后安全重试，不是撤销历史。 */
export const canvasMutation = sqliteTable(
	"canvasMutation",
	{
		mutationId: text("mutationId").primaryKey(),
		canvasId: text("canvasId")
			.notNull()
			.references(() => canvas.id, { onDelete: "cascade" }),
		requestHash: text("requestHash").notNull(),
		baseRevision: integer("baseRevision").notNull(),
		resultingRevision: integer("resultingRevision").notNull(),
		createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
	},
	(table) => [
		index("canvasMutation_canvasId_idx").on(table.canvasId),
		index("canvasMutation_createdAt_idx").on(table.createdAt),
		check(
			"canvasMutation_baseRevision_positive",
			sql`${table.baseRevision} >= 1`,
		),
		check(
			"canvasMutation_resultingRevision_positive",
			sql`${table.resultingRevision} >= 1`,
		),
	],
);

// ──────────────────────────────────────────────
// 关系定义（供 drizzle 关联查询使用）
// ──────────────────────────────────────────────
export const userRelations = relations(user, ({ many }) => ({
	sessions: many(session),
	accounts: many(account),
	canvases: many(canvas),
}));

export const sessionRelations = relations(session, ({ one }) => ({
	user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
	user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const canvasRelations = relations(canvas, ({ one, many }) => ({
	owner: one(user, { fields: [canvas.ownerId], references: [user.id] }),
	nodes: many(canvasNode),
	edges: many(canvasEdge),
	mutations: many(canvasMutation),
}));

export const canvasNodeRelations = relations(canvasNode, ({ one }) => ({
	canvas: one(canvas, {
		fields: [canvasNode.canvasId],
		references: [canvas.id],
	}),
}));

export const canvasEdgeRelations = relations(canvasEdge, ({ one }) => ({
	canvas: one(canvas, {
		fields: [canvasEdge.canvasId],
		references: [canvas.id],
	}),
}));

export const canvasMutationRelations = relations(canvasMutation, ({ one }) => ({
	canvas: one(canvas, {
		fields: [canvasMutation.canvasId],
		references: [canvas.id],
	}),
}));
