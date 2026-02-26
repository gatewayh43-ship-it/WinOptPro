import { useAppStore } from "../store/appStore";
import { Lock, ShieldAlert } from "lucide-react";

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

    if (expertMode) {
        return <>{children}</>;
    }

    if (hideCompletely) {
        return null;
    }

    return (
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
                    onClick={() => updateSettings({ expertModeEnabled: true })}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-colors"
                >
                    <ShieldAlert className="w-4 h-4" />
                    Enable Expert Mode
                </button>
            </div>
        </div>
    );
}
