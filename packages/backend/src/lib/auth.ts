import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { phoneNumber } from "better-auth/plugins";
import { db, schema } from "../db";

export const auth = betterAuth({
	// 数据库：Drizzle + bun:sqlite
	database: drizzleAdapter(db, {
		provider: "sqlite",
		schema,
	}),
	// 允许的前端来源（本地开发 5173）
	trustedOrigins: ["http://localhost:5173"],
	// 关闭邮箱密码登录，只保留手机号 + Google
	emailAndPassword: { enabled: false },
	// Session 策略 —— 对应你问的「token 过期刷新」
	session: {
		expiresIn: 60 * 60 * 24 * 7, // 7 天有效
		updateAge: 60 * 60 * 24, // 剩余 < 1 天时滚动续期（用户活跃就不会过期）
		cookieCache: {
			enabled: true,
			maxAge: 5 * 60, // 5 分钟 cookie 缓存（≈ 短期 access token，减少 DB 查询）
		},
	},
	// Google 登录（凭证为空时该 provider 不生效，不影响手机号流程）
	socialProviders: {
		google: {
			clientId: process.env.GOOGLE_CLIENT_ID ?? "",
			clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
		},
	},
	plugins: [
		phoneNumber({
			// 开发期：把验证码打印到控制台，方便调试
			// 生产环境替换为真实短信服务商（阿里云/Twilio 等）
			// 注意：官方建议不要 await 此函数，避免时序攻击
			sendOTP: ({ phoneNumber, code }) => {
				console.log(`\n[OTP] 验证码已发送到 ${phoneNumber}: ${code}\n`);
			},
			// 验证码校验通过后自动注册（用户不存在则创建）
			signUpOnVerification: {
				// better-auth 的 user.email 是必填字段，手机号用户没有邮箱，生成一个临时占位邮箱
				getTempEmail: (phone) => `${phone}@phone.drama-me.local`,
				getTempName: (phone) => phone,
			},
		}),
	],
});

// 给 Hono 中间件用的类型：当前登录用户与 session
export type AuthType = {
	user: typeof auth.$Infer.Session.user | null;
	session: typeof auth.$Infer.Session.session | null;
};
