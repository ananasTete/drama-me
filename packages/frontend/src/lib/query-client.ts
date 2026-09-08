import { isApiError } from "@/lib/api";
import { ERROR_CODE } from "@drama-me/shared";
import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";

let onUnauthorized: (() => void) | undefined;

export function setUnauthorizedHandler(handler: () => void) {
	onUnauthorized = handler;
}

/**
 * 会话在页面停留期间失效（cookie 过期、别处登出）时，路由守卫已经放行过了，
 * 只能靠接口的 401 兜底：清本地会话并送回登录页。
 */
function handleUnauthorized(error: unknown) {
	if (!isApiError(error, ERROR_CODE.UNAUTHORIZED)) {
		return;
	}

	onUnauthorized?.();
}

export const queryClient = new QueryClient({
	queryCache: new QueryCache({ onError: handleUnauthorized }),
	mutationCache: new MutationCache({ onError: handleUnauthorized }),
});
