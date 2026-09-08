import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

function TooltipProvider({
	delay = 0,
	...props
}: ComponentPropsWithoutRef<typeof TooltipPrimitive.Provider>) {
	return <TooltipPrimitive.Provider delay={delay} {...props} />;
}
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

function TooltipContent({
	className,
	sideOffset = 6,
	...props
}: ComponentPropsWithoutRef<typeof TooltipPrimitive.Popup> & {
	sideOffset?: number;
}) {
	return (
		<TooltipPrimitive.Portal>
			<TooltipPrimitive.Positioner sideOffset={sideOffset}>
				<TooltipPrimitive.Popup
					data-slot="tooltip-content"
					className={cn(
						"z-50 rounded-md bg-foreground px-2 py-1 text-xs text-background shadow-sm animate-in fade-in-0 zoom-in-95",
						className,
					)}
					{...props}
				/>
			</TooltipPrimitive.Positioner>
		</TooltipPrimitive.Portal>
	);
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
