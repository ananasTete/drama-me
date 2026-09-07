import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2Icon } from "lucide-react";
import type { CanvasDeleteTarget } from "../types";
import { formatUpdatedAt } from "../utils";

type CanvasCardProps = {
	id: string;
	name: string;
	updatedAt: string;
	onDelete: (target: CanvasDeleteTarget) => void;
};

export function CanvasCard({ id, name, updatedAt, onDelete }: CanvasCardProps) {
	return (
		<Card className="overflow-hidden rounded-xl border border-border bg-muted/50 pt-0 ring-0">
			<div className="aspect-video bg-muted" />
			<CardContent className="space-y-1 pt-0">
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
						className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/card:opacity-100 hover:text-destructive"
						onClick={() => onDelete({ id, name })}
					>
						<Trash2Icon />
						<span className="sr-only">删除</span>
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
