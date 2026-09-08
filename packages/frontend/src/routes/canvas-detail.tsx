import { CanvasDetailPage, canvasDetailQueryOptions } from "@/features/canvas";
import { requireSession } from "@/lib/auth";
import { createRoute } from "@tanstack/react-router";
import { Route as rootRoute } from "./__root";

export const Route = createRoute({
	getParentRoute: () => rootRoute,
	path: "/canvas/$canvasId",
	beforeLoad: requireSession,
	loader: ({ context, params }) =>
		context.queryClient.ensureQueryData(
			canvasDetailQueryOptions(params.canvasId),
		),
	component: CanvasDetailPage,
});
