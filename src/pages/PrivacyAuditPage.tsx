import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, ShieldAlert, RefreshCw, CheckCircle2, AlertTriangle, AlertCircle, Loader2, Zap } from "lucide-react";
import { usePrivacyAudit } from "../hooks/usePrivacyAudit";
import type { PrivacyIssue } from "../hooks/usePrivacyAudit";

type Category = "All" | "Telemetry" | "Registry" | "Services";

const SEVERITY_LABEL: Record<number, { label: string; color: string; icon: React.ElementType }> = {
    3: { label: "High", color: "text-red-400 bg-red-400/10 border-red-400/20", icon: AlertCircle },
    2: { label: "Medium", color: "text-amber-400 bg-amber-400/10 border-amber-400/20", icon: AlertTriangle },
    1: { label: "Low", color: "text-blue-400 bg-blue-400/10 border-blue-400/20", icon: ShieldAlert },
};

function ScoreGauge({ score }: { score: number }) {
    const color = score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444";
    const dash = 2 * Math.PI * 54;
    const offset = dash * (1 - score / 100);

    return (
        <div className="relative w-36 h-36 mx-auto">
            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                <circle
                    cx="60" cy="60" r="54" fill="none"
                    stroke={color} strokeWidth="10"
                    strokeDasharray={dash}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    style={{ transition: "stroke-dashoffset 0.8s ease" }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black" style={{ color }}>{score}</span>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Score</span>
            </div>
        </div>
    );
}

function IssueCard({ issue, onFix, isFixing }: { issue: PrivacyIssue; onFix: (id: string) => void; isFixing: boolean }) {
    const sev = SEVERITY_LABEL[issue.severity] ?? SEVERITY_LABEL[1];
    const SevIcon = sev.icon;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bento-card p-4 flex flex-col gap-3 transition-all ${issue.is_fixed ? "opacity-60" : ""}`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                    <div className={`mt-0.5 shrink-0 flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-widest ${sev.color}`}>
                        <SevIcon className="w-3 h-3" />
                        {sev.label}
                    </div>
                    <div className="min-w-0">
                        <p className={`text-[13px] font-semibold leading-tight ${issue.is_fixed ? "line-through text-slate-500" : "text-foreground"}`}>
                            {issue.title}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{issue.description}</p>
                    </div>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                    {issue.is_fixed ? (
                        <span className="flex items-center gap-1 text-emerald-400 text-[11px] font-bold">
                            <CheckCircle2 className="w-4 h-4" /> Fixed
                        </span>
                    ) : (
                        <button
                            onClick={() => onFix(issue.id)}
                            disabled={isFixing}
                            className="px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary text-[11px] font-bold transition-colors disabled:opacity-50"
                        >
                            Fix
                        </button>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Category:</span>
                <span className="text-[10px] font-semibold text-slate-400">{issue.category}</span>
            </div>
        </motion.div>
    );
}

export function PrivacyAuditPage() {
    const { auditResult, isScanning, isFixing, runScan, fixIssues, fixAll } = usePrivacyAudit();
    const [category, setCategory] = useState<Category>("All");

    useEffect(() => {
        runScan();
    }, []);

    const categories: Category[] = ["All", "Telemetry", "Registry", "Services"];

    const filtered = (auditResult?.issues ?? []).filter(i =>
        category === "All" || i.category === category
    );
    const unfixedCount = (auditResult?.issues ?? []).filter(i => !i.is_fixed).length;

    return (
        <div className="flex flex-col h-full overflow-hidden p-6 max-w-[1200px] mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
                        Privacy <span className="text-gradient">Audit</span>
                    </h2>
                    <p className="text-slate-500 mt-2 text-[15px] font-medium leading-relaxed max-w-lg">
                        Scans telemetry services, registry entries, and tracking settings to calculate your privacy exposure score.
                    </p>
                </div>
                <div className="flex gap-2">
                    {unfixedCount > 0 && auditResult && (
                        <button
                            onClick={fixAll}
                            disabled={isFixing || isScanning}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white font-bold text-sm shadow-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                            {isFixing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                            Fix All ({unfixedCount})
                        </button>
                    )}
                    <button
                        onClick={runScan}
                        disabled={isScanning}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-surface hover:bg-white/5 font-bold text-sm transition-colors disabled:opacity-50"
                    >
                        {isScanning
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <RefreshCw className="w-4 h-4" />
                        }
                        {isScanning ? "Scanning..." : "Re-scan"}
                    </button>
                </div>
            </div>

            {/* Score + Stats */}
            {isScanning && !auditResult ? (
                <div className="bento-card p-8 flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    <p className="text-slate-400 font-medium">Scanning privacy settings...</p>
                </div>
            ) : auditResult ? (
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bento-card p-6 flex flex-col md:flex-row items-center gap-8"
                >
                    <div className="shrink-0">
                        <ScoreGauge score={auditResult.score} />
                        <p className="text-center mt-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                            {auditResult.score >= 70 ? "Good" : auditResult.score >= 40 ? "Fair" : "At Risk"}
                        </p>
                    </div>
                    <div className="grid grid-cols-3 gap-4 flex-1 w-full">
                        <div className="bento-card p-4 text-center">
                            <p className="text-2xl font-black text-foreground">{auditResult.issues.length}</p>
                            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-1">Total Issues</p>
                        </div>
                        <div className="bento-card p-4 text-center">
                            <p className="text-2xl font-black text-red-400">{unfixedCount}</p>
                            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-1">Unfixed</p>
                        </div>
                        <div className="bento-card p-4 text-center">
                            <p className="text-2xl font-black text-emerald-400">{auditResult.issues.filter(i => i.is_fixed).length}</p>
                            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-1">Fixed</p>
                        </div>
                    </div>
                </motion.div>
            ) : null}

            {/* Category tabs + list */}
            {auditResult && (
                <div className="flex flex-col gap-4 flex-1 min-h-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setCategory(cat)}
                                className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-colors border ${
                                    category === cat
                                        ? "bg-primary/10 border-primary/30 text-primary"
                                        : "border-border text-slate-500 hover:text-foreground hover:border-white/20"
                                }`}
                            >
                                {cat}
                                <span className="ml-1.5 opacity-60">
                                    ({cat === "All" ? auditResult.issues.length : auditResult.issues.filter(i => i.category === cat).length})
                                </span>
                            </button>
                        ))}
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-10 space-y-3">
                        <AnimatePresence mode="popLayout">
                            {filtered.map(issue => (
                                <IssueCard
                                    key={issue.id}
                                    issue={issue}
                                    onFix={id => fixIssues([id])}
                                    isFixing={isFixing}
                                />
                            ))}
                        </AnimatePresence>
                        {filtered.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                                <ShieldCheck className="w-12 h-12 mb-3 opacity-30" />
                                <p className="font-semibold">No issues in this category</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
