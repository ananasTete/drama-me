### 概念

node

edge：每个 edge 都需要一个目标和源节点。react-flow 内置了一些样式类型。边是一条 SVG 路径，可以通过 CSS 进行样式设置，并且完全可自定义。

handle：它们只是div元素，可以定制任意数量和位置的 handle。

viewport：画布信息，包含 x, y, 和 zoom

connect line：从 handle 引出的、还未连接到 target 的连接线。和 edge 一样有内置的样式类型。



要用 layer 的方式引入 react-flow 样式表，否则 tailwindcss 无法覆盖 handle 这种内部元素样式