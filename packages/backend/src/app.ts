import { Hono } from "hono";
import { authRoute } from "./routes/auth";
import { health } from "./routes/health";
import { me } from "./routes/me";

// 路由总挂载：
// - /api/auth/*    → better-auth 处理（登录/注册/验证码/session/登出）
// - /api/health    → 健康检查
// - /api/me        → 受保护业务路由示例（需登录）
const app = new Hono()
	.route("/api/auth", authRoute)
	.route("/api", health)
	.route("/api", me);

export type AppType = typeof app;
export { app };
