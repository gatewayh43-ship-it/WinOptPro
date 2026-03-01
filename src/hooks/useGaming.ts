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
  const [isOverlayVisible, setIsOverlayVisible] = useState(false);
  const [isLoadingGpu, setIsLoadingGpu] = useState(true);
  const [isSettingLimit, setIsSettingLimit] = useState(false);
  const { addToast } = useToast();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchGpuMetrics = useCallback(async () => {
    if (!isTauri()) {
      setGpuMetrics(MOCK_GPU);
      return;
    }
    try {
      const metrics = await invoke<GpuMetrics>("get_gpu_metrics");
      setGpuMetrics(metrics);
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
    isOverlayVisible,
    isLoadingGpu,
    isSettingLimit,
    setGpuPowerLimit,
    showOverlay,
    hideOverlay,
  };
}
