import { createRouter } from "@tanstack/react-router";
import { Route as rootRoute } from "./routes/__root";
import { Route as canvasRoute } from "./routes/canvas";
import { Route as indexRoute } from "./routes/index";
import { Route as learnFlowRoute } from "./routes/learn-flow";
import { Route as loginRoute } from "./routes/login";

const routeTree = rootRoute.addChildren([
	indexRoute,
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
