import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@/test/utils";
import * as tauriCore from "@tauri-apps/api/core";
import { useNetworkOptimizer } from "@/hooks/useNetworkOptimizer";
import { createNetworkOptimizerApplyResult, createNetworkOptimizerReport } from "@/__tests__/fixtures/networkOptimizer";

describe("useNetworkOptimizer", () => {
    beforeEach(() => {
        vi.mocked(tauriCore.invoke).mockReset();
        vi.mocked(tauriCore.invoke).mockImplementation(async (cmd) => {
            if (cmd === "scan_network_optimizer") return createNetworkOptimizerReport();
            if (cmd === "apply_network_optimizer_action") return createNetworkOptimizerApplyResult();
            return null;
        });
    });

    it("scans network telemetry on mount", async () => {
        const { result } = renderHook(() => useNetworkOptimizer());

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.report?.adapters).toHaveLength(2);
        expect(result.current.primaryAdapter?.name).toBe("Ethernet");
        expect(result.current.connectedAdapters.map((adapter) => adapter.name)).toEqual(["Ethernet", "Wi-Fi"]);
        expect(tauriCore.invoke).toHaveBeenCalledWith("scan_network_optimizer");
    });

    it("filters recommendations by optimization profile", async () => {
        const { result } = renderHook(() => useNetworkOptimizer());

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        const gamingRecommendations = result.current.getRecommendationsForProfile("gaming_latency");
        expect(gamingRecommendations.map((rec) => rec.id)).toEqual([
            "background_network_contention",
            "bufferbloat_loaded_test",
        ]);
    });

    it("uses cached telemetry unless refresh is forced", async () => {
        const { result, rerender } = renderHook(() => useNetworkOptimizer());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        const callsAfterFirstRender = vi.mocked(tauriCore.invoke).mock.calls.filter(([cmd]) => cmd === "scan_network_optimizer").length;
        rerender();
        await act(async () => {
            await result.current.scan();
        });

        const callsAfterCachedScan = vi.mocked(tauriCore.invoke).mock.calls.filter(([cmd]) => cmd === "scan_network_optimizer").length;
        expect(callsAfterCachedScan).toBe(callsAfterFirstRender);

        await act(async () => {
            await result.current.refresh();
        });

        const callsAfterRefresh = vi.mocked(tauriCore.invoke).mock.calls.filter(([cmd]) => cmd === "scan_network_optimizer").length;
        expect(callsAfterRefresh).toBeGreaterThan(callsAfterCachedScan);
    });

    it("applies an action, stores result, and rescans telemetry", async () => {
        const { result } = renderHook(() => useNetworkOptimizer());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => {
            await result.current.applyAction({
                actionId: "set_dns_cloudflare",
                adapterName: "Ethernet",
            });
        });

        expect(tauriCore.invoke).toHaveBeenCalledWith("apply_network_optimizer_action", {
            request: {
                actionId: "set_dns_cloudflare",
                adapterName: "Ethernet",
            },
        });
        expect(result.current.lastApplyResult?.title).toBe("Network action applied");
        expect(result.current.isApplying).toBe(false);

        const scanCalls = vi.mocked(tauriCore.invoke).mock.calls.filter(([cmd]) => cmd === "scan_network_optimizer");
        expect(scanCalls.length).toBeGreaterThanOrEqual(2);
    });

    it("surfaces scan errors", async () => {
        vi.mocked(tauriCore.invoke).mockRejectedValue(new Error("PowerShell unavailable"));

        const { result } = renderHook(() => useNetworkOptimizer());

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.error).toBe("PowerShell unavailable");
        expect(result.current.report).toBeNull();
    });

    it("surfaces apply errors without clearing existing telemetry", async () => {
        vi.mocked(tauriCore.invoke).mockImplementation(async (cmd) => {
            if (cmd === "scan_network_optimizer") return createNetworkOptimizerReport();
            if (cmd === "apply_network_optimizer_action") throw new Error("Administrator privileges required");
            return null;
        });
        const { result } = renderHook(() => useNetworkOptimizer());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        let thrown: unknown;
        await act(async () => {
            try {
                await result.current.applyAction({ actionId: "enable_rss", adapterName: "Ethernet" });
            } catch (err) {
                thrown = err;
            }
        });

        expect(thrown).toBeInstanceOf(Error);
        await waitFor(() => expect(result.current.error).toBe("Administrator privileges required"));
        expect(result.current.report?.adapters).toHaveLength(2);
    });
});
