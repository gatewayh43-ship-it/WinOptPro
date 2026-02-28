import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSystemVitals } from "@/hooks/useSystemVitals";
import { useAppStore } from "@/store/appStore";
import * as tauriCore from "@tauri-apps/api/core";

// ── Fixtures ─────────────────────────────────────────────────────────────────

const mockVitals = {
    timestamp: 1000000,
    cpu: { model: "AMD Ryzen 7 7800X3D", usagePct: 42, freqGhz: 4.8, cores: 8, tempC: 65 },
    ram: { usedMb: 8192, totalMb: 32768, usagePct: 25 },
    drives: { "C:": { freeGb: 420, totalGb: 1000, name: "SSD", mountPoint: "C:" } },
    network: { Ethernet: { receivedBytes: 1024, transmittedBytes: 512 } },
    system: { uptimeSeconds: 86400, osVersion: "Windows 11 23H2", isAdmin: true },
};

/** Flush the Promise microtask queue without advancing timers. */
const flushPromises = () => act(async () => {});

/** Settings preset: auto-refresh ON with a custom interval. */
function settingsWithInterval(ms: number) {
    return {
        userSettings: {
            theme: "dark" as const,
            colorScheme: "default" as const,
            expertModeEnabled: false,
            autoRefreshVitals: true,
            autoRefreshIntervalMs: ms,
            showDeployConfirmation: true,
            aiAssistantEnabled: false,
        },
    };
}

/** Settings preset: auto-refresh OFF. */
const settingsNoRefresh = {
    userSettings: {
        theme: "dark" as const,
        colorScheme: "default" as const,
        expertModeEnabled: false,
        autoRefreshVitals: false,
        autoRefreshIntervalMs: 3000,
        showDeployConfirmation: true,
        aiAssistantEnabled: false,
    },
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("useSystemVitals", () => {
    beforeEach(() => {
        useAppStore.setState({ systemVitals: null, ...settingsWithInterval(3000) });
        vi.mocked(tauriCore.invoke).mockReset();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("fetches vitals immediately on mount", async () => {
        vi.mocked(tauriCore.invoke).mockResolvedValue(mockVitals);

        renderHook(() => useSystemVitals());
        // Flush the Promise returned by the initial fetchVitals() call
        await flushPromises();

        expect(tauriCore.invoke).toHaveBeenCalledWith("get_system_vitals");
    });

    it("stores fetched vitals in the app store", async () => {
        vi.mocked(tauriCore.invoke).mockResolvedValue(mockVitals);

        renderHook(() => useSystemVitals());
        await flushPromises();

        expect(useAppStore.getState().systemVitals).toEqual(mockVitals);
    });

    it("returns vitals from the hook result", async () => {
        vi.mocked(tauriCore.invoke).mockResolvedValue(mockVitals);

        const { result } = renderHook(() => useSystemVitals());
        await flushPromises();

        expect(result.current.vitals).toEqual(mockVitals);
    });

    it("polls again after one interval elapses", async () => {
        vi.mocked(tauriCore.invoke).mockResolvedValue(mockVitals);
        useAppStore.setState({ systemVitals: null, ...settingsWithInterval(1000) });

        renderHook(() => useSystemVitals());
        // Flush initial fetch
        await flushPromises();
        const afterMount = vi.mocked(tauriCore.invoke).mock.calls.length;
        expect(afterMount).toBe(1);

        // Advance one full interval — the setInterval callback fires once
        await act(async () => {
            await vi.advanceTimersByTimeAsync(1000);
        });

        expect(vi.mocked(tauriCore.invoke).mock.calls.length).toBeGreaterThan(afterMount);
    });

    it("does NOT poll when autoRefreshVitals is false", async () => {
        vi.mocked(tauriCore.invoke).mockResolvedValue(mockVitals);
        useAppStore.setState({ systemVitals: null, ...settingsNoRefresh });

        renderHook(() => useSystemVitals());
        await flushPromises();
        const afterMount = vi.mocked(tauriCore.invoke).mock.calls.length;

        // Advance time — no additional calls expected
        await act(async () => {
            await vi.advanceTimersByTimeAsync(5000);
        });

        expect(vi.mocked(tauriCore.invoke).mock.calls.length).toBe(afterMount);
    });

    it("handles invoke errors without crashing", async () => {
        vi.mocked(tauriCore.invoke).mockRejectedValue(new Error("WMI unavailable"));

        const { result } = renderHook(() => useSystemVitals());
        // Should not throw — console.error is called internally
        await flushPromises();

        expect(result.current.vitals).toBeNull();
        expect(useAppStore.getState().systemVitals).toBeNull();
    });

    it("exposes a refresh function that re-fetches on demand", async () => {
        vi.mocked(tauriCore.invoke).mockResolvedValue(mockVitals);
        useAppStore.setState({ systemVitals: null, ...settingsNoRefresh });

        const { result } = renderHook(() => useSystemVitals());
        await flushPromises();

        // Clear the initial call count
        vi.mocked(tauriCore.invoke).mockClear();

        await act(async () => {
            await result.current.refresh();
        });

        expect(tauriCore.invoke).toHaveBeenCalledOnce();
        expect(tauriCore.invoke).toHaveBeenCalledWith("get_system_vitals");
    });

    it("clears the interval on unmount so no further fetches occur", async () => {
        vi.mocked(tauriCore.invoke).mockResolvedValue(mockVitals);
        useAppStore.setState({ systemVitals: null, ...settingsWithInterval(1000) });

        const { unmount } = renderHook(() => useSystemVitals());
        await flushPromises();

        unmount();
        vi.mocked(tauriCore.invoke).mockClear();

        // Advance past several intervals — should NOT fetch again
        await act(async () => {
            await vi.advanceTimersByTimeAsync(5000);
        });

        expect(tauriCore.invoke).not.toHaveBeenCalled();
    });
});
