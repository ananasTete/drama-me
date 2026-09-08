function CanvasCardSkeleton() {
	return (
		<div className="overflow-hidden rounded-xl border border-border bg-muted/50">
			<div className="aspect-video animate-pulse bg-muted" />
			<div className="space-y-2 p-4">
				<div className="h-4 w-3/5 animate-pulse rounded bg-muted" />
				<div className="h-3 w-2/5 animate-pulse rounded bg-muted" />
			</div>
		</div>
	);
}

export function CanvasListSkeleton() {
	return (
		<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{Array.from({ length: 6 }, (_, index) => (
				<CanvasCardSkeleton key={index} />
			))}
		</div>
	);
}
