import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@/test/utils";
import { useNetwork } from "@/hooks/useNetwork";
import * as tauriCore from "@tauri-apps/api/core";

const mockInterfaces = [
    { name: "Ethernet", macAddress: "AA:BB:CC:DD:EE:FF", receivedBytes: 1048576, transmittedBytes: 524288, ipV4: "192.168.1.100" },
    { name: "Wi-Fi", macAddress: "11:22:33:44:55:66", receivedBytes: 2097152, transmittedBytes: 1048576, ipV4: "192.168.1.101" },
];

const mockPingResult = {
    host: "8.8.8.8",
    latencyMs: 12.5,
    minMs: 11.0,
    maxMs: 14.0,
    jitterMs: 1.5,
    packetLossPct: 0,
    success: true,
};

describe("useNetwork", () => {
    beforeEach(() => {
        vi.mocked(tauriCore.invoke).mockReset();
        vi.mocked(tauriCore.invoke).mockImplementation(async (cmd) => {
            if (cmd === "get_network_interfaces") return mockInterfaces;
            if (cmd === "ping_host") return mockPingResult;
            return null;
        });
    });

    it("fetches network interfaces on mount", async () => {
        const { result } = renderHook(() => useNetwork());
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.interfaces).toEqual(mockInterfaces);
        expect(tauriCore.invoke).toHaveBeenCalledWith("get_network_interfaces");
    });

    it("sets isLoading false after fetch", async () => {
        const { result } = renderHook(() => useNetwork());
        await waitFor(() => expect(result.current.isLoading).toBe(false));
    });

    it("sets error on fetch failure", async () => {
        vi.mocked(tauriCore.invoke).mockRejectedValue(new Error("Network unavailable"));
        const { result } = renderHook(() => useNetwork());
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.error).toBe("Network unavailable");
    });

    it("pingHost calls ping_host with trimmed host", async () => {
        const { result } = renderHook(() => useNetwork());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => {
            await result.current.pingHost("  8.8.8.8  ");
        });

        expect(tauriCore.invoke).toHaveBeenCalledWith("ping_host", { host: "8.8.8.8" });
    });

    it("pingHost sets pingResult on success", async () => {
        const { result } = renderHook(() => useNetwork());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => {
            await result.current.pingHost("8.8.8.8");
        });

        expect(result.current.pingResult).toEqual(mockPingResult);
    });

    it("pingHost sets pingError on failure", async () => {
        vi.mocked(tauriCore.invoke).mockImplementation(async (cmd) => {
            if (cmd === "get_network_interfaces") return mockInterfaces;
            if (cmd === "ping_host") throw new Error("Host unreachable");
            return null;
        });
        const { result } = renderHook(() => useNetwork());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => {
            await result.current.pingHost("999.999.999.999");
        });

        expect(result.current.pingError).toBe("Host unreachable");
        expect(result.current.pingResult).toBeNull();
    });

    it("pingHost does nothing for empty host", async () => {
        const { result } = renderHook(() => useNetwork());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        const callsBefore = vi.mocked(tauriCore.invoke).mock.calls.filter(c => c[0] === "ping_host").length;
        await act(async () => {
            await result.current.pingHost("   ");
        });
        const callsAfter = vi.mocked(tauriCore.invoke).mock.calls.filter(c => c[0] === "ping_host").length;

        expect(callsAfter).toBe(callsBefore);
    });

    it("pinging is true during pingHost and false after", async () => {
        let resolvePin: (v: unknown) => void;
        const slowPing = new Promise(res => { resolvePin = res; });

        vi.mocked(tauriCore.invoke).mockImplementation(async (cmd) => {
            if (cmd === "get_network_interfaces") return mockInterfaces;
            if (cmd === "ping_host") return slowPing;
            return null;
        });

        const { result } = renderHook(() => useNetwork());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        act(() => { result.current.pingHost("8.8.8.8"); });
        await waitFor(() => expect(result.current.pinging).toBe(true));

        resolvePin!(mockPingResult);
        await waitFor(() => expect(result.current.pinging).toBe(false));
    });

    it("refresh re-fetches interfaces", async () => {
        const { result } = renderHook(() => useNetwork());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        const callsBefore = vi.mocked(tauriCore.invoke).mock.calls.filter(c => c[0] === "get_network_interfaces").length;
        await act(async () => {
            await result.current.refresh();
        });
        const callsAfter = vi.mocked(tauriCore.invoke).mock.calls.filter(c => c[0] === "get_network_interfaces").length;

        expect(callsAfter).toBeGreaterThan(callsBefore);
    });
});
