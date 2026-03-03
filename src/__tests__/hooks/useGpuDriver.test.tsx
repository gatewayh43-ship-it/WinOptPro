import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@/test/utils";
import { useGpuDriver } from "@/hooks/useGpuDriver";
import * as tauriCore from "@tauri-apps/api/core";

vi.mock("@/components/ToastSystem", () => {
    const addToast = vi.fn();
    return { useToast: () => ({ addToast }) };
});

describe("useGpuDriver", () => {
    beforeEach(() => {
        vi.mocked(tauriCore.isTauri).mockReturnValue(false);
        vi.mocked(tauriCore.invoke).mockReset();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("loads mock drivers when not in Tauri", async () => {
        const { result } = renderHook(() => useGpuDriver());

        expect(result.current.isLoading).toBe(true);

        await act(async () => {
            vi.advanceTimersByTime(700);
        });

        expect(result.current.isLoading).toBe(false);
        expect(result.current.drivers.length).toBe(2);
        expect(result.current.drivers[0].vendor).toBe("NVIDIA");
        expect(result.current.drivers[1].vendor).toBe("Intel");
    });

    it("fetchDrivers calls get_gpu_drivers when in Tauri", async () => {
        vi.mocked(tauriCore.isTauri).mockReturnValue(true);
        const mockDrivers = [
            { vendor: "NVIDIA", name: "RTX 3080", version: "30.0.15.1234", date: "2023-06-01", pnpId: "PCI\\VEN_10DE", infName: "oem10.inf" },
        ];
        vi.mocked(tauriCore.invoke).mockResolvedValue(mockDrivers);

        const { result } = renderHook(() => useGpuDriver());

        await act(async () => {
            await vi.runAllTimersAsync();
        });

        expect(tauriCore.invoke).toHaveBeenCalledWith("get_gpu_drivers");
        expect(result.current.drivers).toEqual(mockDrivers);
    });

    it("uninstallDrivers calls invoke with vendor arg when in Tauri", async () => {
        vi.mocked(tauriCore.isTauri).mockReturnValue(true);
        vi.mocked(tauriCore.invoke).mockResolvedValue([]);

        const { result } = renderHook(() => useGpuDriver());

        await act(async () => {
            await vi.runAllTimersAsync();
        });

        vi.mocked(tauriCore.invoke).mockResolvedValue({
            success: true,
            vendor: "NVIDIA",
            removedPackages: ["oem42.inf"],
            log: ["Done"],
            requiresReboot: true,
        });

        await act(async () => {
            await result.current.uninstallDrivers("NVIDIA", true);
        });

        expect(tauriCore.invoke).toHaveBeenCalledWith("uninstall_gpu_drivers", {
            vendor: "NVIDIA",
            deleteDriverStore: true,
        });
    });

    it("uninstallDrivers shows mock result when not in Tauri", async () => {
        const { result } = renderHook(() => useGpuDriver());

        await act(async () => {
            vi.advanceTimersByTime(700);
        });

        await act(async () => {
            result.current.uninstallDrivers("NVIDIA", true);
        });

        await act(async () => {
            vi.advanceTimersByTime(2000);
        });

        expect(result.current.removalResult).not.toBeNull();
        expect(result.current.removalResult?.vendor).toBe("NVIDIA");
        expect(result.current.removalResult?.requiresReboot).toBe(true);
    });

    it("sets error on fetch failure when in Tauri", async () => {
        vi.mocked(tauriCore.isTauri).mockReturnValue(true);
        vi.mocked(tauriCore.invoke).mockRejectedValue(new Error("Access denied"));

        const { result } = renderHook(() => useGpuDriver());

        await act(async () => {
            await vi.runAllTimersAsync();
        });

        expect(result.current.error).toBe("Access denied");
        expect(result.current.drivers).toHaveLength(0);
    });
});
