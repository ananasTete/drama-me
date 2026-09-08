import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "@/components/ui/select";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { MiniMap, Panel, useReactFlow, useViewport } from "@xyflow/react";
import { Grid2X2, Map, Minus, Plus } from "lucide-react";
import { useState } from "react";
import { useUpdateCanvasSettings } from "../hooks";

type CanvasPositioningPanelProps = {
	canvasId: string;
	snapToGrid: boolean;
};

const ZOOM_PERCENTAGES = [
	10, 12, 14, 17, 21, 25, 30, 36, 43, 50, 62, 74, 89, 100, 128, 154,
	185, 200, 222, 266, 319, 383, 400,
] as const;

const QUICK_ZOOM_PERCENTAGES = [50, 100, 200] as const;

const FIT_VIEW_VALUE = "fit-view";

function getPreviousZoom(zoomPercentage: number): number {
	return (
		[...ZOOM_PERCENTAGES]
			.reverse()
			.find((percentage) => percentage < zoomPercentage) ?? ZOOM_PERCENTAGES[0]
	);
}

function getNextZoom(zoomPercentage: number): number {
	return (
		ZOOM_PERCENTAGES.find((percentage) => percentage > zoomPercentage) ??
		ZOOM_PERCENTAGES.at(-1)!
	);
}

export function CanvasPositioningPanel({
	canvasId,
	snapToGrid,
}: CanvasPositioningPanelProps) {
	const [miniMapOpen, setMiniMapOpen] = useState(false);
	const updateCanvasSettings = useUpdateCanvasSettings();
	const reactFlow = useReactFlow();
	const viewport = useViewport();
	const zoomPercentage = Math.round(viewport.zoom * 100);
	const previousZoom = getPreviousZoom(zoomPercentage);
	const nextZoom = getNextZoom(zoomPercentage);

	function setZoom(zoom: number) {
		void reactFlow.setViewport({ ...viewport, zoom: zoom / 100 });
	}

	return (
		<TooltipProvider>
			<Panel
				position="bottom-left"
				className="flex items-center gap-1 rounded-xl border bg-background p-1 shadow-sm"
			>
				<Tooltip>
					<TooltipTrigger
						render={
							<Button
								aria-label="网格吸附"
								aria-pressed={snapToGrid}
								className={cn(snapToGrid && "bg-muted text-foreground")}
								disabled={updateCanvasSettings.isPending}
								size="icon"
								variant="ghost"
								onClick={() =>
									updateCanvasSettings.mutate({
										id: canvasId,
										snapToGrid: !snapToGrid,
									})
								}
							>
								<Grid2X2 />
							</Button>
						}
					/>
					<TooltipContent>网格吸附</TooltipContent>
				</Tooltip>

				<Popover
					open={miniMapOpen}
					onOpenChange={(open, eventDetails) => {
						// 只接受按钮的点击；画布外点击、失焦和 Esc 都不能收起小地图。
						if (eventDetails.reason === "trigger-press") {
							setMiniMapOpen(open);
						}
					}}
				>
					<Tooltip>
						<TooltipTrigger
							render={
								<PopoverTrigger
									render={
										<Button
											aria-label="小地图"
											aria-pressed={miniMapOpen}
											className={cn(
												miniMapOpen && "bg-muted text-foreground",
											)}
											size="icon"
											variant="ghost"
										>
											<Map />
										</Button>
									}
								/>
							}
						/>
						<TooltipContent>小地图</TooltipContent>
					</Tooltip>

					<PopoverContent align="center" side="top" sideOffset={12} className={'overflow-hidden'}>
						<MiniMap
							pannable
							zoomable
							style={{ height: 160, margin: 0, position: "static", width: 240 }}
						/>
					</PopoverContent>
				</Popover>

				<div
					aria-orientation="vertical"
					className="mx-1 h-5 w-px bg-border"
					role="separator"
				/>

				<Tooltip>
					<TooltipTrigger
						render={
							<Button
								aria-label="缩小画布"
								disabled={zoomPercentage <= ZOOM_PERCENTAGES[0]}
								size="icon"
								variant="ghost"
								onClick={() => setZoom(previousZoom)}
							>
								<Minus />
							</Button>
						}
					/>
					<TooltipContent>缩小</TooltipContent>
				</Tooltip>

				<Select
					onValueChange={(value) => {
						if (value === FIT_VIEW_VALUE) {
							void reactFlow.fitView({ duration: 200, padding: 0.2 });
							return;
						}

						setZoom(Number(value));
					}}
					value={String(zoomPercentage)}
				>
					<SelectTrigger
						aria-label="缩放比例"
						className="h-8 min-w-18 border-0 bg-transparent px-2 hover:bg-muted"
						size="sm"
					>
						{`${zoomPercentage}%`}
					</SelectTrigger>
					<SelectContent align="center" side="top">
						{QUICK_ZOOM_PERCENTAGES.map((percentage) => (
							<SelectItem key={percentage} value={String(percentage)}>
								{`${percentage}%`}
							</SelectItem>
						))}
						<SelectItem value={FIT_VIEW_VALUE}>适应屏幕</SelectItem>
					</SelectContent>
				</Select>

				<Tooltip>
					<TooltipTrigger
						render={
							<Button
								aria-label="放大画布"
								disabled={zoomPercentage >= ZOOM_PERCENTAGES.at(-1)!}
								size="icon"
								variant="ghost"
								onClick={() => setZoom(nextZoom)}
							>
								<Plus />
							</Button>
						}
					/>
					<TooltipContent>放大</TooltipContent>
					</Tooltip>
			</Panel>
		</TooltipProvider>
	);
}
