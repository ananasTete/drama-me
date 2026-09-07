import type { CanvasListFilters } from "./types";

export const canvasKeys = {
	all: ["canvases"] as const,
	lists: () => [...canvasKeys.all, "list"] as const,
	list: (filters: CanvasListFilters) =>
		[...canvasKeys.lists(), filters] as const,
};
