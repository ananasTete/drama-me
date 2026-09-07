import {
	CURRENT_CANVAS_SCHEMA_VERSION,
	CanvasDtoSchema,
	CanvasIdParamSchema,
	CanvasListItemSchema,
	CreateCanvasBodySchema,
	CreateCanvasResponseSchema,
	DEFAULT_CANVAS_NAME,
	DeleteCanvasResponseSchema,
	EMPTY_CANVAS_VIEWPORT,
	ERROR_CODE,
	GetCanvasResponseSchema,
	ListCanvasesQuerySchema,
	ListCanvasesResponseSchema,
} from "@drama-me/shared";
import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db";
import { canvas } from "../db/schema";
import { AppError } from "../lib/app-error";
import type { AuthType } from "../lib/auth";
import {
	jsonValidator,
	paramValidator,
	queryValidator,
} from "../lib/zod-validator";
import { authMiddleware, requireUser } from "../middleware/auth";

// 把 keyword 里的 % _ \ 当成普通字符，避免 LIKE 通配符被用户输入放大
function toLikeContainsPattern(keyword: string): string {
	const escaped = keyword
		.replaceAll("\\", "\\\\")
		.replaceAll("%", "\\%")
		.replaceAll("_", "\\_");
	return `%${escaped}%`;
}

function toIso(date: Date): string {
	return date.toISOString();
}

function toCanvasDto(row: typeof canvas.$inferSelect) {
	return CanvasDtoSchema.parse({
		id: row.id,
		ownerId: row.ownerId,
		name: row.name,
		viewport: row.viewport,
		nodes: row.nodes,
		edges: row.edges,
		schemaVersion: row.schemaVersion,
		revision: row.revision,
		createdAt: toIso(row.createdAt),
		updatedAt: toIso(row.updatedAt),
	});
}

const canvases = new Hono<{ Variables: AuthType }>()
	.use(authMiddleware)
	.post("/canvases", jsonValidator(CreateCanvasBodySchema), async (c) => {
		const user = requireUser(c);

		const body = c.req.valid("json");
		const name = body.name || DEFAULT_CANVAS_NAME;
		const now = new Date();

		const [row] = await db
			.insert(canvas)
			.values({
				id: crypto.randomUUID(),
				ownerId: user.id,
				name,
				viewport: EMPTY_CANVAS_VIEWPORT,
				nodes: [],
				edges: [],
				schemaVersion: CURRENT_CANVAS_SCHEMA_VERSION,
				revision: 1,
				createdAt: now,
				updatedAt: now,
			})
			.returning();

		if (!row) {
			throw new Error("Failed to insert canvas");
		}

		return c.json(
			CreateCanvasResponseSchema.parse({ canvas: toCanvasDto(row) }),
			201,
		);
	})
	.get("/canvases", queryValidator(ListCanvasesQuerySchema), async (c) => {
		const user = requireUser(c);

		const query = c.req.valid("query");
		const keyword = query.keyword?.trim() || undefined;
		const sortColumn =
			query.sortBy === "createdAt" ? canvas.createdAt : canvas.updatedAt;
		const orderBy = query.order === "asc" ? asc(sortColumn) : desc(sortColumn);

		const ownerFilter = eq(canvas.ownerId, user.id);
		const where = keyword
			? and(
					ownerFilter,
					sql`${canvas.name} LIKE ${toLikeContainsPattern(keyword)} ESCAPE char(92)`,
				)
			: ownerFilter;

		const offset = (query.page - 1) * query.pageSize;

		const [rows, [totalRow]] = await Promise.all([
			db
				.select({
					id: canvas.id,
					ownerId: canvas.ownerId,
					name: canvas.name,
					schemaVersion: canvas.schemaVersion,
					revision: canvas.revision,
					createdAt: canvas.createdAt,
					updatedAt: canvas.updatedAt,
				})
				.from(canvas)
				.where(where)
				.orderBy(orderBy)
				.limit(query.pageSize)
				.offset(offset),
			db.select({ total: count() }).from(canvas).where(where),
		]);

		return c.json(
			ListCanvasesResponseSchema.parse({
				canvases: rows.map((row) =>
					CanvasListItemSchema.parse({
						id: row.id,
						ownerId: row.ownerId,
						name: row.name,
						schemaVersion: row.schemaVersion,
						revision: row.revision,
						createdAt: toIso(row.createdAt),
						updatedAt: toIso(row.updatedAt),
					}),
				),
				total: totalRow?.total ?? 0,
				page: query.page,
				pageSize: query.pageSize,
			}),
		);
	})
	.get("/canvases/:id", paramValidator(CanvasIdParamSchema), async (c) => {
		const user = requireUser(c);

		const { id } = c.req.valid("param");
		const [row] = await db
			.select()
			.from(canvas)
			.where(and(eq(canvas.id, id), eq(canvas.ownerId, user.id)))
			.limit(1);

		if (!row) {
			throw new AppError(ERROR_CODE.CANVAS_NOT_FOUND, 404, "Canvas not found");
		}

		return c.json(GetCanvasResponseSchema.parse({ canvas: toCanvasDto(row) }));
	})
	.delete("/canvases/:id", paramValidator(CanvasIdParamSchema), async (c) => {
		const user = requireUser(c);

		const { id } = c.req.valid("param");
		const [deleted] = await db
			.delete(canvas)
			.where(and(eq(canvas.id, id), eq(canvas.ownerId, user.id)))
			.returning({ id: canvas.id });

		if (!deleted) {
			throw new AppError(ERROR_CODE.CANVAS_NOT_FOUND, 404, "Canvas not found");
		}

		return c.json(DeleteCanvasResponseSchema.parse({ id: deleted.id }));
	});

export { canvases };
