# 画布节点操作与持久化设计

## 1. 文档状态

- 状态：已确认，后续实现以本文档为准
- 范围：画布节点与连线的读取、创建、更新、删除、批量保存、乐观更新、并发控制、幂等、撤销与重做
- 不包含：多人实时协作、跨会话撤销历史、模型生成任务 API、媒体文件上传协议

## 2. 设计结论

画布采用“客户端即时编辑、服务端确认持久化”的模式：

- 客户端负责画布的即时交互、乐观更新、待保存队列、撤销与重做。
- 服务端负责权限、数据校验、事务一致性、最终持久化、幂等和 revision。
- 读取画布时返回完整节点与连线。
- 写入时不提交整份画布，而是提交一个原子的批量操作。
- 创建节点提交完整节点。
- 更新节点只提交发生变化的顶层字段。
- 节点 `data` 不做深层 Patch；更新 `data` 时提交并整体替换完整 `data`。
- 删除节点只提交节点 ID，服务端级联删除相关连线。
- 写入成功只返回 `mutationId` 和新的 `revision`，不返回节点副本。
- 撤销和重做由客户端生成反向/正向操作，不提供服务端 `/undo` API。

该方案结合了两类常见设计的优点：使用局部操作表达真实修改意图，同时保持响应足够轻量，适合客户端乐观更新。

## 3. 核心原则

### 3.1 用户操作是原子单位

一次用户动作可能同时影响多个资源，例如：

- 粘贴多个节点及其连线。
- 框选并移动多个节点。
- 删除节点并删除与之相连的边。
- 撤销一次批量创建。

这些变化必须在一个数据库事务中全部成功或全部失败，并且整个批次只让画布 `revision` 增加一次。

### 3.2 布局局部更新，复杂数据整体替换

位置、尺寸、层级等高频变化只提交对应字段：

```ts
{
	position: { x: 100, y: 200 },
}
```

节点 `data` 是按节点类型区分的完整业务对象。为避免递归合并、字段删除和 `undefined` / `null` 语义不清，`data` 只允许整体替换：

```ts
{
	data: completeImageNodeData,
}
```

### 3.3 服务端不返回客户端已经知道的数据

客户端在请求发出前已经完成乐观更新；服务端当前也不会重新生成节点 ID 或规范化节点内容，因此成功响应只确认：

- 哪个 mutation 已经完成。
- 服务端最终确认到哪个 revision。

### 3.4 revision 单调递增

`revision` 表示服务端已经确认的画布图数据版本：

- 每个成功的操作批次增加一次。
- 撤销与重做也是新的操作，因此 revision 继续增加，不会回退。
- 画布名称、视口和编辑偏好不属于图操作，不参与本协议的 revision 竞争。

## 4. 资源模型

### 4.1 节点

节点类型：

```ts
type CanvasNodeType = "text" | "image" | "video";
```

节点公共字段：

```ts
type CanvasNodeBase = {
	id: string;
	position: {
		x: number;
		y: number;
	};
	width: number;
	height: number;
	zIndex: number;
	locked: boolean;
};
```

完整节点为按 `type` 区分的联合类型：

```ts
type CanvasTextNode = CanvasNodeBase & {
	type: "text";
	data: CanvasTextNodeData;
};

type CanvasImageNode = CanvasNodeBase & {
	type: "image";
	data: CanvasImageNodeData;
};

type CanvasVideoNode = CanvasNodeBase & {
	type: "video";
	data: CanvasVideoNodeData;
};

type CanvasNode = CanvasTextNode | CanvasImageNode | CanvasVideoNode;
```

约束：

- 节点 ID 由客户端在乐观创建前生成，使用 UUID。
- 节点 `type` 创建后不可修改。转换节点类型应表达为删除旧节点并创建新节点。
- `width`、`height` 必须是正数。
- `zIndex` 必须是整数。
- 不在公共节点模型中提供节点级 `createdAt`、`updatedAt`；前端目前不使用这些字段。
- 图片和视频媒体只保存 URL，不在节点 `data` 中保存 base64 文件内容。

三种节点的 `data` 结构及 Zod Schema 继续由 `@drama-me/shared` 统一定义。其中模型相关的 `model`、`aspectRatio`、`imageSize`、`resolution` 暂时保持 `string`，不在持久化 Schema 中写死具体模型能力。

### 4.2 连线

```ts
type CanvasEdge = {
	id: string;
	source: string;
	target: string;
	sourceHandle: CanvasHandleId;
	targetHandle: CanvasHandleId;
	type: "default";
};
```

约束：

- 连线 ID 由客户端生成，使用 UUID。
- `source` 和 `target` 必须属于当前画布。
- 删除节点时，所有以该节点为 `source` 或 `target` 的连线由服务端级联删除。
- 首版不提供 `edge.update`。改变连线端点或 Handle 时，客户端使用 `edge.delete` 加 `edge.create` 表达。
- 不提供连线级时间戳。

## 5. API 设计

### 5.1 读取画布

继续使用：

```http
GET /api/canvases/:canvasId
```

响应返回完整画布，其中包括当前 `revision`、`nodes` 和 `edges`。首版不提供单独读取某个节点的接口，因为打开画布本身需要完整图数据。

当未来单个画布大到无法一次加载时，再增加按视口或分页加载节点的协议；首版不提前引入空间分页复杂度。

### 5.2 应用画布操作

```http
POST /api/canvases/:canvasId/operations
```

混合创建、更新和删除的批次统一返回 HTTP `200`。

请求：

```ts
type ApplyCanvasOperationsBody = {
	mutationId: string;
	baseRevision: number;
	operations: CanvasOperation[];
};
```

响应：

```ts
type ApplyCanvasOperationsResponse = {
	mutationId: string;
	revision: number;
};
```

请求体不重复传递 `canvasId`，画布 ID 只以路径参数为准。

`operations` 至少包含一项。实现时通过一个可配置常量限制单批最大操作数，初始建议为 500，防止异常请求无限占用事务。

## 6. 操作类型

```ts
type CanvasOperation =
	| CanvasNodeCreateOperation
	| CanvasNodeUpdateOperation
	| CanvasNodeDeleteOperation
	| CanvasEdgeCreateOperation
	| CanvasEdgeDeleteOperation;
```

### 6.1 创建节点

```ts
type CanvasNodeCreateOperation = {
	type: "node.create";
	node: CanvasNode;
};
```

示例：

```json
{
  "type": "node.create",
  "node": {
    "id": "b7e409d6-78df-4cce-aae2-55fb0324e499",
    "type": "image",
    "position": { "x": 3255, "y": -2300 },
    "width": 250,
    "height": 250,
    "zIndex": 1,
    "locked": false,
    "data": {
      "title": "Image",
      "src": "",
      "type": "generate",
      "prompt": "",
      "params": {
        "model": "doubao-seedream-5.0-lite",
        "aspectRatio": "1:1",
        "imageSize": "2K",
        "generate_count": 1
      }
    }
  }
}
```

服务端验证完整节点，并验证 ID 在当前系统中未被占用。

### 6.2 更新节点

更新公共布局字段：

```ts
type CanvasNodeCommonChanges = {
	position?: CanvasPosition;
	width?: number;
	height?: number;
	zIndex?: number;
	locked?: boolean;
};
```

更新操作按 `nodeType` 区分，以保证 `data` 和节点类型在 TypeScript、Zod 中保持关联：

```ts
type CanvasNodeUpdateOperation =
	| {
			type: "node.update";
			nodeId: string;
			nodeType: "text";
			changes: CanvasNodeCommonChanges & {
				data?: CanvasTextNodeData;
			};
	  }
	| {
			type: "node.update";
			nodeId: string;
			nodeType: "image";
			changes: CanvasNodeCommonChanges & {
				data?: CanvasImageNodeData;
			};
	  }
	| {
			type: "node.update";
			nodeId: string;
			nodeType: "video";
			changes: CanvasNodeCommonChanges & {
				data?: CanvasVideoNodeData;
			};
	  };
```

规则：

- `changes` 必须至少包含一个字段，空更新请求校验失败。
- 缺失的字段表示保持原值。
- 不允许使用 `null` 表达删除字段；当前可更新字段均为必需字段。
- `position` 是完整坐标对象，不能只提交 `x` 或 `y`。
- `data` 整体替换，不进行递归合并。
- `nodeType` 必须和数据库中已有节点类型一致。
- 更新操作不允许修改 `id` 和 `type`。

只移动节点：

```json
{
  "type": "node.update",
  "nodeId": "b7e409d6-78df-4cce-aae2-55fb0324e499",
  "nodeType": "image",
  "changes": {
    "position": { "x": 100, "y": 200 }
  }
}
```

修改图片生成参数时，提交完整的图片 `data`，但不需要重复提交位置和尺寸。

### 6.3 删除节点

```ts
type CanvasNodeDeleteOperation = {
	type: "node.delete";
	nodeId: string;
};
```

服务端删除节点并级联删除相关连线。客户端拥有当前画布数据，可以在乐观更新时同步移除这些连线，因此成功响应不需要返回被级联删除的连线 ID。

### 6.4 创建连线

```ts
type CanvasEdgeCreateOperation = {
	type: "edge.create";
	edge: CanvasEdge;
};
```

服务端必须验证连线两端节点都存在于当前画布。

### 6.5 删除连线

```ts
type CanvasEdgeDeleteOperation = {
	type: "edge.delete";
	edgeId: string;
};
```

## 7. 完整请求与响应示例

```json
{
  "mutationId": "e263d150-b0a7-46c5-b33f-da8c80b4b58b",
  "baseRevision": 12,
  "operations": [
    {
      "type": "node.update",
      "nodeId": "b7e409d6-78df-4cce-aae2-55fb0324e499",
      "nodeType": "image",
      "changes": {
        "position": { "x": 100, "y": 200 }
      }
    }
  ]
}
```

```json
{
  "mutationId": "e263d150-b0a7-46c5-b33f-da8c80b4b58b",
  "revision": 13
}
```

## 8. 批次执行语义

- 服务端按数组顺序解释操作。
- 所有操作在同一个数据库事务中执行。
- 任意一项失败，整个批次回滚，`revision` 不变，也不写入 mutation 记录。
- 一个批次成功后，无论包含多少项操作，`revision` 只增加一次。
- 同一个批次中不允许对同一节点或同一连线提交多个互相竞争的操作；客户端应在发送前合并。例如同一节点先移动再调整尺寸，应合并为一次 `node.update`。
- 创建节点后可以在同一批次中创建引用它的连线。
- 删除节点时不需要额外提交相关 `edge.delete`，避免与服务端级联删除重复。

## 9. 并发控制

### 9.1 baseRevision

客户端读取到画布 revision 12 后，下一批请求提交：

```json
{ "baseRevision": 12 }
```

服务端只在数据库当前 revision 仍为 12 时接受该批次。成功后返回 13。

如果当前 revision 已不是 12，返回 HTTP `409`：

```json
{
  "error": {
    "code": "CANVAS_REVISION_CONFLICT",
    "message": "Canvas has been modified",
    "details": {
      "currentRevision": 14
    }
  }
}
```

客户端时间戳不参与并发判断和操作排序，因为客户端时钟不可靠。

### 9.2 服务端内部修改

任何会修改节点或连线的服务端流程也必须使用同一套事务服务并增加 revision，包括未来模型生成任务完成后写回 `src` 或 `content`。不能绕过 revision 直接更新表，否则客户端无法发现状态变化。

## 10. mutationId 与幂等

`mutationId` 标识一个确定的写入批次，不是节点 ID，也不是 revision。

规则：

- 每个新批次由客户端生成一个 UUID。
- 同一批次因超时、断网或恢复队列而重试时，必须复用原 `mutationId`。
- 用户执行新的操作、撤销或重做时，必须生成新的 `mutationId`。
- 服务端第一次成功执行后保存 mutation receipt。
- 同一个 `mutationId` 和相同请求再次到达时，不重复执行，直接返回第一次的 `{ mutationId, revision }`。
- 同一个 `mutationId` 被用于不同请求内容时，返回 HTTP `409`，错误码为 `CANVAS_MUTATION_ID_REUSED`。
- 服务端检查幂等记录必须发生在检查 `baseRevision` 之前。这样“服务端已成功但响应丢失”的重试不会被误判成 revision 冲突。

服务端应保存请求内容的稳定哈希，用于识别相同 ID 是否对应相同请求。幂等记录可按保留期清理；超过保留期的旧请求重新到达时，可以要求客户端重新读取画布。

首版在服务启动完成迁移后清理 7 天前的 receipt，并为 `createdAt` 建立索引，避免清理时全表扫描。

## 11. 服务端事务流程

每个写入请求按以下顺序处理。除登录态和请求形状校验外，幂等检查、revision 更新、图操作和 receipt 写入必须位于同一个数据库事务中：

1. 验证登录态和请求 Schema。
2. 根据路径中的 `canvasId` 验证画布归属。
3. 开启事务并查询 `mutationId`：
   - 相同画布、相同请求哈希已经成功：直接返回原 revision。
   - ID 已存在但请求哈希不同：返回 `CANVAS_MUTATION_ID_REUSED`。
4. 以 `canvasId + ownerId + baseRevision` 条件更新画布 revision。
5. 如果条件更新不到记录，区分画布不存在与 revision 冲突。
6. 按顺序执行节点和连线操作，并验证所有图关系。
7. 写入 mutation receipt。
8. 提交事务并返回 `{ mutationId, revision }`。

`mutationId` 的唯一约束负责处理两个相同请求并发到达的竞态；后到的请求不能再次执行图操作。

## 12. 错误语义

遵循项目现有 API 规范：HTTP 状态码表示大类，JSON `error.code` 表示具体原因，不额外包装 `{ code, msg, data }`。

建议错误码：

| HTTP | error.code | 含义 |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | 请求形状、数值或节点 data 校验失败 |
| 401 | `UNAUTHORIZED` | 未登录 |
| 404 | `CANVAS_NOT_FOUND` | 画布不存在或不属于当前用户 |
| 409 | `CANVAS_REVISION_CONFLICT` | `baseRevision` 已过期 |
| 409 | `CANVAS_MUTATION_ID_REUSED` | 同一 mutation ID 对应了不同请求 |
| 409 | `CANVAS_NODE_ALREADY_EXISTS` | 创建的节点 ID 已存在 |
| 409 | `CANVAS_NODE_NOT_FOUND` | 更新或删除的节点不存在于当前画布 |
| 409 | `CANVAS_NODE_TYPE_MISMATCH` | `nodeType` 与已有节点不一致 |
| 409 | `CANVAS_EDGE_ALREADY_EXISTS` | 创建的连线 ID 已存在 |
| 409 | `CANVAS_EDGE_NOT_FOUND` | 删除的连线不存在于当前画布 |
| 422 | `CANVAS_EDGE_INVALID_ENDPOINT` | 连线端点不属于当前画布 |

所有失败都按整批失败处理。首版不支持部分成功，也不返回逐项结果。

## 13. 数据库设计

当前把 `nodes`、`edges` 作为 JSON 数组保存在 `canvas` 表中。节点级写入实现时将其拆分为独立表，避免每次位置变化都重写整份画布 JSON。

### 13.1 canvas

保留：

- `id`
- `ownerId`
- `name`
- `viewport`
- `snapToGrid`
- `schemaVersion`
- `revision`
- `createdAt`
- `updatedAt`

移除：

- `nodes`
- `edges`

`updatedAt` 继续用于画布列表排序，但不放入操作成功响应。

### 13.2 canvasNode

| 字段 | SQLite 类型 | 约束 |
| --- | --- | --- |
| `id` | text | primary key，客户端 UUID |
| `canvasId` | text | not null，引用 `canvas.id`，画布删除时 cascade |
| `type` | text | not null，`text/image/video` |
| `positionX` | real | not null |
| `positionY` | real | not null |
| `width` | real | not null，正数 |
| `height` | real | not null，正数 |
| `zIndex` | integer | not null |
| `locked` | integer | not null，boolean mode |
| `data` | text/json | not null，应用层使用对应节点 Zod Schema 校验 |

索引与约束：

- `index(canvasId)` 用于读取画布全部节点。
- `unique(canvasId, id)` 为连线的同画布复合外键提供目标。
- 数据库使用 `check` 约束节点类型、正宽度和正高度。

### 13.3 canvasEdge

| 字段 | SQLite 类型 | 约束 |
| --- | --- | --- |
| `id` | text | primary key，客户端 UUID |
| `canvasId` | text | not null，引用 `canvas.id`，画布删除时 cascade |
| `sourceNodeId` | text | not null |
| `targetNodeId` | text | not null |
| `sourceHandle` | text | not null |
| `targetHandle` | text | not null |
| `type` | text | not null，当前固定 `default` |

索引与约束：

- `index(canvasId)` 用于读取画布全部连线。
- `(canvasId, sourceNodeId)` 复合外键引用 `canvasNode(canvasId, id)`，节点删除时 cascade。
- `(canvasId, targetNodeId)` 复合外键引用 `canvasNode(canvasId, id)`，节点删除时 cascade。
- 复合外键保证连线两端不可能引用其他画布的节点。

### 13.4 canvasMutation

| 字段 | SQLite 类型 | 约束 |
| --- | --- | --- |
| `mutationId` | text | primary key |
| `canvasId` | text | not null，引用 `canvas.id`，画布删除时 cascade |
| `requestHash` | text | not null |
| `baseRevision` | integer | not null |
| `resultingRevision` | integer | not null |
| `createdAt` | integer/timestamp | not null，用于清理过期 receipt |

该表只用于网络重试幂等，不是用户操作历史，也不用于撤销/重做。

### 13.5 数据迁移

实现时采用非破坏性迁移顺序：

1. 创建 `canvasNode`、`canvasEdge`、`canvasMutation`。
2. 将现有 `canvas.nodes`、`canvas.edges` 中符合当前 Schema 的数据迁入新表。
3. 对迁移后的数量和归属进行检查。
4. 再通过 SQLite 表重建移除旧 JSON 列。

如果确认开发数据库没有需要保留的节点数据，可以简化 backfill，但不得在没有确认数据状态时静默丢弃已有数据。

## 14. 前端乐观更新与保存队列

### 14.1 状态职责

- TanStack Query：服务端画布数据和最终确认的 revision。
- React Flow / 组件本地状态：拖动、连线预览、文本输入草稿等高频临时交互。
- 画布同步队列：尚未被服务端确认的操作批次。
- 撤销栈：用户动作对应的 forward / inverse 操作。

不应在指针移动的每一帧调用 mutation 或持续写 Query 缓存。

### 14.2 何时形成持久化操作

- 创建节点：创建手势完成后立即形成操作。
- 删除节点：确认删除后立即形成操作。
- 拖动节点：只在 `onNodeDragStop` 形成一次操作。
- 调整尺寸：只在 resize 结束时形成一次操作。
- 文本或 prompt 输入：本地即时显示，通过 debounce 或 blur 合并为一次操作。
- 框选移动：一次手势生成包含多个 `node.update` 的批次。

### 14.3 串行发送

同一画布同时只允许一个写入批次处于请求中：

1. 用户操作立即作用于本地 UI。
2. 操作进入当前画布 FIFO 队列。
3. 队首发送时使用当前最后确认的 revision 作为 `baseRevision`。
4. 成功后用响应 revision 更新确认版本并发送下一批。

不能在多个快速操作刚发生时就把相同 `baseRevision` 固化到所有请求中，否则第二个请求会产生人为冲突。

### 14.4 成功、失败与冲突

成功：

- 校验响应 `mutationId` 与队首一致。
- 更新 Query 中的 revision。
- 移除已经确认的待保存批次。
- 不重新获取完整画布，不再次应用节点变化。

普通失败：

- 暂停队列。
- 丢弃失败操作或按错误类型提示用户。
- 重新读取服务端画布。
- 在权威快照上按顺序重放仍然有效的后续待保存操作。

revision 冲突：

- 不自动用旧完整节点覆盖服务端状态。
- 重新读取画布。
- 尝试在新快照上重放局部待保存操作。
- 如果目标节点已被删除或类型变化，停止对应操作并提示用户。
- 不能对 `409` 做无条件原请求重试。

简单的 `onMutate` 快照回滚可能擦掉失败请求之后的乐观操作，因此实现时必须以“权威快照 + 有序待保存操作重放”处理连续操作失败。

## 15. 撤销与重做

### 15.1 客户端命令栈

每个可撤销用户动作记录：

```ts
type CanvasHistoryEntry = {
	forward: CanvasOperation[];
	inverse: CanvasOperation[];
};
```

示例：

| 用户操作 | inverse |
| --- | --- |
| 创建节点 | 删除该节点 |
| 更新节点 | 恢复变化字段更新前的值 |
| 删除节点 | 重新创建删除前的节点和相关连线 |
| 创建连线 | 删除该连线 |
| 删除连线 | 重新创建删除前的连线 |

删除前必须在客户端保存完整节点及相关连线快照，才能正确构造 inverse。

### 15.2 撤销也是新写入

用户点击撤销时：

1. 立即在本地应用 `inverse`。
2. 使用新的 `mutationId` 将 `inverse` 加入保存队列。
3. 服务端接受后 revision 继续增加。

重做同理，使用新的 `mutationId` 再次提交 `forward`。

服务端不区分普通操作、撤销和重做，也不回退 revision。

### 15.3 尚未发送的操作抵消

如果创建操作仍只存在于本地队列，用户立即撤销，且没有其他操作依赖该节点，则客户端可以直接移除待发送的 create，不向服务端发送 create 或 delete。

如果 create 已经发送或正在发送，则必须保留顺序：先确认 create，再发送 delete。不能假设中断请求就等于服务端没有执行。

### 15.4 首版历史边界

- 撤销和重做历史只存在于当前编辑会话。
- 刷新或关闭页面后不恢复历史。
- 执行新的普通操作后清空 redo 栈。
- 拖动、连续输入等手势应合并成合理的单个历史项，不能每一帧或每个字符生成一项。

如果以后需要刷新后撤销、审计、操作回放或多人实时协作，再单独设计持久化操作日志；`canvasMutation` receipt 不承担这些职责。

## 16. 与其他画布写入的边界

以下操作不放入节点/连线 operations：

- 画布重命名。
- 视口平移和缩放保存。
- `snapToGrid` 等编辑偏好。
- 模型生成任务的创建、取消和重试。
- 媒体文件上传。

它们继续使用各自的资源接口。模型任务完成后如果需要写回节点内容，服务端内部必须通过统一图修改服务更新节点并增加画布 revision。

首版画布资源接口约定：

- `PATCH /api/canvases/:id` 更新名称或 `snapToGrid`；只有重命名更新 `updatedAt`。
- `PUT /api/canvases/:id/viewport` 保存视口；不更新 `revision` 和 `updatedAt`。

## 17. 首版明确不做

- 不做 JSON Patch、JSON Merge Patch 或 `data` 深层合并。
- 不做部分成功的批量操作。
- 不做服务端 `/undo`、`/redo`。
- 不持久化客户端撤销栈。
- 不做 WebSocket 多人实时协作、OT 或 CRDT。
- 不按节点返回操作结果或完整节点。
- 不保存节点和连线级时间戳。
- 不允许客户端发送时间戳决定操作顺序。
- 不在节点数据中保存媒体二进制或 base64。
- 不在首版实现按画布视口的节点分页加载。

## 18. 推荐实现顺序

1. 调整共享层的节点、连线和 operation Zod Schema，移除节点/连线时间戳。
2. 增加新数据库表及迁移。
3. 将画布详情读取切换到独立节点、连线表。
4. 实现服务端 operation 事务服务、revision 条件更新和幂等 receipt。
5. 实现 `POST /api/canvases/:canvasId/operations`。
6. 实现前端 API 函数和 TanStack Query mutation hook。
7. 实现每画布串行保存队列与乐观重放。
8. 接入创建、移动、调整尺寸、编辑、删除与连线操作。
9. 实现客户端撤销/重做栈及未发送操作抵消。
10. 最后再接入模型任务写回节点时的 revision 协调。
