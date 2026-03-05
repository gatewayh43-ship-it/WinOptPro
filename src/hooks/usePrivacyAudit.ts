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


const MOCK_ISSUES: PrivacyIssue[] = [
    { id: "diagtrack_svc", category: "Telemetry", title: "Diagnostics Tracking Service running", severity: 3, description: "DiagTrack sends diagnostic data to Microsoft.", fix_cmd: "", is_fixed: false },
    { id: "telemetry_level", category: "Telemetry", title: "Telemetry level above Security (0)", severity: 3, description: "Telemetry is set above minimum.", fix_cmd: "", is_fixed: false },
    { id: "advertising_id", category: "Registry", title: "Advertising ID enabled", severity: 2, description: "Tracks app usage for personalized ads.", fix_cmd: "", is_fixed: true },
    { id: "activity_history", category: "Registry", title: "Activity History / Timeline enabled", severity: 2, description: "Syncs activity to the cloud.", fix_cmd: "", is_fixed: false },
    { id: "cortana_search", category: "Registry", title: "Bing web search in Start Menu", severity: 1, description: "Sends searches to Microsoft.", fix_cmd: "", is_fixed: true },
    { id: "ceip_tasks", category: "Telemetry", title: "Customer Experience Improvement tasks active", severity: 2, description: "Background data collection tasks.", fix_cmd: "", is_fixed: false },
    { id: "wer_service", category: "Services", title: "Windows Error Reporting service running", severity: 1, description: "Sends crash data to Microsoft.", fix_cmd: "", is_fixed: false },
    { id: "feedback_prompts", category: "Registry", title: "Windows feedback prompts enabled", severity: 1, description: "Feedback popups and data collection.", fix_cmd: "", is_fixed: true },
    { id: "app_launch_tracking", category: "Registry", title: "App launch tracking enabled", severity: 1, description: "Tracks launched apps for suggestions.", fix_cmd: "", is_fixed: false },
];

function computeMockScore(issues: PrivacyIssue[]): number {
    const total = issues.reduce((s, i) => s + i.severity, 0);
    const fixed = issues.filter(i => i.is_fixed).reduce((s, i) => s + i.severity, 0);
    return total === 0 ? 100 : Math.round((fixed / total) * 100);
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
                await new Promise(r => setTimeout(r, 1200));
                const issues = MOCK_ISSUES;
                setAuditResult({ score: computeMockScore(issues), issues });
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
                await new Promise(r => setTimeout(r, 800));
                setAuditResult(prev => {
                    if (!prev) return prev;
                    const updated = prev.issues.map(i =>
                        ids.includes(i.id) ? { ...i, is_fixed: true } : i
                    );
                    return { score: computeMockScore(updated), issues: updated };
                });
                addToast({ type: "success", title: "Privacy Issues Fixed", message: `${ids.length} issue(s) resolved.` });
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
            const total = updatedIssues.reduce((s, i) => s + i.severity, 0);
            const fixed = updatedIssues.filter(i => i.is_fixed).reduce((s, i) => s + i.severity, 0);
            const score = total === 0 ? 100 : Math.round((fixed / total) * 100);
            setAuditResult({ score, issues: updatedIssues });
            addToast({ type: "success", title: "Privacy Issues Fixed", message: `${ids.length} issue(s) resolved.` });
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
