import { useState, useEffect, useCallback } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { useToast } from "@/components/ToastSystem";

export interface LatencyStatus {
  timerResolution100ns: number;
  minResolution100ns: number;
  maxResolution100ns: number;
  standbyRamMb: number;
  dynamicTickDisabled: boolean;
  platformClockForced: boolean;
}

const MOCK_STATUS: LatencyStatus = {
  timerResolution100ns: 156_250,
  minResolution100ns: 156_250,
  maxResolution100ns: 5_000,
  standbyRamMb: 1024,
  dynamicTickDisabled: false,
  platformClockForced: false,
};

export function useLatency() {
  const [status, setStatus] = useState<LatencyStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFlushing, setIsFlushing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  const fetchStatus = useCallback(async () => {
    if (!isTauri()) {
      setStatus(MOCK_STATUS);
      setIsLoading(false);
      return;
    }
    try {
      const s = await invoke<LatencyStatus>("get_latency_status");
      setStatus(s);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const flushStandby = useCallback(async () => {
    if (!isTauri()) {
      addToast({ type: "info", title: "Mock", message: "Standby flush simulated." });
      return;
    }
    setIsFlushing(true);
    try {
      const freed = await invoke<number>("flush_standby_list");
      addToast({
        type: "success",
        title: "Standby flushed",
        message: `Freed ~${freed} MB from standby list.`,
      });
      await fetchStatus();
    } catch (e) {
      addToast({
        type: "error",
        title: "Flush failed",
        message: `${e} — run WinOpt Pro as Administrator.`,
      });
    } finally {
      setIsFlushing(false);
    }
  }, [addToast, fetchStatus]);

  // Initial load + polling every 5s
  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, 5000);
    return () => clearInterval(id);
  }, [fetchStatus]);

  return {
    status,
    isLoading,
    isFlushing,
    error,
    flushStandby,
    refresh: fetchStatus,
  };
}
