import { SignInOrSignUpBodySchema } from "@drama-me/shared";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db";
import { user } from "../db/schema";
import { auth } from "../lib/auth";
import { jsonValidator } from "../lib/zod-validator";

// better-auth 认证端点挂载到 /api/auth/*
// 包括：账号密码登录/注册、获取 session、登出、Google 回调等
const authRoute = new Hono()
	// 必须写在 better-auth 的 /* 之前，否则会被 catch-all 吃掉
	.post(
		"/sign-in-or-up",
		jsonValidator(SignInOrSignUpBodySchema),
		async (c) => {
			const { email, password, name } = c.req.valid("json");
			const [existing] = await db
				.select({ id: user.id })
				.from(user)
				.where(eq(user.email, email))
				.limit(1);

			const headers = c.req.raw.headers;
			// 先查库再只调一次 better-auth：已存在 → 登录，不存在 → 注册并自动登录。
			// 不要在前端用「注册失败再登录」当控制流，否则网络面板里会先出现 USER_ALREADY_EXISTS。
			if (existing) {
				return auth.api.signInEmail({
					body: { email, password },
					headers,
					asResponse: true,
				});
			}
			return auth.api.signUpEmail({
				body: { email, password, name },
				headers,
				asResponse: true,
			});
		},
	)
	.on(["POST", "GET"], "/*", (c) => auth.handler(c.req.raw));

export { authRoute };
