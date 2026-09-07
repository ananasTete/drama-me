import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "@/components/ui/select";
import { isTheme, resolveTheme, type Theme } from "@/lib/theme";
import { useThemeStore } from "@/stores/theme";
import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";

const themeOptions = [
	{ value: "light" as const, label: "浅色", icon: SunIcon },
	{ value: "dark" as const, label: "深色", icon: MoonIcon },
	{ value: "system" as const, label: "跟随系统", icon: MonitorIcon },
];

function ThemeTriggerIcon({ theme }: { theme: Theme }) {
	if (theme === "system") {
		return <MonitorIcon className="size-4" />;
	}

	if (theme === "dark") {
		return <MoonIcon className="size-4" />;
	}

	return <SunIcon className="size-4" />;
}

export function ThemeToggle() {
	const theme = useThemeStore((state) => state.theme);
	const setTheme = useThemeStore((state) => state.setTheme);
	const resolvedTheme = resolveTheme(theme);

	return (
		<Select
			value={theme}
			onValueChange={(value) => {
				if (isTheme(value)) {
					setTheme(value);
				}
			}}
		>
			<SelectTrigger
				size="sm"
				className="w-9 justify-center px-0 [&_[data-slot=select-value]]:hidden [&>svg:last-child]:hidden"
				aria-label={`切换主题，当前为${resolvedTheme === "dark" ? "深色" : "浅色"}`}
			>
				<ThemeTriggerIcon theme={theme} />
			</SelectTrigger>
			<SelectContent align="end">
				{themeOptions.map((option) => (
					<SelectItem key={option.value} value={option.value}>
						<option.icon />
						{option.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
