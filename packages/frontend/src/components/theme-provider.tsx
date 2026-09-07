import { applyTheme } from "@/lib/theme";
import { useThemeStore } from "@/stores/theme";
import type { ReactNode } from "react";
import { useEffect } from "react";

/** 监听系统配色变化，并在 theme === "system" 时重新应用 */
export function ThemeProvider({ children }: { children: ReactNode }) {
	const theme = useThemeStore((state) => state.theme);

	useEffect(() => {
		applyTheme(theme);
	}, [theme]);

	useEffect(() => {
		if (theme !== "system") {
			return;
		}

		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
		const handleChange = () => applyTheme("system");

		mediaQuery.addEventListener("change", handleChange);
		return () => mediaQuery.removeEventListener("change", handleChange);
	}, [theme]);

	return children;
}
