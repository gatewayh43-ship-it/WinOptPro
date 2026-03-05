import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, RefreshCw, CheckCircle2, AlertTriangle, ArrowUpCircle, Loader2 } from "lucide-react";
import { isTauri } from "@tauri-apps/api/core";

// Lazily imported so the app still renders fine in browser dev mode
type UpdateInfo = {
  version: string;
  body?: string | null;
  date?: string | null;
  downloadAndInstall: (cb?: (evt: DownloadEvent) => void) => Promise<void>;
};

type DownloadEvent =
  | { event: "Started"; data: { contentLength?: number } }
  | { event: "Progress"; data: { chunkLength: number } }
  | { event: "Finished" };

type UpdatePhase =
  | { type: "idle" }
  | { type: "checking" }
  | { type: "available"; update: UpdateInfo }
  | { type: "downloading"; progress: number; total: number }
  | { type: "ready" }
  | { type: "error"; message: string };

// Exposed so SettingsPage can trigger a manual check
type UpdateAPI = {
  checkForUpdates: () => Promise<void>;
  phase: UpdatePhase;
};

// Singleton event channel so SettingsPage can call checkForUpdates
const listeners = new Set<(api: UpdateAPI) => void>();
let globalCheckFn: (() => Promise<void>) | null = null;
let globalPhase: UpdatePhase = { type: "idle" };

export function triggerUpdateCheck() {
  globalCheckFn?.();
}

export function getUpdatePhase(): UpdatePhase {
  return globalPhase;
}

export function subscribeUpdatePhase(fn: (api: UpdateAPI) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify(phase: UpdatePhase, checkFn: () => Promise<void>) {
  globalPhase = phase;
  listeners.forEach(fn => fn({ phase, checkForUpdates: checkFn }));
}

export function UpdateNotification() {
  const [phase, setPhase] = useState<UpdatePhase>({ type: "idle" });
  const [dismissed, setDismissed] = useState(false);
  const updateRef = useRef<UpdateInfo | null>(null);

  const setPhaseAndNotify = useCallback((p: UpdatePhase) => {
    setPhase(p);
    notify(p, checkForUpdates);
  }, []);  // eslint-disable-line

  const checkForUpdates = useCallback(async () => {
    if (!isTauri()) return;

    setPhaseAndNotify({ type: "checking" });
    setDismissed(false);

    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const update = await check();

      if (!update) {
        setPhaseAndNotify({ type: "idle" });
        return;
      }

      updateRef.current = update as unknown as UpdateInfo;
      setPhaseAndNotify({ type: "available", update: update as unknown as UpdateInfo });
    } catch {
      // Silently ignore — update server may not be configured yet
      setPhaseAndNotify({ type: "idle" });
    }
  }, [setPhaseAndNotify]);

  // Register global check fn
  useEffect(() => {
    globalCheckFn = checkForUpdates;
    return () => { if (globalCheckFn === checkForUpdates) globalCheckFn = null; };
  }, [checkForUpdates]);

  // Auto-check on startup after a short delay
  useEffect(() => {
    const timer = setTimeout(checkForUpdates, 5000);
    return () => clearTimeout(timer);
  }, [checkForUpdates]);

  const handleInstall = async () => {
    const update = updateRef.current;
    if (!update) return;

    let downloaded = 0;
    let total = 0;

    setPhaseAndNotify({ type: "downloading", progress: 0, total: 0 });

    try {
      await update.downloadAndInstall((evt: DownloadEvent) => {
        if (evt.event === "Started") {
          total = evt.data.contentLength ?? 0;
          setPhaseAndNotify({ type: "downloading", progress: 0, total });
        } else if (evt.event === "Progress") {
          downloaded += evt.data.chunkLength;
          setPhaseAndNotify({ type: "downloading", progress: downloaded, total });
        } else if (evt.event === "Finished") {
          setPhaseAndNotify({ type: "ready" });
        }
      });

      // If downloadAndInstall resolves without Finished event:
      setPhaseAndNotify({ type: "ready" });
    } catch (e: any) {
      setPhaseAndNotify({ type: "error", message: e?.toString() ?? "Download failed" });
    }
  };

  const handleRelaunch = async () => {
    try {
      const { relaunch } = await import("@tauri-apps/plugin-process");
      await relaunch();
    } catch {
      // fallback: do nothing (user can close manually)
    }
  };

  const visible =
    !dismissed &&
    (phase.type === "available" ||
      phase.type === "downloading" ||
      phase.type === "ready" ||
      phase.type === "error");

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="update-toast"
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.97 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed bottom-6 right-6 z-[9999] w-[340px] rounded-2xl border border-white/10 bg-[#0f1117]/95 backdrop-blur-2xl shadow-2xl shadow-black/50 overflow-hidden"
        >
          {/* Top accent bar */}
          <div className="h-[2px] w-full bg-gradient-to-r from-primary via-blue-400 to-primary/0" />

          <div className="p-5">
            {/* Available */}
            {phase.type === "available" && (
              <>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
                      <ArrowUpCircle className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-white leading-none">Update Available</p>
                      <p className="text-[11px] text-slate-400 mt-1 font-mono">v{phase.update.version}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setDismissed(true)}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-slate-300 transition-colors shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {phase.update.body && (
                  <div className="mb-4 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 max-h-[80px] overflow-y-auto custom-scrollbar">
                    <p className="text-[11px] text-slate-400 leading-relaxed whitespace-pre-line">{phase.update.body}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => setDismissed(true)}
                    className="flex-1 py-2 text-[12px] font-medium text-slate-500 hover:text-slate-300 rounded-xl border border-white/5 hover:bg-white/5 transition-colors"
                  >
                    Later
                  </button>
                  <button
                    onClick={handleInstall}
                    className="flex-1 flex items-center justify-center gap-2 py-2 text-[12px] font-bold text-white rounded-xl bg-primary hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Install Now
                  </button>
                </div>
              </>
            )}

            {/* Downloading */}
            {phase.type === "downloading" && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center shrink-0">
                    <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-white leading-none">Downloading Update</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {phase.total > 0
                        ? `${(phase.progress / 1024 / 1024).toFixed(1)} / ${(phase.total / 1024 / 1024).toFixed(1)} MB`
                        : "Please wait…"}
                    </p>
                  </div>
                </div>

                <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-blue-400"
                    initial={{ width: "0%" }}
                    animate={{
                      width: phase.total > 0
                        ? `${Math.min(100, (phase.progress / phase.total) * 100).toFixed(1)}%`
                        : "60%"
                    }}
                    transition={{ duration: 0.3 }}
                  />
                </div>

                {phase.total === 0 && (
                  <motion.div
                    className="mt-2 h-1.5 rounded-full bg-gradient-to-r from-transparent via-primary/40 to-transparent"
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                  />
                )}
              </>
            )}

            {/* Ready to relaunch */}
            {phase.type === "ready" && (
              <>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-white leading-none">Update Ready</p>
                      <p className="text-[11px] text-slate-400 mt-1">Restart to apply the new version</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setDismissed(true)}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-slate-300 transition-colors shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setDismissed(true)}
                    className="flex-1 py-2 text-[12px] font-medium text-slate-500 hover:text-slate-300 rounded-xl border border-white/5 hover:bg-white/5 transition-colors"
                  >
                    Later
                  </button>
                  <button
                    onClick={handleRelaunch}
                    className="flex-1 flex items-center justify-center gap-2 py-2 text-[12px] font-bold text-emerald-300 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/20 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Restart Now
                  </button>
                </div>
              </>
            )}

            {/* Error */}
            {phase.type === "error" && (
              <>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-white leading-none">Update Failed</p>
                      <p className="text-[11px] text-slate-400 mt-1">Could not download update</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setDismissed(true)}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-slate-300 transition-colors shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed mb-3 truncate">{phase.message}</p>
                <button
                  onClick={checkForUpdates}
                  className="w-full py-2 text-[12px] font-bold text-slate-300 rounded-xl border border-white/10 hover:bg-white/5 transition-colors"
                >
                  Retry
                </button>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
