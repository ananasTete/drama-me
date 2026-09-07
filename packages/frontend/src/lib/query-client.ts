import { authKeys } from "@/features/auth/query-keys";
import { isApiError } from "@/lib/api";
import { router } from "@/router";
import { ERROR_CODE } from "@drama-me/shared";
import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";

/**
 * 会话在页面停留期间失效（cookie 过期、别处登出）时，路由守卫已经放行过了，
 * 只能靠接口的 401 兜底：把用户送回登录页，而不是让他盯着一个永远加载失败的页面。
 */
function handleUnauthorized(error: unknown) {
	if (!isApiError(error, ERROR_CODE.UNAUTHORIZED)) {
		return;
	}

	const { pathname, href } = router.state.location;
	if (pathname === "/login") {
		return;
	}

	// 让顶栏重新拉一次会话，切换回未登录态
	void queryClient.invalidateQueries({ queryKey: authKeys.session() });
	void router.navigate({
		to: "/login",
		search: { redirect: href },
		replace: true,
	});
}

export const queryClient = new QueryClient({
	queryCache: new QueryCache({ onError: handleUnauthorized }),
	mutationCache: new MutationCache({ onError: handleUnauthorized }),
});
