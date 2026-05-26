import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@/test/utils";
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
    });

    it("leaves drivers empty and sets an error when desktop runtime is unavailable", async () => {
        const { result } = renderHook(() => useGpuDriver());

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.drivers).toEqual([]);
        expect(result.current.error).toContain("desktop runtime");
        expect(tauriCore.invoke).not.toHaveBeenCalled();
    });

    it("fetchDrivers calls get_gpu_drivers when in Tauri", async () => {
        vi.mocked(tauriCore.isTauri).mockReturnValue(true);
        const mockDrivers = [
            { vendor: "NVIDIA", name: "RTX 3080", version: "30.0.15.1234", date: "2023-06-01", pnpId: "PCI\\VEN_10DE", infName: "oem10.inf" },
        ];
        vi.mocked(tauriCore.invoke).mockResolvedValue(mockDrivers);

        const { result } = renderHook(() => useGpuDriver());

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(tauriCore.invoke).toHaveBeenCalledWith("get_gpu_drivers");
        expect(result.current.drivers).toEqual(mockDrivers);
    });

    it("uninstallDrivers calls invoke with vendor arg when in Tauri", async () => {
        vi.mocked(tauriCore.isTauri).mockReturnValue(true);
        vi.mocked(tauriCore.invoke).mockResolvedValue([]);

        const { result } = renderHook(() => useGpuDriver());

        await waitFor(() => expect(result.current.isLoading).toBe(false));

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

    it("uninstallDrivers leaves removalResult empty without desktop runtime", async () => {
        const { result } = renderHook(() => useGpuDriver());

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => {
            await result.current.uninstallDrivers("NVIDIA", true);
        });

        expect(result.current.removalResult).toBeNull();
        expect(result.current.error).toContain("desktop runtime");
        expect(tauriCore.invoke).not.toHaveBeenCalledWith("uninstall_gpu_drivers", expect.anything());
    });

    it("sets error on fetch failure when in Tauri", async () => {
        vi.mocked(tauriCore.isTauri).mockReturnValue(true);
        vi.mocked(tauriCore.invoke).mockRejectedValue(new Error("Access denied"));

        const { result } = renderHook(() => useGpuDriver());

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.error).toBe("Access denied");
        expect(result.current.drivers).toHaveLength(0);
    });
});
