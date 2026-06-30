import { Link, Outlet, createRootRoute } from "@tanstack/react-router";

export const Route = createRootRoute({
	component: () => (
		<div className="min-h-dvh flex flex-col">
			<header className="border-b px-6 py-3 flex items-center gap-6">
				<h1 className="font-bold text-lg">drama-me</h1>
				<nav className="flex gap-4">
					<Link to="/" className="text-sm hover:underline">
						Home
					</Link>
					<Link to="/test" className="text-sm hover:underline">
						Test
					</Link>
				</nav>
			</header>
			<main className="flex-1 p-6">
				<Outlet />
			</main>
		</div>
	),
});
