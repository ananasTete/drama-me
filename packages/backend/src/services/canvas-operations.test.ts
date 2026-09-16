import { Database } from "bun:sqlite";
import {
	type ApplyCanvasOperationsBody,
	ERROR_CODE,
	type ErrorCode,
} from "@drama-me/shared";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sqlite";
import type { DB } from "../db";
import * as schema from "../db/schema";
import { canvas, canvasEdge, canvasMutation, canvasNode } from "../db/schema";
import { AppError } from "../lib/app-error";
import { applyCanvasOperations } from "./canvas-operations";

const OWNER_ID = "owner-1";
const CANVAS_ID = "canvas-1";
const NODE_ID = "00000000-0000-4000-8000-000000000001";
const SECOND_NODE_ID = "00000000-0000-4000-8000-000000000002";
const EDGE_ID = "00000000-0000-4000-8000-000000000003";

let sqlite: Database;
let database: DB;

function createTestDatabase(): DB {
	sqlite = new Database(":memory:");
	sqlite.exec("PRAGMA foreign_keys = ON;");
	sqlite.exec(`
		CREATE TABLE user (id text PRIMARY KEY NOT NULL);
		CREATE TABLE canvas (
			id text PRIMARY KEY NOT NULL,
			ownerId text NOT NULL REFERENCES user(id) ON DELETE CASCADE,
			name text NOT NULL,
			viewport text NOT NULL,
			snapToGrid integer NOT NULL,
			schemaVersion integer NOT NULL,
			revision integer NOT NULL,
			createdAt integer NOT NULL,
			updatedAt integer NOT NULL
		);
		CREATE TABLE canvasNode (
			id text PRIMARY KEY NOT NULL,
			canvasId text NOT NULL REFERENCES canvas(id) ON DELETE CASCADE,
			type text NOT NULL,
			positionX real NOT NULL,
			positionY real NOT NULL,
			width real NOT NULL,
			height real NOT NULL,
			zIndex integer NOT NULL,
			locked integer NOT NULL,
			data text NOT NULL
		);
		CREATE UNIQUE INDEX canvasNode_canvasId_id_unique
			ON canvasNode(canvasId, id);
		CREATE TABLE canvasEdge (
			id text PRIMARY KEY NOT NULL,
			canvasId text NOT NULL REFERENCES canvas(id) ON DELETE CASCADE,
			sourceNodeId text NOT NULL,
			targetNodeId text NOT NULL,
			sourceHandle text NOT NULL,
			targetHandle text NOT NULL,
			type text NOT NULL,
			FOREIGN KEY (canvasId, sourceNodeId)
				REFERENCES canvasNode(canvasId, id) ON DELETE CASCADE,
			FOREIGN KEY (canvasId, targetNodeId)
				REFERENCES canvasNode(canvasId, id) ON DELETE CASCADE
		);
		CREATE TABLE canvasMutation (
			mutationId text PRIMARY KEY NOT NULL,
			canvasId text NOT NULL REFERENCES canvas(id) ON DELETE CASCADE,
			requestHash text NOT NULL,
			baseRevision integer NOT NULL,
			resultingRevision integer NOT NULL,
			createdAt integer NOT NULL
		);
	`);

	const result = drizzle(sqlite, { schema });
	sqlite.exec(`INSERT INTO user (id) VALUES ('${OWNER_ID}')`);
	result
		.insert(canvas)
		.values({
			id: CANVAS_ID,
			ownerId: OWNER_ID,
			name: "Test canvas",
			viewport: { x: 0, y: 0, zoom: 1 },
			snapToGrid: false,
			schemaVersion: 2,
			revision: 1,
			createdAt: new Date(0),
			updatedAt: new Date(0),
		})
		.run();
	return result;
}

function createTextNodeOperation(
	mutationId: string,
	nodeId = NODE_ID,
): ApplyCanvasOperationsBody {
	return {
		mutationId,
		baseRevision: 1,
		operations: [
			{
				type: "node.create",
				node: {
					id: nodeId,
					type: "text",
					position: { x: 0, y: 0 },
					width: 250,
					height: 250,
					zIndex: 1,
					locked: false,
					data: {
						title: "",
						content: "",
						type: "generate",
						prompt: "",
						params: { model: "" },
					},
				},
			},
		],
	};
}

function expectAppError(run: () => unknown, code: ErrorCode): AppError {
	try {
		run();
	} catch (error) {
		expect(error).toBeInstanceOf(AppError);
		if (error instanceof AppError) {
			expect(error.code).toBe(code);
			return error;
		}
	}
	throw new Error(`Expected AppError ${code}`);
}

function insertTextNode(id: string): void {
	database
		.insert(canvasNode)
		.values({
			id,
			canvasId: CANVAS_ID,
			type: "text",
			positionX: 0,
			positionY: 0,
			width: 250,
			height: 250,
			zIndex: 1,
			locked: false,
			data: {
				title: "",
				content: "",
				type: "generate",
				prompt: "",
				params: { model: "" },
			},
		})
		.run();
}

beforeEach(() => {
	database = createTestDatabase();
});

afterEach(() => {
	sqlite.close();
});

describe("applyCanvasOperations", () => {
	test("replays the same mutation without executing it twice", () => {
		const body = createTextNodeOperation(
			"00000000-0000-4000-8000-000000000010",
		);

		expect(applyCanvasOperations(database, OWNER_ID, CANVAS_ID, body)).toEqual({
			mutationId: body.mutationId,
			revision: 2,
		});
		expect(applyCanvasOperations(database, OWNER_ID, CANVAS_ID, body)).toEqual({
			mutationId: body.mutationId,
			revision: 2,
		});
		expect(database.select().from(canvasNode).all()).toHaveLength(1);
		expect(database.select().from(canvasMutation).all()).toHaveLength(1);
	});

	test("rejects reusing a mutation id for a different request", () => {
		const mutationId = "00000000-0000-4000-8000-000000000011";
		applyCanvasOperations(
			database,
			OWNER_ID,
			CANVAS_ID,
			createTextNodeOperation(mutationId),
		);

		expectAppError(
			() =>
				applyCanvasOperations(
					database,
					OWNER_ID,
					CANVAS_ID,
					createTextNodeOperation(mutationId, SECOND_NODE_ID),
				),
			ERROR_CODE.CANVAS_MUTATION_ID_REUSED,
		);
	});

	test("keeps the revision unchanged when the base revision is stale", () => {
		const body = createTextNodeOperation(
			"00000000-0000-4000-8000-000000000012",
		);
		body.baseRevision = 2;

		expectAppError(
			() => applyCanvasOperations(database, OWNER_ID, CANVAS_ID, body),
			ERROR_CODE.CANVAS_REVISION_CONFLICT,
		);
		expect(
			database.select({ revision: canvas.revision }).from(canvas).get(),
		).toEqual({ revision: 1 });
	});

	test("deleting a node cascades to its connected edges", () => {
		insertTextNode(NODE_ID);
		insertTextNode(SECOND_NODE_ID);
		database
			.insert(canvasEdge)
			.values({
				id: EDGE_ID,
				canvasId: CANVAS_ID,
				sourceNodeId: NODE_ID,
				targetNodeId: SECOND_NODE_ID,
				sourceHandle: "right",
				targetHandle: "left",
				type: "default",
			})
			.run();

		applyCanvasOperations(database, OWNER_ID, CANVAS_ID, {
			mutationId: "00000000-0000-4000-8000-000000000013",
			baseRevision: 1,
			operations: [{ type: "node.delete", nodeId: NODE_ID }],
		});

		expect(database.select().from(canvasEdge).all()).toHaveLength(0);
	});

	test("rejects duplicate targets before changing the revision", () => {
		insertTextNode(NODE_ID);
		const error = expectAppError(
			() =>
				applyCanvasOperations(database, OWNER_ID, CANVAS_ID, {
					mutationId: "00000000-0000-4000-8000-000000000014",
					baseRevision: 1,
					operations: [
						{ type: "node.delete", nodeId: NODE_ID },
						{ type: "node.delete", nodeId: NODE_ID },
					],
				}),
			ERROR_CODE.CANVAS_OPERATION_TARGET_DUPLICATED,
		);

		expect(error.details).toEqual({
			index: 1,
			type: "node.delete",
			target: `node:${NODE_ID}`,
		});
		expect(
			database.select({ revision: canvas.revision }).from(canvas).get(),
		).toEqual({ revision: 1 });
	});

	test("identifies the operation that caused a batch failure", () => {
		const error = expectAppError(
			() =>
				applyCanvasOperations(database, OWNER_ID, CANVAS_ID, {
					mutationId: "00000000-0000-4000-8000-000000000015",
					baseRevision: 1,
					operations: [{ type: "node.delete", nodeId: NODE_ID }],
				}),
			ERROR_CODE.CANVAS_NODE_NOT_FOUND,
		);

		expect(error.details).toEqual({
			index: 0,
			type: "node.delete",
			nodeId: NODE_ID,
		});
		expect(
			database.select({ revision: canvas.revision }).from(canvas).get(),
		).toEqual({ revision: 1 });
	});
});
