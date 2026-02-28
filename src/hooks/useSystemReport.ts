import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useToast } from "../components/ToastSystem";

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export function useSystemReport() {
    const [reportHtml, setReportHtml] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { addToast } = useToast();

    const generateReport = useCallback(async () => {
        setIsGenerating(true);
        setError(null);
        try {
            if (!isTauri) {
                await new Promise(r => setTimeout(r, 1500));
                setReportHtml(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>System Report (Preview)</title>
<style>body{font-family:Segoe UI,Arial,sans-serif;background:#0f0f1a;color:#e2e8f0;padding:24px;}h1{font-size:24px;font-weight:900;}h1 span{color:#4318FF;}h2{font-size:13px;text-transform:uppercase;letter-spacing:.1em;color:#94a3b8;border-bottom:1px solid #1e293b;padding-bottom:8px;margin-top:28px;}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}.card{background:#1e293b;border-radius:10px;padding:14px 18px;}.card-label{font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;}.card-value{font-size:15px;font-weight:600;}table{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;}th{text-align:left;padding:8px 12px;background:#1e293b;color:#64748b;font-size:11px;text-transform:uppercase;}td{padding:8px 12px;border-bottom:1px solid #1e293b;}.note{color:#64748b;font-size:12px;margin-top:8px;}</style>
</head><body>
<h1>WinOpt <span>Pro</span> — System Report <small style="font-size:13px;color:#64748b">(Preview Mode)</small></h1>
<p style="color:#64748b;font-size:13px">This is a preview. Run in the desktop app for real system data.</p>
<h2>Hardware Summary</h2>
<div class="grid">
  <div class="card"><div class="card-label">CPU</div><div class="card-value">Intel Core i9-12900K</div></div>
  <div class="card"><div class="card-label">RAM</div><div class="card-value">32 GB / 12.4 GB free</div></div>
  <div class="card"><div class="card-label">GPU</div><div class="card-value">NVIDIA GeForce RTX 3080</div></div>
  <div class="card"><div class="card-label">OS</div><div class="card-value">Windows 11 Pro (Build 22621)</div></div>
</div>
<h2>Storage</h2>
<table><thead><tr><th>Drive</th><th>Total</th><th>Used</th><th>Free</th></tr></thead>
<tbody><tr><td>C:</td><td>512 GB</td><td>312 GB</td><td>200 GB</td></tr></tbody></table>
<p class="note">* Preview mode data is illustrative only</p>
</body></html>`);
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
            if (!isTauri) {
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
