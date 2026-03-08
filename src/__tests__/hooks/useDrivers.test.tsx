import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@/test/utils";
import { useDrivers } from "@/hooks/useDrivers";
import type { DriverInfo } from "@/hooks/useDrivers";
import * as tauriCore from "@tauri-apps/api/core";

vi.mock("@/components/ToastSystem", () => {
    const addToast = vi.fn();
    return { useToast: () => ({ addToast }) };
});

const mockDrivers: DriverInfo[] = [
    {
        device_name: "NVIDIA GeForce RTX 3080",
        inf_name: "nvlddmkm.inf",
        provider: "NVIDIA",
        version: "31.0.15.3623",
        date: "2024-01-15",
        device_class: "Display",
        is_signed: true,
    },
    {
        device_name: "Intel(R) Wi-Fi 6 AX200",
        inf_name: "netwtw08.inf",
        provider: "Intel",
        version: "22.220.0.7",
        date: "2023-11-20",
        device_class: "Net",
        is_signed: true,
    },
    {
        device_name: "Test Unsigned Driver",
        inf_name: "test.inf",
        provider: "Unknown",
        version: "1.0.0.0",
        date: "2021-01-01",
        device_class: "Unknown",
        is_signed: false,
    },
];

describe("useDrivers", () => {
    beforeEach(() => {
        vi.mocked(tauriCore.invoke).mockReset();
        vi.mocked(tauriCore.isTauri).mockReturnValue(true);
    });

    // ── isTauri=false ─────────────────────────────────────────────────────────

    describe("isTauri=false (mock data)", () => {
        beforeEach(() => {
            vi.mocked(tauriCore.isTauri).mockReturnValue(false);
        });

        it("fetchDrivers loads mock drivers without invoking Tauri", async () => {
            vi.useFakeTimers();
            const { result } = renderHook(() => useDrivers());

            let fetchPromise: Promise<void>;
            act(() => {
                fetchPromise = result.current.fetchDrivers();
            });

            // Advance the 1000ms mock delay
            await act(async () => {
                vi.advanceTimersByTime(1100);
            });
            await act(async () => { await fetchPromise; });

            expect(result.current.isLoading).toBe(false);
            expect(result.current.allDrivers).toHaveLength(5); // MOCK_DRIVERS has 5
            expect(tauriCore.invoke).not.toHaveBeenCalled();
            vi.useRealTimers();
        });

        it("mock drivers include one unsigned driver (unsignedCount=1)", async () => {
            vi.useFakeTimers();
            const { result } = renderHook(() => useDrivers());

            let fetchPromise: Promise<void>;
            act(() => {
                fetchPromise = result.current.fetchDrivers();
            });

            await act(async () => {
                vi.advanceTimersByTime(1100);
            });
            await act(async () => { await fetchPromise; });

            expect(result.current.unsignedCount).toBe(1);
            vi.useRealTimers();
        });

        it("exportList returns false and does not invoke in mock mode", async () => {
            const { result } = renderHook(() => useDrivers());
            let returnValue: boolean | undefined;

            await act(async () => {
                returnValue = await result.current.exportList("C:\\drivers.csv");
            });

            expect(returnValue).toBe(false);
            expect(tauriCore.invoke).not.toHaveBeenCalled();
        });
    });

    // ── isTauri=true ──────────────────────────────────────────────────────────

    describe("isTauri=true", () => {
        beforeEach(() => {
            vi.mocked(tauriCore.isTauri).mockReturnValue(true);
            vi.mocked(tauriCore.invoke).mockResolvedValue(mockDrivers);
        });

        it("fetchDrivers calls invoke('list_drivers') and populates drivers", async () => {
            const { result } = renderHook(() => useDrivers());

            await act(async () => {
                await result.current.fetchDrivers(true);
            });

            expect(tauriCore.invoke).toHaveBeenCalledWith("list_drivers");
            expect(result.current.allDrivers).toEqual(mockDrivers);
        });

        it("fetchDrivers sets isLoading=false after completion", async () => {
            const { result } = renderHook(() => useDrivers());

            await act(async () => {
                await result.current.fetchDrivers(true);
            });

            expect(result.current.isLoading).toBe(false);
        });

        it("fetchDrivers sets error on invoke failure", async () => {
            vi.mocked(tauriCore.invoke).mockRejectedValue(new Error("WMI unavailable"));
            const { result } = renderHook(() => useDrivers());

            await act(async () => {
                await result.current.fetchDrivers(true);
            });

            expect(result.current.error).toContain("WMI unavailable");
        });

        it("exportList calls invoke('export_driver_list') with path", async () => {
            vi.mocked(tauriCore.invoke).mockResolvedValue(undefined);
            const { result } = renderHook(() => useDrivers());
            let returnValue: boolean | undefined;

            await act(async () => {
                returnValue = await result.current.exportList("C:\\drivers.csv");
            });

            expect(tauriCore.invoke).toHaveBeenCalledWith("export_driver_list", {
                path: "C:\\drivers.csv",
            });
            expect(returnValue).toBe(true);
        });

        it("exportList returns false when invoke throws", async () => {
            vi.mocked(tauriCore.invoke).mockRejectedValue(new Error("access denied"));
            const { result } = renderHook(() => useDrivers());
            let returnValue: boolean | undefined;

            await act(async () => {
                returnValue = await result.current.exportList("C:\\drivers.csv");
            });

            expect(returnValue).toBe(false);
        });
    });

    // ── filter state ──────────────────────────────────────────────────────────

    describe("filter state", () => {
        beforeEach(() => {
            vi.mocked(tauriCore.isTauri).mockReturnValue(true);
            vi.mocked(tauriCore.invoke).mockResolvedValue(mockDrivers);
        });

        it("default filter=all returns all drivers", async () => {
            const { result } = renderHook(() => useDrivers());

            await act(async () => {
                await result.current.fetchDrivers(true);
            });

            expect(result.current.filter).toBe("all");
            expect(result.current.drivers).toHaveLength(3);
        });

        it("filter=signed returns only signed drivers", async () => {
            const { result } = renderHook(() => useDrivers());

            await act(async () => {
                await result.current.fetchDrivers(true);
            });

            act(() => {
                result.current.setFilter("signed");
            });

            expect(result.current.drivers.every((d) => d.is_signed)).toBe(true);
            expect(result.current.drivers).toHaveLength(2);
        });

        it("filter=unsigned returns only unsigned drivers", async () => {
            const { result } = renderHook(() => useDrivers());

            await act(async () => {
                await result.current.fetchDrivers(true);
            });

            act(() => {
                result.current.setFilter("unsigned");
            });

            expect(result.current.drivers.every((d) => !d.is_signed)).toBe(true);
            expect(result.current.drivers).toHaveLength(1);
        });

        it("unsignedCount reflects total unsigned regardless of filter", async () => {
            const { result } = renderHook(() => useDrivers());

            await act(async () => {
                await result.current.fetchDrivers(true);
            });

            act(() => {
                result.current.setFilter("signed");
            });

            // Filter shows only signed, but unsignedCount should still be 1
            expect(result.current.unsignedCount).toBe(1);
        });
    });

    // ── cache ─────────────────────────────────────────────────────────────────

    describe("cache behaviour", () => {
        it("uses cached drivers on second fetch without force", async () => {
            vi.mocked(tauriCore.isTauri).mockReturnValue(true);
            vi.mocked(tauriCore.invoke).mockResolvedValue(mockDrivers);

            const { result } = renderHook(() => useDrivers());

            // First fetch (force=true)
            await act(async () => {
                await result.current.fetchDrivers(true);
            });

            const firstCallCount = vi.mocked(tauriCore.invoke).mock.calls.length;

            // Second fetch without force — should use cache
            await act(async () => {
                await result.current.fetchDrivers(false);
            });

            expect(vi.mocked(tauriCore.invoke).mock.calls.length).toBe(firstCallCount);
        });
    });
});
