import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@/test/utils";
import { useProcesses } from "@/hooks/useProcesses";
import * as tauriCore from "@tauri-apps/api/core";

const mockProcesses = [
    { pid: 1234, name: "chrome.exe", cpu_usage: 5.2, memory_bytes: 104857600, disk_read_bytes: 0, disk_written_bytes: 0, user: "S-1-5-21-xxx" },
    { pid: 5678, name: "node.exe", cpu_usage: 1.0, memory_bytes: 52428800, disk_read_bytes: 1024, disk_written_bytes: 512, user: "S-1-5-21-yyy" },
];

describe("useProcesses", () => {
    beforeEach(() => {
        vi.mocked(tauriCore.invoke).mockReset();
        vi.mocked(tauriCore.invoke).mockImplementation(async (cmd) => {
            if (cmd === "get_processes") return mockProcesses;
            if (cmd === "kill_process") return true;
            if (cmd === "set_process_priority") return true;
            if (cmd === "open_file_location") return true;
            return null;
        });
    });

    it("fetches processes on mount", async () => {
        const { result } = renderHook(() => useProcesses());
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.processes).toEqual(mockProcesses);
        expect(tauriCore.invoke).toHaveBeenCalledWith("get_processes");
    });

    it("sets isLoading false after fetch", async () => {
        const { result } = renderHook(() => useProcesses());
        await waitFor(() => expect(result.current.isLoading).toBe(false));
    });

    it("sets error on fetch failure", async () => {
        vi.mocked(tauriCore.invoke).mockRejectedValue(new Error("Access denied"));
        const { result } = renderHook(() => useProcesses());
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.error).toBe("Access denied");
    });

    it("killProcess calls kill_process with pid", async () => {
        const { result } = renderHook(() => useProcesses());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => {
            await result.current.killProcess(1234, "chrome.exe");
        });

        expect(tauriCore.invoke).toHaveBeenCalledWith("kill_process", { pid: 1234 });
    });

    it("killProcess returns true on success", async () => {
        const { result } = renderHook(() => useProcesses());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        let returned: boolean | undefined;
        await act(async () => {
            returned = await result.current.killProcess(1234, "chrome.exe");
        });

        expect(returned).toBe(true);
    });

    it("killProcess returns false on error", async () => {
        vi.mocked(tauriCore.invoke).mockImplementation(async (cmd) => {
            if (cmd === "get_processes") return mockProcesses;
            if (cmd === "kill_process") throw new Error("Permission denied");
            return null;
        });
        const { result } = renderHook(() => useProcesses());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        let returned: boolean | undefined;
        await act(async () => {
            returned = await result.current.killProcess(1234, "chrome.exe");
        });

        expect(returned).toBe(false);
    });

    it("setProcessPriority calls set_process_priority with pid and priority", async () => {
        const { result } = renderHook(() => useProcesses());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => {
            await result.current.setProcessPriority(1234, "High");
        });

        expect(tauriCore.invoke).toHaveBeenCalledWith("set_process_priority", { pid: 1234, priority: "High" });
    });

    it("openFileLocation calls open_file_location with pid", async () => {
        const { result } = renderHook(() => useProcesses());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => {
            await result.current.openFileLocation(1234);
        });

        expect(tauriCore.invoke).toHaveBeenCalledWith("open_file_location", { pid: 1234 });
    });

    it("refresh re-fetches process list", async () => {
        const { result } = renderHook(() => useProcesses());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        const callsBefore = vi.mocked(tauriCore.invoke).mock.calls.filter(c => c[0] === "get_processes").length;
        await act(async () => {
            await result.current.refresh();
        });
        const callsAfter = vi.mocked(tauriCore.invoke).mock.calls.filter(c => c[0] === "get_processes").length;

        expect(callsAfter).toBeGreaterThan(callsBefore);
    });
});
