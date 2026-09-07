import { Handle, Position } from "@xyflow/react";
import type { CSSProperties } from "react";
import { PlusIcon } from "lucide-react";

// 藏掉 Handle 默认的 6px 小圆点，并把热区改成和自定义 UI 一样大
const hiddenHandleStyle: CSSProperties = {
	background: "none",
	border: "none",
	width: 16,
	height: 16,
};

// 子元素只负责外观：禁止抢鼠标事件，贴在 Handle 左上角，和热区完全重合
const handleChildStyle: CSSProperties = {
	pointerEvents: "none",
	position: "absolute",
	left: 0,
	top: 0,
};

// 自定义节点就是一个 react 组件

function CustomInputNode(props) {
	console.log("custom input node props", props);

	return (
		<div className="size-80 bg-blue-300 rounded-md p-2 relative">
			<label htmlFor="text" className="mr-5">
				{props.data.label}
			</label>
			<input
				id="text"
				name="text"
				onChange={(evt) => {
					console.log(evt.target.value);
				}}
				className="w-20 h-10 bg-yellow-200 nodrag" // nodrag 内置样式类：禁止拖拽，用在表单这类不应该导致拖拽节点的元素上
			/>
			{/* nowheel 内置样式类：避免在节点内的滚动容器滚动触发画布的缩放 */}
			<div className="mt-5 size-50 bg-yellow-200 overflow-auto nowheel">
				{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((item) => (
					<div key={item} className="w-50 h-30 mb-5 bg-red-200">
						{item}
					</div>
				))}
			</div>

			{/*
			  1. handle 默认是一个黑色背景，白色边框的圆形 div，可以通过直接给 handle 设置 css 样式来修改 UI
			  2. 只调整 handle 不够时，可以通过设置 child 来自定义 UI，handle 的 background / border 设为 none，清除默认样式，就可以作为普通 div 自定义。
              3. 可以让 child 定位到 handle 外部，注意：1. 连接线始终是从 handle 位置出发的 2. 存在多个 source 或 target handle 时，需要使用 id 来区分
              4. 也可以直接将 handle 定位到外部
			*/}
			<Handle
				id="a"
				type="source"
				position={Position.Right}
				className="size-3 border-none"
			></Handle>
			<Handle
				type="target"
				position={Position.Left}
				className="size-5 border-none bg-transparent"
			>
				<PlusIcon className="size-5 hover:text-red-800" />
			</Handle>
			<Handle
				id="b"
				type="source"
				position={Position.Top}
				className="border-none bg-transparent"
			>
				<PlusIcon className="absolute -top-5 left-1/2 -translate-x-1/2 -translate-y-1/2 size-5 text-black" />
			</Handle>
			<Handle
				id="c"
				type="source"
				position={Position.Bottom}
				className="absolute -bottom-5 size-5 border-none bg-transparent"
			>
				<PlusIcon className="size-5" />
			</Handle>
		</div>
	);
}

export default CustomInputNode;

/**
 * 节点 props 数据结构，不仅会把 data 数据传递给节点，还会传递其他很多数据
 * {
    "id": "n3",
    "data": {
        "label": "Node 3"
    },
    "type": "customInput",
    "positionAbsoluteX": 800,
    "positionAbsoluteY": 300,
    "selected": false,
    "selectable": true,
    "draggable": true,
    "deletable": true,
    "isConnectable": true,
    "dragging": false,
    "zIndex": 0,
    "width": 0,
    "height": 0
}
 */
