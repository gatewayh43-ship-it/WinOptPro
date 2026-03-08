import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@/test/utils";
import { useSmartStore } from "@/hooks/useSmartStore";
import type { WingetSearchResult, WingetAppInfo } from "@/hooks/useSmartStore";
import * as tauriCore from "@tauri-apps/api/core";
import { useAppStore } from "@/store/appStore";

// Mock the app_metadata.json import so we can control what getAppDetails returns
vi.mock("@/data/app_metadata.json", () => ({
    default: { apps: {} },
}));

const mockSearchResults: WingetSearchResult[] = [
    { id: "VideoLAN.VLC", name: "VLC media player", version: "3.0.20", matchType: "Exact" },
    { id: "Mozilla.Firefox", name: "Mozilla Firefox", version: "122.0", matchType: "CaseSensitive" },
    { id: "Notepad++.Notepad++", name: "Notepad++", version: "8.6.2", matchType: "Substring" },
];

const mockAppInfo: WingetAppInfo = {
    id: "VideoLAN.VLC",
    name: "VLC media player",
    publisher: "VideoLAN",
    description: "A free and open source cross-platform multimedia player.",
    homepage: "https://www.videolan.org/vlc/",
    version: "3.0.20",
    tags: ["media", "player"],
};

function resetStore() {
    useAppStore.setState({
        userSettings: {
            theme: "dark",
            colorScheme: "default",
            expertModeEnabled: false,
            autoRefreshVitals: true,
            autoRefreshIntervalMs: 3000,
            showDeployConfirmation: true,
            aiAssistantEnabled: false,
        },
    });
}

describe("useSmartStore", () => {
    beforeEach(() => {
        vi.mocked(tauriCore.invoke).mockReset();
        vi.mocked(tauriCore.isTauri).mockReturnValue(true);
        resetStore();
        // Clear any localStorage app cache
        localStorage.clear();
    });

    // ── searchApps ────────────────────────────────────────────────────────────

    describe("searchApps", () => {
        it("calls invoke('search_winget') with the query", async () => {
            vi.mocked(tauriCore.invoke).mockResolvedValue(mockSearchResults);
            const { result } = renderHook(() => useSmartStore());

            await act(async () => {
                await result.current.searchApps("vlc");
            });

            expect(tauriCore.invoke).toHaveBeenCalledWith("search_winget", { query: "vlc" });
        });

        it("populates searchResults after successful search", async () => {
            vi.mocked(tauriCore.invoke).mockResolvedValue(mockSearchResults);
            const { result } = renderHook(() => useSmartStore());

            await act(async () => {
                await result.current.searchApps("vlc");
            });

            expect(result.current.searchResults).toHaveLength(mockSearchResults.length);
            expect(result.current.searchResults[0].id).toBe("VideoLAN.VLC");
        });

        it("sets isSearching=true during search and false after", async () => {
            let wasSearchingDuring = false;
            vi.mocked(tauriCore.invoke).mockImplementation(async () => {
                wasSearchingDuring = true;
                return mockSearchResults;
            });

            const { result } = renderHook(() => useSmartStore());

            await act(async () => {
                await result.current.searchApps("vlc");
            });

            expect(wasSearchingDuring).toBe(true);
            expect(result.current.isSearching).toBe(false);
        });

        it("sets searchError on invoke failure", async () => {
            vi.mocked(tauriCore.invoke).mockRejectedValue(new Error("winget not found"));
            const { result } = renderHook(() => useSmartStore());

            await act(async () => {
                await result.current.searchApps("vlc");
            });

            expect(result.current.searchError).toContain("winget not found");
        });

        it("returns empty array and does NOT invoke when isTauri=false", async () => {
            vi.mocked(tauriCore.isTauri).mockReturnValue(false);
            const { result } = renderHook(() => useSmartStore());

            let returned: WingetSearchResult[] | undefined;
            await act(async () => {
                returned = await result.current.searchApps("vlc");
            });

            expect(returned).toEqual([]);
            expect(tauriCore.invoke).not.toHaveBeenCalled();
            expect(result.current.searchResults).toEqual([]);
        });

        it("returns empty array and does NOT invoke when query is empty", async () => {
            const { result } = renderHook(() => useSmartStore());

            let returned: WingetSearchResult[] | undefined;
            await act(async () => {
                returned = await result.current.searchApps("");
            });

            expect(returned).toEqual([]);
            expect(tauriCore.invoke).not.toHaveBeenCalled();
        });

        it("filters out results with 'SDK' in name", async () => {
            const rawResults: WingetSearchResult[] = [
                ...mockSearchResults,
                { id: "Microsoft.DotNet.SDK", name: "Microsoft .NET SDK 8.0", version: "8.0.100", matchType: "Exact" },
            ];
            vi.mocked(tauriCore.invoke).mockResolvedValue(rawResults);
            const { result } = renderHook(() => useSmartStore());

            await act(async () => {
                await result.current.searchApps("net");
            });

            expect(result.current.searchResults.every((r) => !r.name.includes("SDK"))).toBe(true);
        });

        it("filters out results with 'Tools' in id", async () => {
            const rawResults: WingetSearchResult[] = [
                ...mockSearchResults,
                { id: "Microsoft.WingetTools", name: "WinGet Tools", version: "1.0", matchType: "Exact" },
            ];
            vi.mocked(tauriCore.invoke).mockResolvedValue(rawResults);
            const { result } = renderHook(() => useSmartStore());

            await act(async () => {
                await result.current.searchApps("tools");
            });

            expect(result.current.searchResults.every((r) => !r.id.includes("Tools"))).toBe(true);
        });

        it("limits results to 30", async () => {
            const bigList: WingetSearchResult[] = Array.from({ length: 50 }, (_, i) => ({
                id: `Vendor.App${i}`,
                name: `App ${i}`,
                version: "1.0",
                matchType: "Substring",
            }));
            vi.mocked(tauriCore.invoke).mockResolvedValue(bigList);
            const { result } = renderHook(() => useSmartStore());

            await act(async () => {
                await result.current.searchApps("app");
            });

            expect(result.current.searchResults.length).toBeLessThanOrEqual(30);
        });
    });

    // ── getAppDetails ─────────────────────────────────────────────────────────

    describe("getAppDetails", () => {
        it("calls invoke('get_winget_info') with id when no static data exists", async () => {
            vi.mocked(tauriCore.invoke).mockImplementation(async (cmd) => {
                if (cmd === "get_winget_info") return mockAppInfo;
                if (cmd === "scrape_app_metadata") return { screenshots: [], githubUrl: null, socialLinks: [], alternativeDownloads: [] };
                return null;
            });

            const { result } = renderHook(() => useSmartStore());

            await act(async () => {
                await result.current.getAppDetails("VideoLAN.VLC", "VLC media player");
            });

            expect(tauriCore.invoke).toHaveBeenCalledWith("get_winget_info", {
                id: "VideoLAN.VLC",
            });
        });

        it("sets appInfo after successful getAppDetails", async () => {
            vi.mocked(tauriCore.invoke).mockImplementation(async (cmd) => {
                if (cmd === "get_winget_info") return mockAppInfo;
                if (cmd === "scrape_app_metadata") return { screenshots: [], githubUrl: null, socialLinks: [], alternativeDownloads: [] };
                return null;
            });

            const { result } = renderHook(() => useSmartStore());

            await act(async () => {
                await result.current.getAppDetails("VideoLAN.VLC", "VLC");
            });

            expect(result.current.appInfo).toMatchObject({ id: "VideoLAN.VLC", name: "VLC media player" });
        });

        it("sets isLoadingInfo=false after getAppDetails completes", async () => {
            vi.mocked(tauriCore.invoke).mockImplementation(async (cmd) => {
                if (cmd === "get_winget_info") return mockAppInfo;
                if (cmd === "scrape_app_metadata") return { screenshots: [], githubUrl: null, socialLinks: [], alternativeDownloads: [] };
                return null;
            });

            const { result } = renderHook(() => useSmartStore());

            await act(async () => {
                await result.current.getAppDetails("VideoLAN.VLC", "VLC");
            });

            expect(result.current.isLoadingInfo).toBe(false);
        });

        it("caches app info in localStorage after first fetch", async () => {
            vi.mocked(tauriCore.invoke).mockImplementation(async (cmd) => {
                if (cmd === "get_winget_info") return mockAppInfo;
                if (cmd === "scrape_app_metadata") return { screenshots: [], githubUrl: null, socialLinks: [], alternativeDownloads: [] };
                return null;
            });

            const { result } = renderHook(() => useSmartStore());

            await act(async () => {
                await result.current.getAppDetails("VideoLAN.VLC", "VLC");
            });

            const cached = localStorage.getItem("appcache_info_VideoLAN.VLC");
            expect(cached).not.toBeNull();
            expect(JSON.parse(cached!).name).toBe("VLC media player");
        });

        it("uses localStorage cache on second call without invoking Tauri", async () => {
            // Pre-populate the cache
            localStorage.setItem("appcache_info_VideoLAN.VLC", JSON.stringify(mockAppInfo));

            const { result } = renderHook(() => useSmartStore());

            await act(async () => {
                await result.current.getAppDetails("VideoLAN.VLC", "VLC");
            });

            expect(tauriCore.invoke).not.toHaveBeenCalledWith("get_winget_info", expect.anything());
            expect(result.current.appInfo).toMatchObject({ id: "VideoLAN.VLC" });
        });

        it("returns null when isTauri=false and no cache", async () => {
            vi.mocked(tauriCore.isTauri).mockReturnValue(false);
            const { result } = renderHook(() => useSmartStore());

            let returned: WingetAppInfo | null | undefined;
            await act(async () => {
                returned = await result.current.getAppDetails("VideoLAN.VLC", "VLC");
            });

            expect(returned).toBeNull();
        });
    });
});
