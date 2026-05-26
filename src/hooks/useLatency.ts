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

export function useLatency() {
  const [status, setStatus] = useState<LatencyStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFlushing, setIsFlushing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  const fetchStatus = useCallback(async () => {
    if (!isTauri()) {
      setStatus(null);
      setError("Latency diagnostics require the WinOpt Pro desktop runtime.");
      setIsLoading(false);
      return;
    }
    try {
      const s = await invoke<LatencyStatus>("get_latency_status");
      setStatus(s);
      setError(null);
    } catch (e) {
      // Only toast on the first failure to avoid flooding on repeated poll errors
      setError(prev => {
        if (!prev) addToast({ type: "error", title: "Failed to load latency status", message: String(e) });
        return String(e);
      });
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  const flushStandby = useCallback(async () => {
    if (!isTauri()) {
      addToast({ type: "error", title: "Desktop runtime required", message: "Standby memory flushing is only available in the WinOpt Pro desktop app." });
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
        message: `${String(e)} — run WinOpt Pro as Administrator.`,
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
