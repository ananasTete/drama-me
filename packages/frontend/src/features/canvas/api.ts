import { HttpClient, throwIfNotOk } from "@/lib/api";
import {
	type ApplyCanvasOperationsBody,
	type CanvasViewport,
	type UpdateCanvasMetadataBody,
} from "@drama-me/shared";
import type { CanvasListFilters } from "./types";

export const CANVAS_PAGE_LIMIT = 12;

export async function fetchCanvasPage(
	filters: CanvasListFilters,
	cursor: string | null,
) {
	const res = await HttpClient.api.canvases.$get({
		query: {
			keyword: filters.keyword || undefined,
			sortBy: filters.sortBy,
			limit: String(CANVAS_PAGE_LIMIT),
			cursor: cursor ?? undefined,
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
		json: {},
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

export async function updateCanvasMetadata(
	id: string,
	metadata: UpdateCanvasMetadataBody,
) {
	const res = await HttpClient.api.canvases[":id"].$patch({
		param: { id },
		json: metadata,
	});
	await throwIfNotOk(res);
	return res.json();
}

export async function updateCanvasViewport(
	id: string,
	viewport: CanvasViewport,
) {
	const res = await HttpClient.api.canvases[":id"].viewport.$put({
		param: { id },
		json: viewport,
	});
	await throwIfNotOk(res);
	return res.json();
}

export async function applyCanvasOperations(
	id: string,
	body: ApplyCanvasOperationsBody,
) {
	const res = await HttpClient.api.canvases[":id"].operations.$post({
		param: { id },
		json: body,
	});
	await throwIfNotOk(res);
	return res.json();
}
