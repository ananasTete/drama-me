import type { CanvasNodeType } from "@drama-me/shared";
import { Film, Image as ImageIcon, TextAlignStart } from "lucide-react";

type CanvasCreateNodeMenuProps = {
	left: number;
	top: number;
	onCreate: (type: CanvasNodeType) => void;
};

const NODE_OPTIONS = [
	{ type: "text", label: "文本", icon: TextAlignStart },
	{ type: "image", label: "图片", icon: ImageIcon },
	{ type: "video", label: "视频", icon: Film },
] as const satisfies ReadonlyArray<{
	type: CanvasNodeType;
	label: string;
	icon: typeof TextAlignStart;
}>;

export function CanvasCreateNodeMenu({
	left,
	top,
	onCreate,
}: CanvasCreateNodeMenuProps) {
	return (
		<div
			aria-label="创建节点"
			className="fixed z-50 flex gap-1 rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg"
			role="menu"
			style={{
				left: `min(${left}px, calc(100vw - 9rem))`,
				top: `min(${top}px, calc(100vh - 3.5rem))`,
			}}
			onContextMenu={(event) => event.preventDefault()}
		>
			{NODE_OPTIONS.map(({ type, label, icon: Icon }) => (
				<button
					aria-label={`创建${label}节点`}
					autoFocus={type === "text"}
					className="flex size-10 items-center justify-center rounded-lg outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
					key={type}
					role="menuitem"
					type="button"
					onClick={() => onCreate(type)}
				>
					<Icon className="size-5" />
				</button>
			))}
		</div>
	);
}
