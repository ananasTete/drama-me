
## 右下面板

使用 react-flow 的 `<Panel>` 组件作为面板，它会在画布容器内生成带 react-flow__panel 的元素，并通过 position="bottom-left" 自动处理：
1. 相对画布视口定位，而不是相对页面；
2. 画布平移、缩放时始终固定在对应角落；
3. 使用 React Flow 既有的层级与指针事件规则，避免与节点、选择框、连线交互冲突。
自定义的 div 当然也能用，但需要自行保证绝对定位的参照容器、层级和交互行为；这里使用 Panel 更贴合 React Flow 的设计。

### 网格吸附

- 给 <ReactFlow> 传 snapToGrid={gridSnapEnabled} 与 snapGrid={[20, 20]}。开启后，节点拖动会自动落在 20px 网格上；关闭则自由移动。背景点阵也设为相同 gap={20}，保证视觉网格与实际吸附网格一致。
- 为画布数据结构新增 `snapToGrid: z.boolean()` 字段持久化用户选择，小地图不用。

### 小地图

- 直接使用 @xyflow/react 的 <MiniMap />，它会跟随节点、边和当前视口更新；建议开启 pannable，让用户能在缩略图中拖拽定位画布。
- Popover 用受控模式。仅在按钮触发的 trigger-press 事件中更新 miniMapOpen；忽略 outside-press、escape-key 与失焦关闭事件。这样点击画布或弹窗外不会关闭，只有再次点击小地图按钮才会关闭。
- 气泡菜单使用 side="top"、align="center"，即可相对小地图按钮水平居中、向上展开。
- React Flow 的 <MiniMap> 默认自己包了一层右下角定位的 Panel；放进 Popover 时需给它传 style={{ position: "static" }}，否则会脱离气泡回到画布右下角。再指定如 width: 240, height: 160，并给 Popover 内容加边框、圆角和阴影即可。

### 画布缩放

- 解析服务端 canvas.viewport 数据
- 按固定进度 10 12 14 17 21 25 30 36 43 50 62 74 89 100 128 154 185 200 222 266 319 383 400 来步进。
- 中间显示缩放比例，但中间同时也是一个 select，Select 菜单仅显示 50%、100%、200% 和最后一项“适应屏幕”。
- 使用 `reactFlow.setViewport({ ...viewport, zoom: zoom / 100 })` API 设置比例；使用 `reactFlow.fitView({ duration: 200, padding: 0.2 })` 来让画布自动适应。
