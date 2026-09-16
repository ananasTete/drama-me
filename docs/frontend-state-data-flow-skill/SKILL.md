---
name: frontend-state-data-flow
description: 设计、实现或评审 React 前端状态与数据流时使用。适用于服务端数据请求、筛选分页排序、URL search params、TanStack Query，以及查询加载态；纯样式或纯静态内容修改不需要使用。
---

# 前端状态与数据流

## 目标

先根据数据来源和生命周期选择状态归属，再编写实现。不要把服务端数据或应持久化的页面状态塞进组件本地 state。

本 skill 只处理业务数据与页面状态。认证、会话和路由守卫遵循项目当前的认证实现，不从这里推导特殊规则。

## 状态选择流程

按顺序判断：

1. 数据是否来自后端，或写操作是否需要同步后端？
   - 是：使用 TanStack Query 的 `useQuery`、`useInfiniteQuery` 或 `useMutation`。
2. 状态是否应在刷新后保留，或支持分享链接、浏览器前进与后退？
   - 是：使用 TanStack Router 的 URL search params。
3. 状态是否只是当前交互期间的临时 UI 状态？
   - 是：使用 `useState` 或 `useReducer`，并把状态放在真正使用它的最小组件中。
4. 多个组件是否必须共同读写同一份客户端状态，并且它既不属于服务端数据，也不适合 URL？
   - 是：再考虑 Zustand。不要仅为了避免传递少量 props 就创建全局 store。

| 数据类型 | 状态方案 | 常见示例 |
| --- | --- | --- |
| 服务端数据 | TanStack Query | 列表、详情、创建、更新、删除 |
| 可恢复的页面状态 | URL search params | 筛选、分页、排序、当前标签页 |
| 临时 UI 状态 | `useState` / `useReducer` | 弹窗开关、未提交表单、拖拽中间态 |
| 必要的跨组件客户端状态 | Zustand | 不适合 URL 的跨页面 UI 协作状态 |

## URL search params

- 用户可能刷新、分享或后退的状态应写入 URL，而不是组件 state。
- 未提交的输入可以暂存在本地。例如搜索框输入是草稿，提交后再同步到 URL。
- `validateSearch` 必须为缺失参数提供稳定默认值，让组件始终得到完整、类型安全的数据。
- URL 只表达非默认状态。为有默认值的参数配置 `stripSearchParams(默认值)`；清空筛选或切回默认排序时应自动移除对应参数。

示例：默认列表地址应是 `/projects`，而不是 `/projects?keyword=&sortBy=updatedAt`。

## TanStack Query

- 组件中的服务端读取必须通过 Query，不在 `useEffect` 或事件处理函数里直接请求并手动维护结果。
- 列表数据、加载状态和请求错误分别使用 Query 的 `data`、`isPending` 和 `error`，不要复制到本地 state。
- HTTP 纯函数放在 feature 的 `api.ts`；`queryKey`、`queryFn`、mutation 和缓存失效逻辑封装在 feature hooks 中。
- mutation 成功后的缓存更新或失效应集中在业务 hook 中，不散落到展示组件。

## 查询加载态

按“当前有没有可展示的数据”决定加载界面。快请求不应先闪现整页骨架，也不要在数据已经返回后强制继续展示骨架。

| 场景 | 做法 |
| --- | --- |
| 筛选、分页等会更换 `queryKey` 的列表 | 在 `useQuery` 中展开 `keepPreviousQueryData`，请求期间保留上一屏 |
| 首次访问、硬刷新或该 key 从未成功，没有任何可展示数据 | 将 Query 的 `isPending` 传给 `useDeferredPending`；默认延迟 250ms 后仍 pending 才显示骨架 |
| 缓存命中或 `staleTime` 内回访 | 直接渲染内容 |
| 详情或一次性查询，不应沿用上一份数据 | 只使用 `useDeferredPending`，不使用 `keepPreviousQueryData` |

项目提供的加载原语：

- `packages/frontend/src/lib/query/loading.ts`：`keepPreviousQueryData`
- `packages/frontend/src/hooks/use-deferred-pending.ts`：`useDeferredPending`

列表查询：

```ts
useQuery({ queryKey, queryFn, ...keepPreviousQueryData })
```

没有可展示数据时的渲染顺序：

```tsx
const { data, isPending, isError, error } = useXxxList()
const showSkeleton = useDeferredPending(isPending)

if (showSkeleton) return <本模块骨架 />
if (isPending) return null
// 再处理 error、empty 和内容
```

`keepPreviousData` 生效时已有 placeholder data，`isPending` 为 `false`，因此切换筛选不会重新显示骨架。

加载态约束：

- 不用 `isPending` 立即渲染整表骨架，避免快请求闪烁。
- 不用 `isFetching` 驱动骨架；后台刷新和保留旧数据时它也可能为 `true`。
- 不设置骨架最短展示时间；数据返回后立即展示数据。
- 不把 `keepPreviousQueryData` 或延迟骨架配置成 QueryClient 全局默认。
- 延迟窗口内 `isPending && !showSkeleton` 时返回 `null`，不要先渲染空状态。
- 只复用加载策略和小型原语；各业务模块自行实现骨架、空态与错误态，不创建通用 `useNiceQuery` 或 `<QuerySkeleton>`。

## 实施步骤

1. 列出新增或修改的每一项状态，以及它的来源、读者、写者和生命周期。
2. 使用状态选择流程确定 Query、URL、本地 state 或 Zustand。
3. 服务端数据先建立 API 纯函数和 Query hook，再让组件消费 hook。
4. 页面状态先定义路由的 `validateSearch` 和默认值，再实现导航更新。
5. 根据是否已有可展示数据选择加载策略。
6. 将临时 state 下沉到最小使用组件；只有确实需要共享时才提升。

## 评审清单

- 是否把服务端返回值、loading 或 error 手动复制进了本地 state？
- 是否在 `useEffect` 或事件处理函数中直接读取服务端数据？
- 筛选、分页、排序等状态刷新后是否丢失，或无法通过链接分享？
- URL 是否包含本可省略的默认参数？
- 未提交输入与已提交 URL 状态是否被正确区分？
- Query 配置和缓存失效是否集中在 feature hooks 中？
- 列表切换 query key 时是否保留上一屏？
- 首次快速请求是否会闪现骨架或空状态？
- 是否误用 `isFetching` 控制主骨架？
- 本地 state 是否位于真正使用它的最小组件中？
- 是否在没有明确跨组件需求时创建了 Zustand store？
