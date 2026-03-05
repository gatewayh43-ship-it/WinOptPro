import { useState } from "react";
import { FileText, Download, RefreshCw, Loader2, Printer } from "lucide-react";
import { useSystemReport } from "../hooks/useSystemReport";

function exportAsPdf(htmlContent: string) {
    const win = window.open("", "_blank");
    win?.document.write(htmlContent);
    win?.document.close();
    win?.print();
}

export function SystemReportPage() {
    const { reportHtml, isGenerating, error, generateReport, saveReport } = useSystemReport();
    const [savePath, setSavePath] = useState("C:\\Users\\Public\\Documents\\WinOpt-SystemReport.html");
    const [pdfNote, setPdfNote] = useState(false);

    return (
        <div className="flex flex-col h-full overflow-hidden p-6 max-w-[1200px] mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
                        System <span className="text-gradient">Report</span>
                    </h2>
                    <p className="text-slate-500 mt-2 text-[15px] font-medium leading-relaxed max-w-lg">
                        Generate a comprehensive HTML report of your hardware, storage, network, startup items, and running processes.
                    </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    {reportHtml && (
                        <>
                            <button
                                onClick={() => saveReport(savePath)}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-surface hover:bg-white/5 font-bold text-sm transition-colors"
                            >
                                <Download className="w-4 h-4" />
                                Save HTML
                            </button>
                            <div className="relative">
                                <button
                                    onClick={() => {
                                        exportAsPdf(reportHtml);
                                        setPdfNote(true);
                                        setTimeout(() => setPdfNote(false), 4000);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-surface hover:bg-white/5 font-bold text-sm transition-colors"
                                >
                                    <Printer className="w-4 h-4" />
                                    Export as PDF
                                </button>
                                {pdfNote && (
                                    <div className="absolute right-0 top-full mt-2 z-10 w-56 bg-card border border-border rounded-xl px-3 py-2 shadow-lg">
                                        <p className="text-[11px] text-slate-400 leading-relaxed">
                                            Use your browser's <span className="font-semibold text-foreground">Print &rarr; Save as PDF</span> option in the dialog.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                    <button
                        onClick={generateReport}
                        disabled={isGenerating}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white font-bold text-sm shadow-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                        {isGenerating
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <RefreshCw className="w-4 h-4" />
                        }
                        {isGenerating ? "Generating..." : reportHtml ? "Regenerate" : "Generate Report"}
                    </button>
                </div>
            </div>

            {/* Save path input */}
            {reportHtml && (
                <div className="flex items-center gap-3 bento-card p-3">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest shrink-0">Save Path</span>
                    <input
                        value={savePath}
                        onChange={e => setSavePath(e.target.value)}
                        className="flex-1 bg-transparent text-[12px] font-mono text-slate-300 focus:outline-none border-b border-border focus:border-primary/50 py-1"
                        placeholder="C:\Users\You\Documents\report.html"
                    />
                </div>
            )}

            {/* Content */}
            {error && (
                <div className="bento-card p-6 border-red-500/20 bg-red-500/5 text-red-400 text-sm">
                    <strong>Error:</strong> {error}
                </div>
            )}

            {isGenerating && !reportHtml && (
                <div className="bento-card flex-1 flex flex-col items-center justify-center gap-4 min-h-[300px]">
                    <Loader2 className="w-12 h-12 text-primary animate-spin" />
                    <p className="text-slate-400 font-medium">Gathering system information...</p>
                    <p className="text-[12px] text-slate-600">This may take 10–20 seconds</p>
                </div>
            )}

            {!isGenerating && !reportHtml && !error && (
                <div className="bento-card flex-1 flex flex-col items-center justify-center gap-4 min-h-[300px]">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <FileText className="w-8 h-8 text-primary opacity-60" />
                    </div>
                    <div className="text-center">
                        <p className="font-bold text-foreground">No report generated yet</p>
                        <p className="text-[13px] text-slate-500 mt-1">Click "Generate Report" to collect and display your system information.</p>
                    </div>
                </div>
            )}

            {reportHtml && (
                <div className="flex-1 min-h-0 overflow-hidden bento-card">
                    <iframe
                        srcDoc={reportHtml}
                        title="System Report"
                        className="w-full h-full border-0 rounded-[var(--bento-radius)]"
                        sandbox="allow-same-origin"
                    />
                </div>
            )}
        </div>
    );
}
