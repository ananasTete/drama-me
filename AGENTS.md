# drama-me — AGENTS.md

## 项目简介

drama-me 是一个前后端分离的 Web 应用，采用 monorepo 架构。**用户是后端新手，这个项目是其第一个后端学习项目。** 所有设计与实现都应该是最佳实践、所有代码修改和解释应考虑教学性和可理解性。

## 技术栈

| 层 | 技术 |
| --- | --- |
| 运行时 | Bun |
| 后端框架 | Hono |
| 前端框架 | React 19 + Vite + TypeScript |
| 路由/数据 | TanStack Router + TanStack Query |
| 样式 | Tailwind CSS v4 + shadcn/ui |
| 状态管理 | Zustand |
| 校验 | Zod |
| 数据库 | SQLite + Drizzle ORM（准备中） |
| 包管理 | pnpm workspaces |
| 并行任务 | Turbo |
| 代码规范 | Biome |

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
│   │       ├── routes/        # 页面路由
│   │       ├── components/    # UI 组件
│   │       ├── lib/           # 工具函数、API 客户端
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

### 后端学习重点

- Hono 路由定义与中间件机制
- Zod 请求校验与类型推导
- Hono RPC 类型导出 → 前端自动推断
- Drizzle ORM schema 定义与查询
- HTTP 基本概念：路由、状态码、CORS

### 代码风格

- 使用 Biome 进行格式化和 lint（`pnpm format` / `pnpm lint`）
- TypeScript 严格模式
- 不使用 `any`（除非绝对必要）
- 函数和组件应有明确的类型标注

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

## 给 AI 的指导

1. **优先解释「为什么」而非只给代码** — 用户在学习后端
2. **给出可运行的完整代码** — 每段代码都应能直接使用
3. **避免一次性大量修改** — 分步骤、可验证的方式推进
4. **复杂变动先给方案** — 解释改动范围和影响
5. **修改后端代码时指出对应的 Hono/HTTP 概念** — 帮助用户建立知识关联
6. **修改后提醒运行 `pnpm format` 和 `pnpm dev` 验证**
