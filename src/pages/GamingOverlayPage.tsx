import { useState, useEffect, useCallback } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { X } from "lucide-react";
import { GpuMetrics } from "@/hooks/useGaming";

async function startDrag() {
  if (!isTauri()) return;
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  getCurrentWindow().startDragging();
}

async function saveOverlayPosition() {
  if (!isTauri()) return;
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    const pos = await getCurrentWindow().outerPosition();
    localStorage.setItem("overlay-pos", JSON.stringify({ x: pos.x, y: pos.y }));
  } catch {
    // ignore
  }
}

async function restoreOverlayPosition() {
  if (!isTauri()) return;
  try {
    const saved = localStorage.getItem("overlay-pos");
    if (!saved) return;
    const { x, y } = JSON.parse(saved) as { x: number; y: number };
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    const { LogicalPosition } = await import("@tauri-apps/api/dpi");
    await getCurrentWindow().setPosition(new LogicalPosition(x, y));
  } catch {
    // ignore
  }
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

function vendorBadgeColor(vendor: string): string {
  switch (vendor) {
    case "NVIDIA": return "text-[#76b900]";
    case "AMD":    return "text-[#ed1c24]";
    case "Intel":  return "text-[#0071c5]";
    default:       return "text-white/40";
  }
}

function vramBarColor(vendor: string): string {
  switch (vendor) {
    case "AMD":   return "#ed1c24";
    case "Intel": return "#0071c5";
    default:      return "#a855f7"; // violet for NVIDIA + unknown
  }
}

export function GamingOverlayPage() {
  const { game, gpu, cpuLoad, fps, closeOverlay } = useGamingOverlayState();

// (Replaced by useGamingOverlayState below for cleaner hook usage)

  const tempColor =
    gpu && gpu.temperatureC > 85
      ? "text-red-400"
      : gpu && gpu.temperatureC > 70
      ? "text-amber-400"
      : "text-emerald-400";

  const hasTemp = gpu && gpu.temperatureC > 0;
  const hasVram = gpu && gpu.memTotalMb > 0;

  return (
    <div className="h-screen bg-transparent overflow-hidden flex items-start justify-start">
      <div className="m-1 bg-black/85 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden shadow-2xl w-full">
        {/* Drag handle */}
        <div
          className="flex items-center justify-between px-3 py-1.5 bg-white/5 cursor-grab active:cursor-grabbing select-none"
          onMouseDown={() => startDrag()}
          onMouseUp={() => saveOverlayPosition()}
        >
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold tracking-[0.15em] text-primary uppercase">
              WinOpt Gaming
            </span>
            {gpu?.vendor && gpu.vendor !== "Unknown" && (
              <span className={`text-[8px] font-bold uppercase tracking-wider ${vendorBadgeColor(gpu.vendor)}`}>
                {gpu.vendor}
              </span>
            )}
          </div>
          <button
            onClick={closeOverlay}
            aria-label="Close overlay"
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
        <div className="px-2 py-2 flex gap-1.5 flex-wrap items-center">
          {fps !== null && (
            <MetricPill
              label="FPS"
              value={`${fps.toFixed(0)}`}
              color="text-fuchsia-400 font-black text-[15px]"
            />
          )}
          
          <MetricPill
            label="CPU"
            value={cpuLoad != null ? `${cpuLoad.toFixed(0)}%` : "—"}
            color="text-sky-400"
          />

          {gpu?.isSupported ? (
            <>
              <MetricPill
                label="GPU"
                value={`${gpu.gpuUtilPct.toFixed(0)}%`}
                color="text-primary"
              />
              {hasTemp && (
                <MetricPill
                  label="TEMP"
                  value={`${gpu.temperatureC.toFixed(0)}°C`}
                  color={tempColor}
                />
              )}
              {/* Power: NVIDIA only (no universal API) */}
              {gpu.isNvidia && gpu.powerDrawW > 0 && (
                <MetricPill
                  label="POWER"
                  value={`${gpu.powerDrawW.toFixed(0)}W`}
                  color="text-amber-400"
                />
              )}
              {hasVram && (
                <MetricPill
                  label="VRAM"
                  value={
                    gpu.memUsedMb >= 1024
                      ? `${(gpu.memUsedMb / 1024).toFixed(1)}G`
                      : `${gpu.memUsedMb}M`
                  }
                  color="text-violet-400"
                />
              )}
            </>
          ) : (
            <p className="text-[10px] text-white/40 px-1 self-center">
              {gpu?.name ?? "Reading GPU…"}
            </p>
          )}
        </div>

        {/* VRAM bar — works for all vendors */}
        {gpu?.isSupported && hasVram && (
          <div className="px-3 pb-2">
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min((gpu.memUsedMb / gpu.memTotalMb) * 100, 100)}%`,
                  background: vramBarColor(gpu.vendor),
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Hook for Overlay State (since the main useGaming triggers toasts & background tasks) ──
import { listen, UnlistenFn } from "@tauri-apps/api/event";

function useGamingOverlayState() {
  const [game, setGame] = useState<string | null>(null);
  const [gpu, setGpu] = useState<GpuMetrics | null>(null);
  const [cpuLoad, setCpuLoad] = useState<number | null>(null);
  const [fps, setFps] = useState<number | null>(null);

  useEffect(() => {
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
    restoreOverlayPosition();
    return () => {
      document.documentElement.style.background = "";
      document.body.style.background = "";
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!isTauri()) {
      setGame(null);
      setGpu(null);
      setCpuLoad(null);
      setFps(null);
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
      // ignore
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 3000);
    return () => clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    if (!isTauri()) return;
    let unlisten: UnlistenFn | undefined;
    listen<number>("fps-update", (event) => {
      setFps(event.payload < 0 ? null : event.payload);
    }).then(fn => { unlisten = fn; });
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  return { game, gpu, cpuLoad, fps, closeOverlay };
}
