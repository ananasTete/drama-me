import { type Node, type NodeProps } from "@xyflow/react";
import type { CanvasNodeType } from "@drama-me/shared";
import { Film, Image as ImageIcon, TextAlignStart } from "lucide-react";

export type CanvasFlowNode = Node<
	{ nodeType: CanvasNodeType },
	CanvasNodeType
>;

const NODE_ICON = {
	text: TextAlignStart,
	image: ImageIcon,
	video: Film,
} as const;

/** 内容功能接入前的统一占位节点。 */
export function CanvasPlaceholderNode({ data }: NodeProps<CanvasFlowNode>) {
	const Icon = NODE_ICON[data.nodeType];

	return (
		<div className="flex size-full items-center justify-center rounded-xl border bg-card text-muted-foreground shadow-sm">
			<Icon aria-hidden="true" className="size-12" strokeWidth={1.5} />
			<span className="sr-only">{data.nodeType} 节点暂无内容</span>
		</div>
	);
}
