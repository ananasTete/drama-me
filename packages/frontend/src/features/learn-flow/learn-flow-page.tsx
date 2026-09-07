import {
	type Connection,
	type Edge,
	type EdgeChange,
	type Node,
	type NodeChange,
	ReactFlow,
	addEdge,
	applyEdgeChanges,
	applyNodeChanges,
} from "@xyflow/react";
import { useState } from "react";
import nodeTypes from "./nodes";

const initialNodes: Node[] = [
	{
		id: "n1",
		position: { x: 800, y: 100 },
		data: { label: "Node 1" },
		type: "input", // 可选，限制节点只有 source handle，类型为 "input" | "output"
	},
	{
		id: "n2",
		position: { x: 800, y: 200 },
		data: { label: "Node 2" },
	},
	{
		id: "n3",
		position: { x: 800, y: 300 },
		data: { label: "Node 3" }, // 节点数据，可以用来存储节点状态
		type: "customInput", // 节点类型，必须和 nodeTypes 中的类型一致
	},
];

const initialEdges: Edge[] = [
	{
		id: "n1-n2",
		source: "n1",
		target: "n2",
		type: "smoothstepornormal", // 可选，edge 的类型，类型为 "straight" | "smoothstep" | "smoothstepornormal" | "step" | "smooth" | "curved"
		label: "connects with", // 可选，显示在 edge 上的文本
	},
];

function LearnFlowPage() {
	const [nodes, setNodes] = useState(initialNodes);
	const [edges, setEdges] = useState(initialEdges);

	// onNodesChange、onEdgesChange 会在节点移动、删除节点等场景下触发用来更新 node 和 edge

	const onNodesChange = (changes: NodeChange[]) => {
		// applyNodeChanges 方法会根据 changes 和 nodesSnapshot 生成新的 nodes 数组
		setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot));
	};

	const onEdgesChange = (changes: EdgeChange[]) => {
		setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot));
	};

	// onConnect 会在连接节点时触发用来新增 edge
	const onConnect = (params: Connection) => {
		setEdges((edgesSnapshot) => addEdge(params, edgesSnapshot));
	};

	return (
		// React Flow 必须有明确宽高的父容器，否则画布高度为 0、什么都看不见
		<div className="h-[calc(100dvh-6.5rem)] w-full">
			<ReactFlow
				nodes={nodes}
				edges={edges}
				nodeTypes={nodeTypes}
				onNodesChange={onNodesChange}
				onEdgesChange={onEdgesChange}
				onConnect={onConnect}
			/>
		</div>
	);
}

export default LearnFlowPage;
