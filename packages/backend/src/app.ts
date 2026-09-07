import { Hono } from "hono";
import { handleError } from "./lib/app-error";
import { authRoute } from "./routes/auth";
import { canvases } from "./routes/canvas";
import { health } from "./routes/health";
import { me } from "./routes/me";

// 路由总挂载：
// - /api/auth/*     → better-auth（账号密码登录 / 登出 / session / Google）
// - /api/health     → 健康检查
// - /api/me         → 受保护业务路由示例（需登录）
// - /api/canvases*  → 画布增删查（需登录）
const app = new Hono()
	.onError(handleError)
	.route("/api/auth", authRoute)
	.route("/api", health)
	.route("/api", me)
	.route("/api", canvases);

export type AppType = typeof app;
export { app };
