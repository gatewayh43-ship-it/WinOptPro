import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Loader2, Clock, X, RotateCcw, SkipForward } from "lucide-react";
import type { TweakResult } from "../store/appStore";

type ItemStatus = "pending" | "running" | "success" | "failed";

interface ProgressItem {
    id: string;
    name: string;
    status: ItemStatus;
    result?: TweakResult;
}

interface ProgressModalProps {
    isOpen: boolean;
    items: ProgressItem[];
    onClose: () => void;
    onRollback?: () => void;
    onSkipAndContinue?: () => void;
    showFailureActions?: boolean;
}

const statusIcon = (status: ItemStatus) => {
    switch (status) {
        case "pending":
            return <Clock className="w-4 h-4 text-slate-500" />;
        case "running":
            return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
        case "success":
            return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
        case "failed":
            return <XCircle className="w-4 h-4 text-red-400" />;
    }
};

export function ProgressModal({
    isOpen,
    items,
    onClose,
    onRollback,
    onSkipAndContinue,
    showFailureActions = false,
}: ProgressModalProps) {
    const completed = items.filter((i) => i.status === "success").length;
    const failed = items.filter((i) => i.status === "failed").length;
    const total = items.length;
    const allDone = items.every((i) => i.status === "success" || i.status === "failed");
    const progressPct = total > 0 ? ((completed + failed) / total) * 100 : 0;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
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
                                <div>
                                    <h2 className="text-lg font-bold text-white">
                                        {allDone
                                            ? failed > 0
                                                ? "Deployment Partially Failed"
                                                : "Deployment Complete"
                                            : "Deploying…"}
                                    </h2>
                                    <p className="text-sm text-slate-400 mt-0.5">
                                        {completed} of {total} completed
                                        {failed > 0 ? ` · ${failed} failed` : ""}
                                    </p>
                                </div>
                                {allDone && (
                                    <button
                                        onClick={onClose}
                                        className="p-2 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                )}
                            </div>

                            {/* Progress bar */}
                            <div className="px-6 pt-4">
                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                    <motion.div
                                        className={`h-full rounded-full ${failed > 0 ? "bg-red-500" : "bg-primary"
                                            }`}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progressPct}%` }}
                                        transition={{ duration: 0.3 }}
                                    />
                                </div>
                            </div>

                            {/* Items list */}
                            <div className="px-6 py-4 max-h-[45vh] overflow-y-auto space-y-2">
                                {items.map((item) => (
                                    <div
                                        key={item.id}
                                        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${item.status === "running"
                                                ? "bg-primary/5 border-primary/20"
                                                : item.status === "failed"
                                                    ? "bg-red-500/5 border-red-500/20"
                                                    : item.status === "success"
                                                        ? "bg-emerald-500/5 border-emerald-500/20"
                                                        : "bg-white/[0.02] border-white/5"
                                            }`}
                                    >
                                        {statusIcon(item.status)}
                                        <div className="flex-1 min-w-0">
                                            <span className="text-sm font-medium text-white truncate block">
                                                {item.name}
                                            </span>
                                            {item.status === "success" && item.result && (
                                                <span className="text-xs text-slate-500">
                                                    {item.result.durationMs}ms
                                                </span>
                                            )}
                                            {item.status === "failed" && item.result && (
                                                <span className="text-xs text-red-400 truncate block">
                                                    {item.result.stderr || `Exit code: ${item.result.exitCode}`}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Failure actions */}
                            {showFailureActions && (
                                <div className="px-6 py-4 border-t border-white/10 flex items-center justify-end gap-3">
                                    {onRollback && (
                                        <button
                                            onClick={onRollback}
                                            className="px-4 py-2 text-sm font-medium rounded-lg text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                                        >
                                            <RotateCcw className="w-4 h-4" />
                                            Rollback All
                                        </button>
                                    )}
                                    {onSkipAndContinue && (
                                        <button
                                            onClick={onSkipAndContinue}
                                            className="px-4 py-2 text-sm font-medium rounded-lg text-amber-400 hover:bg-amber-500/10 transition-colors flex items-center gap-2"
                                        >
                                            <SkipForward className="w-4 h-4" />
                                            Skip & Continue
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Done actions */}
                            {allDone && !showFailureActions && (
                                <div className="px-6 py-4 border-t border-white/10 flex items-center justify-end">
                                    <button
                                        onClick={onClose}
                                        className="px-5 py-2 text-sm font-bold rounded-lg bg-primary text-white hover:opacity-90 transition-opacity"
                                    >
                                        Done
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

export type { ProgressItem, ItemStatus };
