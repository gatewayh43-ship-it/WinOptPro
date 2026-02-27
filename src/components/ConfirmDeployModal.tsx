import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, ShieldCheck, Code2, X, Loader2 } from "lucide-react";

interface Tweak {
    id: string;
    name: string;
    riskLevel: string;
    execution: { code: string; revertCode: string };
    estimatedExecutionTimeMs?: number;
}

interface ConfirmDeployModalProps {
    isOpen: boolean;
    tweaks: Tweak[];
    onConfirm: () => void;
    onCancel: () => void;
    isExecuting?: boolean;
}

const riskBadge = (level: string) => {
    const map: Record<string, { bg: string; text: string; label: string }> = {
        Green: { bg: "bg-emerald-500/15", text: "text-emerald-400", label: "Safe" },
        Yellow: { bg: "bg-amber-500/15", text: "text-amber-400", label: "Moderate" },
        Red: { bg: "bg-red-500/15", text: "text-red-400", label: "High Risk" },
    };
    const r = map[level] || map.Green;
    return (
        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${r.bg} ${r.text}`}>
            {r.label}
        </span>
    );
};

export function ConfirmDeployModal({
    isOpen,
    tweaks,
    onConfirm,
    onCancel,
    isExecuting = false,
}: ConfirmDeployModalProps) {
    if (!isOpen) return null;

    const riskCounts = tweaks.reduce(
        (acc, t) => {
            acc[t.riskLevel] = (acc[t.riskLevel] || 0) + 1;
            return acc;
        },
        {} as Record<string, number>
    );

    const hasRed = (riskCounts["Red"] || 0) > 0;
    const hasYellow = (riskCounts["Yellow"] || 0) > 0;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onCancel}
                    />
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                    >
                        <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden">
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                                        <ShieldCheck className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-white">
                                            Confirm Deploy
                                        </h2>
                                        <p className="text-sm text-slate-400">
                                            {tweaks.length} tweak{tweaks.length !== 1 ? "s" : ""} ready
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={onCancel}
                                    className="p-2 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Warning */}
                            {(hasRed || hasYellow) && (
                                <div
                                    className={`mx-6 mt-4 p-3 rounded-lg border flex items-start gap-3 ${hasRed
                                        ? "bg-red-500/10 border-red-500/20"
                                        : "bg-amber-500/10 border-amber-500/20"
                                        }`}
                                >
                                    <AlertTriangle
                                        className={`w-4 h-4 mt-0.5 shrink-0 ${hasRed ? "text-red-400" : "text-amber-400"
                                            }`}
                                    />
                                    <p className="text-sm text-slate-300">
                                        {hasRed
                                            ? "This batch includes high-risk tweaks that may affect system stability."
                                            : "This batch includes moderate-risk tweaks. Review carefully before applying."}
                                    </p>
                                </div>
                            )}

                            {/* Tweak list */}
                            <div className="px-6 py-4 max-h-[40vh] overflow-y-auto space-y-2">
                                {tweaks.map((tweak) => (
                                    <div
                                        key={tweak.id}
                                        className="flex flex-col p-3 rounded-lg bg-white/5 border border-white/5 space-y-2"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <Code2 className="w-4 h-4 text-slate-500 shrink-0" />
                                                <span className="text-sm font-medium text-white truncate">
                                                    {tweak.name}
                                                </span>
                                            </div>
                                            {riskBadge(tweak.riskLevel)}
                                        </div>

                                        <div className="bg-black/30 rounded border border-white/5 p-2 overflow-x-auto custom-scrollbar">
                                            <code className="text-[11px] text-emerald-400/90 font-mono whitespace-nowrap flex items-center">
                                                <span className="text-blue-500/50 select-none mr-2 font-bold shrink-0">PS&gt;</span>
                                                {tweak.execution.code}
                                            </code>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Risk summary + actions */}
                            <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    {riskCounts["Green"] && (
                                        <span className="text-emerald-400">
                                            {riskCounts["Green"]} Safe
                                        </span>
                                    )}
                                    {riskCounts["Yellow"] && (
                                        <span className="text-amber-400">
                                            · {riskCounts["Yellow"]} Moderate
                                        </span>
                                    )}
                                    {riskCounts["Red"] && (
                                        <span className="text-red-400">
                                            · {riskCounts["Red"]} High Risk
                                        </span>
                                    )}
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={onCancel}
                                        disabled={isExecuting}
                                        className="px-4 py-2 text-sm font-medium rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={onConfirm}
                                        disabled={isExecuting}
                                        className="px-5 py-2 text-sm font-bold rounded-lg bg-primary text-white hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {isExecuting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Deploying…
                                            </>
                                        ) : (
                                            `Confirm & Deploy (${tweaks.length})`
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
