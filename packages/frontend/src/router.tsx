import { rememberSession } from "@/lib/auth";
import { queryClient, setUnauthorizedHandler } from "@/lib/query-client";
import { createRouter } from "@tanstack/react-router";
import { Route as rootRoute } from "./routes/__root";
import { Route as canvasDetailRoute } from "./routes/canvas-detail";
import { Route as indexRoute } from "./routes/index";
import { Route as learnFlowRoute } from "./routes/learn-flow";
import { Route as loginRoute } from "./routes/login";
import { Route as projectsRoute } from "./routes/projects";

const routeTree = rootRoute.addChildren([
	indexRoute,
	learnFlowRoute,
	projectsRoute,
	canvasDetailRoute,
	loginRoute,
]);

export const router = createRouter({
	routeTree,
	context: { queryClient },
});

setUnauthorizedHandler(() => {
	const { pathname, href } = router.state.location;
	if (pathname === "/login") {
		return;
	}

	rememberSession(null);
	void router.navigate({
		to: "/login",
		search: { redirect: href },
		replace: true,
	});
});

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}
