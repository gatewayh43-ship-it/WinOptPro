import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@/test/utils";
import { usePrivacyAudit } from "@/hooks/usePrivacyAudit";
import type { PrivacyAuditResult } from "@/hooks/usePrivacyAudit";
import * as tauriCore from "@tauri-apps/api/core";

vi.mock("../../../components/ToastSystem", () => {
    const addToast = vi.fn();
    return { useToast: () => ({ addToast }) };
});

const mockAuditResult: PrivacyAuditResult = {
    score: 40,
    issues: [
        {
            id: "diagtrack_svc",
            category: "Telemetry",
            title: "Diagnostics Tracking Service running",
            severity: 3,
            description: "DiagTrack sends data.",
            fix_cmd: "",
            is_fixed: false,
        },
        {
            id: "telemetry_level",
            category: "Telemetry",
            title: "Telemetry level above Security",
            severity: 3,
            description: "Telemetry is set above minimum.",
            fix_cmd: "",
            is_fixed: false,
        },
        {
            id: "advertising_id",
            category: "Registry",
            title: "Advertising ID enabled",
            severity: 2,
            description: "Tracks app usage.",
            fix_cmd: "",
            is_fixed: true,
        },
    ],
};

describe("usePrivacyAudit", () => {
    beforeEach(() => {
        vi.mocked(tauriCore.invoke).mockReset();
    });

    // ── isTauri=false (mock data) ─────────────────────────────────────────────

    describe("isTauri=false (mock data)", () => {
        beforeEach(() => {
            vi.mocked(tauriCore.isTauri).mockReturnValue(false);
        });

        it("initial state: auditResult=null, isScanning=false", () => {
            const { result } = renderHook(() => usePrivacyAudit());
            expect(result.current.auditResult).toBeNull();
            expect(result.current.isScanning).toBe(false);
        });

        it("runScan returns mock issues and sets auditResult", async () => {
            vi.useFakeTimers();
            const { result } = renderHook(() => usePrivacyAudit());

            let scanPromise: Promise<void>;
            act(() => {
                scanPromise = result.current.runScan();
            });

            // Advance past the 1200ms delay
            await act(async () => {
                vi.advanceTimersByTime(1300);
            });
            await act(async () => { await scanPromise; });

            expect(result.current.auditResult).not.toBeNull();
            expect(result.current.auditResult!.issues.length).toBeGreaterThan(0);
            expect(tauriCore.invoke).not.toHaveBeenCalledWith("scan_privacy_issues");
            vi.useRealTimers();
        });

        it("runScan sets isScanning=false after completion", async () => {
            vi.useFakeTimers();
            const { result } = renderHook(() => usePrivacyAudit());

            let scanPromise: Promise<void>;
            act(() => {
                scanPromise = result.current.runScan();
            });

            await act(async () => {
                vi.advanceTimersByTime(1300);
            });
            await act(async () => { await scanPromise; });

            expect(result.current.isScanning).toBe(false);
            vi.useRealTimers();
        });

        it("mock score is computed from mock issues", async () => {
            vi.useFakeTimers();
            const { result } = renderHook(() => usePrivacyAudit());

            let scanPromise: Promise<void>;
            act(() => {
                scanPromise = result.current.runScan();
            });

            await act(async () => {
                vi.advanceTimersByTime(1300);
            });
            await act(async () => { await scanPromise; });

            // MOCK_ISSUES: some are is_fixed=true, some false — score is 0–100
            expect(result.current.auditResult!.score).toBeGreaterThanOrEqual(0);
            expect(result.current.auditResult!.score).toBeLessThanOrEqual(100);
            vi.useRealTimers();
        });

        it("fixIssues marks selected issues as fixed and updates score", async () => {
            vi.useFakeTimers();
            const { result } = renderHook(() => usePrivacyAudit());

            let scanPromise: Promise<void>;
            act(() => {
                scanPromise = result.current.runScan();
            });

            await act(async () => {
                vi.advanceTimersByTime(1300);
            });
            await act(async () => { await scanPromise; });

            const scoreBefore = result.current.auditResult!.score;

            // Fix the first unfixed issue
            const unfixedIds = result.current.auditResult!.issues
                .filter((i) => !i.is_fixed)
                .map((i) => i.id)
                .slice(0, 1);

            let fixPromise: Promise<void>;
            act(() => {
                fixPromise = result.current.fixIssues(unfixedIds);
            });

            await act(async () => {
                vi.advanceTimersByTime(900);
            });
            await act(async () => { await fixPromise; });

            const fixedIssue = result.current.auditResult!.issues.find(
                (i) => i.id === unfixedIds[0]
            );
            expect(fixedIssue?.is_fixed).toBe(true);
            expect(result.current.auditResult!.score).toBeGreaterThanOrEqual(scoreBefore);
            vi.useRealTimers();
        });

        it("fixIssues with empty array does nothing", async () => {
            const { result } = renderHook(() => usePrivacyAudit());

            await act(async () => {
                await result.current.fixIssues([]);
            });

            expect(result.current.auditResult).toBeNull();
        });

        it("fixAll fixes all unfixed issues", async () => {
            vi.useFakeTimers();
            const { result } = renderHook(() => usePrivacyAudit());

            let scanPromise: Promise<void>;
            act(() => {
                scanPromise = result.current.runScan();
            });
            await act(async () => { vi.advanceTimersByTime(1300); });
            await act(async () => { await scanPromise; });

            let fixAllPromise: Promise<void>;
            act(() => {
                fixAllPromise = result.current.fixAll();
            });
            await act(async () => { vi.advanceTimersByTime(900); });
            await act(async () => { await fixAllPromise; });

            const stillUnfixed = result.current.auditResult!.issues.filter((i) => !i.is_fixed);
            expect(stillUnfixed).toHaveLength(0);
            vi.useRealTimers();
        });
    });

    // ── isTauri=true ──────────────────────────────────────────────────────────

    describe("isTauri=true", () => {
        beforeEach(() => {
            vi.mocked(tauriCore.isTauri).mockReturnValue(true);
            vi.mocked(tauriCore.invoke).mockImplementation(async (cmd) => {
                if (cmd === "scan_privacy_issues") return mockAuditResult;
                if (cmd === "fix_privacy_issues") return undefined;
                if (cmd === "check_privacy_issue") return true;
                return null;
            });
        });

        it("runScan calls invoke('scan_privacy_issues')", async () => {
            const { result } = renderHook(() => usePrivacyAudit());

            await act(async () => {
                await result.current.runScan();
            });

            expect(tauriCore.invoke).toHaveBeenCalledWith("scan_privacy_issues");
        });

        it("runScan populates auditResult from invoke result", async () => {
            const { result } = renderHook(() => usePrivacyAudit());

            await act(async () => {
                await result.current.runScan();
            });

            expect(result.current.auditResult).toEqual(mockAuditResult);
        });

        it("runScan sets error on invoke failure", async () => {
            vi.mocked(tauriCore.invoke).mockRejectedValue(new Error("registry access denied"));
            const { result } = renderHook(() => usePrivacyAudit());

            await act(async () => {
                await result.current.runScan();
            });

            expect(result.current.error).toContain("registry access denied");
        });

        it("fixIssues calls invoke('fix_privacy_issues') with issueIds", async () => {
            const { result } = renderHook(() => usePrivacyAudit());

            // Populate auditResult first
            await act(async () => {
                await result.current.runScan();
            });

            await act(async () => {
                await result.current.fixIssues(["diagtrack_svc", "telemetry_level"]);
            });

            expect(tauriCore.invoke).toHaveBeenCalledWith("fix_privacy_issues", {
                issueIds: ["diagtrack_svc", "telemetry_level"],
            });
        });

        it("fixIssues calls invoke('check_privacy_issue') for each fixed id", async () => {
            const { result } = renderHook(() => usePrivacyAudit());

            await act(async () => {
                await result.current.runScan();
            });

            await act(async () => {
                await result.current.fixIssues(["diagtrack_svc"]);
            });

            expect(tauriCore.invoke).toHaveBeenCalledWith("check_privacy_issue", {
                issueId: "diagtrack_svc",
            });
        });

        it("score updates after fixIssues when check returns true", async () => {
            const { result } = renderHook(() => usePrivacyAudit());

            await act(async () => {
                await result.current.runScan();
            });

            const scoreBefore = result.current.auditResult!.score;

            await act(async () => {
                await result.current.fixIssues(["diagtrack_svc", "telemetry_level"]);
            });

            expect(result.current.auditResult!.score).toBeGreaterThanOrEqual(scoreBefore);
        });

        it("isFixing=false after fixIssues completes", async () => {
            const { result } = renderHook(() => usePrivacyAudit());

            await act(async () => {
                await result.current.runScan();
            });

            await act(async () => {
                await result.current.fixIssues(["diagtrack_svc"]);
            });

            expect(result.current.isFixing).toBe(false);
        });
    });
});
