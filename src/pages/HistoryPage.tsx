import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Trash2, CheckCircle2, XCircle, RotateCcw, Calendar, ChevronDown } from "lucide-react";
import { useToast } from "../components/ToastSystem";
import type { TweakHistoryEntry } from "../store/appStore";

type FilterAction = "ALL" | "APPLIED" | "REVERTED" | "FAILED";

export function HistoryPage() {
    const [entries, setEntries] = useState<TweakHistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterAction, setFilterAction] = useState<FilterAction>("ALL");
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const { addToast } = useToast();

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const data = await invoke<TweakHistoryEntry[]>("get_tweak_history", { limit: 200 });
            setEntries(data);
        } catch (err) {
            console.error("Failed to fetch history:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchHistory(); }, []);

    const handleClear = async () => {
        if (!confirm("Clear all tweak history? This cannot be undone.")) return;
        try {
            await invoke("clear_tweak_history");
            setEntries([]);
            addToast({ type: "success", title: "History cleared" });
        } catch (err) {
            addToast({ type: "error", title: "Failed to clear history", message: String(err) });
        }
    };

    const filtered = entries.filter(e => filterAction === "ALL" || e.action === filterAction);

    // Group by date
    const grouped = filtered.reduce<Record<string, TweakHistoryEntry[]>>((acc, entry) => {
        const date = new Date(entry.timestamp).toLocaleDateString("en-US", {
            weekday: "long", year: "numeric", month: "long", day: "numeric"
        });
        (acc[date] ??= []).push(entry);
        return acc;
    }, {});

    const actionIcon = (action: string) => {
        switch (action) {
            case "APPLIED": return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
            case "REVERTED": return <RotateCcw className="w-4 h-4 text-blue-400" />;
            case "FAILED": return <XCircle className="w-4 h-4 text-red-400" />;
            default: return <Clock className="w-4 h-4 text-slate-400 dark:text-slate-200" />;
        }
    };

    const actionBadge = (action: string, status: string) => {
        const map: Record<string, { bg: string; text: string }> = {
            APPLIED: { bg: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-400" },
            REVERTED: { bg: "bg-blue-500/10 border-blue-500/20", text: "text-blue-400" },
            FAILED: { bg: "bg-red-500/10 border-red-500/20", text: "text-red-400" },
        };
        const s = map[action] || map.FAILED;
        return (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${s.bg} ${s.text} uppercase tracking-wider`}>
                {action} · {status}
            </span>
        );
    };

    const filterBtns: { label: string; value: FilterAction }[] = [
        { label: "All", value: "ALL" },
        { label: "Applied", value: "APPLIED" },
        { label: "Reverted", value: "REVERTED" },
        { label: "Failed", value: "FAILED" },
    ];

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-end md:justify-between gap-4"
            >
                <div>
                    <h2 className="text-3xl font-black tracking-tight text-foreground">
                        Tweak <span className="text-gradient">History</span>
                    </h2>
                    <p className="text-slate-500 dark:text-slate-300 mt-2 text-[15px] font-medium leading-relaxed max-w-lg">
                        Full log of every optimization deployed, reverted, or failed — with timestamps and output.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex gap-1.5 bg-white/[0.02] border border-border rounded-xl p-1">
                        {filterBtns.map(f => (
                            <button
                                key={f.value}
                                onClick={() => setFilterAction(f.value)}
                                className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${filterAction === f.value
                                    ? "bg-primary/15 text-primary border border-primary/20"
                                    : "text-slate-500 dark:text-slate-300 hover:text-foreground"
                                    }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={handleClear}
                        disabled={entries.length === 0}
                        className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-30"
                    >
                        <Trash2 className="w-3.5 h-3.5" /> Clear
                    </button>
                </div>
            </motion.div>

            {/* Timeline */}
            {loading ? (
                <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="bento-card p-5 animate-pulse">
                            <div className="h-4 w-48 bg-white/5 rounded mb-3" />
                            <div className="h-3 w-64 bg-white/5 rounded" />
                        </div>
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="bento-card border-dashed flex flex-col items-center justify-center py-20 text-center">
                    <Clock className="w-10 h-10 text-slate-600 mb-4" />
                    <p className="text-[14px] font-bold text-slate-400 dark:text-slate-200">No history entries yet</p>
                    <p className="text-[12px] text-slate-600 mt-1 max-w-[220px] leading-relaxed">
                        Deploy your first tweak to start recording history.
                    </p>
                </div>
            ) : (
                <div className="space-y-8">
                    {Object.entries(grouped).map(([date, items]) => (
                        <div key={date}>
                            <div className="flex items-center gap-3 mb-4">
                                <Calendar className="w-4 h-4 text-slate-500 dark:text-slate-300" />
                                <h3 className="text-[13px] font-bold text-slate-400 dark:text-slate-200 uppercase tracking-widest">{date}</h3>
                                <div className="flex-1 h-px bg-border" />
                                <span className="text-[11px] text-slate-600 font-mono">{items.length} entries</span>
                            </div>

                            <div className="relative ml-5 border-l-2 border-border/50 space-y-3 pl-6">
                                <AnimatePresence>
                                    {items.map((entry) => {
                                        const isExpanded = expandedId === entry.id;
                                        const time = new Date(entry.timestamp).toLocaleTimeString("en-US", {
                                            hour: "2-digit", minute: "2-digit", second: "2-digit"
                                        });

                                        return (
                                            <motion.div
                                                key={entry.id}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ duration: 0.15, ease: "easeOut" }}
                                                className="relative"
                                            >
                                                {/* Timeline dot */}
                                                <div className="absolute -left-[31px] top-4 w-3 h-3 rounded-full bg-card border-2 border-border flex items-center justify-center">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${entry.action === "APPLIED" ? "bg-emerald-400" :
                                                        entry.action === "REVERTED" ? "bg-blue-400" : "bg-red-400"
                                                        }`} />
                                                </div>

                                                <div
                                                    className="bento-card p-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                                                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                                                >
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            {actionIcon(entry.action)}
                                                            <div className="min-w-0">
                                                                <h4 className="text-[14px] font-bold text-foreground truncate">{entry.tweakName}</h4>
                                                                <p className="text-[11px] text-slate-500 dark:text-slate-300 font-mono mt-0.5">{time} · {entry.durationMs}ms</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            {actionBadge(entry.action, entry.status)}
                                                            <ChevronDown className={`w-4 h-4 text-slate-500 dark:text-slate-300 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                                                        </div>
                                                    </div>

                                                    <AnimatePresence>
                                                        {isExpanded && (
                                                            <motion.div
                                                                initial={{ height: 0, opacity: 0 }}
                                                                animate={{ height: "auto", opacity: 1 }}
                                                                exit={{ height: 0, opacity: 0 }}
                                                                transition={{ duration: 0.2 }}
                                                                className="overflow-hidden"
                                                            >
                                                                <div className="mt-4 space-y-3 border-t border-border/50 pt-4">
                                                                    <div>
                                                                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest mb-1.5">Command</p>
                                                                        <div className="bg-slate-900 dark:bg-[#050505] rounded-lg p-3 border border-border">
                                                                            <code className="text-[11px] text-emerald-400/80 font-mono break-all leading-loose">
                                                                                {entry.commandExecuted}
                                                                            </code>
                                                                        </div>
                                                                    </div>
                                                                    {entry.stdout && (
                                                                        <div>
                                                                            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1.5">stdout</p>
                                                                            <pre className="text-[11px] text-slate-400 dark:text-slate-200 font-mono bg-white/[0.02] rounded-lg p-3 border border-border overflow-x-auto">
                                                                                {entry.stdout}
                                                                            </pre>
                                                                        </div>
                                                                    )}
                                                                    {entry.stderr && (
                                                                        <div>
                                                                            <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-1.5">stderr</p>
                                                                            <pre className="text-[11px] text-red-400/80 font-mono bg-red-500/5 rounded-lg p-3 border border-red-500/10 overflow-x-auto">
                                                                                {entry.stderr}
                                                                            </pre>
                                                                        </div>
                                                                    )}
                                                                    <div className="flex items-center gap-4 text-[11px] text-slate-500 dark:text-slate-300 font-mono">
                                                                        <span>exit: {entry.exitCode}</span>
                                                                        <span>id: {entry.tweakId}</span>
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
