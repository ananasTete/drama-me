import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { useSession, useSignOut } from "@/features/auth";
import { formatAccountLabel } from "@/lib/auth";
import {
	Link,
	Outlet,
	createRootRoute,
	useRouterState,
} from "@tanstack/react-router";

// 根路由不做鉴权：公开页面无需会话。
// 需要登录的页面在自己的 beforeLoad 里挂 requireSession（见 routes/canvas.tsx）。
export const Route = createRootRoute({
	component: RootLayout,
});

function RootLayout() {
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	});

	if (pathname === "/login") {
		return (
			<div className="flex min-h-dvh flex-col bg-background">
				<Outlet />
			</div>
		);
	}

	return (
		<div className="flex h-dvh flex-col overflow-hidden">
			<header className="flex items-center gap-6 border-b px-6 py-3">
				<h1 className="font-bold text-lg">drama-me</h1>
				<nav className="flex flex-1 gap-4">
					<Link to="/" className="text-sm hover:underline">
						Home
					</Link>
					<Link
						to="/canvas"
						search={{ keyword: "", sortBy: "updatedAt" }}
						className="text-sm hover:underline"
					>
						Canvas
					</Link>
					<Link to="/learn-flow" className="text-sm hover:underline">
						Learn Flow
					</Link>
				</nav>
				<div className="flex items-center gap-3">
					<ThemeToggle />
					<AccountMenu />
				</div>
			</header>
			<main className="flex min-h-0 flex-1 flex-col p-6">
				<Outlet />
			</main>
		</div>
	);
}

function AccountMenu() {
	const { data: session, isPending } = useSession();
	const signOutMutation = useSignOut();

	// 首次拉取会话时不渲染，避免「登录」和账号名之间闪一下
	if (isPending) {
		return null;
	}

	if (!session) {
		return (
			<Link
				to="/login"
				search={{ redirect: undefined }}
				className="text-sm hover:underline"
			>
				登录
			</Link>
		);
	}

	return (
		<div className="flex items-center gap-3">
			<span className="max-w-40 truncate text-muted-foreground text-sm">
				{formatAccountLabel(session.user.email, session.user.name)}
			</span>
			<Button
				type="button"
				variant="outline"
				size="sm"
				onClick={() => signOutMutation.mutate()}
				disabled={signOutMutation.isPending}
			>
				{signOutMutation.isPending ? "退出中..." : "退出登录"}
			</Button>
		</div>
	);
}
