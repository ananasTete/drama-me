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

/** 节点内容的来源：由模型生成，或由用户上传。 */
export const CanvasNodeSourceTypeSchema = z.enum(["generate", "upload"]);
export type CanvasNodeSourceType = z.infer<typeof CanvasNodeSourceTypeSchema>;

export const CanvasTextNodeDataSchema = z.object({
	title: z.string(),
	content: z.string(),
	type: CanvasNodeSourceTypeSchema,
	prompt: z.string(),
	params: z.object({
		model: z.string(),
	}),
});
export type CanvasTextNodeData = z.infer<typeof CanvasTextNodeDataSchema>;

export const CanvasImageNodeDataSchema = z.object({
	title: z.string(),
	src: z.string(),
	type: CanvasNodeSourceTypeSchema,
	prompt: z.string(),
	params: z.object({
		model: z.string(),
		// 可选值由具体模型的能力配置决定，共享数据层暂不写死枚举。
		aspectRatio: z.string(),
		imageSize: z.string(),
		generate_count: z.number().int().positive(),
	}),
});
export type CanvasImageNodeData = z.infer<typeof CanvasImageNodeDataSchema>;

export const CanvasVideoNodeDataSchema = z.object({
	title: z.string(),
	src: z.string(),
	type: CanvasNodeSourceTypeSchema,
	prompt: z.string(),
	params: z.object({
		model: z.string(),
		duration: z.number().positive(),
		// 可选值由具体模型的能力配置决定，共享数据层暂不写死枚举。
		aspectRatio: z.string(),
		resolution: z.string(),
	}),
});
export type CanvasVideoNodeData = z.infer<typeof CanvasVideoNodeDataSchema>;

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
	zoom: z.number().positive(),
});
export type CanvasViewport = z.infer<typeof CanvasViewportSchema>;

const canvasNodeBaseSchema = {
	id: z.string().uuid(),
	position: CanvasPositionSchema,
	width: z.number().positive(),
	height: z.number().positive(),
	zIndex: z.number().int(),
	locked: z.boolean(),
};

export const CanvasNodeSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("text"),
		...canvasNodeBaseSchema,
		data: CanvasTextNodeDataSchema,
	}),
	z.object({
		type: z.literal("video"),
		...canvasNodeBaseSchema,
		data: CanvasVideoNodeDataSchema,
	}),
	z.object({
		type: z.literal("image"),
		...canvasNodeBaseSchema,
		data: CanvasImageNodeDataSchema,
	}),
]);
export type CanvasNode = z.infer<typeof CanvasNodeSchema>;
export type CanvasTextNode = Extract<CanvasNode, { type: "text" }>;
export type CanvasVideoNode = Extract<CanvasNode, { type: "video" }>;
export type CanvasImageNode = Extract<CanvasNode, { type: "image" }>;

export const CanvasEdgeSchema = z.object({
	id: z.string().uuid(),
	source: z.string().uuid(),
	target: z.string().uuid(),
	sourceHandle: CanvasHandleIdSchema,
	targetHandle: CanvasHandleIdSchema,
	type: CanvasEdgeTypeSchema,
});
export type CanvasEdge = z.infer<typeof CanvasEdgeSchema>;

const canvasNodeCommonChangesSchema = z.object({
	position: CanvasPositionSchema.optional(),
	width: z.number().positive().optional(),
	height: z.number().positive().optional(),
	zIndex: z.number().int().optional(),
	locked: z.boolean().optional(),
});
export type CanvasNodeCommonChanges = z.infer<
	typeof canvasNodeCommonChangesSchema
>;

function requireChanges<T extends z.ZodRawShape>(shape: T) {
	return canvasNodeCommonChangesSchema
		.extend(shape)
		.refine((changes) => Object.keys(changes).length > 0, {
			message: "At least one node change is required",
		});
}

export const CanvasNodeCreateOperationSchema = z.object({
	type: z.literal("node.create"),
	node: CanvasNodeSchema,
});
export type CanvasNodeCreateOperation = z.infer<
	typeof CanvasNodeCreateOperationSchema
>;

export const CanvasNodeUpdateOperationSchema = z.discriminatedUnion(
	"nodeType",
	[
		z.object({
			type: z.literal("node.update"),
			nodeId: z.string().uuid(),
			nodeType: z.literal("text"),
			changes: requireChanges({ data: CanvasTextNodeDataSchema.optional() }),
		}),
		z.object({
			type: z.literal("node.update"),
			nodeId: z.string().uuid(),
			nodeType: z.literal("image"),
			changes: requireChanges({ data: CanvasImageNodeDataSchema.optional() }),
		}),
		z.object({
			type: z.literal("node.update"),
			nodeId: z.string().uuid(),
			nodeType: z.literal("video"),
			changes: requireChanges({ data: CanvasVideoNodeDataSchema.optional() }),
		}),
	],
);
export type CanvasNodeUpdateOperation = z.infer<
	typeof CanvasNodeUpdateOperationSchema
>;

export const CanvasNodeDeleteOperationSchema = z.object({
	type: z.literal("node.delete"),
	nodeId: z.string().uuid(),
});
export type CanvasNodeDeleteOperation = z.infer<
	typeof CanvasNodeDeleteOperationSchema
>;

export const CanvasEdgeCreateOperationSchema = z.object({
	type: z.literal("edge.create"),
	edge: CanvasEdgeSchema,
});
export type CanvasEdgeCreateOperation = z.infer<
	typeof CanvasEdgeCreateOperationSchema
>;

export const CanvasEdgeDeleteOperationSchema = z.object({
	type: z.literal("edge.delete"),
	edgeId: z.string().uuid(),
});
export type CanvasEdgeDeleteOperation = z.infer<
	typeof CanvasEdgeDeleteOperationSchema
>;

export const CanvasOperationSchema = z.union([
	CanvasNodeCreateOperationSchema,
	CanvasNodeUpdateOperationSchema,
	CanvasNodeDeleteOperationSchema,
	CanvasEdgeCreateOperationSchema,
	CanvasEdgeDeleteOperationSchema,
]);
export type CanvasOperation = z.infer<typeof CanvasOperationSchema>;

export const MAX_CANVAS_OPERATIONS_PER_REQUEST = 500;

export const ApplyCanvasOperationsBodySchema = z.object({
	mutationId: z.string().uuid(),
	baseRevision: z.number().int().min(1),
	operations: z
		.array(CanvasOperationSchema)
		.min(1)
		.max(MAX_CANVAS_OPERATIONS_PER_REQUEST),
});
export type ApplyCanvasOperationsBody = z.infer<
	typeof ApplyCanvasOperationsBodySchema
>;

export const ApplyCanvasOperationsResponseSchema = z.object({
	mutationId: z.string().uuid(),
	revision: z.number().int().min(1),
});
export type ApplyCanvasOperationsResponse = z.infer<
	typeof ApplyCanvasOperationsResponseSchema
>;

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
export const CURRENT_CANVAS_SCHEMA_VERSION = 2;
export const EMPTY_CANVAS_VIEWPORT: CanvasViewport = { x: 0, y: 0, zoom: 1 };

export const DEFAULT_NODE_SIZE = {
	text: { width: 250, height: 250 },
	image: { width: 250, height: 250 },
	video: { width: 250, height: 250 },
} as const satisfies Record<CanvasNodeType, { width: number; height: number }>;

export const CreateCanvasBodySchema = z.object({
	name: z.string().trim().min(1).max(CANVAS_NAME_MAX_LENGTH).optional(),
});
export type CreateCanvasBody = z.infer<typeof CreateCanvasBodySchema>;

export const CreateCanvasResponseSchema = z.object({
	canvas: CanvasDtoSchema,
});
export type CreateCanvasResponse = z.infer<typeof CreateCanvasResponseSchema>;

/** 画布编辑偏好单独保存，避免把临时 UI 状态（如小地图开关）写入服务端。 */
export const UpdateCanvasMetadataBodySchema = z
	.object({
		name: z.string().trim().min(1).max(CANVAS_NAME_MAX_LENGTH).optional(),
		snapToGrid: z.boolean().optional(),
	})
	.refine((body) => body.name !== undefined || body.snapToGrid !== undefined, {
		message: "At least one canvas metadata change is required",
	});
export type UpdateCanvasMetadataBody = z.infer<
	typeof UpdateCanvasMetadataBodySchema
>;

export const CanvasMetadataSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	snapToGrid: z.boolean(),
	updatedAt: z.string(),
});
export type CanvasMetadata = z.infer<typeof CanvasMetadataSchema>;

export const UpdateCanvasMetadataResponseSchema = z.object({
	canvas: CanvasMetadataSchema,
});
export type UpdateCanvasMetadataResponse = z.infer<
	typeof UpdateCanvasMetadataResponseSchema
>;

export const UpdateCanvasViewportResponseSchema = z.object({
	viewport: CanvasViewportSchema,
});
export type UpdateCanvasViewportResponse = z.infer<
	typeof UpdateCanvasViewportResponseSchema
>;

/** 列表游标格式：`排序时间的毫秒值:画布 ID`。 */
export const CanvasListCursorSchema = z.string().refine(
	(cursor) => {
		const separatorIndex = cursor.indexOf(":");
		if (separatorIndex <= 0 || separatorIndex === cursor.length - 1) {
			return false;
		}

		const timestamp = Number(cursor.slice(0, separatorIndex));
		return (
			Number.isSafeInteger(timestamp) &&
			!Number.isNaN(new Date(timestamp).getTime())
		);
	},
	{ message: "Invalid canvas list cursor" },
);
export type CanvasListCursor = z.infer<typeof CanvasListCursorSchema>;

export const ListCanvasesQuerySchema = z.object({
	keyword: z.string().max(CANVAS_NAME_MAX_LENGTH).optional(),
	sortBy: z.enum(["createdAt", "updatedAt"]).optional().default("updatedAt"),
	limit: z.coerce.number().int().min(1).max(50).optional().default(20),
	cursor: CanvasListCursorSchema.optional(),
});
export type ListCanvasesQuery = z.infer<typeof ListCanvasesQuerySchema>;

export const ListCanvasesResponseSchema = z.object({
	canvases: z.array(CanvasListItemSchema),
	nextCursor: CanvasListCursorSchema.nullable(),
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

export const DeleteCanvasResponseSchema = z.object({
	id: z.string().min(1),
});
export type DeleteCanvasResponse = z.infer<typeof DeleteCanvasResponseSchema>;
