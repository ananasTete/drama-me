import { ScrollArea } from "@/components/ui/scroll-area";
import { isApiError } from "@/lib/api";
import { ERROR_CODE } from "@drama-me/shared";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { CanvasCard } from "./components/canvas-card";
import { CanvasListToolbar } from "./components/canvas-list-toolbar";
import { DeleteCanvasDialog } from "./components/delete-canvas-dialog";
import {
	useCanvasList,
	useCreateCanvas,
	useDeleteCanvas,
	useFetchNextOnSentinel,
} from "./hooks";
import type { CanvasDeleteTarget } from "./types";

function CanvasListPage() {
	const navigate = useNavigate({ from: "/canvas" });
	const { keyword, sortBy } = useSearch({ from: "/canvas" });
	const [keywordInput, setKeywordInput] = useState(keyword);
	const [canvasToDelete, setCanvasToDelete] =
		useState<CanvasDeleteTarget | null>(null);

	useEffect(() => {
		setKeywordInput(keyword);
	}, [keyword]);

	const listQuery = useCanvasList({ keyword, sortBy });
	const canvases = listQuery.data?.pages.flatMap((page) => page.canvases) ?? [];
	const { fetchNextPage, hasNextPage, isFetchingNextPage } = listQuery;
	const sentinelRef = useFetchNextOnSentinel(
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
	);

	const createMutation = useCreateCanvas();
	const deleteMutation = useDeleteCanvas(() => setCanvasToDelete(null));

	function updateSearch(next: {
		keyword?: string;
		sortBy?: "createdAt" | "updatedAt";
	}) {
		void navigate({
			search: (current) => ({
				keyword: next.keyword ?? current.keyword,
				sortBy: next.sortBy ?? current.sortBy,
			}),
			replace: true,
		});
	}

	function onSubmitFilter(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		updateSearch({ keyword: keywordInput.trim() });
	}

	const isUnauthorized = isApiError(listQuery.error, ERROR_CODE.UNAUTHORIZED);

	return (
		<div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col gap-4">
			<CanvasListToolbar
				keywordInput={keywordInput}
				onKeywordInputChange={setKeywordInput}
				sortBy={sortBy}
				onSortByChange={(value) => updateSearch({ sortBy: value })}
				onSubmitFilter={onSubmitFilter}
				onCreate={() => createMutation.mutate()}
				createPending={createMutation.isPending}
			/>

			{createMutation.isError && (
				<p className="text-right text-sm text-destructive">
					{isApiError(createMutation.error, ERROR_CODE.UNAUTHORIZED)
						? "请先登录后再创建画布"
						: "创建失败，请稍后重试"}
				</p>
			)}

			<ScrollArea className="min-h-0 flex-1">
				<div className="p-4">
					{listQuery.isLoading && (
						<p className="text-sm text-muted-foreground">加载中...</p>
					)}

					{isUnauthorized && (
						<p className="text-sm text-muted-foreground">
							请先登录后再查看画布列表
						</p>
					)}

					{listQuery.isError && !isUnauthorized && (
						<p className="text-sm text-destructive">加载失败，请稍后重试</p>
					)}

					{listQuery.isSuccess && canvases.length === 0 && (
						<p className="text-sm text-muted-foreground">
							还没有画布，点击右上角创建
						</p>
					)}

					{canvases.length > 0 && (
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
							{canvases.map((canvas) => (
								<CanvasCard
									key={canvas.id}
									id={canvas.id}
									name={canvas.name}
									updatedAt={canvas.updatedAt}
									onDelete={setCanvasToDelete}
								/>
							))}
						</div>
					)}

					<div ref={sentinelRef} className="h-4" />

					{isFetchingNextPage && (
						<p className="mt-2 text-center text-sm text-muted-foreground">
							加载更多...
						</p>
					)}
				</div>
			</ScrollArea>

			<DeleteCanvasDialog
				target={canvasToDelete}
				pending={deleteMutation.isPending}
				isError={deleteMutation.isError}
				onOpenChange={(open) => {
					if (!open) {
						setCanvasToDelete(null);
					}
				}}
				onConfirm={(id) => deleteMutation.mutate(id)}
			/>
		</div>
	);
}

export default CanvasListPage;
