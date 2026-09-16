---
name: infinite-scroll
description: 实现、修改或评审无限滚动列表时使用。覆盖 TanStack Query useInfiniteQuery、cursor 分页、IntersectionObserver、ScrollArea、加载与错误状态；需要页码跳转或精确总数的列表不使用。
---

# 无限滚动列表

## 目标与边界

无限滚动用于用户只需持续向后浏览、不需要跳到指定页码或查看精确总数的列表。前端使用 `useInfiniteQuery + IntersectionObserver + ScrollArea`，后端使用 cursor 分页。

以下场景不要使用无限滚动：

- 后台表格需要页码、跳页或精确总数。
- 数据量很小，一次请求即可合理返回。
- 用户需要稳定定位到某一页并反复比较记录。

状态归属、URL 筛选参数和首屏加载态同时遵循 [frontend-state-data-flow skill](../frontend-state-data-flow-skill/SKILL.md)。

## 数据契约

请求只在第一次省略 cursor，后续原样传回上一批的 `nextCursor`：

```http
GET /api/items?limit=20&cursor=上一批返回的nextCursor
```

响应直接使用资源字段，不增加全局 `data` 信封：

```ts
type ListItemsResponse = {
	items: Item[];
	nextCursor: string | null;
};
```

`nextCursor: null` 表示已经加载完毕，不额外返回 `hasMore` 或 `total`。具体字段名应与资源一致，例如画布列表使用 `canvases`，不要为了通用示例改变业务 API。

请求和响应 Schema 放在 `@drama-me/shared`。`limit` 必须是有上下限的整数，cursor 必须校验格式；非法参数交给项目的校验中间件返回 `400 VALIDATION_ERROR`。

## Cursor 设计

cursor 必须表示一条记录在完整排序中的位置，而不只是主排序字段。排序必须稳定且具有唯一的最终顺序。

例如列表排序为：

```sql
ORDER BY updatedAt DESC, id ASC
```

cursor 至少包含：

```ts
type Cursor = {
	updatedAt: number;
	id: string;
};
```

下一批条件必须与排序方向严格对应：

```sql
WHERE updatedAt < :cursorUpdatedAt
   OR (updatedAt = :cursorUpdatedAt AND id > :cursorId)
ORDER BY updatedAt DESC, id ASC
LIMIT :limitPlusOne
```

实现要求：

- 后端负责 cursor 的编码、解码和校验；前端只把它当作不透明字符串传递。
- cursor 包含所有参与稳定排序的字段。切换为 `createdAt` 排序时，cursor 也必须使用 `createdAt`。
- 编码必须能无歧义地还原字段。只有确认 ID 不包含分隔符时，才使用 `timestamp:id`；否则使用结构化编码。
- 权限、租户和业务筛选条件必须与 cursor 条件同时进入查询，不能先分页再过滤。
- 主排序字段可变时，分页期间发生更新仍可能让记录移动。若业务要求严格快照一致性，应改用不可变排序字段或加入快照边界，而不是假设 cursor 能消除所有并发变化。

## 后端查询

查询 `limit + 1` 条，用额外的一条判断是否还有下一批：

```ts
const rows = await query.limit(limit + 1)
const pageRows = rows.slice(0, limit)
const lastRow = pageRows.at(-1)
const nextCursor =
	rows.length > limit && lastRow ? encodeCursor(lastRow) : null
```

不要执行 `COUNT(*)`。生成 cursor 的是本批实际返回的最后一条，而不是多取的那一条。

为常用过滤和排序建立匹配的复合索引。例如按用户隔离并以更新时间排序时，优先评估：

```sql
(ownerId, updatedAt, id)
```

如果同时支持 `createdAt` 排序，应单独评估对应索引。索引设计必须根据真实查询和数据库执行计划决定，不盲目为每种理论组合建索引。

## 前端数据层

API 函数只负责发请求和解析响应，放在 feature 的 `api.ts`。页大小使用具名常量，cursor 首次传 `null`，发请求时转换成 `undefined` 以省略 query 参数。

Query 配置集中在 feature hooks 或 `query-options.ts`：

```ts
function itemsListQueryOptions(filters: ItemFilters) {
	return infiniteQueryOptions({
		queryKey: itemKeys.list(filters),
		queryFn: ({ pageParam }) => fetchItemsPage(filters, pageParam),
		initialPageParam: null as string | null,
		getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
	});
}
```

要求：

- `queryKey` 必须包含所有会改变结果的筛选和排序条件。条件变化后由新 key 创建新的分页链。
- `getNextPageParam` 在 `nextCursor` 为 `null` 时返回 `undefined`，让 `hasNextPage` 变为 `false`。
- 页面组件只消费封装后的 Query hook，不手写请求、query key 或分页累积状态。
- 渲染时从所有页面展平资源数组：`query.data?.pages.flatMap((page) => page.items) ?? []`。
- 筛选切换时是否保留旧内容，遵循状态管理 skill 中的 `keepPreviousQueryData` 规则。

## 滚动哨兵

用列表末尾的哨兵触发下一批请求：

```ts
function useFetchNextOnSentinel(
	fetchNextPage: () => void,
	hasNextPage: boolean,
	isFetchingNextPage: boolean,
) {
	const sentinelRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		const sentinel = sentinelRef.current
		if (!sentinel) return

		const root = sentinel.closest("[data-slot='scroll-area-viewport']")
		if (!root) return

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
					fetchNextPage()
				}
			},
			{ root, rootMargin: "160px" },
		)

		observer.observe(sentinel)
		return () => observer.disconnect()
	}, [fetchNextPage, hasNextPage, isFetchingNextPage])

	return sentinelRef
}
```

约束：

- `ScrollArea` 必须有确定的可滚动高度；flex 布局通常使用 `min-h-0 flex-1`。
- observer 的 root 必须是实际滚动的 viewport。找不到预期 root 时不要静默退回浏览器 viewport。
- 哨兵放在列表末尾，并使用适当的 `rootMargin` 提前加载。
- 同时检查 `hasNextPage && !isFetchingNextPage`，防止到底后继续请求或发起重复请求。
- effect 必须在依赖变化或组件卸载时断开旧 observer。
- 项目启用了 React Compiler，不要为了稳定回调手动增加 `useCallback`。

## UI 状态

必须分别处理以下状态：

- 首屏 pending：使用 `useDeferredPending(query.isPending)` 延迟显示本模块骨架。
- 延迟窗口：`query.isPending && !showSkeleton` 时返回 `null`，不要闪现空态。
- 首屏错误：显示模块错误态；需要时提供重试操作。
- 空列表：仅在查询成功且展平后的数组为空时显示。
- 加载下一页：保留已有内容，在列表底部显示轻量状态，不显示整页骨架。
- 下一页失败：保留已有内容，并在底部提供“重试加载”入口；不要把整份列表替换成首屏错误态。
- 没有下一页：停止观察触发请求；是否展示“已经到底”由产品体验决定。

底部加载文案可使用 `role="status"` 或 `aria-live="polite"`，让辅助技术感知新增加载状态。哨兵本身不承载业务内容。

## 实施步骤

1. 确认产品确实需要无限滚动，而不是页码分页或一次性列表。
2. 定义稳定排序、复合 cursor、请求与响应 Schema。
3. 实现带权限和业务过滤的 `limit + 1` 后端查询，并评估复合索引。
4. 在 `api.ts` 实现单页请求。
5. 在 Query 层配置完整 query key、`initialPageParam` 和 `getNextPageParam`。
6. 在页面展平各页数据，并接入 ScrollArea 与滚动哨兵。
7. 补齐首屏、空态、首屏错误、下一页加载、下一页错误和结束状态。

## 评审清单

- 该页面是否真的不需要页码、跳页或精确总数？
- 排序是否稳定，并以唯一字段作为最终 tie-breaker？
- cursor 是否包含完整排序位置，并由后端严格校验？
- cursor 查询谓词是否与每个排序字段的方向一致？
- 是否先应用权限和业务过滤，再执行分页？
- 是否只查询 `limit + 1`，且未执行无用的 `COUNT(*)`？
- `nextCursor` 是否由本批返回的最后一条生成？
- 是否评估了匹配常用过滤与排序的复合索引？
- Query key 是否包含全部筛选与排序条件？
- 是否以 `nextCursor: null` 结束，而不是维护重复的 `hasMore`？
- observer root 是否为真实滚动容器，并在清理时断开？
- 是否防止到底后的请求和重复请求？
- 首屏加载与下一页加载、首屏错误与下一页错误是否分开处理？
- 是否避免用 `isFetching` 驱动整页骨架？
- 是否没有手动添加 `useMemo` 或 `useCallback`？
