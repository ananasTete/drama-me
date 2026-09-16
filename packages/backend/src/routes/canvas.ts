import {
	ApplyCanvasOperationsBodySchema,
	ApplyCanvasOperationsResponseSchema,
	CURRENT_CANVAS_SCHEMA_VERSION,
	CanvasIdParamSchema,
	CanvasViewportSchema,
	CreateCanvasBodySchema,
	CreateCanvasResponseSchema,
	DEFAULT_CANVAS_NAME,
	DeleteCanvasResponseSchema,
	EMPTY_CANVAS_VIEWPORT,
	ERROR_CODE,
	GetCanvasResponseSchema,
	ListCanvasesQuerySchema,
	ListCanvasesResponseSchema,
	UpdateCanvasMetadataBodySchema,
	UpdateCanvasMetadataResponseSchema,
	UpdateCanvasViewportResponseSchema,
} from "@drama-me/shared";
import { and, asc, desc, eq, gt, lt, or, sql } from "drizzle-orm";
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
import {
	loadCanvasDto,
	toCanvasDto,
	toCanvasMetadata,
	toIso,
	toLikeContainsPattern,
} from "../services/canvas-document";
import { applyCanvasOperations } from "../services/canvas-operations";

function decodeCanvasListCursor(cursor: string): {
	sortValue: Date;
	id: string;
} {
	const separatorIndex = cursor.indexOf(":");
	return {
		sortValue: new Date(Number(cursor.slice(0, separatorIndex))),
		id: cursor.slice(separatorIndex + 1),
	};
}

function encodeCanvasListCursor(sortValue: Date, id: string): string {
	return `${sortValue.getTime()}:${id}`;
}

const canvases = new Hono<{ Variables: AuthType }>()
	.use(authMiddleware)
	.post("/canvases", jsonValidator(CreateCanvasBodySchema), async (c) => {
		const user = requireUser(c);

		const body = c.req.valid("json");
		const name = body.name ?? DEFAULT_CANVAS_NAME;
		const now = new Date();

		const [row] = await db
			.insert(canvas)
			.values({
				id: crypto.randomUUID(),
				ownerId: user.id,
				name,
				viewport: EMPTY_CANVAS_VIEWPORT,
				snapToGrid: false,
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
			CreateCanvasResponseSchema.parse({ canvas: toCanvasDto(row, [], []) }),
			201,
		);
	})
	.get("/canvases", queryValidator(ListCanvasesQuerySchema), async (c) => {
		const user = requireUser(c);

		const query = c.req.valid("query");
		const keyword = query.keyword?.trim() || undefined;
		const sortColumn =
			query.sortBy === "createdAt" ? canvas.createdAt : canvas.updatedAt;
		const orderBy = [desc(sortColumn), asc(canvas.id)];

		const ownerFilter = eq(canvas.ownerId, user.id);
		const keywordFilter = keyword
			? sql`${canvas.name} LIKE ${toLikeContainsPattern(keyword)} ESCAPE char(92)`
			: undefined;
		const cursorFilter = query.cursor
			? (() => {
					const cursor = decodeCanvasListCursor(query.cursor);
					return or(
						lt(sortColumn, cursor.sortValue),
						and(
							eq(sortColumn, cursor.sortValue),
							gt(canvas.id, cursor.id),
						),
					);
				})()
			: undefined;
		const where = and(ownerFilter, keywordFilter, cursorFilter);

		// 多取一条只用于判断是否还有下一批，避免为滚动列表额外 COUNT 全量数据。
		const rows = await db
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
			.orderBy(...orderBy)
			.limit(query.limit + 1);

		const pageRows = rows.slice(0, query.limit);
		const lastRow = pageRows.at(-1);
		const nextCursor =
			rows.length > query.limit && lastRow
				? encodeCanvasListCursor(
						query.sortBy === "createdAt"
							? lastRow.createdAt
							: lastRow.updatedAt,
						lastRow.id,
					)
				: null;

		return c.json(
			ListCanvasesResponseSchema.parse({
				canvases: pageRows.map((row) => ({
					id: row.id,
					ownerId: row.ownerId,
					name: row.name,
					schemaVersion: row.schemaVersion,
					revision: row.revision,
					createdAt: toIso(row.createdAt),
					updatedAt: toIso(row.updatedAt),
				})),
				nextCursor,
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

		return c.json(
			GetCanvasResponseSchema.parse({ canvas: await loadCanvasDto(db, row) }),
		);
	})
	.post(
		"/canvases/:id/operations",
		paramValidator(CanvasIdParamSchema),
		jsonValidator(ApplyCanvasOperationsBodySchema),
		(c) => {
			const user = requireUser(c);
			const { id } = c.req.valid("param");
			const body = c.req.valid("json");
			return c.json(
				ApplyCanvasOperationsResponseSchema.parse(
					applyCanvasOperations(db, user.id, id, body),
				),
			);
		},
	)
	.patch(
		"/canvases/:id",
		paramValidator(CanvasIdParamSchema),
		jsonValidator(UpdateCanvasMetadataBodySchema),
		async (c) => {
			const user = requireUser(c);
			const { id } = c.req.valid("param");
			const body = c.req.valid("json");

			const [updated] = await db
				.update(canvas)
				.set({
					...(body.name === undefined ? {} : { name: body.name }),
					...(body.snapToGrid === undefined
						? {}
						: { snapToGrid: body.snapToGrid }),
					// 重命名算文档更新；编辑偏好不会改变列表的“最近更新”顺序。
					...(body.name === undefined ? {} : { updatedAt: new Date() }),
				})
				.where(and(eq(canvas.id, id), eq(canvas.ownerId, user.id)))
				.returning();

			if (!updated) {
				throw new AppError(
					ERROR_CODE.CANVAS_NOT_FOUND,
					404,
					"Canvas not found",
				);
			}

			return c.json(
				UpdateCanvasMetadataResponseSchema.parse({
					canvas: toCanvasMetadata(updated),
				}),
			);
		},
	)
	.put(
		"/canvases/:id/viewport",
		paramValidator(CanvasIdParamSchema),
		jsonValidator(CanvasViewportSchema),
		async (c) => {
			const user = requireUser(c);
			const { id } = c.req.valid("param");
			const viewport = c.req.valid("json");

			const [updated] = await db
				.update(canvas)
				// viewport 是浏览位置，不改变 revision 和列表的最近更新时间。
				.set({ viewport })
				.where(and(eq(canvas.id, id), eq(canvas.ownerId, user.id)))
				.returning({ viewport: canvas.viewport });

			if (!updated) {
				throw new AppError(
					ERROR_CODE.CANVAS_NOT_FOUND,
					404,
					"Canvas not found",
				);
			}

			return c.json(UpdateCanvasViewportResponseSchema.parse(updated));
		},
	)
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
