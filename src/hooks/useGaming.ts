import { useState, useEffect, useCallback, useRef } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
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
  vendor: string;       // "NVIDIA", "AMD", "Intel", "Unknown"
  isSupported: boolean; // true when real metrics are available
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

export function useGaming() {
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [gpuMetrics, setGpuMetrics] = useState<GpuMetrics | null>(null);
  const [cpuLoad, setCpuLoad] = useState<number | null>(null);
  const [fps, setFps] = useState<number | null>(null);
  const [presentMonStatus, setPresentMonStatus] = useState<{installed: boolean; path: string | null}>({ installed: false, path: null });
  
  const [isOverlayVisible, setIsOverlayVisible] = useState(false);
  const [isLoadingGpu, setIsLoadingGpu] = useState(true);
  const [isSettingLimit, setIsSettingLimit] = useState(false);
  const [isDownloadingPm, setIsDownloadingPm] = useState(false);

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
      setGpuMetrics(null);
      setCpuLoad(null);
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
      setActiveGame(null);
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

  const checkPresentMon = useCallback(async () => {
    if (!isTauri()) return;
    try {
      const status = await invoke<{installed: boolean; path: string | null}>("check_presentmon");
      setPresentMonStatus(status);
    } catch {
      // ignore
    }
  }, []);

  const downloadPresentMon = useCallback(async () => {
    if (!isTauri()) {
      addToast({ type: "error", title: "Desktop runtime required", message: "PresentMon setup is only available in the WinOpt Pro desktop app." });
      return;
    }
    setIsDownloadingPm(true);
    try {
      const path = await invoke<string>("download_presentmon");
      setPresentMonStatus({ installed: true, path });
      addToast({ type: "success", title: "Ready", message: "FPS counter is ready to use." });
    } catch (e) {
      addToast({ type: "error", title: "Download Failed", message: String(e) });
    } finally {
      setIsDownloadingPm(false);
    }
  }, [addToast]);

  const toggleFpsCounter = useCallback(async (start: boolean) => {
    if (!isTauri()) return;
    try {
      if (start && activeGame) {
        await invoke("start_fps_counter", { processName: activeGame });
      } else {
        await invoke("stop_fps_counter");
        setFps(null);
      }
    } catch (e) {
      addToast({ type: "error", title: "FPS Target", message: String(e) });
    }
  }, [activeGame, addToast]);

  // Restart FPS counter if active game changes while it's running
  useEffect(() => {
    if (!isTauri() || !activeGame || !presentMonStatus.installed) return;
    if (fps !== null) {
      // If FPS is currently active but the game changed, restart targeting new game
      if (prevGameRef.current !== activeGame) {
        invoke("start_fps_counter", { processName: activeGame }).catch(() => {});
      }
    }
  }, [activeGame, presentMonStatus.installed, fps]);

  // Listen for FPS updates from Rust
  useEffect(() => {
    if (!isTauri()) return;
    let unlisten: UnlistenFn | undefined;
    listen<number>("fps-update", (event) => {
      if (event.payload < 0) {
        setFps(null); // Backend signaled stop
      } else {
        setFps(event.payload);
      }
    }).then(fn => { unlisten = fn; });
    
    return () => {
      if (unlisten) unlisten();
      invoke("stop_fps_counter").catch(() => {});
    };
  }, []);

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
        addToast({ type: "error", title: "Desktop runtime required", message: `GPU power limit changes require the WinOpt Pro desktop app.` });
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
    checkPresentMon();
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
    fps,
    isOverlayVisible,
    isLoadingGpu,
    isSettingLimit,
    autoOptimize,
    baseline,
    presentMonStatus,
    isDownloadingPm,
    setAutoOptimize,
    captureBaseline,
    setGpuPowerLimit,
    showOverlay,
    hideOverlay,
    downloadPresentMon,
    toggleFpsCounter,
  };
}
