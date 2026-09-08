import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@tanstack/react-router";
import { Trash2Icon } from "lucide-react";
import type { MouseEvent } from "react";
import type { CanvasDeleteTarget } from "../types";
import { formatUpdatedAt } from "../utils";

type CanvasCardProps = {
	id: string;
	name: string;
	updatedAt: string;
	onDelete: (target: CanvasDeleteTarget) => void;
};

export function CanvasCard({ id, name, updatedAt, onDelete }: CanvasCardProps) {
	function handleDelete(event: MouseEvent<HTMLButtonElement>) {
		event.preventDefault();
		onDelete({ id, name });
	}

	return (
		<Card className="relative overflow-hidden rounded-xl border border-border bg-muted/50 pt-0 ring-0">
			<div className="aspect-video bg-muted" />
			<CardContent className="relative z-10 pointer-events-none space-y-1 pt-0">
				<div className="flex items-start justify-between gap-2">
					<div className="min-w-0 space-y-1">
						<p className="truncate font-medium">{name}</p>
						<p className="text-xs text-muted-foreground">
							更新于 {formatUpdatedAt(updatedAt)}
						</p>
					</div>
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						className="pointer-events-auto shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/card:opacity-100 hover:text-destructive"
						onClick={handleDelete}
					>
						<Trash2Icon />
						<span className="sr-only">删除</span>
					</Button>
				</div>
			</CardContent>
			<Link
				to="/canvas/$canvasId"
				params={{ canvasId: id }}
				className="absolute inset-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			>
				<span className="sr-only">打开项目 {name}</span>
			</Link>
		</Card>
	);
}
