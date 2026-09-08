import {
	rememberSession,
	resolvePostLoginRedirect,
	resolveSession,
} from "@/lib/auth";
import { authClient } from "@/lib/auth-client";
import { useSessionStore } from "@/stores/session";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { signInOrSignUp } from "./api";

/**
 * 顶栏等组件展示当前登录用户用。
 * 读的是进程内会话缓存，和路由守卫共用；首次挂载时若还没查过才请求一次。
 */
export function useSession() {
	const session = useSessionStore((state) => state.session);

	useEffect(() => {
		void resolveSession();
	}, []);

	return {
		data: session,
		isPending: session === undefined,
	};
}

export function useSignIn(redirect?: string) {
	const navigate = useNavigate();

	return useMutation({
		mutationFn: async (input: { account: string; password: string }) => {
			const result = await signInOrSignUp(input.account, input.password);
			if (!result.ok) {
				throw new Error(result.message);
			}
		},
		onSuccess: async () => {
			// cookie 刚换过，必须强制重拉，不能沿用登录页 beforeLoad 写下的 null
			await resolveSession({ force: true });
			await navigate({ to: resolvePostLoginRedirect(redirect) });
		},
	});
}

export function useSignOut() {
	const router = useRouter();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: () => authClient.signOut(),
		onMutate: () => {
			rememberSession(null);
		},
		onSuccess: async () => {
			// 清掉当前用户的全部服务端缓存，避免下一个用户看到残留数据
			queryClient.clear();
			await router.navigate({
				to: "/login",
				search: { redirect: undefined },
				replace: true,
			});
		},
	});
}
