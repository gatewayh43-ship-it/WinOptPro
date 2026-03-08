import { describe, it, expect, vi, beforeEach } from "vitest";
import { useGlobalCache } from "@/hooks/useGlobalCache";

// useGlobalCache is a Zustand store — test it directly without renderHook
// The beforeEach in setup.ts already calls clearCache(), so each test starts clean.

describe("useGlobalCache", () => {
    beforeEach(() => {
        // Ensure clean state (setup.ts also does this, but be explicit)
        useGlobalCache.getState().clearCache();
    });

    // ── setCacheObject / getCacheObject ───────────────────────────────────────

    describe("setCacheObject and getCacheObject", () => {
        it("stores and retrieves a plain object", () => {
            const data = { foo: "bar", count: 42 };
            useGlobalCache.getState().setCacheObject("test-page", data);

            const retrieved = useGlobalCache.getState().getCacheObject("test-page");
            expect(retrieved).toEqual(data);
        });

        it("stores and retrieves an array", () => {
            const data = [1, 2, 3];
            useGlobalCache.getState().setCacheObject("array-page", data);

            expect(useGlobalCache.getState().getCacheObject("array-page")).toEqual([1, 2, 3]);
        });

        it("returns null for a key that has not been set", () => {
            expect(useGlobalCache.getState().getCacheObject("nonexistent")).toBeNull();
        });

        it("overwrites existing cache entry with new data", () => {
            useGlobalCache.getState().setCacheObject("overwrite-key", { v: 1 });
            useGlobalCache.getState().setCacheObject("overwrite-key", { v: 2 });

            expect(useGlobalCache.getState().getCacheObject("overwrite-key")).toEqual({ v: 2 });
        });

        it("can hold multiple independent keys simultaneously", () => {
            useGlobalCache.getState().setCacheObject("key-a", "alpha");
            useGlobalCache.getState().setCacheObject("key-b", "beta");

            expect(useGlobalCache.getState().getCacheObject("key-a")).toBe("alpha");
            expect(useGlobalCache.getState().getCacheObject("key-b")).toBe("beta");
        });

        it("updates lastFetched timestamp when setting cache", () => {
            const before = Date.now();
            useGlobalCache.getState().setCacheObject("ts-key", { x: 1 });
            const after = Date.now();

            const ts = useGlobalCache.getState().lastFetched["ts-key"];
            expect(ts).toBeGreaterThanOrEqual(before);
            expect(ts).toBeLessThanOrEqual(after);
        });
    });

    // ── clearCache ────────────────────────────────────────────────────────────

    describe("clearCache", () => {
        it("clearCache() with no argument clears all entries", () => {
            useGlobalCache.getState().setCacheObject("a", 1);
            useGlobalCache.getState().setCacheObject("b", 2);

            useGlobalCache.getState().clearCache();

            expect(useGlobalCache.getState().getCacheObject("a")).toBeNull();
            expect(useGlobalCache.getState().getCacheObject("b")).toBeNull();
            expect(useGlobalCache.getState().pageCache).toEqual({});
        });

        it("clearCache() resets lastFetched to empty object", () => {
            useGlobalCache.getState().setCacheObject("a", 1);

            useGlobalCache.getState().clearCache();

            expect(useGlobalCache.getState().lastFetched).toEqual({});
        });

        it("clearCache(pageId) removes only the specified key", () => {
            useGlobalCache.getState().setCacheObject("keep", "keeper");
            useGlobalCache.getState().setCacheObject("remove", "gone");

            useGlobalCache.getState().clearCache("remove");

            expect(useGlobalCache.getState().getCacheObject("keep")).toBe("keeper");
            expect(useGlobalCache.getState().getCacheObject("remove")).toBeNull();
        });

        it("clearCache(pageId) removes the key from lastFetched", () => {
            useGlobalCache.getState().setCacheObject("ts-remove", { x: 1 });

            useGlobalCache.getState().clearCache("ts-remove");

            expect(useGlobalCache.getState().lastFetched["ts-remove"]).toBeUndefined();
        });

        it("clearCache(nonexistentKey) does not throw", () => {
            expect(() => {
                useGlobalCache.getState().clearCache("ghost");
            }).not.toThrow();
        });
    });

    // ── TTL expiry logic ──────────────────────────────────────────────────────

    describe("TTL expiry (manual check via lastFetched)", () => {
        it("lastFetched timestamp allows consumers to detect stale cache", () => {
            vi.useFakeTimers();

            const fakeNow = 1_700_000_000_000;
            vi.setSystemTime(fakeNow);

            useGlobalCache.getState().setCacheObject("ttl-key", { stale: false });

            const ts = useGlobalCache.getState().lastFetched["ttl-key"];
            expect(ts).toBe(fakeNow);

            // Advance 10 minutes
            vi.advanceTimersByTime(10 * 60 * 1000);

            // The cache entry still exists (TTL enforcement is up to consumers)
            // but the timestamp shows it's stale
            const age = Date.now() - ts;
            expect(age).toBeGreaterThanOrEqual(10 * 60 * 1000);

            vi.useRealTimers();
        });

        it("new setCacheObject refreshes the lastFetched timestamp", () => {
            vi.useFakeTimers();

            vi.setSystemTime(1_000_000);
            useGlobalCache.getState().setCacheObject("refresh-key", { v: 1 });
            const firstTs = useGlobalCache.getState().lastFetched["refresh-key"];

            vi.setSystemTime(2_000_000);
            useGlobalCache.getState().setCacheObject("refresh-key", { v: 2 });
            const secondTs = useGlobalCache.getState().lastFetched["refresh-key"];

            expect(secondTs).toBeGreaterThan(firstTs);

            vi.useRealTimers();
        });
    });

    // ── setAppReady / updateLoadingProgress ───────────────────────────────────

    describe("auxiliary state", () => {
        it("setAppReady(true) sets isAppReady to true", () => {
            useGlobalCache.getState().setAppReady(true);
            expect(useGlobalCache.getState().isAppReady).toBe(true);
        });

        it("setAppReady(false) sets isAppReady to false", () => {
            useGlobalCache.getState().setAppReady(true);
            useGlobalCache.getState().setAppReady(false);
            expect(useGlobalCache.getState().isAppReady).toBe(false);
        });

        it("updateLoadingProgress sets progress and message", () => {
            useGlobalCache.getState().updateLoadingProgress(42, "Loading drivers...");
            expect(useGlobalCache.getState().loadingProgress).toBe(42);
            expect(useGlobalCache.getState().loadingMessage).toBe("Loading drivers...");
        });
    });
});
