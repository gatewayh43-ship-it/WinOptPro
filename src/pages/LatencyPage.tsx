import { Timer, Cpu, HardDrive, RefreshCw, Zap, Info, CheckCircle, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useLatency } from "@/hooks/useLatency";

function to_ms(units100ns: number) {
  return (units100ns / 10_000).toFixed(3);
}

function BoolBadge({ value, trueLabel = "Yes", falseLabel = "No" }: { value: boolean; trueLabel?: string; falseLabel?: string }) {
  return value ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
      <CheckCircle className="w-3 h-3" /> {trueLabel}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-slate-500/10 text-slate-500 border border-slate-600/30">
      <XCircle className="w-3 h-3" /> {falseLabel}
    </span>
  );
}

export function LatencyPage({ setView }: { setView?: (id: string) => void }) {
  const { status, isLoading, isFlushing, error, flushStandby, refresh } = useLatency();

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className="max-w-4xl mx-auto p-6 pt-8 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Timer className="w-4 h-4 text-primary" strokeWidth={1.8} />
            </div>
            Latency Optimizer
          </h1>
          <p className="text-[13px] text-slate-500 mt-1">
            Timer resolution, standby memory, and boot-time latency settings
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[12px]">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="glass-panel rounded-2xl p-8 flex items-center justify-center gap-3 text-slate-500">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span className="text-[13px]">Reading system latency state…</span>
          </div>
        ) : status ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Timer Resolution */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel rounded-2xl p-5 space-y-4"
            >
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-primary" strokeWidth={1.8} />
                <h3 className="text-[14px] font-bold text-foreground">Timer Resolution</h3>
                <button onClick={refresh} title="Refresh" className="ml-auto text-slate-600 hover:text-slate-400 transition-colors">
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[12px] text-slate-500">Current</span>
                  <span className="text-[15px] font-bold text-primary font-mono">{to_ms(status.timerResolution100ns)} ms</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[12px] text-slate-500">Best (min)</span>
                  <span className="text-[13px] font-semibold text-emerald-400 font-mono">{to_ms(status.maxResolution100ns)} ms</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[12px] text-slate-500">Lowest (max)</span>
                  <span className="text-[13px] font-semibold text-slate-500 font-mono">{to_ms(status.minResolution100ns)} ms</span>
                </div>
              </div>

              {/* Visual bar: current position between min and max resolution */}
              <div className="space-y-1">
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.max(0, Math.min(100,
                        ((status.minResolution100ns - status.timerResolution100ns) /
                        Math.max(1, status.minResolution100ns - status.maxResolution100ns)) * 100
                      ))}%`
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-600">
                  <span>{to_ms(status.maxResolution100ns)}ms (best / fastest)</span>
                  <span>{to_ms(status.minResolution100ns)}ms (worst / default)</span>
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/5 border border-primary/10 text-[11px] text-slate-500">
                <Info className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                Lower ms = more precise timer = better frame pacing. Windows 11 24H2+ auto-adjusts to 0.5ms when a game is active. This shows the current active resolution.
              </div>
            </motion.div>

            {/* Standby Memory */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-panel rounded-2xl p-5 space-y-4"
            >
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" strokeWidth={1.8} />
                <h3 className="text-[14px] font-bold text-foreground">Standby Memory</h3>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[12px] text-slate-500">Standby RAM</span>
                  <span className="text-[15px] font-bold text-amber-400 font-mono">
                    {(status.standbyRamMb / 1024).toFixed(1)} GB
                  </span>
                </div>
                <div className="text-[11px] text-slate-600">
                  {status.standbyRamMb} MB in standby list
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 text-[11px] text-slate-500">
                <Info className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                Standby RAM is memory marked as free but still holding cached data. Flushing forces Windows to release it immediately, which can reduce game load time stutters.
              </div>

              <button
                onClick={flushStandby}
                disabled={isFlushing}
                className="w-full py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-semibold text-[13px] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isFlushing ? (
                  <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Flushing…</>
                ) : (
                  <><Zap className="w-3.5 h-3.5" /> Flush Standby List</>
                )}
              </button>
              <p className="text-[10px] text-slate-600 text-center">Requires administrator privileges</p>
            </motion.div>

            {/* Boot Settings */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-panel rounded-2xl p-5 space-y-4 md:col-span-2"
            >
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-violet-400" strokeWidth={1.8} />
                <h3 className="text-[14px] font-bold text-foreground">Boot / BCDEdit Settings</h3>
                <span className="ml-auto text-[11px] text-slate-600 font-mono bg-black/20 px-2 py-0.5 rounded border border-border">
                  read-only view
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border border-border bg-white/[0.02] space-y-1.5">
                  <p className="text-[11px] text-slate-500 font-mono">disabledynamictick</p>
                  <BoolBadge value={status.dynamicTickDisabled} trueLabel="Off (optimized)" falseLabel="On (default)" />
                  <p className="text-[10px] text-slate-600 leading-relaxed">Disable for smoother frame pacing</p>
                </div>
                <div className="p-3 rounded-xl border border-border bg-white/[0.02] space-y-1.5">
                  <p className="text-[11px] text-slate-500 font-mono">useplatformclock</p>
                  <BoolBadge value={status.platformClockForced} trueLabel="Forced" falseLabel="Auto (default)" />
                  <p className="text-[10px] text-slate-600 leading-relaxed">Forces HPET as the platform clock</p>
                </div>
              </div>

              {setView && (
                <button
                  onClick={() => setView("gaming")}
                  className="inline-flex items-center gap-1.5 text-[12px] text-slate-400 hover:text-primary transition-colors font-medium"
                >
                  <span>→</span> Manage these settings in Gaming Tweaks
                </button>
              )}
            </motion.div>

          </div>
        ) : null}
      </div>
    </div>
  );
}
