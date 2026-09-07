import { authClient, loadSession, resolvePostLoginRedirect } from "@/lib/auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { signInOrSignUp } from "./api";
import { authKeys } from "./query-keys";

/**
 * 顶栏等组件展示当前登录用户用。
 * 路由守卫不走这里——它在 beforeLoad 里直接 loadSession()，不依赖组件生命周期。
 */
export function useSession() {
	return useQuery({
		queryKey: authKeys.session(),
		queryFn: loadSession,
		staleTime: 5 * 60 * 1000,
	});
}

export function useSignIn(redirect?: string) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: { account: string; password: string }) => {
			const result = await signInOrSignUp(input.account, input.password);
			if (!result.ok) {
				throw new Error(result.message);
			}
		},
		onSuccess: async () => {
			// 只标记过期：登录页没有渲染顶栏，所以此刻不会重新请求；
			// 跳转后顶栏挂载时才拉一次，避免和目标页守卫的 loadSession 撞成两次。
			void queryClient.invalidateQueries({ queryKey: authKeys.session() });
			await navigate({ to: resolvePostLoginRedirect(redirect) });
		},
	});
}

export function useSignOut() {
	const router = useRouter();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: () => authClient.signOut(),
		onSuccess: async () => {
			// 清掉当前用户的全部服务端缓存（含 session 查询），避免下一个用户看到残留数据
			queryClient.clear();
			await router.navigate({
				to: "/login",
				search: { redirect: undefined },
				replace: true,
			});
		},
	});
}
