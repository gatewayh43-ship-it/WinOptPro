import React, { createContext, useContext, useEffect, useState } from "react";

export type ThemeName =
  | "dark" | "dark-teal" | "dark-rose" | "dark-amber" | "dark-emerald" | "dark-violet"
  | "light" | "light-teal" | "light-rose" | "light-amber" | "light-emerald" | "light-violet"
  | "claude" | "fluent" | "cyberpunk";

type ThemeProviderState = {
    theme: ThemeName;
    setTheme: (theme: ThemeName) => void;
};

const CLASS_MAP: Record<ThemeName, string[]> = {
    "dark":           ["dark"],
    "dark-teal":      ["dark", "theme-teal"],
    "dark-rose":      ["dark", "theme-rose"],
    "dark-amber":     ["dark", "theme-amber"],
    "dark-emerald":   ["dark", "theme-emerald"],
    "dark-violet":    ["dark", "theme-violet"],
    "light":          ["light"],
    "light-teal":     ["light", "theme-teal"],
    "light-rose":     ["light", "theme-rose"],
    "light-amber":    ["light", "theme-amber"],
    "light-emerald":  ["light", "theme-emerald"],
    "light-violet":   ["light", "theme-violet"],
    "claude":         ["light", "theme-claude"],
    "fluent":         ["light", "theme-fluent"],
    "cyberpunk":      ["dark",  "theme-cyberpunk"],
};

const DEPRECATED_DESIGN_THEMES = new Set<ThemeName>(["claude", "fluent", "cyberpunk"]);

function normalizeTheme(theme: string | null, fallback: ThemeName): ThemeName {
    if (!theme || !(theme in CLASS_MAP)) return fallback;
    const nextTheme = theme as ThemeName;
    return DEPRECATED_DESIGN_THEMES.has(nextTheme) ? fallback : nextTheme;
}

type ThemeProviderProps = {
    children: React.ReactNode;
    defaultTheme?: ThemeName;
    storageKey?: string;
};

const initialState: ThemeProviderState = {
    theme: "dark",
    setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
    children,
    defaultTheme = "dark",
    storageKey = "vite-ui-theme",
    ...props
}: ThemeProviderProps) {
    const [theme, setTheme] = useState<ThemeName>(
        () => normalizeTheme(localStorage.getItem(storageKey), defaultTheme)
    );

    useEffect(() => {
        const root = window.document.documentElement;

        // Remove all existing dark/light and theme-* classes
        const classesToRemove = Array.from(root.classList).filter(
            (cls) => cls === "dark" || cls === "light" || cls.startsWith("theme-")
        );
        root.classList.remove(...classesToRemove);

        // Add the classes for the current theme
        root.classList.add(...CLASS_MAP[theme]);

        localStorage.setItem(storageKey, theme);
    }, [theme, storageKey]);

    const value: ThemeProviderState = {
        theme,
        setTheme: (newTheme: ThemeName) => {
            setTheme(normalizeTheme(newTheme, defaultTheme));
        },
    };

    return (
        <ThemeProviderContext.Provider {...props} value={value}>
            {children}
        </ThemeProviderContext.Provider>
    );
}

export const useTheme = () => {
    const context = useContext(ThemeProviderContext);

    if (context === undefined)
        throw new Error("useTheme must be used within a ThemeProvider");

    return context;
};
