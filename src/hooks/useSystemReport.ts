import { useState, useCallback } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { useToast } from "../components/ToastSystem";

export function useSystemReport() {
    const [reportHtml, setReportHtml] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { addToast } = useToast();

    const generateReport = useCallback(async () => {
        setIsGenerating(true);
        setError(null);
        try {
            if (!isTauri()) {
                const msg = "System report generation requires the WinOpt Pro desktop runtime.";
                setError(msg);
                addToast({ type: "error", title: "Desktop runtime required", message: msg });
                return;
            }
            const html = await invoke<string>("generate_system_report");
            setReportHtml(html);
        } catch (err) {
            const msg = String(err);
            setError(msg);
            addToast({ type: "error", title: "Report Generation Failed", message: msg });
        } finally {
            setIsGenerating(false);
        }
    }, [addToast]);

    const saveReport = useCallback(async (path: string) => {
        if (!reportHtml) return false;
        try {
            if (!isTauri()) {
                // Browser fallback: download
                const blob = new Blob([reportHtml], { type: "text/html" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "WinOpt-SystemReport.html";
                a.click();
                URL.revokeObjectURL(url);
                addToast({ type: "success", title: "Report Downloaded", message: "Report saved to Downloads folder." });
                return true;
            }
            await invoke("save_system_report", { path, html: reportHtml });
            addToast({ type: "success", title: "Report Saved", message: `Saved to: ${path}` });
            return true;
        } catch (err) {
            addToast({ type: "error", title: "Save Failed", message: String(err) });
            return false;
        }
    }, [reportHtml, addToast]);

    return { reportHtml, isGenerating, error, generateReport, saveReport };
}
