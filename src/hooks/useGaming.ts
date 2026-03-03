import { useState, useEffect, useCallback, useRef } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { useToast } from "@/components/ToastSystem";

export interface GpuMetrics {
  name: string;
  temperatureC: number;
  gpuUtilPct: number;
  memUtilPct: number;
  memUsedMb: number;
  memTotalMb: number;
  powerDrawW: number;
  powerLimitW: number;
  powerMaxLimitW: number;
  isNvidia: boolean;
}

export interface KnownGame {
  exe: string;
  name: string;
}

export interface GpuSnapshot {
  gpu: GpuMetrics;
  cpu: number;
  timestamp: number;
}

const GAMING_TWEAK_IDS = [
  "SystemResponsiveness",
  "GamePriority",
  "DisableDynamicTick",
  "EnableHWGPUScheduling",
  "DisableCoreParking",
  "DisableNetworkThrottling",
];

const MOCK_GPU: GpuMetrics = {
  name: "NVIDIA GeForce RTX 3080",
  temperatureC: 65,
  gpuUtilPct: 78,
  memUtilPct: 44,
  memUsedMb: 4506,
  memTotalMb: 10240,
  powerDrawW: 145.5,
  powerLimitW: 250,
  powerMaxLimitW: 320,
  isNvidia: true,
};

export function useGaming() {
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [gpuMetrics, setGpuMetrics] = useState<GpuMetrics | null>(null);
  const [cpuLoad, setCpuLoad] = useState<number | null>(null);
  const [isOverlayVisible, setIsOverlayVisible] = useState(false);
  const [isLoadingGpu, setIsLoadingGpu] = useState(true);
  const [isSettingLimit, setIsSettingLimit] = useState(false);
  const [autoOptimize, setAutoOptimizeState] = useState<boolean>(
    () => localStorage.getItem("gaming-auto-optimize") === "true"
  );
  const [baseline, setBaseline] = useState<GpuSnapshot | null>(() => {
    try {
      const raw = localStorage.getItem("gaming-baseline");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const { addToast } = useToast();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevGameRef = useRef<string | null>(null);

  const fetchGpuMetrics = useCallback(async () => {
    if (!isTauri()) {
      setGpuMetrics(MOCK_GPU);
      setCpuLoad(34);
      return;
    }
    try {
      const [metrics, cpu] = await Promise.all([
        invoke<GpuMetrics>("get_gpu_metrics"),
        invoke<number>("get_cpu_quick"),
      ]);
      setGpuMetrics(metrics);
      setCpuLoad(cpu);
    } catch {
      // silently ignore — nvidia-smi may not be present
    }
  }, []);

  const detectGame = useCallback(async () => {
    if (!isTauri()) {
      setActiveGame("Counter-Strike 2 (mock)");
      return;
    }
    try {
      const game = await invoke<string | null>("detect_active_game");
      setActiveGame(game);
    } catch {
      // ignore
    }
  }, []);

  const setAutoOptimize = useCallback((val: boolean) => {
    setAutoOptimizeState(val);
    localStorage.setItem("gaming-auto-optimize", String(val));
  }, []);

  const captureBaseline = useCallback(() => {
    if (!gpuMetrics || cpuLoad === null) return;
    const snap: GpuSnapshot = { gpu: gpuMetrics, cpu: cpuLoad, timestamp: Date.now() };
    setBaseline(snap);
    localStorage.setItem("gaming-baseline", JSON.stringify(snap));
    addToast({ type: "success", title: "Baseline captured", message: "Current GPU/CPU snapshot saved." });
  }, [gpuMetrics, cpuLoad, addToast]);

  // Auto-optimize: apply batch gaming tweaks when a game is detected
  useEffect(() => {
    if (!isTauri()) return;
    if (autoOptimize && activeGame !== null && prevGameRef.current === null) {
      invoke("execute_batch_tweaks", { tweakIds: GAMING_TWEAK_IDS }).catch(() => {});
      addToast({
        type: "info",
        title: "Auto-optimize applied",
        message: `Gaming tweaks applied for ${activeGame}`,
      });
    }
    prevGameRef.current = activeGame;
  }, [activeGame, autoOptimize, addToast]);

  const setGpuPowerLimit = useCallback(
    async (watts: number) => {
      if (!isTauri()) {
        addToast({ type: "info", title: "Mock", message: `Power limit: ${watts}W` });
        return;
      }
      setIsSettingLimit(true);
      try {
        const ok = await invoke<boolean>("set_gpu_power_limit", {
          gpuIndex: 0,
          watts,
        });
        if (ok) {
          addToast({ type: "success", title: "Power limit applied", message: `GPU limit set to ${watts}W` });
          await fetchGpuMetrics();
        } else {
          addToast({
            type: "error",
            title: "Failed",
            message: "Could not set power limit — run WinOpt Pro as Administrator.",
          });
        }
      } catch (e) {
        addToast({ type: "error", title: "Error", message: String(e) });
      } finally {
        setIsSettingLimit(false);
      }
    },
    [addToast, fetchGpuMetrics]
  );

  const showOverlay = useCallback(async () => {
    if (!isTauri()) {
      addToast({ type: "info", title: "Desktop only", message: "Overlay is only available in the desktop app." });
      return;
    }
    try {
      await invoke("show_gaming_overlay");
      setIsOverlayVisible(true);
    } catch (e) {
      addToast({ type: "error", title: "Error", message: String(e) });
    }
  }, [addToast]);

  const hideOverlay = useCallback(async () => {
    if (!isTauri()) return;
    try {
      await invoke("hide_gaming_overlay");
      setIsOverlayVisible(false);
    } catch {
      // ignore
    }
  }, []);

  // Keep isOverlayVisible in sync when user closes the overlay window directly
  useEffect(() => {
    if (!isTauri()) return;
    let unlisten: (() => void) | undefined;
    import("@tauri-apps/api/event").then(({ listen }) => {
      listen<void>("overlay-closed", () => {
        setIsOverlayVisible(false);
      }).then((fn) => {
        unlisten = fn;
      });
    });
    return () => {
      unlisten?.();
    };
  }, []);

  // Start polling on mount
  useEffect(() => {
    setIsLoadingGpu(true);
    Promise.all([fetchGpuMetrics(), detectGame()]).finally(() =>
      setIsLoadingGpu(false)
    );

    intervalRef.current = setInterval(() => {
      fetchGpuMetrics();
      detectGame();
    }, 4000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchGpuMetrics, detectGame]);

  return {
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
  };
}
