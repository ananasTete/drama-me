import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;

function PopoverContent({
	align = "center",
	className,
	side = "bottom",
	sideOffset = 4,
	...props
}: ComponentPropsWithoutRef<typeof PopoverPrimitive.Popup> &
	ComponentPropsWithoutRef<typeof PopoverPrimitive.Positioner>) {
	return (
		<PopoverPrimitive.Portal>
			<PopoverPrimitive.Positioner
				align={align}
				side={side}
				sideOffset={sideOffset}
			>
				<PopoverPrimitive.Popup
					data-slot="popover-content"
					className={cn(
						"z-50 rounded-xl border bg-popover text-popover-foreground shadow-lg outline-none animate-in fade-in-0 zoom-in-95",
						className,
					)}
					{...props}
				/>
			</PopoverPrimitive.Positioner>
		</PopoverPrimitive.Portal>
	);
}

export { Popover, PopoverContent, PopoverTrigger };
