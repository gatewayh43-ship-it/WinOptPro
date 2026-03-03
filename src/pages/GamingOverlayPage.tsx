import { useState, useEffect, useCallback } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { X } from "lucide-react";
import { GpuMetrics } from "@/hooks/useGaming";

async function startDrag() {
  if (!isTauri()) return;
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  getCurrentWindow().startDragging();
}

async function closeOverlay() {
  if (!isTauri()) return;
  const [{ getCurrentWindow }, { emit }] = await Promise.all([
    import("@tauri-apps/api/window"),
    import("@tauri-apps/api/event"),
  ]);
  await emit("overlay-closed");
  await getCurrentWindow().close();
}

function MetricPill({
  label,
  value,
  color = "text-white",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="bg-white/8 rounded-lg px-2 py-1.5 text-center min-w-[60px]">
      <p className="text-[8px] text-white/40 uppercase tracking-wider leading-none mb-0.5">
        {label}
      </p>
      <p className={`text-[13px] font-bold leading-none ${color}`}>{value}</p>
    </div>
  );
}

export function GamingOverlayPage() {
  const [game, setGame] = useState<string | null>(null);
  const [gpu, setGpu] = useState<GpuMetrics | null>(null);
  const [cpuLoad, setCpuLoad] = useState<number | null>(null);

  // Make body transparent so the rounded container shows through
  useEffect(() => {
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
    return () => {
      document.documentElement.style.background = "";
      document.body.style.background = "";
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!isTauri()) {
      setGame("Counter-Strike 2 (mock)");
      setGpu({
        name: "RTX 3080",
        temperatureC: 65,
        gpuUtilPct: 78,
        memUtilPct: 44,
        memUsedMb: 4506,
        memTotalMb: 10240,
        powerDrawW: 145,
        powerLimitW: 250,
        powerMaxLimitW: 320,
        isNvidia: true,
      });
      setCpuLoad(34);
      return;
    }
    try {
      const [g, metrics, cpu] = await Promise.all([
        invoke<string | null>("detect_active_game"),
        invoke<GpuMetrics>("get_gpu_metrics"),
        invoke<number>("get_cpu_quick"),
      ]);
      setGame(g);
      setGpu(metrics);
      setCpuLoad(cpu);
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 3000);
    return () => clearInterval(id);
  }, [refresh]);

  const tempColor =
    gpu && gpu.temperatureC > 85
      ? "text-red-400"
      : gpu && gpu.temperatureC > 70
      ? "text-amber-400"
      : "text-emerald-400";

  return (
    <div className="h-screen bg-transparent overflow-hidden flex items-start justify-start">
      <div className="m-1 bg-black/85 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden shadow-2xl w-full">
        {/* Drag handle */}
        <div
          className="flex items-center justify-between px-3 py-1.5 bg-white/5 cursor-grab active:cursor-grabbing select-none"
          onMouseDown={() => startDrag()}
        >
          <span className="text-[9px] font-bold tracking-[0.15em] text-primary uppercase">
            WinOpt Gaming
          </span>
          <button
            onClick={closeOverlay}
            className="text-white/30 hover:text-white/80 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>

        {/* Game name */}
        <div className="px-3 py-1 border-b border-white/5">
          <p className="text-[11px] font-semibold text-white truncate">
            {game ?? "No game detected"}
          </p>
        </div>

        {/* Metrics row */}
        <div className="px-2 py-2 flex gap-1.5 flex-wrap">
          <MetricPill
            label="CPU"
            value={cpuLoad != null ? `${cpuLoad.toFixed(0)}%` : "—"}
            color="text-sky-400"
          />
          {gpu?.isNvidia ? (
            <>
              <MetricPill
                label="GPU"
                value={`${gpu.gpuUtilPct.toFixed(0)}%`}
                color="text-primary"
              />
              <MetricPill
                label="TEMP"
                value={`${gpu.temperatureC.toFixed(0)}°C`}
                color={tempColor}
              />
              <MetricPill
                label="POWER"
                value={`${gpu.powerDrawW.toFixed(0)}W`}
                color="text-amber-400"
              />
              <MetricPill
                label="VRAM"
                value={`${(gpu.memUsedMb / 1024).toFixed(1)}G`}
                color="text-violet-400"
              />
            </>
          ) : (
            <p className="text-[10px] text-white/40 px-1">
              nvidia-smi not available
            </p>
          )}
        </div>

        {/* VRAM bar */}
        {gpu?.isNvidia && gpu.memTotalMb > 0 && (
          <div className="px-3 pb-2">
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-violet-500 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min((gpu.memUsedMb / gpu.memTotalMb) * 100, 100)}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
