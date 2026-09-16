# Canvas CRUD

所有接口均要求有效登录会话，时间字段均为 ISO 8601 字符串。

## 画布数据结构

```ts
type ISODateTime = string;

type CanvasViewport = {
	x: number;
	y: number;
	zoom: number; // 缩放，> 0
};

type Canvas = {
	id: string;
	ownerId: string; // 用户 ID
	name: string;
	viewport: CanvasViewport;
	nodes: CanvasNode[];
	edges: CanvasEdge[];
	snapToGrid: boolean; // 拖动节点时是否吸附到网格
	schemaVersion: number; // 画布文档结构版本，当前为 2
	revision: number; // 内容乐观锁版本，从 1 开始
	createdAt: ISODateTime;
	updatedAt: ISODateTime;
};

type UUID = string;

type CanvasPosition = {
	x: number;
	y: number;
};

type CanvasNodeBase = {
	id: UUID;
	position: CanvasPosition;
	width: number; // > 0
	height: number; // > 0
	zIndex: number;
	locked: boolean;
};

type CanvasNode = CanvasTextNode | CanvasImageNode | CanvasVideoNode;

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

type CanvasNodeSourceType = "generate" | "upload";

type CanvasTextNodeData = {
	title: string;
	content: string;
	type: CanvasNodeSourceType;
	prompt: string;
	params: {
		model: string;
	};
};

type CanvasImageNodeData = {
	title: string;
	src: string;
	type: CanvasNodeSourceType;
	prompt: string;
	params: {
		model: string;
		aspectRatio: string; // 比例，‘16:9‘/’1:1‘ 等，可选值由模型能力决定
		imageSize: string; // 尺寸，‘2k'/'3k' 等可选值由模型能力决定
		generate_count: number; // 正整数
	};
};

type CanvasVideoNodeData = {
	title: string;
	src: string;
	type: CanvasNodeSourceType;
	prompt: string;
	params: {
		model: string;
		duration: number; // > 0
		aspectRatio: string; // 可选值由模型能力决定
		resolution: string; // 清晰度, '480p'等，可选值由模型能力决定
	};
};

type CanvasEdge = {
	id: UUID;
	source: UUID; // 起点节点 id
	target: UUID; // 终点节点 id
	sourceHandle: "left" | "right";
	targetHandle: "left" | "right";
	type: "default";
};
```

## 接口定义

### 1. 创建画布

#### UX

点击按钮立即创建画布并自动进入画布详情页面，不需要自定义名称，默认：“未命名画布”。

#### 接口： `POST /api/canvases`

```ts
// 参数：

type CreateCanvasBody = {
	name?: string; // 去除首尾空白后长度 1～100，默认“未命名画布”
};

// 响应：`201 Created`

type CreateCanvasResponse = {
	canvas: Canvas; // 新画布的 nodes、edges 均为空，revision 为 1
};
```

### 2. 查询画布列表 

#### UX

1. 滚动加载列表展示，一次 12 个
2. 关键字、最近更新/最新创建的表单筛选

#### 接口：`GET /api/canvases`

```ts
// 参数：

type ListCanvasesQuery = {
	keyword?: string; // 名称模糊匹配，最长 100 字符
	sortBy?: "createdAt" | "updatedAt"; // 默认 updatedAt
	limit?: number; // 每批 1～50 个，默认 20
	cursor?: string; // 上一批响应返回的 nextCursor；首次请求不传，格式为“排序时间毫秒值:画布 ID”
};

// 响应：`200 OK`，选取 Canvas 类型中 nodes edges 之外的字段，列表场景用不到这两个字段，降低体积

type CanvasListItem = Pick<
	Canvas,
	| "id"
	| "ownerId"
	| "name"
	| "schemaVersion"
	| "revision"
	| "createdAt"
	| "updatedAt"
>;

type ListCanvasesResponse = {
	canvases: CanvasListItem[];
	nextCursor: string | null; // null 表示没有下一批
};
```

### 3. 查询画布详情 `GET /api/canvases/:id`

参数：

```ts
type GetCanvasParams = {
	id: string;
};
```

响应：`200 OK`

```ts
type GetCanvasResponse = {
	canvas: Canvas;
};
```

### 4. 修改画布元数据 `PATCH /api/canvases/:id`

参数：

```ts
type UpdateCanvasMetadataParams = {
	id: string;
};

type UpdateCanvasMetadataBody = {
	name?: string; // 去除首尾空白后长度 1～100
	snapToGrid?: boolean;
}; // 至少传入一个字段；仅修改 name 会更新 updatedAt
```

响应：`200 OK`

```ts
type UpdateCanvasMetadataResponse = {
	canvas: {
		id: string;
		name: string;
		snapToGrid: boolean;
		updatedAt: ISODateTime;
	};
};
```

### 5. 保存画布视口 `PUT /api/canvases/:id/viewport`

参数：

```ts
type UpdateCanvasViewportParams = {
	id: string;
};

type UpdateCanvasViewportBody = CanvasViewport;
```

响应：`200 OK`

```ts
type UpdateCanvasViewportResponse = {
	viewport: CanvasViewport;
}; // 不改变 revision 和 updatedAt
```

### 6. 批量修改节点与连线 `POST /api/canvases/:id/operations`

参数：

```ts
type ApplyCanvasOperationsParams = {
	id: string;
};

type ApplyCanvasOperationsBody = {
	mutationId: UUID; // 同一次请求重试必须复用相同 id
	baseRevision: number; // 客户端当前 revision，正整数
	operations: CanvasOperation[]; // 1～500 项，同一目标在一批中最多出现一次
};

type CanvasOperation =
	| { type: "node.create"; node: CanvasNode }
	| CanvasNodeUpdateOperation
	| { type: "node.delete"; nodeId: UUID } // 同画布关联连线级联删除
	| { type: "edge.create"; edge: CanvasEdge }
	| { type: "edge.delete"; edgeId: UUID };

type CanvasNodeCommonChanges = {
	position?: CanvasPosition;
	width?: number; // > 0
	height?: number; // > 0
	zIndex?: number;
	locked?: boolean;
};

type CanvasNodeUpdateOperation =
	| {
			type: "node.update";
			nodeId: UUID;
			nodeType: "text";
			changes: CanvasNodeCommonChanges & { data?: CanvasTextNodeData };
	  }
	| {
			type: "node.update";
			nodeId: UUID;
			nodeType: "image";
			changes: CanvasNodeCommonChanges & { data?: CanvasImageNodeData };
	  }
	| {
			type: "node.update";
			nodeId: UUID;
			nodeType: "video";
			changes: CanvasNodeCommonChanges & { data?: CanvasVideoNodeData };
	  }; // changes 至少包含一个字段
```

响应：`200 OK`

```ts
type ApplyCanvasOperationsResponse = {
	mutationId: UUID;
	revision: number; // 保存成功后的 revision
};
```

### 7. 删除画布 `DELETE /api/canvases/:id`

参数：

```ts
type DeleteCanvasParams = {
	id: string;
};
```

响应：`200 OK`

```ts
type DeleteCanvasResponse = {
	id: string;
};
```

## 失败响应

```ts
type CanvasApiErrorResponse = {
	error: {
		code: CanvasApiErrorCode;
		message: string; // 仅供开发与日志使用
		details?: unknown;
	};
};

type CanvasApiErrorCode =
	| "UNAUTHORIZED" // 401
	| "VALIDATION_ERROR" // 400
	| "CANVAS_NOT_FOUND" // 404
	| "CANVAS_REVISION_CONFLICT" // 409
	| "CANVAS_MUTATION_ID_REUSED" // 409
	| "CANVAS_NODE_ALREADY_EXISTS" // 409
	| "CANVAS_NODE_NOT_FOUND" // 409
	| "CANVAS_NODE_TYPE_MISMATCH" // 409
	| "CANVAS_EDGE_ALREADY_EXISTS" // 409
	| "CANVAS_EDGE_NOT_FOUND" // 409
	| "CANVAS_EDGE_INVALID_ENDPOINT" // 422
	| "CANVAS_OPERATION_TARGET_DUPLICATED" // 409
	| "CANVAS_SCHEMA_VERSION_UNSUPPORTED" // 409
	| "CANVAS_DOCUMENT_INVALID" // 500
	| "INTERNAL_ERROR"; // 500

type ValidationErrorDetails = {
	fields: Array<{
		path: string;
		message: string;
	}>;
};

type RevisionConflictDetails = {
	currentRevision: number;
};

type OperationErrorDetails = {
	index: number; // operations 中失败项的索引
	type: CanvasOperation["type"];
	nodeId?: UUID;
	edgeId?: UUID;
};
```
