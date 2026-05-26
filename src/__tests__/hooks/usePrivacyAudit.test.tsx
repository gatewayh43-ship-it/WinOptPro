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

    // ── isTauri=false ─────────────────────────────────────────────────────────

    describe("isTauri=false (desktop runtime unavailable)", () => {
        beforeEach(() => {
            vi.mocked(tauriCore.isTauri).mockReturnValue(false);
        });

        it("initial state: auditResult=null, isScanning=false", () => {
            const { result } = renderHook(() => usePrivacyAudit());
            expect(result.current.auditResult).toBeNull();
            expect(result.current.isScanning).toBe(false);
        });

        it("runScan keeps auditResult empty and sets an error", async () => {
            const { result } = renderHook(() => usePrivacyAudit());

            await act(async () => {
                await result.current.runScan();
            });

            expect(result.current.auditResult).toBeNull();
            expect(result.current.error).toContain("desktop runtime");
            expect(tauriCore.invoke).not.toHaveBeenCalledWith("scan_privacy_issues");
        });

        it("runScan sets isScanning=false after completion", async () => {
            const { result } = renderHook(() => usePrivacyAudit());

            await act(async () => {
                await result.current.runScan();
            });

            expect(result.current.isScanning).toBe(false);
        });

        it("does not compute a score without a real desktop scan", async () => {
            const { result } = renderHook(() => usePrivacyAudit());

            await act(async () => {
                await result.current.runScan();
            });

            expect(result.current.auditResult).toBeNull();
        });

        it("fixIssues does not mutate audit state without desktop runtime", async () => {
            const { result } = renderHook(() => usePrivacyAudit());

            await act(async () => {
                await result.current.fixIssues(["diagtrack_svc"]);
            });

            expect(result.current.auditResult).toBeNull();
            expect(result.current.isFixing).toBe(false);
            expect(tauriCore.invoke).not.toHaveBeenCalledWith("fix_privacy_issues", expect.anything());
        });

        it("fixIssues with empty array does nothing", async () => {
            const { result } = renderHook(() => usePrivacyAudit());

            await act(async () => {
                await result.current.fixIssues([]);
            });

            expect(result.current.auditResult).toBeNull();
        });

        it("fixAll is a no-op when no real audit result exists", async () => {
            const { result } = renderHook(() => usePrivacyAudit());

            await act(async () => {
                await result.current.fixAll();
            });

            expect(result.current.auditResult).toBeNull();
            expect(tauriCore.invoke).not.toHaveBeenCalledWith("fix_privacy_issues", expect.anything());
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
