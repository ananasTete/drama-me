import type { CanvasListFilters } from "./types";

export const canvasKeys = {
	all: ["canvases"] as const,
	detail: (id: string) => [...canvasKeys.all, "detail", id] as const,
	lists: () => [...canvasKeys.all, "list"] as const,
	list: (filters: CanvasListFilters) =>
		[...canvasKeys.lists(), filters] as const,
};
