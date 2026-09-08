import { CanvasListPage } from "@/features/canvas";
import { requireSession } from "@/lib/auth";
import { createRoute, stripSearchParams } from "@tanstack/react-router";
import { Route as rootRoute } from "./__root";

export const Route = createRoute({
	getParentRoute: () => rootRoute,
	path: "/projects",
	validateSearch: (
		search: Record<string, unknown>,
	): { keyword: string; sortBy: "createdAt" | "updatedAt" } => ({
		keyword: typeof search.keyword === "string" ? search.keyword : "",
		sortBy: search.sortBy === "createdAt" ? "createdAt" : "updatedAt",
	}),
	search: {
		middlewares: [stripSearchParams({ keyword: "", sortBy: "updatedAt" })],
	},
	beforeLoad: requireSession,
	component: CanvasListPage,
});
