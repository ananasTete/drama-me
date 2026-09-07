export const CANVAS_SORT_OPTIONS = [
	{ value: "updatedAt", label: "最近更新" },
	{ value: "createdAt", label: "最近创建" },
] as const;

export function formatUpdatedAt(iso: string): string {
	return new Date(iso).toLocaleString("zh-CN", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	});
}
