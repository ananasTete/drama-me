import { Button } from "@/components/ui/button";
import { HttpClient } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { createRoute } from "@tanstack/react-router";
import { Route as rootRoute } from "./__root";

export const Route = createRoute({
	getParentRoute: () => rootRoute,
	path: "/test",
	component: TestPage,
});

function TestPage() {
	const { data, error, isLoading, isError, refetch, isFetching } = useQuery({
		queryKey: ["health"],
		queryFn: async () => {
			const res = await HttpClient.api.health.$get();
			return res.json();
		},
	});

	return (
		<div className="space-y-4">
			<h2 className="text-2xl font-semibold">Backend Connection Test</h2>

			<Button onClick={() => refetch()} disabled={isFetching}>
				{isFetching ? "Loading..." : "Refresh"}
			</Button>

			{isLoading && <p className="text-muted-foreground">Connecting...</p>}

			{isError && (
				<div className="text-red-500">
					<p>Error: {error?.message ?? "Unknown error"}</p>
				</div>
			)}

			{data && (
				<div className="border rounded-lg p-4 space-y-1">
					<p>
						<span className="font-medium">Status:</span>{" "}
						<span className="text-green-600">{data.status}</span>
					</p>
					<p>
						<span className="font-medium">Timestamp:</span> {data.timestamp}
					</p>
				</div>
			)}
		</div>
	);
}
