import {
	useInfiniteQuery,
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { createUntitledCanvas, deleteCanvas, updateCanvasSettings } from "./api";
import { canvasKeys } from "./query-keys";
import {
	canvasDetailQueryOptions,
	canvasListQueryOptions,
} from "./query-options";
import type { CanvasListFilters } from "./types";

// 页面已由路由守卫保证已登录，这里不再判断会话
export function useCanvasList(filters: CanvasListFilters) {
	return useInfiniteQuery(canvasListQueryOptions(filters));
}

export function useCanvas(id: string) {
	return useSuspenseQuery(canvasDetailQueryOptions(id));
}

export function useCreateCanvas(onCreated?: (canvasId: string) => void) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: createUntitledCanvas,
		onSuccess: ({ canvas }) => {
			void queryClient.invalidateQueries({
				queryKey: canvasKeys.lists(),
				refetchType: "none",
			});
			onCreated?.(canvas.id);
		},
	});
}

export function useDeleteCanvas(onDeleted?: () => void) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: deleteCanvas,
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: canvasKeys.lists() });
			onDeleted?.();
		},
	});
}

export function useUpdateCanvasSettings() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, snapToGrid }: { id: string; snapToGrid: boolean }) =>
			updateCanvasSettings(id, snapToGrid),
		onMutate: async ({ id, snapToGrid }) => {
			const queryKey = canvasKeys.detail(id);
			await queryClient.cancelQueries({ queryKey });
			const previousCanvas = queryClient.getQueryData(queryKey);

			queryClient.setQueryData(queryKey, (current) => {
				if (!current) {
					return current;
				}

				return {
					...current,
					canvas: { ...current.canvas, snapToGrid },
				};
			});

			return { queryKey, previousCanvas };
		},
		onError: (_error, _variables, context) => {
			if (context?.previousCanvas) {
				queryClient.setQueryData(context.queryKey, context.previousCanvas);
			}
		},
		onSuccess: ({ canvas }) => {
			queryClient.setQueryData(canvasKeys.detail(canvas.id), { canvas });
		},
	});
}

/** 滚动容器底部哨兵：进入视口时拉取下一页 */
export function useFetchNextOnSentinel(
	fetchNextPage: () => void,
	hasNextPage: boolean,
	isFetchingNextPage: boolean,
) {
	const sentinelRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const sentinel = sentinelRef.current;
		if (!sentinel) {
			return;
		}
		const root = sentinel.closest("[data-slot='scroll-area-viewport']");
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
					fetchNextPage();
				}
			},
			{ root, rootMargin: "160px" },
		);
		observer.observe(sentinel);
		return () => observer.disconnect();
	}, [fetchNextPage, hasNextPage, isFetchingNextPage]);

	return sentinelRef;
}
