import { ERROR_CODE } from "@drama-me/shared";
import type { Context, MiddlewareHandler } from "hono";
import { AppError } from "../lib/app-error";
import { auth } from "../lib/auth";
import type { AuthType } from "../lib/auth";

type AuthContext = Context<{ Variables: AuthType }>;

/** 中间件已通过后取当前用户；缺失则视为未登录 */
export function requireUser(c: AuthContext) {
	const user = c.get("user");
	if (!user) {
		throw new AppError(ERROR_CODE.UNAUTHORIZED, 401, "Unauthorized");
	}
	return user;
}

// 鉴权中间件：校验 better-auth session
// - 未登录 → AppError 401
// - 已登录 → 把 user / session 注入 Hono 上下文
export const authMiddleware: MiddlewareHandler<{
	Variables: AuthType;
}> = async (c, next) => {
	const session = await auth.api.getSession({ headers: c.req.raw.headers });
	if (!session) {
		throw new AppError(ERROR_CODE.UNAUTHORIZED, 401, "Unauthorized");
	}
	c.set("user", session.user);
	c.set("session", session.session);
	await next();
};
