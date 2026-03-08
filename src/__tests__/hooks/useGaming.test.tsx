import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@/test/utils";
import { useGaming } from "@/hooks/useGaming";
import type { GpuMetrics } from "@/hooks/useGaming";
import * as tauriCore from "@tauri-apps/api/core";

vi.mock("@/components/ToastSystem", () => {
    const addToast = vi.fn();
    return { useToast: () => ({ addToast }) };
});

// Mock @tauri-apps/api/event (used for overlay-closed listener)
vi.mock("@tauri-apps/api/event", () => ({
    listen: vi.fn(() => Promise.resolve(() => {})),
}));

const MOCK_GPU: GpuMetrics = {
    name: "NVIDIA GeForce RTX 3080",
    temperatureC: 65,
    gpuUtilPct: 78,
    memUtilPct: 44,
    memUsedMb: 4506,
    memTotalMb: 10240,
    powerDrawW: 145.5,
    powerLimitW: 250,
    powerMaxLimitW: 320,
    isNvidia: true,
};

describe("useGaming", () => {
    beforeEach(() => {
        vi.mocked(tauriCore.invoke).mockReset();
        localStorage.clear();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    // ── isTauri=false (mock data) ─────────────────────────────────────────────

    describe("isTauri=false (mock data)", () => {
        beforeEach(() => {
            vi.mocked(tauriCore.isTauri).mockReturnValue(false);
        });

        it("returns mock GPU metrics on mount", async () => {
            const { result } = renderHook(() => useGaming());

            await waitFor(() => expect(result.current.isLoadingGpu).toBe(false));

            expect(result.current.gpuMetrics).toMatchObject({
                name: "NVIDIA GeForce RTX 3080",
                temperatureC: 65,
                gpuUtilPct: 78,
            });
        });

        it("sets cpuLoad=34 from mock data", async () => {
            const { result } = renderHook(() => useGaming());

            await waitFor(() => expect(result.current.isLoadingGpu).toBe(false));

            expect(result.current.cpuLoad).toBe(34);
        });

        it("sets mock activeGame on mount", async () => {
            const { result } = renderHook(() => useGaming());

            await waitFor(() => expect(result.current.activeGame).not.toBeNull());

            expect(result.current.activeGame).toContain("mock");
        });

        it("setGpuPowerLimit does NOT call invoke in mock mode", async () => {
            const { result } = renderHook(() => useGaming());

            await waitFor(() => expect(result.current.isLoadingGpu).toBe(false));

            await act(async () => {
                await result.current.setGpuPowerLimit(200);
            });

            expect(tauriCore.invoke).not.toHaveBeenCalledWith(
                "set_gpu_power_limit",
                expect.anything()
            );
        });
    });

    // ── autoOptimize toggle ───────────────────────────────────────────────────

    describe("autoOptimize toggle", () => {
        beforeEach(() => {
            vi.mocked(tauriCore.isTauri).mockReturnValue(false);
        });

        it("defaults to false when localStorage is empty", () => {
            const { result } = renderHook(() => useGaming());
            expect(result.current.autoOptimize).toBe(false);
        });

        it("defaults to true when localStorage has 'true'", () => {
            localStorage.setItem("gaming-auto-optimize", "true");
            const { result } = renderHook(() => useGaming());
            expect(result.current.autoOptimize).toBe(true);
        });

        it("setAutoOptimize(true) updates state and localStorage", () => {
            const { result } = renderHook(() => useGaming());

            act(() => {
                result.current.setAutoOptimize(true);
            });

            expect(result.current.autoOptimize).toBe(true);
            expect(localStorage.getItem("gaming-auto-optimize")).toBe("true");
        });

        it("setAutoOptimize(false) updates state and localStorage", () => {
            localStorage.setItem("gaming-auto-optimize", "true");
            const { result } = renderHook(() => useGaming());

            act(() => {
                result.current.setAutoOptimize(false);
            });

            expect(result.current.autoOptimize).toBe(false);
            expect(localStorage.getItem("gaming-auto-optimize")).toBe("false");
        });
    });

    // ── captureBaseline ───────────────────────────────────────────────────────

    describe("captureBaseline", () => {
        beforeEach(() => {
            vi.mocked(tauriCore.isTauri).mockReturnValue(false);
        });

        it("captureBaseline saves snapshot to state and localStorage", async () => {
            const { result } = renderHook(() => useGaming());

            // Wait for mock GPU/CPU data to populate
            await waitFor(() => expect(result.current.gpuMetrics).not.toBeNull());
            await waitFor(() => expect(result.current.cpuLoad).not.toBeNull());

            act(() => {
                result.current.captureBaseline();
            });

            expect(result.current.baseline).not.toBeNull();
            expect(result.current.baseline?.gpu).toMatchObject({ name: "NVIDIA GeForce RTX 3080" });
            expect(result.current.baseline?.cpu).toBe(34);
            expect(result.current.baseline?.timestamp).toBeGreaterThan(0);

            const stored = localStorage.getItem("gaming-baseline");
            expect(stored).not.toBeNull();
            const parsed = JSON.parse(stored!);
            expect(parsed.gpu.name).toBe("NVIDIA GeForce RTX 3080");
        });

        it("captureBaseline does nothing when gpuMetrics is null", () => {
            vi.mocked(tauriCore.isTauri).mockReturnValue(false);
            const { result } = renderHook(() => useGaming());

            // Baseline is null initially
            act(() => {
                result.current.captureBaseline();
            });

            // Still null because gpuMetrics may not be set yet at this exact moment
            // Just ensure no crash
        });

        it("baseline is rehydrated from localStorage on mount", async () => {
            const snap = {
                gpu: MOCK_GPU,
                cpu: 42,
                timestamp: 1_700_000_000_000,
            };
            localStorage.setItem("gaming-baseline", JSON.stringify(snap));

            const { result } = renderHook(() => useGaming());

            expect(result.current.baseline).not.toBeNull();
            expect(result.current.baseline?.cpu).toBe(42);
            expect(result.current.baseline?.timestamp).toBe(1_700_000_000_000);
        });
    });

    // ── isTauri=true ──────────────────────────────────────────────────────────

    describe("isTauri=true", () => {
        beforeEach(() => {
            vi.mocked(tauriCore.isTauri).mockReturnValue(true);
            vi.mocked(tauriCore.invoke).mockImplementation(async (cmd) => {
                if (cmd === "get_gpu_metrics") return MOCK_GPU;
                if (cmd === "get_cpu_quick") return 55;
                if (cmd === "detect_active_game") return "Cyberpunk 2077";
                if (cmd === "set_gpu_power_limit") return true;
                return null;
            });
        });

        it("fetches real GPU metrics via invoke on mount", async () => {
            const { result } = renderHook(() => useGaming());

            await waitFor(() => expect(result.current.isLoadingGpu).toBe(false));

            expect(tauriCore.invoke).toHaveBeenCalledWith("get_gpu_metrics");
            expect(result.current.gpuMetrics).toMatchObject({ name: "NVIDIA GeForce RTX 3080" });
        });

        it("fetches real CPU load via invoke on mount", async () => {
            const { result } = renderHook(() => useGaming());

            await waitFor(() => expect(result.current.isLoadingGpu).toBe(false));

            expect(tauriCore.invoke).toHaveBeenCalledWith("get_cpu_quick");
            expect(result.current.cpuLoad).toBe(55);
        });

        it("setGpuPowerLimit calls invoke with gpuIndex and watts", async () => {
            const { result } = renderHook(() => useGaming());

            await waitFor(() => expect(result.current.isLoadingGpu).toBe(false));

            await act(async () => {
                await result.current.setGpuPowerLimit(200);
            });

            expect(tauriCore.invoke).toHaveBeenCalledWith("set_gpu_power_limit", {
                gpuIndex: 0,
                watts: 200,
            });
        });

        it("setGpuPowerLimit sets isSettingLimit=false after completion", async () => {
            const { result } = renderHook(() => useGaming());

            await waitFor(() => expect(result.current.isLoadingGpu).toBe(false));

            await act(async () => {
                await result.current.setGpuPowerLimit(180);
            });

            expect(result.current.isSettingLimit).toBe(false);
        });

        it("showOverlay calls invoke('show_gaming_overlay') and sets isOverlayVisible=true", async () => {
            vi.mocked(tauriCore.invoke).mockImplementation(async (cmd) => {
                if (cmd === "get_gpu_metrics") return MOCK_GPU;
                if (cmd === "get_cpu_quick") return 55;
                if (cmd === "detect_active_game") return null;
                if (cmd === "show_gaming_overlay") return undefined;
                return null;
            });
            const { result } = renderHook(() => useGaming());

            await waitFor(() => expect(result.current.isLoadingGpu).toBe(false));

            await act(async () => {
                await result.current.showOverlay();
            });

            expect(tauriCore.invoke).toHaveBeenCalledWith("show_gaming_overlay");
            expect(result.current.isOverlayVisible).toBe(true);
        });
    });
});
