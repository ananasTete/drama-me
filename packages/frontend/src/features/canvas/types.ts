import type { ListCanvasesQuery } from "@drama-me/shared";

export type CanvasListFilters = {
	keyword: string;
	sortBy: ListCanvasesQuery["sortBy"];
};

export type CanvasDeleteTarget = {
	id: string;
	name: string;
};
