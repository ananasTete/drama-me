# TanStack Router 登录权限路由

使用 TanStack Router 的无路径路由和 `beforeLoad` 做统一权限校验：登录成功后把 Session 快照保存到 Zustand；首次加载时异步恢复 Session，登录后的内部跳转通过 `getState()` 同步放行；收到 401 或退出登录时清理 Session。

## 路由结构

无路径路由不会增加 URL 层级，只负责包住所有受保护页面：

```text
/
├── /login
└── /_authenticated          # 无路径布局，只用于鉴权
    ├── /projects
    └── /canvas/$canvasId
```

实际 URL 仍然是 `/projects` 和 `/canvas/:canvasId`。使用文件路由时，子路由的 route id 会包含 `/_authenticated`，例如 `/_authenticated/projects`；`useSearch` 的 `from` 应使用生成的 route id。

## 1. 使用 Zustand 保存 Session 快照

Session 使用三态表示：

- `undefined`：还没有完成首次恢复
- `null`：已经确认未登录
- 对象：已经登录

只保存用于 UI 和路由判断的快照，不保存真正的登录凭证，也不把它当作服务端权限。Zustand 同时支持 React 组件订阅和路由守卫外部读取：

```ts
import { create } from "zustand";

type Session = {
	user: { id: string; name: string };
};

type SessionState = {
	session: Session | null | undefined;
	setSession: (session: Session | null) => void;
};

export const useSessionStore = create<SessionState>((set) => ({
	session: undefined,
	setSession: (session) => set({ session }),
}));
```

## 2. 首次异步恢复，之后同步校验

首次打开网页时，前端不知道当前凭证是否仍然有效，需要请求服务端恢复 Session。使用 `inflight` 合并并发请求，避免顶栏和路由守卫同时恢复两次：

```ts
let inflight: Promise<Session | null> | null = null;

function getSession(): Promise<Session | null> {
	return fetchSessionFromServer();
}

export function resolveSession(): Promise<Session | null> {
	const remembered = useSessionStore.getState().session;
	if (remembered !== undefined) {
		return Promise.resolve(remembered);
	}

	if (!inflight) {
		inflight = getSession()
			.then((session) => {
				useSessionStore.getState().setSession(session);
				return session;
			})
			.finally(() => {
				inflight = null;
			});
	}

	return inflight;
}
```

关键点是 `requireSession` 不要无条件声明为 `async`。缓存已经确定时直接返回对象，只有首次恢复时才返回 Promise：

```ts
import { redirect } from "@tanstack/react-router";

function assertSession(
	session: Session | null,
	location: { href: string },
) {
	if (!session) {
		throw redirect({
			to: "/login",
			search: { redirect: location.href },
		});
	}

	return { session };
}

export function requireSession({
	location,
}: {
	location: { href: string };
}) {
	const remembered = useSessionStore.getState().session;

	if (remembered !== undefined) {
		return assertSession(remembered, location);
	}

	return resolveSession().then((session) =>
		assertSession(session, location),
	);
}
```

## 3. 在无路径路由统一挂载 `beforeLoad`

```tsx
import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated")({
	beforeLoad: requireSession,
	component: () => <Outlet />,
});
```

所有受保护页面都放在这个路由下面，不需要每个页面重复写鉴权逻辑。公开页面（例如 `/login`）放在它外面。

## 4. 登录、退出和 401

登录成功后，先刷新并保存 Session，再导航到目标页面：

```ts
await resolveSession({ force: true });
await navigate({ to: "/projects" });
```

退出登录时清除快照和服务端 Query 缓存：

```ts
useSessionStore.getState().setSession(null);
queryClient.clear();
await router.navigate({ to: "/login" });
```

任何 API 返回 401 时都执行同样的清理和跳转，避免界面继续显示已经失效的用户数据。

## 安全边界

前端 `beforeLoad` 只是路由体验层，不能作为真正的权限边界。每个返回私有数据或执行写操作的服务端接口，都必须自行验证当前请求的凭证和资源权限。
