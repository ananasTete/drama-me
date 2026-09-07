import {
	THEME_STORAGE_KEY,
	applyTheme,
	type Theme,
} from "@/lib/theme";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type ThemeState = {
	theme: Theme;
	setTheme: (theme: Theme) => void;
};

export const useThemeStore = create<ThemeState>()(
	persist(
		(set) => ({
			theme: "system",
			setTheme: (theme) => {
				applyTheme(theme);
				set({ theme });
			},
		}),
		{
			name: THEME_STORAGE_KEY,
			onRehydrateStorage: () => (state) => {
				if (state) {
					applyTheme(state.theme);
				}
			},
		},
	),
);
