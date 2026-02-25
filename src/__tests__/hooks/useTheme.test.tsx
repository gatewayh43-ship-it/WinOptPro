import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { ThemeProvider, useTheme } from "@/hooks/useTheme";

function wrapper({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider defaultTheme="dark" defaultColorScheme="default">
            {children}
        </ThemeProvider>
    );
}

describe("useTheme", () => {
    beforeEach(() => {
        localStorage.clear();
        // Reset root classes
        document.documentElement.className = "";
    });

    it("returns the default theme", () => {
        const { result } = renderHook(() => useTheme(), { wrapper });
        expect(result.current.theme).toBe("dark");
    });

    it("toggles between dark and light theme", () => {
        const { result } = renderHook(() => useTheme(), { wrapper });
        act(() => {
            result.current.setTheme("light");
        });
        expect(result.current.theme).toBe("light");
        act(() => {
            result.current.setTheme("dark");
        });
        expect(result.current.theme).toBe("dark");
    });

    it("persists theme to localStorage", () => {
        const { result } = renderHook(() => useTheme(), { wrapper });
        act(() => {
            result.current.setTheme("light");
        });
        expect(localStorage.getItem("vite-ui-theme")).toBe("light");
    });

    it("returns the default color scheme", () => {
        const { result } = renderHook(() => useTheme(), { wrapper });
        expect(result.current.colorScheme).toBe("default");
    });

    it("changes the color scheme", () => {
        const { result } = renderHook(() => useTheme(), { wrapper });
        act(() => {
            result.current.setColorScheme("rose");
        });
        expect(result.current.colorScheme).toBe("rose");
    });

    it("persists color scheme to localStorage", () => {
        const { result } = renderHook(() => useTheme(), { wrapper });
        act(() => {
            result.current.setColorScheme("teal");
        });
        expect(localStorage.getItem("vite-ui-color")).toBe("teal");
    });

    it("returns context from initialState when used outside ThemeProvider", () => {
        // createContext(initialState) means the fallback is the initialState object, not undefined.
        // The throw guard is dead code in this pattern — verify graceful fallback instead.
        const { result } = renderHook(() => useTheme());
        expect(result.current.theme).toBeDefined();
        expect(typeof result.current.setTheme).toBe("function");
    });
});
