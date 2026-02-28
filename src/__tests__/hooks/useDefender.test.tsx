import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@/test/utils";
import { useDefender } from "@/hooks/useDefender";
import * as tauriCore from "@tauri-apps/api/core";

const mockStatus = {
    realtimeProtectionEnabled: true,
    signatureOutOfDate: false,
    antivirusSignatureAge: 2,
    quickScanAge: 5,
    fullScanAge: 10,
};

describe("useDefender", () => {
    beforeEach(() => {
        vi.mocked(tauriCore.invoke).mockReset();
        vi.mocked(tauriCore.invoke).mockImplementation(async (cmd) => {
            if (cmd === "defender_get_status") return mockStatus;
            return "OK";
        });
    });

    it("fetches status on mount", async () => {
        const { result } = renderHook(() => useDefender());
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.status).toEqual(mockStatus);
        expect(tauriCore.invoke).toHaveBeenCalledWith("defender_get_status");
    });

    it("sets loading false after fetch completes", async () => {
        const { result } = renderHook(() => useDefender());
        await waitFor(() => expect(result.current.loading).toBe(false));
    });

    it("handles fetch error gracefully — status remains null", async () => {
        vi.mocked(tauriCore.invoke).mockRejectedValue(new Error("WMI error"));
        const { result } = renderHook(() => useDefender());
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.status).toBeNull();
    });

    it("runScan calls defender_run_scan and refetches status", async () => {
        const { result } = renderHook(() => useDefender());
        await waitFor(() => expect(result.current.loading).toBe(false));

        await act(async () => {
            await result.current.runScan("Quick");
        });

        expect(tauriCore.invoke).toHaveBeenCalledWith("defender_run_scan", { scanType: "Quick" });
        // refetch should have happened
        const getCalls = vi.mocked(tauriCore.invoke).mock.calls.filter(c => c[0] === "defender_get_status");
        expect(getCalls.length).toBeGreaterThanOrEqual(2);
    });

    it("runScan clears actionLoading after completing", async () => {
        const { result } = renderHook(() => useDefender());
        await waitFor(() => expect(result.current.loading).toBe(false));

        await act(async () => {
            await result.current.runScan("Full");
        });

        expect(result.current.actionLoading).toBe(false);
    });

    it("updateSignatures calls defender_update_signatures and refetches", async () => {
        const { result } = renderHook(() => useDefender());
        await waitFor(() => expect(result.current.loading).toBe(false));

        await act(async () => {
            await result.current.updateSignatures();
        });

        expect(tauriCore.invoke).toHaveBeenCalledWith("defender_update_signatures");
        const getCalls = vi.mocked(tauriCore.invoke).mock.calls.filter(c => c[0] === "defender_get_status");
        expect(getCalls.length).toBeGreaterThanOrEqual(2);
    });

    it("setRealtime calls defender_set_realtime with enabled flag", async () => {
        const { result } = renderHook(() => useDefender());
        await waitFor(() => expect(result.current.loading).toBe(false));

        await act(async () => {
            await result.current.setRealtime(false);
        });

        expect(tauriCore.invoke).toHaveBeenCalledWith("defender_set_realtime", { enabled: false });
    });

    it("setRealtime refetches status afterward", async () => {
        const { result } = renderHook(() => useDefender());
        await waitFor(() => expect(result.current.loading).toBe(false));

        await act(async () => {
            await result.current.setRealtime(true);
        });

        const getCalls = vi.mocked(tauriCore.invoke).mock.calls.filter(c => c[0] === "defender_get_status");
        expect(getCalls.length).toBeGreaterThanOrEqual(2);
    });
});
