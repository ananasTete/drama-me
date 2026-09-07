import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { FormEvent } from "react";
import type { CanvasListFilters } from "../types";
import { CANVAS_SORT_OPTIONS } from "../utils";

type CanvasListToolbarProps = {
	keywordInput: string;
	onKeywordInputChange: (value: string) => void;
	sortBy: CanvasListFilters["sortBy"];
	onSortByChange: (sortBy: CanvasListFilters["sortBy"]) => void;
	onSubmitFilter: (event: FormEvent<HTMLFormElement>) => void;
	onCreate: () => void;
	createPending: boolean;
};

export function CanvasListToolbar({
	keywordInput,
	onKeywordInputChange,
	sortBy,
	onSortByChange,
	onSubmitFilter,
	onCreate,
	createPending,
}: CanvasListToolbarProps) {
	return (
		<header className="flex shrink-0 justify-end">
			<div className="flex flex-wrap items-center justify-end gap-2">
				<form
					className="flex flex-wrap items-center gap-2"
					onSubmit={onSubmitFilter}
				>
					<Input
						value={keywordInput}
						onChange={(event) => onKeywordInputChange(event.target.value)}
						placeholder="搜索名称"
						className="w-44"
						name="keyword"
						maxLength={100}
					/>
					<Select
						value={sortBy}
						onValueChange={(value) => {
							if (value === "createdAt" || value === "updatedAt") {
								onSortByChange(value);
							}
						}}
					>
						<SelectTrigger className="w-32">
							<SelectValue>
								{
									CANVAS_SORT_OPTIONS.find((option) => option.value === sortBy)
										?.label
								}
							</SelectValue>
						</SelectTrigger>
						<SelectContent align="end">
							{CANVAS_SORT_OPTIONS.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Button type="submit" variant="outline">
						筛选
					</Button>
				</form>
				<Button type="button" onClick={onCreate} disabled={createPending}>
					{createPending ? "创建中..." : "创建画布"}
				</Button>
			</div>
		</header>
	);
}
