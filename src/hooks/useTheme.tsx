import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";
type ColorScheme = "default" | "teal" | "rose" | "amber" | "emerald" | "violet";

type ThemeProviderProps = {
    children: React.ReactNode;
    defaultTheme?: Theme;
    defaultColorScheme?: ColorScheme;
    storageKey?: string;
    colorStorageKey?: string;
};

type ThemeProviderState = {
    theme: Theme;
    colorScheme: ColorScheme;
    setTheme: (theme: Theme) => void;
    setColorScheme: (scheme: ColorScheme) => void;
};

const initialState: ThemeProviderState = {
    theme: "dark",
    colorScheme: "default" as ColorScheme,
    setTheme: () => null,
    setColorScheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
    children,
    defaultTheme = "dark",
    defaultColorScheme = "default",
    storageKey = "vite-ui-theme",
    colorStorageKey = "vite-ui-color",
    ...props
}: ThemeProviderProps) {
    const [theme, setTheme] = useState<Theme>(
        () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
    );

    const [colorScheme, setColorScheme] = useState<ColorScheme>(
        () => (localStorage.getItem(colorStorageKey) as ColorScheme) || defaultColorScheme
    );

    useEffect(() => {
        const root = window.document.documentElement;

        root.classList.remove("light", "dark");
        root.classList.add(theme);

        // Manage color schemes
        root.classList.remove("theme-default", "theme-teal");
        root.classList.add(`theme-${colorScheme}`);
    }, [theme, colorScheme]);

    const value = {
        theme,
        colorScheme,
        setTheme: (theme: Theme) => {
            localStorage.setItem(storageKey, theme);
            setTheme(theme);
        },
        setColorScheme: (scheme: ColorScheme) => {
            localStorage.setItem(colorStorageKey, scheme);
            setColorScheme(scheme);
        }
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
