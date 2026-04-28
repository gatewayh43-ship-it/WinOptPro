import { useEffect, useRef } from "react";
import { Shield, Database } from "lucide-react";

interface ConsentModalProps {
  onAccept: () => void;
  onDecline: () => void;
}

export function ConsentModal({ onAccept, onDecline }: ConsentModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const acceptBtnRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<Element | null>(null);

  // Focus trap + Escape-to-decline + initial focus
  useEffect(() => {
    previouslyFocused.current = document.activeElement;
    acceptBtnRef.current?.focus();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onDecline();
        return;
      }
      if (e.key !== "Tab") return;

      const root = dialogRef.current;
      if (!root) return;
      const focusables = root.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      if (previouslyFocused.current instanceof HTMLElement) {
        previouslyFocused.current.focus();
      }
    };
  }, [onDecline]);

  return (
    <div
      data-testid="consent-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-title"
      aria-describedby="consent-description"
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-primary" aria-hidden="true" />
            </div>
            <h2 id="consent-title" className="text-xl font-bold text-foreground">Welcome to WinOpt Pro</h2>
          </div>
          <p id="consent-description" className="text-[13px] text-slate-500 dark:text-slate-300 mt-3 leading-relaxed">
            Before you continue, please review how WinOpt Pro handles your data.
          </p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* What we collect */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-black/5 dark:bg-white/5 border border-border">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
              <Database className="w-4 h-4 text-primary" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-foreground">What we collect</p>
              <p className="text-[12px] text-slate-500 dark:text-slate-300 mt-1 leading-relaxed">
                An audit log of tweaks applied — stored locally on your machine and never uploaded to any server or third party.
              </p>
            </div>
          </div>

          {/* Your control */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-black/5 dark:bg-white/5 border border-border">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <Shield className="w-4 h-4 text-emerald-500" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-foreground">Your control</p>
              <p className="text-[12px] text-slate-500 dark:text-slate-300 mt-1 leading-relaxed">
                All data stays on your machine. You can export or delete your audit log at any time from Settings &rarr; Data &amp; Privacy.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-border">
          <button
            type="button"
            onClick={onDecline}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-border text-slate-500 dark:text-slate-300 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            Decline &amp; Exit
          </button>
          <button
            type="button"
            ref={acceptBtnRef}
            onClick={onAccept}
            className="px-5 py-2 text-sm font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Accept &amp; Continue
          </button>
        </div>
      </div>
    </div>
  );
}
