import { useParams } from "@tanstack/react-router";
import { Background, BackgroundVariant, ReactFlow } from "@xyflow/react";
import { useCanvas } from "./hooks";

function CanvasDetailPage() {
	const { canvasId } = useParams({ from: "/canvas/$canvasId" });
	const {
		data: { canvas },
	} = useCanvas(canvasId);

	return (
		<div className="h-dvh w-dvw">
			<ReactFlow defaultViewport={canvas.viewport}>
				<Background variant={BackgroundVariant.Dots} />
			</ReactFlow>
		</div>
	);
}

export default CanvasDetailPage;
