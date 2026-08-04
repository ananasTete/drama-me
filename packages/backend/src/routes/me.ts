import { Hono } from "hono";
import type { AuthType } from "../lib/auth";
import { authMiddleware } from "../middleware/auth";

// 受保护路由示例：演示如何在业务路由上套用鉴权中间件
// 后续真实的业务路由（如获取用户数据）可参照此模式：先 .use(authMiddleware) 再定义处理逻辑
const me = new Hono<{ Variables: AuthType }>()
	.use(authMiddleware)
	.get("/me", (c) => {
		const user = c.get("user");
		return c.json({ user });
	});

export { me };
