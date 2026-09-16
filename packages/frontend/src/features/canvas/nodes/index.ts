import type { NodeTypes } from "@xyflow/react";
import { CanvasPlaceholderNode } from "./canvas-placeholder-node";

export const canvasNodeTypes = {
	text: CanvasPlaceholderNode,
	image: CanvasPlaceholderNode,
	video: CanvasPlaceholderNode,
} satisfies NodeTypes;

export type { CanvasFlowNode } from "./canvas-placeholder-node";
