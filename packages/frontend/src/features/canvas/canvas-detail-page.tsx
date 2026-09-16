import { useParams } from "@tanstack/react-router";
import {
	Background,
	BackgroundVariant,
	ReactFlow,
	ReactFlowProvider,
	applyNodeChanges,
	type NodeChange,
	type OnNodeDrag,
	useReactFlow,
} from "@xyflow/react";
import {
	type CanvasEdge,
	DEFAULT_NODE_SIZE,
	type CanvasNode,
	type CanvasNodeType,
	type CanvasOperation,
} from "@drama-me/shared";
import { useEffect, useState } from "react";
import { CanvasCreateNodeMenu } from "./components/canvas-create-node-menu";
import { CanvasPositioningPanel } from "./components/canvas-positioning-panel";
import {
	useApplyCanvasOperations,
	useCanvas,
	useUpdateCanvasViewport,
} from "./hooks";
import { canvasNodeTypes, type CanvasFlowNode } from "./nodes";

const CANVAS_GRID_SIZE = 20;

type CreateMenuState = {
	clientX: number;
	clientY: number;
	flowPosition: { x: number; y: number };
};

function toFlowNodes(nodes: CanvasNode[]): CanvasFlowNode[] {
	return nodes.map((node) => ({
		id: node.id,
		type: node.type,
		position: node.position,
		width: node.width,
		height: node.height,
		zIndex: node.zIndex,
		draggable: !node.locked,
		deletable: !node.locked,
		data: { nodeType: node.type },
	}));
}

function toFlowEdges(canvasNodes: CanvasNode[], edges: CanvasEdge[]) {
	const nodeIds = new Set(canvasNodes.map((node) => node.id));
	return edges.filter(
		(edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target),
	);
}

function createNodePositionUpdate(node: CanvasFlowNode): CanvasOperation {
	switch (node.data.nodeType) {
		case "text":
			return {
				type: "node.update",
				nodeId: node.id,
				nodeType: "text",
				changes: { position: node.position },
			};
		case "image":
			return {
				type: "node.update",
				nodeId: node.id,
				nodeType: "image",
				changes: { position: node.position },
			};
		case "video":
			return {
				type: "node.update",
				nodeId: node.id,
				nodeType: "video",
				changes: { position: node.position },
			};
	}
}

function createEmptyNode(
	type: CanvasNodeType,
	position: { x: number; y: number },
	zIndex: number,
): CanvasNode {
	const common = {
		id: crypto.randomUUID(),
		position,
		...DEFAULT_NODE_SIZE[type],
		zIndex,
		locked: false,
	};

	switch (type) {
		case "text":
			return {
				...common,
				type,
				data: {
					title: "",
					content: "",
					type: "generate",
					prompt: "",
					params: { model: "" },
				},
			};
		case "image":
			return {
				...common,
				type,
				data: {
					title: "",
					src: "",
					type: "generate",
					prompt: "",
					params: {
						model: "",
						aspectRatio: "",
						imageSize: "",
						generate_count: 1,
					},
				},
			};
		case "video":
			return {
				...common,
				type,
				data: {
					title: "",
					src: "",
					type: "generate",
					prompt: "",
					params: {
						model: "",
						duration: 1,
						aspectRatio: "",
						resolution: "",
					},
				},
			};
	}
}

function CanvasDetailEditor() {
	const { canvasId } = useParams({ from: "/canvas/$canvasId" });
	const {
		data: { canvas },
	} = useCanvas(canvasId);
	const { screenToFlowPosition } = useReactFlow();
	const { submitOperations } = useApplyCanvasOperations(canvas.id);
	const { mutate: saveViewport } = useUpdateCanvasViewport(canvas.id);
	const [nodes, setNodes] = useState(() => toFlowNodes(canvas.nodes));
	const [createMenu, setCreateMenu] = useState<CreateMenuState | null>(null);

	useEffect(() => {
		setNodes(toFlowNodes(canvas.nodes));
	}, [canvas.nodes]);

	function handleNodesChange(changes: NodeChange<CanvasFlowNode>[]) {
		setNodes((currentNodes) => applyNodeChanges(changes, currentNodes));
	}

	const handleNodeDragStop: OnNodeDrag<CanvasFlowNode> = (
		_event,
		node,
		draggedNodes,
	) => {
		const nodesToSave = draggedNodes.length > 0 ? draggedNodes : [node];
		submitOperations(nodesToSave.map(createNodePositionUpdate));
	};

	function handleCreateNode(type: CanvasNodeType) {
		if (!createMenu) return;
		const highestZIndex = canvas.nodes.reduce(
			(highest, node) => Math.max(highest, node.zIndex),
			0,
		);
		const node = createEmptyNode(
			type,
			createMenu.flowPosition,
			highestZIndex + 1,
		);
		setCreateMenu(null);
		submitOperations([{ type: "node.create", node }]);
	}

	return (
		<div className="h-dvh w-dvw">
			<ReactFlow
				defaultViewport={canvas.viewport}
				edges={toFlowEdges(canvas.nodes, canvas.edges)}
				maxZoom={4}
				minZoom={0.12}
				nodes={nodes}
				nodeTypes={canvasNodeTypes}
				snapGrid={[CANVAS_GRID_SIZE, CANVAS_GRID_SIZE]}
				snapToGrid={canvas.snapToGrid}
				onNodeClick={() => setCreateMenu(null)}
				onNodeContextMenu={() => setCreateMenu(null)}
				onNodeDragStop={handleNodeDragStop}
				onMoveEnd={(_event, viewport) => saveViewport(viewport)}
				onNodesChange={handleNodesChange}
				onNodesDelete={(deletedNodes) => {
					if (deletedNodes.length === 0) return;
					submitOperations(
						deletedNodes.map((node) => ({
							type: "node.delete",
							nodeId: node.id,
						})),
					);
				}}
				onPaneClick={() => setCreateMenu(null)}
				onPaneContextMenu={(event) => {
					event.preventDefault();
					event.stopPropagation();
					setCreateMenu({
						clientX: event.clientX,
						clientY: event.clientY,
						flowPosition: screenToFlowPosition(
							{ x: event.clientX, y: event.clientY },
							{ snapToGrid: canvas.snapToGrid },
						),
					});
				}}
			>
				<Background gap={CANVAS_GRID_SIZE} variant={BackgroundVariant.Dots} />
				<CanvasPositioningPanel
					canvasId={canvas.id}
					snapToGrid={canvas.snapToGrid}
				/>
			</ReactFlow>
			{createMenu && (
				<CanvasCreateNodeMenu
					left={createMenu.clientX}
					top={createMenu.clientY}
					onCreate={handleCreateNode}
				/>
			)}
		</div>
	);
}

function CanvasDetailPage() {
	return (
		<ReactFlowProvider>
			<CanvasDetailEditor />
		</ReactFlowProvider>
	);
}

export default CanvasDetailPage;
