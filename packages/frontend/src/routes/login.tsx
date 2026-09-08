import { LoginPage } from "@/features/auth";
import { resolvePostLoginRedirect, resolveSession } from "@/lib/auth";
import { createRoute, redirect } from "@tanstack/react-router";
import { Route as rootRoute } from "./__root";

export const Route = createRoute({
	getParentRoute: () => rootRoute,
	path: "/login",
	validateSearch: (search: Record<string, unknown>) => ({
		redirect: typeof search.redirect === "string" ? search.redirect : undefined,
	}),
	// 已登录用户不该停留在登录表单上
	beforeLoad: async ({ search }) => {
		if (await resolveSession()) {
			throw redirect({ to: resolvePostLoginRedirect(search.redirect) });
		}
	},
	component: LoginPage,
});
