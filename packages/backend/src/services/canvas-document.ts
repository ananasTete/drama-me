import {
	CURRENT_CANVAS_SCHEMA_VERSION,
	type CanvasDto,
	CanvasDtoSchema,
	type CanvasMetadata,
	ERROR_CODE,
} from "@drama-me/shared";
import { asc, eq, lt } from "drizzle-orm";
import type { DB } from "../db";
import { canvas, canvasEdge, canvasMutation, canvasNode } from "../db/schema";
import { AppError } from "../lib/app-error";

const CANVAS_MUTATION_RETENTION_DAYS = 7;

type CanvasRow = typeof canvas.$inferSelect;
type CanvasNodeRow = typeof canvasNode.$inferSelect;
type CanvasEdgeRow = typeof canvasEdge.$inferSelect;
type CanvasDocumentCandidate = Omit<CanvasDto, "nodes" | "schemaVersion"> & {
	nodes: unknown[];
	schemaVersion: number;
};

export function toIso(date: Date): string {
	return date.toISOString();
}

/**
 * 旧版本先升级成当前 DTO，再执行严格校验。版本 1 → 2 只改变了数据库存储方式，
 * 对外节点数据结构没有变化；未来版本的数据变换继续在这里逐版追加。
 */
function migrateCanvasDocument(
	document: CanvasDocumentCandidate,
): CanvasDocumentCandidate {
	switch (document.schemaVersion) {
		case 1:
			return { ...document, schemaVersion: 2 };
		case CURRENT_CANVAS_SCHEMA_VERSION:
			return document;
		default:
			throw new AppError(
				ERROR_CODE.CANVAS_SCHEMA_VERSION_UNSUPPORTED,
				409,
				"Canvas schema version is not supported",
				{
					canvasId: document.id,
					schemaVersion: document.schemaVersion,
					supportedVersion: CURRENT_CANVAS_SCHEMA_VERSION,
				},
			);
	}
}

export function toCanvasDto(
	row: CanvasRow,
	nodeRows: CanvasNodeRow[],
	edgeRows: CanvasEdgeRow[],
): CanvasDto {
	const document = migrateCanvasDocument({
		id: row.id,
		ownerId: row.ownerId,
		name: row.name,
		viewport: row.viewport,
		nodes: nodeRows.map((node) => ({
			id: node.id,
			type: node.type,
			position: { x: node.positionX, y: node.positionY },
			width: node.width,
			height: node.height,
			zIndex: node.zIndex,
			locked: node.locked,
			data: node.data,
		})),
		edges: edgeRows.map((edge) => ({
			id: edge.id,
			source: edge.sourceNodeId,
			target: edge.targetNodeId,
			sourceHandle: edge.sourceHandle,
			targetHandle: edge.targetHandle,
			type: edge.type,
		})),
		snapToGrid: row.snapToGrid,
		schemaVersion: row.schemaVersion,
		revision: row.revision,
		createdAt: toIso(row.createdAt),
		updatedAt: toIso(row.updatedAt),
	});
	const result = CanvasDtoSchema.safeParse(document);

	if (!result.success) {
		const issue = result.error.issues[0];
		const nodeIndex = issue?.path[0] === "nodes" ? issue.path[1] : undefined;
		const edgeIndex = issue?.path[0] === "edges" ? issue.path[1] : undefined;
		throw new AppError(
			ERROR_CODE.CANVAS_DOCUMENT_INVALID,
			500,
			"Canvas data is invalid",
			{
				canvasId: row.id,
				path: issue?.path.map(String).join("."),
				...(typeof nodeIndex === "number"
					? { nodeId: nodeRows[nodeIndex]?.id }
					: {}),
				...(typeof edgeIndex === "number"
					? { edgeId: edgeRows[edgeIndex]?.id }
					: {}),
			},
		);
	}

	return result.data;
}

export async function loadCanvasDto(
	database: DB,
	row: CanvasRow,
): Promise<CanvasDto> {
	const [nodes, edges] = await Promise.all([
		database
			.select()
			.from(canvasNode)
			.where(eq(canvasNode.canvasId, row.id))
			.orderBy(asc(canvasNode.zIndex), asc(canvasNode.id)),
		database
			.select()
			.from(canvasEdge)
			.where(eq(canvasEdge.canvasId, row.id))
			.orderBy(asc(canvasEdge.id)),
	]);

	return toCanvasDto(row, nodes, edges);
}

export function toCanvasMetadata(row: CanvasRow): CanvasMetadata {
	return {
		id: row.id,
		name: row.name,
		snapToGrid: row.snapToGrid,
		updatedAt: toIso(row.updatedAt),
	};
}

export function toLikeContainsPattern(keyword: string): string {
	const escaped = keyword
		.replaceAll("\\", "\\\\")
		.replaceAll("%", "\\%")
		.replaceAll("_", "\\_");
	return `%${escaped}%`;
}

export function removeExpiredCanvasMutationReceipts(database: DB): void {
	const cutoff = new Date(
		Date.now() - CANVAS_MUTATION_RETENTION_DAYS * 24 * 60 * 60 * 1000,
	);
	database
		.delete(canvasMutation)
		.where(lt(canvasMutation.createdAt, cutoff))
		.run();
}
