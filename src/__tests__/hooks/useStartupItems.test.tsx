import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@/test/utils";
import { useStartupItems } from "@/hooks/useStartupItems";
import * as tauriCore from "@tauri-apps/api/core";

// useStartupItems.fetchItems depends on addToast, so we need a stable reference
// to prevent useCallback from being recreated every render (infinite loop in tests).
vi.mock("@/components/ToastSystem", () => {
    const addToast = vi.fn();
    const removeToast = vi.fn();
    return {
        useToast: () => ({ addToast, removeToast }),
        ToastProvider: ({ children }: { children: React.ReactNode }) => children,
    };
});

const mockItems = [
    { id: "hkcu-discord", name: "Discord", command: "C:\\Discord\\Update.exe --processStart Discord.exe", location: "HKCU\\Run", enabled: true },
    { id: "hkcu-spotify", name: "Spotify", command: "C:\\Spotify\\Spotify.exe", location: "HKCU\\Run", enabled: false },
];

describe("useStartupItems", () => {
    beforeEach(() => {
        vi.mocked(tauriCore.invoke).mockReset();
        vi.mocked(tauriCore.invoke).mockImplementation(async (cmd) => {
            if (cmd === "get_startup_items") return mockItems;
            if (cmd === "set_startup_item_state") return null;
            return null;
        });
    });

    it("fetches startup items on mount", async () => {
        const { result } = renderHook(() => useStartupItems());
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.items).toEqual(mockItems);
        expect(tauriCore.invoke).toHaveBeenCalledWith("get_startup_items");
    });

    it("sets isLoading false after fetch", async () => {
        const { result } = renderHook(() => useStartupItems());
        await waitFor(() => expect(result.current.isLoading).toBe(false));
    });

    it("sets error on fetch failure", async () => {
        vi.mocked(tauriCore.invoke).mockRejectedValue(new Error("Registry error"));
        const { result } = renderHook(() => useStartupItems());
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.error).toBe("Registry error");
    });

    it("toggleItem calls set_startup_item_state with correct id and flipped enabled", async () => {
        const { result } = renderHook(() => useStartupItems());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => {
            await result.current.toggleItem("hkcu-discord", true);
        });

        expect(tauriCore.invoke).toHaveBeenCalledWith("set_startup_item_state", {
            id: "hkcu-discord",
            enabled: false,
        });
    });

    it("toggleItem optimistically updates items list", async () => {
        const { result } = renderHook(() => useStartupItems());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => {
            await result.current.toggleItem("hkcu-discord", true);
        });

        const discord = result.current.items.find(i => i.id === "hkcu-discord");
        expect(discord?.enabled).toBe(false);
    });

    it("toggleItem enables a disabled item", async () => {
        const { result } = renderHook(() => useStartupItems());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => {
            await result.current.toggleItem("hkcu-spotify", false);
        });

        expect(tauriCore.invoke).toHaveBeenCalledWith("set_startup_item_state", {
            id: "hkcu-spotify",
            enabled: true,
        });
    });

    it("refresh re-fetches startup items", async () => {
        const { result } = renderHook(() => useStartupItems());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        const callsBefore = vi.mocked(tauriCore.invoke).mock.calls.filter(c => c[0] === "get_startup_items").length;
        await act(async () => {
            await result.current.refresh();
        });
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        const callsAfter = vi.mocked(tauriCore.invoke).mock.calls.filter(c => c[0] === "get_startup_items").length;

        expect(callsAfter).toBeGreaterThan(callsBefore);
    });
});
