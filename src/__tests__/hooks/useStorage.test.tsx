import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@/test/utils";
import { useStorage } from "@/hooks/useStorage";
import * as tauriCore from "@tauri-apps/api/core";

const mockItems = [
    { id: "temp-windows", category: "Windows Temp", path: "C:\\Windows\\Temp", size_bytes: 52428800, description: "Windows temporary files" },
    { id: "temp-user", category: "User Temp", path: "%TEMP%", size_bytes: 10485760, description: "User temp folder" },
];

const mockDiskHealth = [
    { name: "Samsung SSD", status: "OK", media_type: "4", health_status: "Healthy" },
];

const mockCleanupResult = {
    success: true,
    bytes_freed: 62914560,
    items_removed: 350,
    errors: [],
};

describe("useStorage", () => {
    beforeEach(() => {
        vi.mocked(tauriCore.invoke).mockReset();
        vi.mocked(tauriCore.invoke).mockImplementation(async (cmd) => {
            if (cmd === "scan_junk_files") return mockItems;
            if (cmd === "get_disk_health") return mockDiskHealth;
            if (cmd === "execute_cleanup") return mockCleanupResult;
            return null;
        });
    });

    it("scans on mount and populates items", async () => {
        const { result } = renderHook(() => useStorage());
        await waitFor(() => expect(result.current.isScanning).toBe(false));
        expect(result.current.items).toEqual(mockItems);
        expect(tauriCore.invoke).toHaveBeenCalledWith("scan_junk_files");
    });

    it("fetches disk health on mount", async () => {
        const { result } = renderHook(() => useStorage());
        await waitFor(() => expect(result.current.isScanning).toBe(false));
        expect(result.current.diskHealth).toEqual(mockDiskHealth);
        expect(tauriCore.invoke).toHaveBeenCalledWith("get_disk_health");
    });

    it("sets isScanning to false after scan", async () => {
        const { result } = renderHook(() => useStorage());
        await waitFor(() => expect(result.current.isScanning).toBe(false));
    });

    it("sets error on scan failure", async () => {
        vi.mocked(tauriCore.invoke).mockRejectedValue(new Error("Permission denied"));
        const { result } = renderHook(() => useStorage());
        await waitFor(() => expect(result.current.isScanning).toBe(false));
        expect(result.current.error).toBe("Permission denied");
    });

    it("still loads even if disk health fails", async () => {
        vi.mocked(tauriCore.invoke).mockImplementation(async (cmd) => {
            if (cmd === "scan_junk_files") return mockItems;
            if (cmd === "get_disk_health") throw new Error("WMI failed");
            return null;
        });
        const { result } = renderHook(() => useStorage());
        await waitFor(() => expect(result.current.isScanning).toBe(false));
        expect(result.current.items).toEqual(mockItems);
        expect(result.current.diskHealth).toEqual([]);
    });

    it("executeCleanup calls execute_cleanup with selected ids", async () => {
        const { result } = renderHook(() => useStorage());
        await waitFor(() => expect(result.current.isScanning).toBe(false));

        await act(async () => {
            await result.current.executeCleanup(["temp-windows", "temp-user"]);
        });

        expect(tauriCore.invoke).toHaveBeenCalledWith("execute_cleanup", {
            itemIds: ["temp-windows", "temp-user"],
        });
    });

    it("executeCleanup does nothing for empty array", async () => {
        const { result } = renderHook(() => useStorage());
        await waitFor(() => expect(result.current.isScanning).toBe(false));

        const invokeBefore = vi.mocked(tauriCore.invoke).mock.calls.length;
        await act(async () => {
            await result.current.executeCleanup([]);
        });
        const invokeAfter = vi.mocked(tauriCore.invoke).mock.calls.length;

        expect(invokeAfter).toBe(invokeBefore);
    });

    it("executeCleanup re-scans after completion", async () => {
        const { result } = renderHook(() => useStorage());
        await waitFor(() => expect(result.current.isScanning).toBe(false));

        const scanCallsBefore = vi.mocked(tauriCore.invoke).mock.calls.filter(c => c[0] === "scan_junk_files").length;

        await act(async () => {
            await result.current.executeCleanup(["temp-windows"]);
        });

        await waitFor(() => expect(result.current.isCleaning).toBe(false));
        const scanCallsAfter = vi.mocked(tauriCore.invoke).mock.calls.filter(c => c[0] === "scan_junk_files").length;
        expect(scanCallsAfter).toBeGreaterThan(scanCallsBefore);
    });

    it("scan can be triggered manually", async () => {
        const { result } = renderHook(() => useStorage());
        await waitFor(() => expect(result.current.isScanning).toBe(false));

        const scanCallsBefore = vi.mocked(tauriCore.invoke).mock.calls.filter(c => c[0] === "scan_junk_files").length;
        await act(async () => {
            await result.current.scan();
        });
        await waitFor(() => expect(result.current.isScanning).toBe(false));

        const scanCallsAfter = vi.mocked(tauriCore.invoke).mock.calls.filter(c => c[0] === "scan_junk_files").length;
        expect(scanCallsAfter).toBeGreaterThan(scanCallsBefore);
    });
});
