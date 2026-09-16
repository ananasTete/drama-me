import {
	useInfiniteQuery,
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import type {
	CanvasDto,
	CanvasOperation,
	CanvasViewport,
	GetCanvasResponse,
} from "@drama-me/shared";
import { useEffect, useRef } from "react";
import { isApiError } from "@/lib/api";
import {
	applyCanvasOperations,
	createUntitledCanvas,
	deleteCanvas,
	updateCanvasMetadata,
	updateCanvasViewport,
} from "./api";
import { applyOperationsToCanvas } from "./operation-utils";
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

export function useRefreshCanvasList() {
	const queryClient = useQueryClient();

	return (filters: CanvasListFilters) =>
		queryClient.invalidateQueries({
			queryKey: canvasKeys.list(filters),
			exact: true,
		});
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
			updateCanvasMetadata(id, { snapToGrid }),
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
			queryClient.setQueryData(canvasKeys.detail(canvas.id), (current) => {
				if (!current) return current;
				return {
					...current,
					canvas: { ...current.canvas, snapToGrid: canvas.snapToGrid },
				};
			});
		},
	});
}

export function useUpdateCanvasName() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, name }: { id: string; name: string }) =>
			updateCanvasMetadata(id, { name }),
		onSuccess: ({ canvas }) => {
			queryClient.setQueryData<GetCanvasResponse>(
				canvasKeys.detail(canvas.id),
				(current) => {
					if (!current) return current;
					return {
						canvas: {
							...current.canvas,
							name: canvas.name,
							updatedAt: canvas.updatedAt,
						},
					};
				},
			);
			void queryClient.invalidateQueries({ queryKey: canvasKeys.lists() });
		},
	});
}

export function useUpdateCanvasViewport(canvasId: string) {
	const queryClient = useQueryClient();
	const queryKey = canvasKeys.detail(canvasId);

	return useMutation({
		mutationFn: (viewport: CanvasViewport) =>
			updateCanvasViewport(canvasId, viewport),
		// 多次平移结束时按触发顺序保存，保证最后一次写入最终生效。
		scope: { id: `canvas-viewport:${canvasId}` },
		onSuccess: ({ viewport }) => {
			queryClient.setQueryData<GetCanvasResponse>(queryKey, (current) => {
				if (!current) return current;
				return { canvas: { ...current.canvas, viewport } };
			});
		},
		retry: (failureCount, error) => !isApiError(error) && failureCount < 2,
	});
}

type CanvasOperationsVariables = {
	mutationId: string;
	operations: CanvasOperation[];
};

/**
 * 同一画布的写入通过 mutation scope 串行发送。baseRevision 在真正出队发送时读取，
 * 同一次网络重试则复用首次发送的 revision 和 mutationId。
 */
export function useApplyCanvasOperations(canvasId: string) {
	const queryClient = useQueryClient();
	const baseRevisionByMutation = useRef(new Map<string, number>());
	const confirmedCanvas = useRef<CanvasDto | null>(null);
	const pendingMutations = useRef<CanvasOperationsVariables[]>([]);
	const queryKey = canvasKeys.detail(canvasId);

	const projectPendingOperations = (base: CanvasDto): CanvasDto =>
		applyOperationsToCanvas(
			base,
			pendingMutations.current.flatMap((item) => item.operations),
		);

	const mutation = useMutation({
		mutationKey: [...queryKey, "operations"],
		scope: { id: `canvas-operations:${canvasId}` },
		mutationFn: (variables: CanvasOperationsVariables) => {
			const cached = queryClient.getQueryData<GetCanvasResponse>(queryKey);
			if (!cached) {
				throw new Error("Canvas must be loaded before applying operations");
			}

			const baseRevision =
				baseRevisionByMutation.current.get(variables.mutationId) ??
				cached.canvas.revision;
			baseRevisionByMutation.current.set(variables.mutationId, baseRevision);

			return applyCanvasOperations(canvasId, {
				mutationId: variables.mutationId,
				baseRevision,
				operations: variables.operations,
			});
		},
		onMutate: async (variables) => {
			const cancelPromise = queryClient.cancelQueries({
				queryKey,
				exact: true,
			});
			const current = queryClient.getQueryData<GetCanvasResponse>(queryKey);
			if (current) {
				if (pendingMutations.current.length === 0) {
					confirmedCanvas.current = current.canvas;
				}
				pendingMutations.current.push(variables);
				const base = confirmedCanvas.current ?? current.canvas;
				queryClient.setQueryData<GetCanvasResponse>(queryKey, {
					canvas: projectPendingOperations(base),
				});
			}
			await cancelPromise;
		},
		onSuccess: (response, variables) => {
			const current = queryClient.getQueryData<GetCanvasResponse>(queryKey);
			const base = confirmedCanvas.current ?? current?.canvas;
			pendingMutations.current = pendingMutations.current.filter(
				(item) => item.mutationId !== variables.mutationId,
			);

			if (base) {
				const nextConfirmed = {
					...applyOperationsToCanvas(base, variables.operations),
					// 幂等重试可能返回该 mutation 当时的 revision，不能让已知版本倒退。
					revision: Math.max(base.revision, response.revision),
				};
				confirmedCanvas.current = nextConfirmed;
				queryClient.setQueryData<GetCanvasResponse>(queryKey, {
					canvas: projectPendingOperations(nextConfirmed),
				});
			}

			if (pendingMutations.current.length === 0) {
				confirmedCanvas.current = null;
			}
			void queryClient.invalidateQueries({
				queryKey: canvasKeys.lists(),
				refetchType: "none",
			});
		},
		onError: async (_error, variables) => {
			pendingMutations.current = pendingMutations.current.filter(
				(item) => item.mutationId !== variables.mutationId,
			);
			// 失败后用权威快照做基底，再按顺序重放仍在队列中的乐观操作。
			await queryClient.refetchQueries({ queryKey, exact: true });
			const authoritative =
				queryClient.getQueryData<GetCanvasResponse>(queryKey);
			if (authoritative) {
				confirmedCanvas.current = authoritative.canvas;
				queryClient.setQueryData<GetCanvasResponse>(queryKey, {
					canvas: projectPendingOperations(authoritative.canvas),
				});
			}
			if (pendingMutations.current.length === 0) {
				confirmedCanvas.current = null;
			}
		},
		onSettled: (_data, _error, variables) => {
			baseRevisionByMutation.current.delete(variables.mutationId);
		},
		retry: (failureCount, error) => !isApiError(error) && failureCount < 2,
	});

	const submitOperations = (operations: CanvasOperation[]) => {
		mutation.mutate({ mutationId: crypto.randomUUID(), operations });
	};

	const submitOperationsAsync = (operations: CanvasOperation[]) =>
		mutation.mutateAsync({ mutationId: crypto.randomUUID(), operations });

	return { ...mutation, submitOperations, submitOperationsAsync };
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
