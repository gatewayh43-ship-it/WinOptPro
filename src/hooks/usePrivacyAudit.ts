import { useState, useCallback } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { useToast } from "../components/ToastSystem";

export interface PrivacyIssue {
    id: string;
    category: string;
    title: string;
    severity: number;
    description: string;
    fix_cmd: string;
    is_fixed: boolean;
}

export interface PrivacyAuditResult {
    score: number;
    issues: PrivacyIssue[];
}


export function usePrivacyAudit() {
    const [auditResult, setAuditResult] = useState<PrivacyAuditResult | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [isFixing, setIsFixing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { addToast } = useToast();

    const runScan = useCallback(async () => {
        setIsScanning(true);
        setError(null);
        try {
            if (!isTauri()) {
                const msg = "Privacy auditing requires the WinOpt Pro desktop runtime.";
                setAuditResult(null);
                setError(msg);
                addToast({ type: "error", title: "Desktop runtime required", message: msg });
                return;
            }
            const result = await invoke<PrivacyAuditResult>("scan_privacy_issues");
            setAuditResult(result);
        } catch (err) {
            const msg = String(err);
            setError(msg);
            addToast({ type: "error", title: "Privacy Scan Failed", message: msg });
        } finally {
            setIsScanning(false);
        }
    }, [addToast]);

    const fixIssues = useCallback(async (ids: string[]) => {
        if (ids.length === 0) return;
        setIsFixing(true);
        try {
            if (!isTauri()) {
                addToast({ type: "error", title: "Desktop runtime required", message: "Privacy fixes require the WinOpt Pro desktop app running with Administrator privileges." });
                return;
            }
            await invoke("fix_privacy_issues", { issueIds: ids });
            // Re-check fixed issues
            const updatedIssues = await Promise.all(
                (auditResult?.issues ?? []).map(async issue => {
                    if (!ids.includes(issue.id)) return issue;
                    try {
                        const fixed = await invoke<boolean>("check_privacy_issue", { issueId: issue.id });
                        return { ...issue, is_fixed: fixed };
                    } catch {
                        return issue;
                    }
                })
            );
            const fixedCount = updatedIssues.filter(i => ids.includes(i.id) && i.is_fixed).length;
            // Use functional updater to merge with latest state, avoiding stale closure overwrites
            setAuditResult(prev => {
                const base = prev?.issues ?? updatedIssues;
                const mergedIssues = base.map(prevIssue => {
                    const updated = updatedIssues.find(u => u.id === prevIssue.id);
                    return updated ?? prevIssue;
                });
                const total = mergedIssues.reduce((s, i) => s + i.severity, 0);
                const fixedSev = mergedIssues.filter(i => i.is_fixed).reduce((s, i) => s + i.severity, 0);
                return { score: total === 0 ? 100 : Math.round((fixedSev / total) * 100), issues: mergedIssues };
            });
            if (ids.length === 1) {
                const issue = updatedIssues.find(i => i.id === ids[0]);
                addToast({
                    type: fixedCount === 1 ? "success" : "error",
                    title: fixedCount === 1 ? "Issue fixed" : "Failed to fix issue",
                    message: issue?.title ?? ids[0],
                });
            } else {
                addToast({ type: "success", title: "Privacy Issues Fixed", message: `${fixedCount} of ${ids.length} issue(s) fixed.` });
            }
        } catch (err) {
            addToast({ type: "error", title: "Fix Failed", message: String(err) });
        } finally {
            setIsFixing(false);
        }
    }, [auditResult, addToast]);

    const fixAll = useCallback(async () => {
        const unfixed = (auditResult?.issues ?? []).filter(i => !i.is_fixed).map(i => i.id);
        await fixIssues(unfixed);
    }, [auditResult, fixIssues]);

    return { auditResult, isScanning, isFixing, error, runScan, fixIssues, fixAll };
}
