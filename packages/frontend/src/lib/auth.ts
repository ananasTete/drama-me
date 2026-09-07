import { redirect } from "@tanstack/react-router";
import { createAuthClient } from "better-auth/react";

// 与后端 /api/auth/* 同源（Vite proxy），cookie 自动带上
export const authClient = createAuthClient({
	baseURL: "",
});

export type AuthSession = typeof authClient.$Infer.Session;

/**
 * 读取当前会话。
 * 登录凭证是 HttpOnly cookie，这里只是把它翻译成用户信息，不在前端缓存：
 * 后端开了 cookieCache，命中时不查库，一次往返很便宜，换来的是永远不会读到过期会话。
 */
export async function loadSession(): Promise<AuthSession | null> {
	const { data } = await authClient.getSession();
	return data ?? null;
}

/**
 * 受保护路由的守卫，直接用作路由的 beforeLoad。
 * 未登录时跳登录页，并把当前地址（含查询参数）记进 search.redirect 用于登录后返回。
 * 注意这只是体验优化，真正的边界是后端的 authMiddleware。
 */
export async function requireSession({
	location,
}: {
	location: { href: string };
}) {
	const session = await loadSession();
	if (!session) {
		throw redirect({ to: "/login", search: { redirect: location.href } });
	}
	return { session };
}

/**
 * 登录成功后的跳转目标：优先 search.redirect，否则首页。
 * 只接受站内相对地址——"//host" 会被浏览器当成外站，必须排除。
 */
export function resolvePostLoginRedirect(redirectTo?: string): string {
	if (
		typeof redirectTo === "string" &&
		redirectTo.startsWith("/") &&
		!redirectTo.startsWith("//") &&
		!redirectTo.startsWith("/login")
	) {
		return redirectTo;
	}
	return "/";
}

export function formatAccountLabel(email: string, name: string): string {
	if (email.endsWith("@account.drama-me.local")) {
		return email.replace("@account.drama-me.local", "");
	}
	return name || email;
}
