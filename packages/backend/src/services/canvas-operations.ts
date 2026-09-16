import {
	type ApplyCanvasOperationsBody,
	type ApplyCanvasOperationsResponse,
	ERROR_CODE,
} from "@drama-me/shared";
import { and, eq, sql } from "drizzle-orm";
import type { DB } from "../db";
import { canvas, canvasEdge, canvasMutation, canvasNode } from "../db/schema";
import { AppError } from "../lib/app-error";

function hashMutation(body: ApplyCanvasOperationsBody): string {
	// body 已经过 Zod 解析，键顺序由共享 Schema 固定；同一请求重试会得到相同哈希。
	return new Bun.CryptoHasher("sha256")
		.update(JSON.stringify(body))
		.digest("hex");
}

function assertUniqueOperationTargets(
	operations: ApplyCanvasOperationsBody["operations"],
) {
	const targets = new Set<string>();

	for (const [index, operation] of operations.entries()) {
		const target =
			operation.type === "node.create"
				? `node:${operation.node.id}`
				: operation.type === "node.update" || operation.type === "node.delete"
					? `node:${operation.nodeId}`
					: operation.type === "edge.create"
						? `edge:${operation.edge.id}`
						: `edge:${operation.edgeId}`;

		if (targets.has(target)) {
			throw new AppError(
				ERROR_CODE.CANVAS_OPERATION_TARGET_DUPLICATED,
				409,
				"A batch cannot mutate the same target more than once",
				{ index, type: operation.type, target },
			);
		}
		targets.add(target);
	}
}

export function applyCanvasOperations(
	database: DB,
	ownerId: string,
	canvasId: string,
	body: ApplyCanvasOperationsBody,
): ApplyCanvasOperationsResponse {
	assertUniqueOperationTargets(body.operations);
	const requestHash = hashMutation(body);

	return database.transaction(
		(tx) => {
			const currentCanvas = tx
				.select({ id: canvas.id, revision: canvas.revision })
				.from(canvas)
				.where(and(eq(canvas.id, canvasId), eq(canvas.ownerId, ownerId)))
				.get();

			if (!currentCanvas) {
				throw new AppError(
					ERROR_CODE.CANVAS_NOT_FOUND,
					404,
					"Canvas not found",
				);
			}

			const receipt = tx
				.select()
				.from(canvasMutation)
				.where(eq(canvasMutation.mutationId, body.mutationId))
				.get();

			if (receipt) {
				if (
					receipt.canvasId !== canvasId ||
					receipt.requestHash !== requestHash
				) {
					throw new AppError(
						ERROR_CODE.CANVAS_MUTATION_ID_REUSED,
						409,
						"Mutation id has already been used for a different request",
					);
				}

				return {
					mutationId: receipt.mutationId,
					revision: receipt.resultingRevision,
				};
			}

			const revisionResult = tx
				.update(canvas)
				.set({
					revision: sql`${canvas.revision} + 1`,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(canvas.id, canvasId),
						eq(canvas.ownerId, ownerId),
						eq(canvas.revision, body.baseRevision),
					),
				)
				.returning({ revision: canvas.revision })
				.get();

			if (!revisionResult) {
				throw new AppError(
					ERROR_CODE.CANVAS_REVISION_CONFLICT,
					409,
					"Canvas has been modified",
					{ currentRevision: currentCanvas.revision },
				);
			}

			for (const [index, operation] of body.operations.entries()) {
				try {
					switch (operation.type) {
						case "node.create": {
							const existing = tx
								.select({ id: canvasNode.id })
								.from(canvasNode)
								.where(eq(canvasNode.id, operation.node.id))
								.get();
							if (existing) {
								throw new AppError(
									ERROR_CODE.CANVAS_NODE_ALREADY_EXISTS,
									409,
									"Canvas node already exists",
								);
							}

							tx.insert(canvasNode)
								.values({
									id: operation.node.id,
									canvasId,
									type: operation.node.type,
									positionX: operation.node.position.x,
									positionY: operation.node.position.y,
									width: operation.node.width,
									height: operation.node.height,
									zIndex: operation.node.zIndex,
									locked: operation.node.locked,
									data: operation.node.data,
								})
								.run();
							break;
						}

						case "node.update": {
							const existing = tx
								.select({ type: canvasNode.type })
								.from(canvasNode)
								.where(
									and(
										eq(canvasNode.id, operation.nodeId),
										eq(canvasNode.canvasId, canvasId),
									),
								)
								.get();

							if (!existing) {
								throw new AppError(
									ERROR_CODE.CANVAS_NODE_NOT_FOUND,
									409,
									"Canvas node not found",
								);
							}
							if (existing.type !== operation.nodeType) {
								throw new AppError(
									ERROR_CODE.CANVAS_NODE_TYPE_MISMATCH,
									409,
									"Canvas node type does not match",
								);
							}

							const values: Partial<typeof canvasNode.$inferInsert> = {};
							if (operation.changes.position !== undefined) {
								values.positionX = operation.changes.position.x;
								values.positionY = operation.changes.position.y;
							}
							if (operation.changes.width !== undefined) {
								values.width = operation.changes.width;
							}
							if (operation.changes.height !== undefined) {
								values.height = operation.changes.height;
							}
							if (operation.changes.zIndex !== undefined) {
								values.zIndex = operation.changes.zIndex;
							}
							if (operation.changes.locked !== undefined) {
								values.locked = operation.changes.locked;
							}
							if (operation.changes.data !== undefined) {
								values.data = operation.changes.data;
							}

							tx.update(canvasNode)
								.set(values)
								.where(
									and(
										eq(canvasNode.id, operation.nodeId),
										eq(canvasNode.canvasId, canvasId),
									),
								)
								.run();
							break;
						}

						case "node.delete": {
							const deleted = tx
								.delete(canvasNode)
								.where(
									and(
										eq(canvasNode.id, operation.nodeId),
										eq(canvasNode.canvasId, canvasId),
									),
								)
								.returning({ id: canvasNode.id })
								.get();
							if (!deleted) {
								throw new AppError(
									ERROR_CODE.CANVAS_NODE_NOT_FOUND,
									409,
									"Canvas node not found",
								);
							}
							break;
						}

						case "edge.create": {
							const existing = tx
								.select({ id: canvasEdge.id })
								.from(canvasEdge)
								.where(eq(canvasEdge.id, operation.edge.id))
								.get();
							if (existing) {
								throw new AppError(
									ERROR_CODE.CANVAS_EDGE_ALREADY_EXISTS,
									409,
									"Canvas edge already exists",
								);
							}

							const source = tx
								.select({ id: canvasNode.id })
								.from(canvasNode)
								.where(
									and(
										eq(canvasNode.id, operation.edge.source),
										eq(canvasNode.canvasId, canvasId),
									),
								)
								.get();
							const target = tx
								.select({ id: canvasNode.id })
								.from(canvasNode)
								.where(
									and(
										eq(canvasNode.id, operation.edge.target),
										eq(canvasNode.canvasId, canvasId),
									),
								)
								.get();

							if (!source || !target) {
								throw new AppError(
									ERROR_CODE.CANVAS_EDGE_INVALID_ENDPOINT,
									422,
									"Canvas edge endpoint is invalid",
								);
							}

							tx.insert(canvasEdge)
								.values({
									id: operation.edge.id,
									canvasId,
									sourceNodeId: operation.edge.source,
									targetNodeId: operation.edge.target,
									sourceHandle: operation.edge.sourceHandle,
									targetHandle: operation.edge.targetHandle,
									type: operation.edge.type,
								})
								.run();
							break;
						}

						case "edge.delete": {
							const deleted = tx
								.delete(canvasEdge)
								.where(
									and(
										eq(canvasEdge.id, operation.edgeId),
										eq(canvasEdge.canvasId, canvasId),
									),
								)
								.returning({ id: canvasEdge.id })
								.get();
							if (!deleted) {
								throw new AppError(
									ERROR_CODE.CANVAS_EDGE_NOT_FOUND,
									409,
									"Canvas edge not found",
								);
							}
							break;
						}
					}
				} catch (error) {
					if (!(error instanceof AppError)) throw error;

					const target =
						operation.type === "node.create"
							? { nodeId: operation.node.id }
							: operation.type === "node.update" ||
									operation.type === "node.delete"
								? { nodeId: operation.nodeId }
								: operation.type === "edge.create"
									? { edgeId: operation.edge.id }
									: { edgeId: operation.edgeId };

					throw new AppError(error.code, error.status, error.message, {
						index,
						type: operation.type,
						...target,
					});
				}
			}

			tx.insert(canvasMutation)
				.values({
					mutationId: body.mutationId,
					canvasId,
					requestHash,
					baseRevision: body.baseRevision,
					resultingRevision: revisionResult.revision,
					createdAt: new Date(),
				})
				.run();

			return {
				mutationId: body.mutationId,
				revision: revisionResult.revision,
			};
		},
		{ behavior: "immediate" },
	);
}
