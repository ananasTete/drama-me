import { createRouter } from "@tanstack/react-router";
import { Route as rootRoute } from "./routes/__root";
import { Route as canvasRoute } from "./routes/canvas";
import { Route as indexRoute } from "./routes/index";
import { Route as learnFlowRoute } from "./routes/learn-flow";
import { Route as loginRoute } from "./routes/login";
import { Route as testRoute } from "./routes/test";

const routeTree = rootRoute.addChildren([
	indexRoute,
	testRoute,
	learnFlowRoute,
	canvasRoute,
	loginRoute,
]);

export const router = createRouter({
	routeTree,
});

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}
