import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "../store/appStore";
import { Lock, ShieldAlert, AlertTriangle, X } from "lucide-react";

interface ExpertModeGateProps {
    children: React.ReactNode;
    /** Optional custom message shown when expert mode is off */
    message?: string;
    /** If true, renders nothing when gated (instead of the lock overlay) */
    hideCompletely?: boolean;
}

/**
 * Wraps content that should only be visible when Expert Mode is enabled.
 * Shows a locked overlay with a prompt to enable expert mode in settings.
 */
export function ExpertModeGate({ children, message, hideCompletely = false }: ExpertModeGateProps) {
    const expertMode = useAppStore((s) => s.userSettings.expertModeEnabled);
    const updateSettings = useAppStore((s) => s.updateSettings);
    const [showConfirm, setShowConfirm] = useState(false);

    if (expertMode) {
        return <>{children}</>;
    }

    if (hideCompletely) {
        return null;
    }

    return (
        <>
        <div className="relative select-none">
            {/* Blurred content underneath */}
            <div className="opacity-20 blur-sm pointer-events-none" aria-hidden>
                {children}
            </div>

            {/* Lock overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-10">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
                    <Lock className="w-6 h-6 text-amber-400" />
                </div>
                <h4 className="text-[15px] font-bold text-foreground mb-1.5">Expert Mode Required</h4>
                <p className="text-[13px] text-slate-400 max-w-xs leading-relaxed mb-4">
                    {message || "This content is hidden because it requires advanced knowledge. Enable Expert Mode to view."}
                </p>
                <button
                    onClick={() => setShowConfirm(true)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-colors"
                >
                    <ShieldAlert className="w-4 h-4" />
                    Enable Expert Mode
                </button>
            </div>
        </div>

        {/* Expert Mode Confirmation Modal */}
        <AnimatePresence>
            {showConfirm && (
                <>
                    <motion.div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={() => setShowConfirm(false)}
                    />
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                    >
                        <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl shadow-2xl max-w-md w-full">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
                                        <AlertTriangle className="w-5 h-5 text-red-400" />
                                    </div>
                                    <h2 className="text-lg font-bold text-white">Expert Mode Warning</h2>
                                </div>
                                <button onClick={() => setShowConfirm(false)} className="p-2 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="px-6 py-5">
                                <p className="text-[14px] text-slate-300 leading-relaxed">
                                    Expert Mode enables high-risk tweaks that can affect system stability.
                                    These tweaks are labeled <span className="text-red-400 font-semibold">Red</span> and
                                    carry a higher risk of causing system issues or requiring a restore point.
                                </p>
                                <p className="text-[13px] text-slate-500 mt-3 leading-relaxed">
                                    Only enable this if you understand the risks and have a system restore point ready.
                                </p>
                            </div>
                            <div className="px-6 py-4 border-t border-white/10 flex items-center justify-end gap-3">
                                <button onClick={() => setShowConfirm(false)} className="px-4 py-2 text-sm font-medium rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
                                    Cancel
                                </button>
                                <button
                                    onClick={() => { updateSettings({ expertModeEnabled: true }); setShowConfirm(false); }}
                                    className="px-5 py-2 text-sm font-bold rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30 transition-colors"
                                >
                                    I Understand, Enable
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
        </>
    );
}
