import { useEffect, useRef, useState } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { motion } from "framer-motion";
import { ShieldAlert, Save, AlertTriangle, RotateCcw } from "lucide-react";

interface RestorePointPromptProps {
  isOpen: boolean;
  highRiskCount: number;
  onCreatedAndContinue: () => void;
  onSkipAndContinue: () => void;
  onCancel: () => void;
}

export function RestorePointPrompt({
  isOpen,
  highRiskCount,
  onCreatedAndContinue,
  onSkipAndContinue,
  onCancel,
}: RestorePointPromptProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const createBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    createBtnRef.current?.focus();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isCreating) {
        e.preventDefault();
        onCancel();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, isCreating, onCancel]);

  if (!isOpen) return null;

  const handleCreate = async () => {
    setIsCreating(true);
    setError(null);
    try {
      if (isTauri()) {
        const description = `WinOpt Pro — before applying ${highRiskCount} high-risk tweak${highRiskCount > 1 ? "s" : ""}`;
        await invoke<boolean>("create_restore_point", { description });
      }
      onCreatedAndContinue();
    } catch (e) {
      setError(typeof e === "string" ? e : (e as Error).message ?? "Restore point creation failed.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="restore-point-title"
      aria-describedby="restore-point-description"
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5 text-amber-400" aria-hidden="true" />
          </div>
          <div>
            <h2 id="restore-point-title" className="text-base font-bold text-foreground">
              High-risk tweaks selected
            </h2>
            <p className="text-[12px] text-slate-500 dark:text-slate-300 mt-0.5">
              {highRiskCount} red-tier tweak{highRiskCount > 1 ? "s" : ""} can be hard to undo without a snapshot.
            </p>
          </div>
        </div>

        {/* Body */}
        <div id="restore-point-description" className="px-6 py-5 space-y-3">
          <p className="text-[13px] text-slate-700 dark:text-slate-200 leading-relaxed">
            We recommend creating a Windows System Restore Point first.
            If something breaks, you can revert your whole system to this point from Recovery.
          </p>
          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-500/[0.08] border border-red-500/20">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-[12px] text-red-300 leading-relaxed">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end px-6 py-4 border-t border-border">
          <button
            type="button"
            onClick={onCancel}
            disabled={isCreating}
            className="px-4 py-2 text-[13px] font-medium rounded-lg border border-border text-slate-500 dark:text-slate-300 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSkipAndContinue}
            disabled={isCreating}
            className="px-4 py-2 text-[13px] font-medium rounded-lg border border-amber-500/30 text-amber-300 hover:bg-amber-500/10 transition-colors disabled:opacity-50"
          >
            Skip (risky)
          </button>
          <button
            type="button"
            ref={createBtnRef}
            onClick={handleCreate}
            disabled={isCreating}
            className="px-5 py-2 text-[13px] font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isCreating ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin" aria-hidden="true" />
                Creating…
              </>
            ) : (
              <>
                <Save className="w-4 h-4" aria-hidden="true" />
                Create &amp; Continue
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
