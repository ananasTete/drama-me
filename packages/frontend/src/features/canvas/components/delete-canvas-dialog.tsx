import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { CanvasDeleteTarget } from "../types";

type DeleteCanvasDialogProps = {
	target: CanvasDeleteTarget | null;
	pending: boolean;
	isError: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: (id: string) => void;
};

export function DeleteCanvasDialog({
	target,
	pending,
	isError,
	onOpenChange,
	onConfirm,
}: DeleteCanvasDialogProps) {
	return (
		<AlertDialog
			open={target !== null}
			onOpenChange={(open) => {
				if (!open && !pending) {
					onOpenChange(false);
				}
			}}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>删除画布</AlertDialogTitle>
					<AlertDialogDescription>
						确定要删除「{target?.name}」吗？此操作无法撤销。
					</AlertDialogDescription>
				</AlertDialogHeader>
				{isError && (
					<p className="text-sm text-destructive">删除失败，请稍后重试</p>
				)}
				<AlertDialogFooter>
					<AlertDialogCancel disabled={pending}>取消</AlertDialogCancel>
					<AlertDialogAction
						variant="destructive"
						disabled={pending}
						onClick={() => {
							if (target) {
								onConfirm(target.id);
							}
						}}
					>
						{pending ? "删除中..." : "删除"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
