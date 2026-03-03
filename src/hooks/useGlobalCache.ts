import { create } from "zustand";

interface GlobalCacheState {
    isAppReady: boolean;
    pageCache: Record<string, any>;
    lastFetched: Record<string, number>;
    loadingProgress: number;
    loadingMessage: string;
    setAppReady: (ready: boolean) => void;
    setCacheObject: (pageId: string, data: any) => void;
    getCacheObject: (pageId: string) => any | null;
    clearCache: (pageId?: string) => void;
    updateLoadingProgress: (progress: number, message: string) => void;
}

export const useGlobalCache = create<GlobalCacheState>((set, get) => ({
    isAppReady: false,
    pageCache: {},
    lastFetched: {},
    loadingProgress: 0,
    loadingMessage: "Initializing kernel...",

    setAppReady: (ready) => set({ isAppReady: ready }),

    setCacheObject: (pageId, data) =>
        set((state) => ({
            pageCache: { ...state.pageCache, [pageId]: data },
            lastFetched: { ...state.lastFetched, [pageId]: Date.now() },
        })),

    getCacheObject: (pageId) => {
        return get().pageCache[pageId] || null;
    },

    clearCache: (pageId) =>
        set((state) => {
            if (pageId) {
                const newCache = { ...state.pageCache };
                const newFetched = { ...state.lastFetched };
                delete newCache[pageId];
                delete newFetched[pageId];
                return { pageCache: newCache, lastFetched: newFetched };
            }
            return { pageCache: {}, lastFetched: {} };
        }),

    updateLoadingProgress: (progress, message) =>
        set({ loadingProgress: progress, loadingMessage: message }),
}));
