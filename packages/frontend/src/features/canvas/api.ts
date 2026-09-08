import { HttpClient, throwIfNotOk } from "@/lib/api";
import { DEFAULT_CANVAS_NAME } from "@drama-me/shared";
import type { CanvasListFilters } from "./types";

export const CANVAS_PAGE_SIZE = 12;

export async function fetchCanvasPage(
	filters: CanvasListFilters,
	page: number,
) {
	const res = await HttpClient.api.canvases.$get({
		query: {
			keyword: filters.keyword || undefined,
			sortBy: filters.sortBy,
			order: "desc",
			page: String(page),
			pageSize: String(CANVAS_PAGE_SIZE),
		},
	});
	await throwIfNotOk(res);
	return res.json();
}

export async function fetchCanvas(id: string) {
	const res = await HttpClient.api.canvases[":id"].$get({
		param: { id },
	});
	await throwIfNotOk(res);
	return res.json();
}

export async function createUntitledCanvas() {
	const res = await HttpClient.api.canvases.$post({
		json: { name: DEFAULT_CANVAS_NAME },
	});
	await throwIfNotOk(res);
	return res.json();
}

export async function deleteCanvas(id: string) {
	const res = await HttpClient.api.canvases[":id"].$delete({
		param: { id },
	});
	await throwIfNotOk(res);
	return res.json();
}

export async function updateCanvasSettings(id: string, snapToGrid: boolean) {
	const res = await HttpClient.api.canvases[":id"].settings.$patch({
		param: { id },
		json: { snapToGrid },
	});
	await throwIfNotOk(res);
	return res.json();
}
