import { useParams } from "@tanstack/react-router";
import { Background, BackgroundVariant, ReactFlow } from "@xyflow/react";
import { CanvasPositioningPanel } from "./components/canvas-positioning-panel";
import { useCanvas } from "./hooks";

const CANVAS_GRID_SIZE = 20;

function CanvasDetailPage() {
	const { canvasId } = useParams({ from: "/canvas/$canvasId" });
	const {
		data: { canvas },
	} = useCanvas(canvasId);

	return (
		<div className="h-dvh w-dvw">
			<ReactFlow
				defaultViewport={canvas.viewport}
				maxZoom={4}
				minZoom={0.12}
				snapGrid={[CANVAS_GRID_SIZE, CANVAS_GRID_SIZE]}
				snapToGrid={canvas.snapToGrid}
			>
				<Background gap={CANVAS_GRID_SIZE} variant={BackgroundVariant.Dots} />
				<CanvasPositioningPanel
					canvasId={canvas.id}
					snapToGrid={canvas.snapToGrid}
				/>
			</ReactFlow>
		</div>
	);
}

export default CanvasDetailPage;
