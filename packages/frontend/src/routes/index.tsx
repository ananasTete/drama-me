import { createRoute } from "@tanstack/react-router";
import { Route as rootRoute } from "./__root";

export const Route = createRoute({
	getParentRoute: () => rootRoute,
	path: "/",
	component: () => (
		<div>
			<h2 className="text-2xl font-semibold mb-2">drama-me</h2>
			<p className="text-muted-foreground">
				Welcome. Go to /test to verify the backend connection.
			</p>
		</div>
	),
});
