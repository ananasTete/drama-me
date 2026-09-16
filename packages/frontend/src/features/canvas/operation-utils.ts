import type {
	CanvasDto,
	CanvasNode,
	CanvasNodeCommonChanges,
	CanvasOperation,
} from "@drama-me/shared";

function updateNode(
	node: CanvasNode,
	operation: Extract<CanvasOperation, { type: "node.update" }>,
): CanvasNode {
	if (node.id !== operation.nodeId || node.type !== operation.nodeType) {
		return node;
	}

	switch (operation.nodeType) {
		case "text":
			return node.type === "text" ? { ...node, ...operation.changes } : node;
		case "image":
			return node.type === "image" ? { ...node, ...operation.changes } : node;
		case "video":
			return node.type === "video" ? { ...node, ...operation.changes } : node;
	}
}

/**
 * 将一个已校验操作批次应用到本地画布。创建采用 upsert，确保服务端确认后
 * 再应用同一批次不会产生重复节点或连线。
 */
export function applyOperationsToCanvas(
	canvas: CanvasDto,
	operations: CanvasOperation[],
): CanvasDto {
	let nodes = canvas.nodes;
	let edges = canvas.edges;

	for (const operation of operations) {
		switch (operation.type) {
			case "node.create":
				nodes = [
					...nodes.filter((node) => node.id !== operation.node.id),
					operation.node,
				];
				break;
			case "node.update":
				nodes = nodes.map((node) => updateNode(node, operation));
				break;
			case "node.delete":
				nodes = nodes.filter((node) => node.id !== operation.nodeId);
				edges = edges.filter(
					(edge) =>
						edge.source !== operation.nodeId && edge.target !== operation.nodeId,
				);
				break;
			case "edge.create":
				edges = [
					...edges.filter((edge) => edge.id !== operation.edge.id),
					operation.edge,
				];
				break;
			case "edge.delete":
				edges = edges.filter((edge) => edge.id !== operation.edgeId);
				break;
		}
	}

	return { ...canvas, nodes, edges };
}

function previousCommonChanges(
	node: CanvasNode,
	changes: CanvasNodeCommonChanges,
): CanvasNodeCommonChanges {
	return {
		...(changes.position === undefined ? {} : { position: node.position }),
		...(changes.width === undefined ? {} : { width: node.width }),
		...(changes.height === undefined ? {} : { height: node.height }),
		...(changes.zIndex === undefined ? {} : { zIndex: node.zIndex }),
		...(changes.locked === undefined ? {} : { locked: node.locked }),
	};
}

function invertNodeUpdate(
	node: CanvasNode,
	operation: Extract<CanvasOperation, { type: "node.update" }>,
): CanvasOperation {
	if (node.type !== operation.nodeType) {
		throw new Error("Cannot invert an update for a different node type");
	}

	const commonChanges = previousCommonChanges(node, operation.changes);
	switch (operation.nodeType) {
		case "text":
			if (node.type !== "text") break;
			return {
				type: "node.update",
				nodeId: node.id,
				nodeType: "text",
				changes: {
					...commonChanges,
					...(operation.changes.data === undefined ? {} : { data: node.data }),
				},
			};
		case "image":
			if (node.type !== "image") break;
			return {
				type: "node.update",
				nodeId: node.id,
				nodeType: "image",
				changes: {
					...commonChanges,
					...(operation.changes.data === undefined ? {} : { data: node.data }),
				},
			};
		case "video":
			if (node.type !== "video") break;
			return {
				type: "node.update",
				nodeId: node.id,
				nodeType: "video",
				changes: {
					...commonChanges,
					...(operation.changes.data === undefined ? {} : { data: node.data }),
				},
			};
	}

	throw new Error("Cannot invert node update");
}

/** 在应用 forward 前调用，为一次用户动作生成按逆序执行的撤销操作。 */
export function createInverseOperations(
	canvas: CanvasDto,
	forward: CanvasOperation[],
): CanvasOperation[] {
	let workingCanvas = canvas;
	const inverseGroups: CanvasOperation[][] = [];

	for (const operation of forward) {
		switch (operation.type) {
			case "node.create":
				inverseGroups.push([
					{ type: "node.delete", nodeId: operation.node.id },
				]);
				break;
			case "node.update": {
				const node = workingCanvas.nodes.find(
					(candidate) => candidate.id === operation.nodeId,
				);
				if (!node) throw new Error("Cannot invert update for a missing node");
				inverseGroups.push([invertNodeUpdate(node, operation)]);
				break;
			}
			case "node.delete": {
				const node = workingCanvas.nodes.find(
					(candidate) => candidate.id === operation.nodeId,
				);
				if (!node) throw new Error("Cannot invert deletion of a missing node");
				const connectedEdges = workingCanvas.edges.filter(
					(edge) => edge.source === node.id || edge.target === node.id,
				);
				inverseGroups.push([
					{ type: "node.create", node },
					...connectedEdges.map(
						(edge): CanvasOperation => ({ type: "edge.create", edge }),
					),
				]);
				break;
			}
			case "edge.create":
				inverseGroups.push([
					{ type: "edge.delete", edgeId: operation.edge.id },
				]);
				break;
			case "edge.delete": {
				const edge = workingCanvas.edges.find(
					(candidate) => candidate.id === operation.edgeId,
				);
				if (!edge) throw new Error("Cannot invert deletion of a missing edge");
				inverseGroups.push([{ type: "edge.create", edge }]);
				break;
			}
		}

		workingCanvas = applyOperationsToCanvas(workingCanvas, [operation]);
	}

	return inverseGroups.reverse().flat();
}
