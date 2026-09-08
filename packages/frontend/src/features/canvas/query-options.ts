import { keepPreviousQueryData } from "@/lib/query/loading";
import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { fetchCanvas, fetchCanvasPage } from "./api";
import { canvasKeys } from "./query-keys";
import type { CanvasListFilters } from "./types";

const CANVAS_CACHE_GC_TIME = 10 * 60_000;

export function canvasListQueryOptions(filters: CanvasListFilters) {
	return infiniteQueryOptions({
		queryKey: canvasKeys.list(filters),
		queryFn: ({ pageParam }) => fetchCanvasPage(filters, pageParam),
		...keepPreviousQueryData,
		initialPageParam: 1,
		getNextPageParam: (lastPage) => {
			if (lastPage.page * lastPage.pageSize >= lastPage.total) {
				return undefined;
			}
			return lastPage.page + 1;
		},
		staleTime: 30_000,
		gcTime: CANVAS_CACHE_GC_TIME,
	});
}

export function canvasDetailQueryOptions(id: string) {
	return queryOptions({
		queryKey: canvasKeys.detail(id),
		queryFn: () => fetchCanvas(id),
		staleTime: 5 * 60_000,
		gcTime: CANVAS_CACHE_GC_TIME,
	});
}
