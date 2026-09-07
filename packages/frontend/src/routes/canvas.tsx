import { CanvasListPage } from "@/features/canvas";
import { requireSession } from "@/lib/auth";
import { createRoute } from "@tanstack/react-router";
import { Route as rootRoute } from "./__root";

export const Route = createRoute({
	getParentRoute: () => rootRoute,
	path: "/canvas",
	validateSearch: (
		search: Record<string, unknown>,
	): { keyword: string; sortBy: "createdAt" | "updatedAt" } => ({
		keyword: typeof search.keyword === "string" ? search.keyword : "",
		sortBy: search.sortBy === "createdAt" ? "createdAt" : "updatedAt",
	}),
	// 需要登录：未登录会跳 /login 并带上 redirect
	beforeLoad: requireSession,
	component: CanvasListPage,
});
