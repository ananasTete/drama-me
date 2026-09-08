import { z } from "zod";

/** 节点连接口 id，与自定义节点里 Handle 的 id 保持一致 */
export const CANVAS_HANDLE = {
	left: "left",
	right: "right",
} as const;

export const CanvasHandleIdSchema = z.enum([
	CANVAS_HANDLE.left,
	CANVAS_HANDLE.right,
]);
export type CanvasHandleId = z.infer<typeof CanvasHandleIdSchema>;

export const CanvasNodeTypeSchema = z.enum(["text", "video", "image"]);
export type CanvasNodeType = z.infer<typeof CanvasNodeTypeSchema>;

export const CanvasEdgeTypeSchema = z.literal("default");
export type CanvasEdgeType = z.infer<typeof CanvasEdgeTypeSchema>;

export const CanvasPositionSchema = z.object({
	x: z.number(),
	y: z.number(),
});
export type CanvasPosition = z.infer<typeof CanvasPositionSchema>;

export const CanvasViewportSchema = z.object({
	x: z.number(),
	y: z.number(),
	zoom: z.number(),
});
export type CanvasViewport = z.infer<typeof CanvasViewportSchema>;

const canvasNodeBaseSchema = {
	id: z.string().min(1),
	position: CanvasPositionSchema,
	width: z.number(),
	height: z.number(),
	zIndex: z.number().int(),
	locked: z.boolean(),
	createdAt: z.string(),
	updatedAt: z.string(),
	data: z.unknown(),
};

export const CanvasNodeSchema = z.discriminatedUnion("type", [
	z.object({ type: z.literal("text"), ...canvasNodeBaseSchema }),
	z.object({ type: z.literal("video"), ...canvasNodeBaseSchema }),
	z.object({ type: z.literal("image"), ...canvasNodeBaseSchema }),
]);
export type CanvasNode = z.infer<typeof CanvasNodeSchema>;

export const CanvasEdgeSchema = z.object({
	id: z.string().min(1),
	source: z.string().min(1),
	target: z.string().min(1),
	sourceHandle: CanvasHandleIdSchema,
	targetHandle: CanvasHandleIdSchema,
	type: CanvasEdgeTypeSchema,
	createdAt: z.string(),
	updatedAt: z.string(),
});
export type CanvasEdge = z.infer<typeof CanvasEdgeSchema>;

/** 打开画布 / 创建成功时返回的完整文档（时间戳为 ISO 8601） */
export const CanvasDtoSchema = z.object({
	id: z.string().min(1),
	ownerId: z.string().min(1),
	name: z.string().min(1),
	viewport: CanvasViewportSchema,
	nodes: z.array(CanvasNodeSchema),
	edges: z.array(CanvasEdgeSchema),
	/** 是否在拖动节点时吸附到画布网格。 */
	snapToGrid: z.boolean(),
	schemaVersion: z.number().int().min(1),
	revision: z.number().int().min(1),
	createdAt: z.string(),
	updatedAt: z.string(),
});
export type CanvasDto = z.infer<typeof CanvasDtoSchema>;

/** 列表项：只有信封，没有图 */
export const CanvasListItemSchema = CanvasDtoSchema.omit({
	viewport: true,
	nodes: true,
	edges: true,
	snapToGrid: true,
});
export type CanvasListItem = z.infer<typeof CanvasListItemSchema>;

export const DEFAULT_CANVAS_NAME = "未命名画布";
export const CANVAS_NAME_MAX_LENGTH = 100;
export const CURRENT_CANVAS_SCHEMA_VERSION = 1;
export const EMPTY_CANVAS_VIEWPORT: CanvasViewport = { x: 0, y: 0, zoom: 1 };

export const DEFAULT_NODE_SIZE = {
	text: { width: 280, height: 160 },
	image: { width: 320, height: 180 },
	video: { width: 480, height: 270 },
} as const satisfies Record<CanvasNodeType, { width: number; height: number }>;

export const CreateCanvasBodySchema = z.object({
	name: z.string().trim().max(CANVAS_NAME_MAX_LENGTH).optional(),
});
export type CreateCanvasBody = z.infer<typeof CreateCanvasBodySchema>;

export const CreateCanvasResponseSchema = z.object({
	canvas: CanvasDtoSchema,
});
export type CreateCanvasResponse = z.infer<typeof CreateCanvasResponseSchema>;

/** 画布编辑偏好单独保存，避免把临时 UI 状态（如小地图开关）写入服务端。 */
export const UpdateCanvasSettingsBodySchema = z.object({
	snapToGrid: z.boolean(),
});
export type UpdateCanvasSettingsBody = z.infer<
	typeof UpdateCanvasSettingsBodySchema
>;

export const ListCanvasesQuerySchema = z.object({
	keyword: z.string().max(CANVAS_NAME_MAX_LENGTH).optional(),
	sortBy: z.enum(["createdAt", "updatedAt"]).optional().default("updatedAt"),
	order: z.enum(["asc", "desc"]).optional().default("desc"),
	page: z.coerce.number().int().min(1).optional().default(1),
	pageSize: z.coerce.number().int().min(1).max(50).optional().default(20),
});
export type ListCanvasesQuery = z.infer<typeof ListCanvasesQuerySchema>;

export const ListCanvasesResponseSchema = z.object({
	canvases: z.array(CanvasListItemSchema),
	total: z.number().int().min(0),
	page: z.number().int().min(1),
	pageSize: z.number().int().min(1),
});
export type ListCanvasesResponse = z.infer<typeof ListCanvasesResponseSchema>;

export const CanvasIdParamSchema = z.object({
	id: z.string().min(1),
});
export type CanvasIdParam = z.infer<typeof CanvasIdParamSchema>;

export const GetCanvasResponseSchema = z.object({
	canvas: CanvasDtoSchema,
});
export type GetCanvasResponse = z.infer<typeof GetCanvasResponseSchema>;

export const UpdateCanvasSettingsResponseSchema = z.object({
	canvas: CanvasDtoSchema,
});
export type UpdateCanvasSettingsResponse = z.infer<
	typeof UpdateCanvasSettingsResponseSchema
>;

export const DeleteCanvasResponseSchema = z.object({
	id: z.string().min(1),
});
export type DeleteCanvasResponse = z.infer<typeof DeleteCanvasResponseSchema>;
