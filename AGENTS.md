# drama-me — [AGENTS.md](http://AGENTS.md)

## 项目简介

drama-me 是一个前后端分离的 Web 应用，采用 monorepo 架构。**用户是后端新手，这个项目是其第一个后端项目。** 所有设计与实现都应该是最佳实践、所有代码修改和解释应考虑可理解性。

## 技术栈

| 层        | 技术                             |
| --------- | -------------------------------- |
| 运行时    | Bun                              |
| 后端框架  | Hono                             |
| 前端框架  | React 19 + Vite + TypeScript     |
| React 优化 | React Compiler（自动 memo）      |
| 路由/数据 | TanStack Router + TanStack Query |
| 样式      | Tailwind CSS v4 + shadcn/ui      |
| 状态管理  | Zustand                          |
| 校验      | Zod                              |
| 数据库    | SQLite + Drizzle ORM（准备中）   |
| 包管理    | pnpm workspaces                  |
| 并行任务  | Turbo                            |
| 代码规范  | Biome                            |

## 项目结构

```
drama-me/
├── packages/
│   ├── backend/          # Hono 后端 (Bun)
│   │   └── src/
│   │       ├── index.ts       # 启动入口
│   │       ├── app.ts         # Hono 实例 + AppType 导出
│   │       ├── routes/        # 路由模块
│   │       └── db/            # 数据库 schema (准备中)
│   ├── frontend/         # React 前端 (Vite)
│   │   └── src/
│   │       ├── main.tsx       # 应用入口
│   │       ├── router.tsx     # 路由树
│   │       ├── routes/        # 页面路由（validateSearch + 挂页面）
│   │       ├── features/      # 按业务模块组织的页面与数据层
│   │       ├── components/    # 全局 UI 组件（shadcn 等）
│   │       ├── lib/           # 工具函数、API 客户端、会话
│   │       └── stores/        # Zustand stores
│   └── shared/           # 前后端共享
│       └── src/validators/    # Zod Schema
├── AGENTS.md             # 本文件
├── biome.json            # Biome 配置
├── turbo.json            # Turbo 配置
└── pnpm-workspace.yaml   # Workspace 配置
```

## 开发原则

### 对新手友好

- **使用经过验证的最佳实践**，避免用户踩无意义的坑
- **复杂逻辑应加简短注释**，说明「做了什么」和「为什么」
- 新增依赖前，先确认是否真的需要

### 代码风格

- 使用 Biome 进行格式化和 lint（`pnpm format` / `pnpm lint`）
- TypeScript 严格模式
- 不使用 `any`（除非绝对必要）
- 函数和组件应有明确的类型标注

### React Compiler

项目已启用 [React Compiler](https://react.dev/learn/react-compiler)（`babel-plugin-react-compiler`，见 `packages/frontend/vite.config.ts`）。编译器会在构建时自动插入 memo 逻辑，**禁止手动使用 `useMemo` 和 `useCallback`**——它们会与编译器优化冲突，并带来不必要的维护成本。

### 前端状态管理

按数据来源选择状态方案，避免把服务端数据或应持久化的 UI 状态塞进 `useState` / `useReducer`。

| 数据类型 | 方案 | 示例 |
| -------- | ---- | ---- |
| 服务端数据 | **TanStack Query**（`useQuery` / `useInfiniteQuery` / `useMutation`） | 列表、详情、创建/删除 |
| 筛选、分页、排序等页面状态 | **URL search params**（TanStack Router `validateSearch`） | `?keyword=foo&sortBy=updatedAt` |
| 临时本地 UI 状态 | `useState` / `useReducer` | 弹窗开关、表单草稿、拖拽中间态 |

**URL 优先**：筛选条件、分页页码、排序字段等，只要用户可能刷新、分享或后退，就应写入 URL query，而不是组件 state。未提交的输入（如搜索框草稿）可暂存本地，提交后再同步到 URL。

**URL 只表达非默认状态**：路由的 `validateSearch` 仍须给缺失参数提供稳定的默认值，供组件安全使用；但 URL 不应序列化这些默认值。例如默认列表页使用 `/projects`，而非 `/projects?keyword=&sortBy=updatedAt`。为有默认值的 search 参数配置 TanStack Router 的 `stripSearchParams(默认值)` 中间件；用户清空筛选或切回默认排序时，也应自动移除对应参数。

**Query 管服务端数据**：组件内发起网络请求必须通过 TanStack Query，不在 `useEffect` 或事件处理里直接 `await` API。

**本地 state 只放临时态**：`useState` 仅用于不需要跨刷新保留、也不来自服务端的 UI 状态。不要把列表数据、加载中、错误信息手动维护在 state 里——交给 Query 的 `data` / `isPending` / `error`。

**例外**：登录态用 `resolveSession` / `rememberSession`（进程内三态缓存），**不走 Query**。TanStack Router 改查询参数也会重跑 `beforeLoad`，`shouldReload` 管不到它；守卫和顶栏必须共用这份缓存，否则筛选画布也会打 `/api/auth/get-session`。登录/登出仍用 `useMutation`。新的受保护页写 `beforeLoad: requireSession`。不要用无路径布局包一层——路由 id 会变成 `/_authenticated/canvas`，和 URL `/canvas` 不一致，`useSearch({ from })` 会对不上。

### 加载态（骨架屏，避免快请求闪烁）

快请求立刻出骨架再换成内容会闪一下。按「有没有可展示 data」分支，**不要**给骨架加最短展示时间（数据已到却继续看骨架）。

**复用边界：** 只复用策略和两个小原语；骨架 / 空态 / 错误每个模块自己写。**不要**再包 `useNiceQuery` 或通用 `<QuerySkeleton>`（会绑死「一定占位 + 一定骨架」，详情页、弹窗不适用）。

| 场景 | 做法 |
|------|------|
| 筛选 / 分页等会换 `queryKey` 的列表 | `useQuery` spread `keepPreviousQueryData`（`src/lib/query/loading.ts`），请求期间保留上一屏 |
| 尚无任何可展示 data（首访、硬刷新、该 key 从未成功） | `useDeferredPending(isPending)`（`src/hooks/use-deferred-pending.ts`），默认 250ms 内完成则不出骨架；超时仍 pending 再出骨架，等到数据即可 |
| 缓存命中 / `staleTime` 内回访 | 直接渲染内容 |
| 详情 / 一次性查询（不该沿用上一份 data） | 只用 `useDeferredPending`，不要 `keepPreviousQueryData` |

列表参考 `useModelsList` + `ModelsGrid`：

```ts
useQuery({ queryKey, queryFn, ...keepPreviousQueryData })
```

```tsx
const { data, isPending, isError, error } = useXxxList()
const showSkeleton = useDeferredPending(isPending)

if (showSkeleton) return <本模块骨架 />
if (isPending) return null
// 再处理 error / empty / 内容
```

`keepPreviousData` 时 `isPending === false`（已有 placeholder），筛选切换不会误出骨架。传入 hook 的必须是 Query 的 `isPending`。

**禁止事项**

- **禁止**用 `isPending` 立刻渲染整表骨架（快网会闪烁）
- **禁止**用 `isFetching` 驱动骨架（后台刷新、`keepPreviousData` 换 key 时也会为 true）
- **禁止**骨架最短展示时间（数据已返回仍等到满 N ms 才切内容）
- **禁止**把 `keepPreviousQueryData` 或延迟骨架设成 QueryClient 全局默认（详情页会短暂显示上一条；延迟是 UI 决策）

延迟窗口内（`isPending && !showSkeleton`）不要渲染空状态文案，返回 `null`，避免「暂无数据」闪一下再出列表。

### Feature 模块结构

业务放在 `packages/frontend/src/features/<module>/`。**按数据边界分文件，按文件数量决定要不要变成目录**——有则拆、无则扁平，不要为每个模块预先建空目录。

长大后的上限结构：

```
features/<module>/
  query-keys.ts     # TanStack Query key 工厂（有服务端读写才需要）
  api.ts            # HTTP 纯函数，无 React；作为 queryFn / mutationFn
  hooks.ts          # 或 hooks/：Query 封装 + 业务 hook（超过约 2 个文件再拆目录）
  components/       # 从页面拆出的子组件（有第 2 个才建目录）
  utils.ts          # 或 utils/：模块工具（有第 2 个文件再拆目录）
  types.ts          # 仅前端私有类型；DTO 用 @drama-me/shared，不要再抄一份
  <page>.tsx        # 页面入口（路由只挂这一个组件）
  index.ts          # 对外导出：页面、query-keys、必要时 hooks
```

| 层 | 职责 | 谁可以引用 |
| -- | ---- | ---------- |
| `query-keys.ts` | key 工厂，如 `canvasKeys.list(filters)` | 模块 hooks |
| `api.ts` | `HttpClient` + `throwIfNotOk` | 仅作为 `queryFn` / `mutationFn` |
| `hooks.ts` | `useQuery` / `useInfiniteQuery` / `useMutation` | 页面与模块内组件 |
| `components/` | 模块 UI 子块 | 本模块页面 |
| `index.ts` | 模块对外承诺 | `routes/`、少数跨模块调用（如布局里的 `useSignOut`） |

约束：

- **不要把 HTTP 写进 hooks**：`api.ts` 不依赖 React，便于测试和将来在非组件里复用。
- **组件里不要手写 Query 配置**：`queryKey`、`queryFn`、`invalidateQueries` 放在模块 hooks 里。
- **`index.ts` 不要全量 re-export 内部组件**，避免循环依赖、模糊边界。
- **没有服务端数据的模块**（如当前 `learn-flow`）不要硬建 `api.ts` / `query-keys.ts`。
- 筛选/分页/排序仍由路由 `validateSearch` 写入 URL，不要放进 feature 的 `types` 当「页面状态源」。
- 登出时用 `queryClient.clear()` 清掉当前用户的服务端缓存，避免 auth 依赖各个业务模块的 query-keys。

## 常用命令

```bash
pnpm dev            # 一键启动前后端
pnpm dev:be         # 仅启动后端 (端口 3001)
pnpm dev:fe         # 仅启动前端 (端口 5173)
pnpm format         # Biome 全量格式化
pnpm format:be      # Biome 仅格式化后端
pnpm format:fe      # Biome 仅格式化前端
pnpm lint           # Biome 全量检查
pnpm lint:be        # Biome 仅检查后端
pnpm lint:fe        # Biome 仅检查前端
```

## 前后端通信

后端导出 `AppType`，前端通过 `hc<AppType>` 创建类型安全客户端。API 路径、参数、返回值均自动推断，无需手动维护接口声明。

```
UI 组件
  ↕ TanStack Query
hc 类型安全 RPC 客户端
  ↕ HTTP (Vite proxy: /api/* → localhost:3001)
Hono 路由 (中间件 → 校验 → 业务逻辑)
  ↕ Drizzle ORM
SQLite
```

业务接口的成功/失败形状见 [docs/api-response.md](docs/api-response.md)。
