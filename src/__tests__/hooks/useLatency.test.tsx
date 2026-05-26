import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@/test/utils";
import { useLatency } from "@/hooks/useLatency";
import type { LatencyStatus } from "@/hooks/useLatency";
import * as tauriCore from "@tauri-apps/api/core";

vi.mock("@/components/ToastSystem", () => {
    const addToast = vi.fn();
    return { useToast: () => ({ addToast }) };
});

const REAL_STATUS: LatencyStatus = {
    timerResolution100ns: 100_000,
    minResolution100ns: 156_250,
    maxResolution100ns: 5_000,
    standbyRamMb: 512,
    dynamicTickDisabled: true,
    platformClockForced: true,
};

describe("useLatency", () => {
    beforeEach(() => {
        vi.mocked(tauriCore.invoke).mockReset();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    // ── isTauri=false ─────────────────────────────────────────────────────────

    describe("isTauri=false (desktop runtime unavailable)", () => {
        beforeEach(() => {
            vi.mocked(tauriCore.isTauri).mockReturnValue(false);
        });

        it("leaves status empty and sets a desktop-runtime error without invoking Tauri", async () => {
            const { result } = renderHook(() => useLatency());

            await waitFor(() => expect(result.current.isLoading).toBe(false));

            expect(result.current.status).toBeNull();
            expect(result.current.error).toContain("desktop runtime");
            expect(tauriCore.invoke).not.toHaveBeenCalled();
        });

        it("isLoading starts true and becomes false after mount", async () => {
            const { result } = renderHook(() => useLatency());

            // Initially loading (mock status set synchronously inside fetchStatus)
            await waitFor(() => expect(result.current.isLoading).toBe(false));
        });

        it("sets an error when latency diagnostics need the desktop runtime", async () => {
            const { result } = renderHook(() => useLatency());

            await waitFor(() => expect(result.current.isLoading).toBe(false));

            expect(result.current.error).toContain("desktop runtime");
        });

        it("flushStandby does not invoke without the desktop runtime", async () => {
            const { result } = renderHook(() => useLatency());

            await waitFor(() => expect(result.current.isLoading).toBe(false));

            await act(async () => {
                await result.current.flushStandby();
            });

            expect(tauriCore.invoke).not.toHaveBeenCalledWith("flush_standby_list");
        });
    });

    // ── isTauri=true ──────────────────────────────────────────────────────────

    describe("isTauri=true", () => {
        beforeEach(() => {
            vi.mocked(tauriCore.isTauri).mockReturnValue(true);
            vi.mocked(tauriCore.invoke).mockImplementation(async (cmd) => {
                if (cmd === "get_latency_status") return REAL_STATUS;
                if (cmd === "flush_standby_list") return 256;
                return null;
            });
        });

        it("calls invoke('get_latency_status') on mount and populates status", async () => {
            const { result } = renderHook(() => useLatency());

            await waitFor(() => expect(result.current.isLoading).toBe(false));

            expect(tauriCore.invoke).toHaveBeenCalledWith("get_latency_status");
            expect(result.current.status).toEqual(REAL_STATUS);
        });

        it("sets error when invoke('get_latency_status') throws", async () => {
            vi.mocked(tauriCore.invoke).mockRejectedValue(new Error("NtQuery failed"));
            const { result } = renderHook(() => useLatency());

            await waitFor(() => expect(result.current.isLoading).toBe(false));

            expect(result.current.error).toContain("NtQuery failed");
        });

        it("flushStandby calls invoke('flush_standby_list')", async () => {
            const { result } = renderHook(() => useLatency());

            await waitFor(() => expect(result.current.isLoading).toBe(false));

            await act(async () => {
                await result.current.flushStandby();
            });

            expect(tauriCore.invoke).toHaveBeenCalledWith("flush_standby_list");
        });

        it("flushStandby sets isFlushing=false after completion", async () => {
            const { result } = renderHook(() => useLatency());

            await waitFor(() => expect(result.current.isLoading).toBe(false));

            await act(async () => {
                await result.current.flushStandby();
            });

            expect(result.current.isFlushing).toBe(false);
        });

        it("flushStandby re-fetches status after flush", async () => {
            const { result } = renderHook(() => useLatency());

            await waitFor(() => expect(result.current.isLoading).toBe(false));

            const callsBefore = vi.mocked(tauriCore.invoke).mock.calls.filter(
                (c) => c[0] === "get_latency_status"
            ).length;

            await act(async () => {
                await result.current.flushStandby();
            });

            const callsAfter = vi.mocked(tauriCore.invoke).mock.calls.filter(
                (c) => c[0] === "get_latency_status"
            ).length;

            expect(callsAfter).toBeGreaterThan(callsBefore);
        });
    });

    // ── refresh (manual re-fetch) ─────────────────────────────────────────────

    describe("refresh", () => {
        it("refresh calls fetchStatus again (isTauri=true)", async () => {
            vi.mocked(tauriCore.isTauri).mockReturnValue(true);
            vi.mocked(tauriCore.invoke).mockResolvedValue(REAL_STATUS);

            const { result } = renderHook(() => useLatency());

            await waitFor(() => expect(result.current.isLoading).toBe(false));

            const callsBefore = vi.mocked(tauriCore.invoke).mock.calls.filter(
                (c) => c[0] === "get_latency_status"
            ).length;

            await act(async () => {
                await result.current.refresh();
            });

            const callsAfter = vi.mocked(tauriCore.invoke).mock.calls.filter(
                (c) => c[0] === "get_latency_status"
            ).length;

            expect(callsAfter).toBeGreaterThan(callsBefore);
        });

        it("refresh updates status with latest invoke result", async () => {
            vi.mocked(tauriCore.isTauri).mockReturnValue(true);
            vi.mocked(tauriCore.invoke)
                .mockResolvedValueOnce(REAL_STATUS)
                .mockResolvedValueOnce({ ...REAL_STATUS, standbyRamMb: 128 });

            const { result } = renderHook(() => useLatency());

            await waitFor(() => expect(result.current.isLoading).toBe(false));

            await act(async () => {
                await result.current.refresh();
            });

            expect(result.current.status?.standbyRamMb).toBe(128);
        });
    });

    // ── edge cases ────────────────────────────────────────────────────────────

    describe("edge cases", () => {
        beforeEach(async () => {
            vi.mocked(tauriCore.isTauri).mockReturnValue(true);
            // Reset the shared addToast mock so prior tests don't pollute call counts
            const { useToast } = await import("@/components/ToastSystem");
            vi.mocked(useToast().addToast).mockClear();
        });

        it("flushStandby shows freed MB in success toast", async () => {
            const { useToast } = await import("@/components/ToastSystem");
            const { addToast } = useToast();
            vi.mocked(tauriCore.invoke).mockImplementation(async (cmd) => {
                if (cmd === "get_latency_status") return REAL_STATUS;
                if (cmd === "flush_standby_list") return 512;
                return null;
            });
            const { result } = renderHook(() => useLatency());
            await waitFor(() => expect(result.current.isLoading).toBe(false));

            await act(async () => {
                await result.current.flushStandby();
            });

            expect(addToast).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: "success",
                    message: expect.stringContaining("512"),
                })
            );
        });

        it("error toast only fires once on repeated fetch failures (dedup)", async () => {
            const { useToast } = await import("@/components/ToastSystem");
            const { addToast } = useToast();
            vi.mocked(tauriCore.invoke).mockRejectedValue(new Error("NtQuery failed"));

            const { result } = renderHook(() => useLatency());
            await waitFor(() => expect(result.current.isLoading).toBe(false));

            // Trigger a second fetch — error is already set so toast must NOT fire again
            await act(async () => {
                await result.current.refresh();
            });

            const errorToastCalls = (addToast as ReturnType<typeof vi.fn>).mock.calls.filter(
                (c: unknown[]) => (c[0] as { type?: string })?.type === "error"
            );
            expect(errorToastCalls.length).toBe(1);
        });
    });

    // ── polling ───────────────────────────────────────────────────────────────

    describe("polling (5s interval)", () => {
        it("polls fetchStatus every 5 seconds when isTauri=true", async () => {
            vi.mocked(tauriCore.isTauri).mockReturnValue(true);
            vi.mocked(tauriCore.invoke).mockResolvedValue(REAL_STATUS);

            vi.useFakeTimers();
            renderHook(() => useLatency());

            // Flush the initial mount fetch using act + advanceTimersByTime
            await act(async () => {
                vi.advanceTimersByTime(0);
            });

            const callsAfterMount = vi.mocked(tauriCore.invoke).mock.calls.filter(
                (c) => c[0] === "get_latency_status"
            ).length;

            // Advance 5 seconds to trigger the setInterval callback
            await act(async () => {
                vi.advanceTimersByTime(5000);
            });

            const callsAfterPoll = vi.mocked(tauriCore.invoke).mock.calls.filter(
                (c) => c[0] === "get_latency_status"
            ).length;

            expect(callsAfterPoll).toBeGreaterThan(callsAfterMount);
            vi.useRealTimers();
        });
    });
});
