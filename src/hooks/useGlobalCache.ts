import { create } from "zustand";

// Bounded cache — evicts the least-recently-set entry when over MAX_ENTRIES.
// Boot-time and page caches both write here; without a bound the map grows
// unboundedly over a long session (e.g. process lists refreshed on a timer).
const MAX_ENTRIES = 32;

interface GlobalCacheState {
    isAppReady: boolean;
    pageCache: Record<string, any>;
    lastFetched: Record<string, number>;
    bootErrors: string[];
    loadingProgress: number;
    loadingMessage: string;
    setAppReady: (ready: boolean) => void;
    setCacheObject: (pageId: string, data: any) => void;
    getCacheObject: (pageId: string) => any | null;
    clearCache: (pageId?: string) => void;
    addBootError: (message: string) => void;
    clearBootErrors: () => void;
    updateLoadingProgress: (progress: number, message: string) => void;
}

function evictIfFull(
    pageCache: Record<string, any>,
    lastFetched: Record<string, number>,
    incomingKey: string
): { pageCache: Record<string, any>; lastFetched: Record<string, number> } {
    const keys = Object.keys(pageCache);
    if (keys.length < MAX_ENTRIES || incomingKey in pageCache) return { pageCache, lastFetched };

    let oldestKey = keys[0];
    let oldestTs = lastFetched[oldestKey] ?? 0;
    for (const k of keys) {
        const ts = lastFetched[k] ?? 0;
        if (ts < oldestTs) {
            oldestTs = ts;
            oldestKey = k;
        }
    }
    const nextCache = { ...pageCache };
    const nextFetched = { ...lastFetched };
    delete nextCache[oldestKey];
    delete nextFetched[oldestKey];
    return { pageCache: nextCache, lastFetched: nextFetched };
}

export const useGlobalCache = create<GlobalCacheState>((set, get) => ({
    isAppReady: false,
    pageCache: {},
    lastFetched: {},
    bootErrors: [],
    loadingProgress: 0,
    loadingMessage: "Initializing kernel...",

    setAppReady: (ready) => set({ isAppReady: ready }),

    setCacheObject: (pageId, data) =>
        set((state) => {
            const evicted = evictIfFull(state.pageCache, state.lastFetched, pageId);
            return {
                pageCache: { ...evicted.pageCache, [pageId]: data },
                lastFetched: { ...evicted.lastFetched, [pageId]: Date.now() },
            };
        }),

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

    addBootError: (message) =>
        set((state) => ({ bootErrors: [...state.bootErrors, message] })),

    clearBootErrors: () => set({ bootErrors: [] }),

    updateLoadingProgress: (progress, message) =>
        set({ loadingProgress: progress, loadingMessage: message }),
}));
