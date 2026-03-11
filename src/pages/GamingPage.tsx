import React, { useState, useEffect } from "react";
import {
  Gamepad2,
  Thermometer,
  Zap,
  Cpu,
  Monitor,
  Layers,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  Camera,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { motion } from "framer-motion";
import { useGaming, GpuMetrics, GpuSnapshot } from "@/hooks/useGaming";

// ── Sub-components ────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color = "text-primary",
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color?: string;
}) {
  return (
    <div className="glass-panel rounded-2xl p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-slate-400">
        <Icon className={`w-4 h-4 ${color}`} strokeWidth={1.8} />
        <span className="text-[11px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-[11px] text-slate-500">{sub}</p>}
    </div>
  );
}

function BarMeter({
  label,
  value,
  max,
  unit,
  color,
}: {
  label: string;
  value: number;
  max: number;
  unit: string;
  color: string;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[12px]">
        <span className="text-slate-400 font-medium">{label}</span>
        <span className="text-foreground font-semibold">
          {unit === "GB"
            ? `${(value / 1024).toFixed(1)} / ${(max / 1024).toFixed(0)} GB`
            : `${value.toFixed(0)}${unit} / ${max.toFixed(0)}${unit}`}
        </span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6 }}
        />
      </div>
    </div>
  );
}

function GpuPanel({ gpu }: { gpu: GpuMetrics }) {
  return (
    <div className="glass-panel rounded-2xl p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[14px] font-bold text-foreground">GPU Metrics</h3>
          <p className="text-[12px] text-slate-500 mt-0.5">{gpu.name}</p>
        </div>
        {!gpu.isNvidia && (
          <div className="flex items-center gap-1.5 text-amber-400 text-[11px] font-medium bg-amber-400/10 px-3 py-1.5 rounded-lg border border-amber-400/20">
            <AlertTriangle className="w-3.5 h-3.5" />
            nvidia-smi not found
          </div>
        )}
      </div>

      {gpu.isNvidia ? (
        <>
          {/* Stat grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="GPU Temp"
              value={`${gpu.temperatureC.toFixed(0)}°C`}
              icon={Thermometer}
              color={gpu.temperatureC > 85 ? "text-red-400" : gpu.temperatureC > 70 ? "text-amber-400" : "text-emerald-400"}
            />
            <StatCard
              label="GPU Load"
              value={`${gpu.gpuUtilPct.toFixed(0)}%`}
              icon={Cpu}
              color="text-primary"
            />
            <StatCard
              label="Power Draw"
              value={`${gpu.powerDrawW.toFixed(0)}W`}
              sub={`Limit: ${gpu.powerLimitW.toFixed(0)}W`}
              icon={Zap}
              color="text-amber-400"
            />
            <StatCard
              label="VRAM"
              value={`${(gpu.memUsedMb / 1024).toFixed(1)} GB`}
              sub={`of ${(gpu.memTotalMb / 1024).toFixed(0)} GB`}
              icon={Layers}
              color="text-violet-400"
            />
          </div>

          {/* Bars */}
          <div className="space-y-3">
            <BarMeter
              label="GPU Utilization"
              value={gpu.gpuUtilPct}
              max={100}
              unit="%"
              color="bg-primary"
            />
            <BarMeter
              label="VRAM Usage"
              value={gpu.memUsedMb}
              max={gpu.memTotalMb}
              unit="GB"
              color="bg-violet-500"
            />
            <BarMeter
              label="Power Draw"
              value={gpu.powerDrawW}
              max={gpu.powerLimitW}
              unit="W"
              color="bg-amber-500"
            />
          </div>
        </>
      ) : (
        <p className="text-[13px] text-slate-500 leading-relaxed">
          GPU metrics require an NVIDIA GPU with nvidia-smi available in PATH.
          AMD/Intel metrics are not yet supported.
        </p>
      )}
    </div>
  );
}

function PowerLimitPanel({
  gpu,
  isSettingLimit,
  onSet,
}: {
  gpu: GpuMetrics;
  isSettingLimit: boolean;
  onSet: (w: number) => void;
}) {
  const [pending, setPending] = useState(gpu.powerLimitW);

  useEffect(() => {
    setPending(gpu.powerLimitW);
  }, [gpu.powerLimitW]);

  const min = Math.round(gpu.powerMaxLimitW * 0.4);
  const max = Math.round(gpu.powerMaxLimitW);

  return (
    <div className="glass-panel rounded-2xl p-5 space-y-4">
      <div>
        <h3 className="text-[14px] font-bold text-foreground">GPU Power Limit</h3>
        <p className="text-[12px] text-slate-500 mt-0.5">
          Reduce to save power/heat · Increase for maximum performance (requires admin)
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-[13px]">
          <span className="text-slate-400">Limit</span>
          <span className="font-bold text-amber-400">{pending.toFixed(0)} W</span>
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={5}
          value={pending}
          onChange={(e) => setPending(Number(e.target.value))}
          className="w-full accent-amber-400"
        />
        <div className="flex justify-between text-[10px] text-slate-600">
          <span>{min}W (min)</span>
          <span>{max}W (max)</span>
        </div>
      </div>

      <button
        onClick={() => onSet(Math.round(pending))}
        disabled={isSettingLimit || Math.round(pending) === Math.round(gpu.powerLimitW)}
        className="w-full py-2 rounded-xl bg-amber-500 text-white hover:bg-amber-600 border border-amber-600 shadow-sm shadow-amber-500/20 font-semibold text-[13px] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isSettingLimit ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            Applying…
          </>
        ) : (
          <>
            <Zap className="w-3.5 h-3.5" />
            Apply {pending.toFixed(0)}W Limit
          </>
        )}
      </button>
    </div>
  );
}

const AUTO_OPTIMIZE_TWEAKS = [
  "SystemResponsiveness",
  "GamePriority",
  "DisableDynamicTick",
  "EnableHWGPUScheduling",
  "DisableCoreParking",
  "DisableNetworkThrottling",
];

function AutoOptimizePanel({
  autoOptimize,
  setAutoOptimize,
}: {
  autoOptimize: boolean;
  setAutoOptimize: (v: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="glass-panel rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-emerald-400" strokeWidth={1.8} />
          <div>
            <p className="text-[14px] font-bold text-foreground">Auto-Optimize on Launch</p>
            <p className="text-[12px] text-slate-500 mt-0.5">
              Automatically apply gaming tweaks when a game is detected
            </p>
          </div>
        </div>
        <button
          onClick={() => setAutoOptimize(!autoOptimize)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-[13px] transition-all ${
            autoOptimize
              ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
              : "bg-white/5 border border-border text-slate-400 hover:text-foreground"
          }`}
        >
          {autoOptimize ? (
            <><ToggleRight className="w-4 h-4" /> On</>
          ) : (
            <><ToggleLeft className="w-4 h-4" /> Off</>
          )}
        </button>
      </div>
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-400 transition-colors"
      >
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {expanded ? "Hide" : "Show"} tweaks that will be applied
      </button>
      {expanded && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {AUTO_OPTIMIZE_TWEAKS.map(id => (
            <span key={id} className="px-2 py-0.5 rounded-md bg-white/5 border border-border text-[11px] font-mono text-slate-400">
              {id}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function BeforeAfterPanel({
  gpuMetrics,
  cpuLoad,
  baseline,
  captureBaseline,
}: {
  gpuMetrics: GpuMetrics | null;
  cpuLoad: number | null;
  baseline: GpuSnapshot | null;
  captureBaseline: () => void;
}) {
  const rows: Array<{ label: string; before: string; now: string; delta: number | null }> =
    gpuMetrics && baseline
      ? [
          {
            label: "GPU %",
            before: `${baseline.gpu.gpuUtilPct.toFixed(0)}%`,
            now: `${gpuMetrics.gpuUtilPct.toFixed(0)}%`,
            delta: gpuMetrics.gpuUtilPct - baseline.gpu.gpuUtilPct,
          },
          {
            label: "CPU %",
            before: `${baseline.cpu.toFixed(0)}%`,
            now: cpuLoad != null ? `${cpuLoad.toFixed(0)}%` : "—",
            delta: cpuLoad != null ? cpuLoad - baseline.cpu : null,
          },
          {
            label: "Power",
            before: `${baseline.gpu.powerDrawW.toFixed(0)}W`,
            now: `${gpuMetrics.powerDrawW.toFixed(0)}W`,
            delta: gpuMetrics.powerDrawW - baseline.gpu.powerDrawW,
          },
          {
            label: "GPU Temp",
            before: `${baseline.gpu.temperatureC.toFixed(0)}°C`,
            now: `${gpuMetrics.temperatureC.toFixed(0)}°C`,
            delta: gpuMetrics.temperatureC - baseline.gpu.temperatureC,
          },
        ]
      : [];

  return (
    <div className="glass-panel rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Camera className="w-5 h-5 text-violet-400" strokeWidth={1.8} />
          <div>
            <p className="text-[14px] font-bold text-foreground">Before / After</p>
            <p className="text-[12px] text-slate-500 mt-0.5">
              {baseline
                ? `Baseline: ${new Date(baseline.timestamp).toLocaleTimeString()}`
                : "Capture a baseline before applying tweaks"}
            </p>
          </div>
        </div>
        <button
          onClick={captureBaseline}
          disabled={!gpuMetrics}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 text-violet-400 font-semibold text-[13px] transition-all disabled:opacity-40"
        >
          <Camera className="w-3.5 h-3.5" />
          Capture Baseline
        </button>
      </div>

      {baseline && gpuMetrics && (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-white/[0.03] border-b border-border">
                <th className="text-left px-3 py-2 text-slate-500 font-semibold">Metric</th>
                <th className="text-right px-3 py-2 text-slate-500 font-semibold">Before</th>
                <th className="text-right px-3 py-2 text-slate-500 font-semibold">Now</th>
                <th className="text-right px-3 py-2 text-slate-500 font-semibold">Δ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-b border-border/50 last:border-0">
                  <td className="px-3 py-2 text-slate-400 font-medium">{row.label}</td>
                  <td className="px-3 py-2 text-right text-slate-500">{row.before}</td>
                  <td className="px-3 py-2 text-right text-foreground font-semibold">{row.now}</td>
                  <td className={`px-3 py-2 text-right font-bold ${
                    row.delta === null ? "text-slate-600" :
                    row.delta < 0 ? "text-emerald-400" : row.delta > 0 ? "text-red-400" : "text-slate-500"
                  }`}>
                    {row.delta === null ? "—" : `${row.delta > 0 ? "+" : ""}${row.delta.toFixed(0)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export function GamingPage() {
  const {
    activeGame,
    gpuMetrics,
    cpuLoad,
    isOverlayVisible,
    isLoadingGpu,
    isSettingLimit,
    autoOptimize,
    baseline,
    setAutoOptimize,
    captureBaseline,
    setGpuPowerLimit,
    showOverlay,
    hideOverlay,
  } = useGaming();

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Gamepad2 className="w-4 h-4 text-primary" strokeWidth={1.8} />
            </div>
            Gaming Optimizer
          </h1>
          <p className="text-[13px] text-slate-500 mt-1">
            Real-time game detection, GPU metrics, and performance overlay
          </p>
        </div>

        {/* Active game detection */}
        <div className="glass-panel rounded-2xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className={`w-2.5 h-2.5 rounded-full shadow-lg transition-colors ${
                activeGame
                  ? "bg-emerald-400 shadow-emerald-400/50 animate-pulse"
                  : "bg-slate-600"
              }`}
            />
            <div>
              <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-0.5">
                Active Game
              </p>
              <p className="text-[15px] font-bold text-foreground">
                {activeGame ?? "No game detected"}
              </p>
            </div>
          </div>
          <div className="text-[11px] text-slate-600 font-mono bg-black/5 dark:bg-white/5 px-3 py-1.5 rounded-lg border border-border">
            Polling every 4s
          </div>
        </div>

        {/* GPU panel */}
        {isLoadingGpu ? (
          <div className="glass-panel rounded-2xl p-8 flex items-center justify-center gap-3 text-slate-500">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span className="text-[13px]">Querying GPU metrics…</span>
          </div>
        ) : gpuMetrics ? (
          <>
            <GpuPanel gpu={gpuMetrics} />
            {gpuMetrics.isNvidia && gpuMetrics.powerMaxLimitW > 0 && (
              <PowerLimitPanel
                gpu={gpuMetrics}
                isSettingLimit={isSettingLimit}
                onSet={setGpuPowerLimit}
              />
            )}
          </>
        ) : null}

        {/* Overlay toggle */}
        <div className="glass-panel rounded-2xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Monitor className="w-5 h-5 text-primary" strokeWidth={1.8} />
            <div>
              <p className="text-[14px] font-bold text-foreground">Gaming Overlay</p>
              <p className="text-[12px] text-slate-500 mt-0.5">
                Transparent always-on-top window showing live GPU stats
              </p>
            </div>
          </div>
          <button
            onClick={isOverlayVisible ? hideOverlay : showOverlay}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-[13px] transition-all ${
              isOverlayVisible
                ? "bg-primary/10 border border-primary/30 text-primary"
                : "bg-white/5 border border-border text-slate-400 hover:text-foreground"
            }`}
          >
            {isOverlayVisible ? (
              <>
                <ToggleRight className="w-4 h-4" />
                Overlay On
              </>
            ) : (
              <>
                <ToggleLeft className="w-4 h-4" />
                Show Overlay
              </>
            )}
          </button>
        </div>

        {/* Auto-optimize */}
        <AutoOptimizePanel autoOptimize={autoOptimize} setAutoOptimize={setAutoOptimize} />

        {/* Before / After */}
        <BeforeAfterPanel
          gpuMetrics={gpuMetrics}
          cpuLoad={cpuLoad}
          baseline={baseline}
          captureBaseline={captureBaseline}
        />

        {/* Note about game tweaks */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/15 text-[12px] text-slate-400">
          <Gamepad2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <span>
            For registry-level gaming tweaks (GPU scheduling, game mode, timer resolution),
            use the <strong className="text-foreground">Gaming</strong> section under System Tuning in the sidebar.
          </span>
        </div>
      </div>
    </div>
  );
}
