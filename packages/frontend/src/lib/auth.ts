import { useSessionStore } from "@/stores/session";
import { redirect } from "@tanstack/react-router";
import { authClient } from "./auth-client";
import type { AuthSession } from "./auth-client";

/**
 * 进程内会话缓存（不进 localStorage）。
 *
 * 三态：undefined = 还没查过，null = 已确认未登录，对象 = 已登录。
 * 登录凭证仍是 HttpOnly cookie；这里只是 cookie 翻译成用户信息的结果。
 *
 * 必须有这份缓存：TanStack Router 改查询参数也会重跑 beforeLoad，
 * shouldReload 只影响 loader，拦不住 get-session。会话和 URL 无关，
 * 所以守卫只在「还没查过 / 登录登出 / 401」时才打网络。
 */
let inflight: Promise<AuthSession | null> | null = null;

export function getRememberedSession(): AuthSession | null | undefined {
	return useSessionStore.getState().session;
}

export function rememberSession(session: AuthSession | null) {
	useSessionStore.getState().setSession(session);
}

async function fetchSession(): Promise<AuthSession | null> {
	const { data } = await authClient.getSession();
	const session = data ?? null;
	rememberSession(session);
	return session;
}

/**
 * 读取当前会话：已有确定值就直接返回，并发调用共用同一次请求。
 * `force` 用于登录成功后 cookie 刚换过，必须忽略旧的「未登录」缓存。
 */
export async function resolveSession(options?: {
	force?: boolean;
}): Promise<AuthSession | null> {
	if (options?.force) {
		return fetchSession();
	}

	const rememberedSession = getRememberedSession();
	if (rememberedSession !== undefined) {
		return rememberedSession;
	}

	if (!inflight) {
		inflight = fetchSession().finally(() => {
			inflight = null;
		});
	}

	return inflight;
}

/**
 * 受保护路由的守卫，直接用作 beforeLoad。
 * 未登录时跳登录页，并把当前地址（含查询参数）记进 search.redirect。
 * 注意这只是体验优化，真正的边界是后端的 authMiddleware。
 */
function requireResolvedSession(
	session: AuthSession | null,
	location: { href: string },
) {
	if (!session) {
		throw redirect({ to: "/login", search: { redirect: location.href } });
	}
	return { session };
}

export function requireSession({
	location,
}: {
	location: { href: string };
}) {
	const rememberedSession = getRememberedSession();
	if (rememberedSession !== undefined) {
		return requireResolvedSession(rememberedSession, location);
	}

	return resolveSession().then((session) =>
		requireResolvedSession(session, location),
	);
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
