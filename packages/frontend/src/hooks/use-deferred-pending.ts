import { useEffect, useState } from "react";

const DEFAULT_DELAY = 250;

/** 只有请求持续超过短暂延迟后才显示骨架，避免快速请求造成闪烁。 */
export function useDeferredPending(
	isPending: boolean,
	delay = DEFAULT_DELAY,
) {
	const [showSkeleton, setShowSkeleton] = useState(false);

	useEffect(() => {
		if (!isPending) {
			setShowSkeleton(false);
			return;
		}

		const timeoutId = window.setTimeout(() => {
			setShowSkeleton(true);
		}, delay);

		return () => window.clearTimeout(timeoutId);
	}, [delay, isPending]);

	return isPending && showSkeleton;
}
