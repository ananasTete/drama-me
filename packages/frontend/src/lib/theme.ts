export type Theme = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "drama-me-theme";

const themes: Theme[] = ["light", "dark", "system"];

export function isTheme(value: string): value is Theme {
	return themes.includes(value as Theme);
}

export function getSystemTheme(): "light" | "dark" {
	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
}

export function resolveTheme(theme: Theme): "light" | "dark" {
	return theme === "system" ? getSystemTheme() : theme;
}

/** 把解析后的主题同步到 <html> 的 class，供 Tailwind dark: 变体使用 */
export function applyTheme(theme: Theme) {
	const resolved = resolveTheme(theme);
	document.documentElement.classList.toggle("dark", resolved === "dark");
}
