import type { MiddlewareHandler } from "hono";
import { auth } from "../lib/auth";
import type { AuthType } from "../lib/auth";

// 鉴权中间件：校验 better-auth session
// - 未登录 → 返回 401
// - 已登录 → 把 user / session 注入 Hono 上下文，业务路由可用 c.get("user")
//
// better-auth 的 cookie（含 session token）会随请求自动带上（前端走 Vite proxy 同源）
export const authMiddleware: MiddlewareHandler<{
	Variables: AuthType;
}> = async (c, next) => {
	const session = await auth.api.getSession({ headers: c.req.raw.headers });
	if (!session) {
		return c.json({ error: "UNAUTHORIZED" }, 401);
	}
	c.set("user", session.user);
	c.set("session", session.session);
	await next();
};
