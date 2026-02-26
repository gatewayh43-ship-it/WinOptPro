import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore, type SystemVitals } from "../store/appStore";

/**
 * Polls `get_system_vitals` from the Rust backend at a configurable interval.
 * Stores results in the Zustand store.
 */
export function useSystemVitals() {
    const setVitals = useAppStore((s) => s.setSystemVitals);
    const autoRefresh = useAppStore((s) => s.userSettings.autoRefreshVitals);
    const interval = useAppStore((s) => s.userSettings.autoRefreshIntervalMs);
    const vitals = useAppStore((s) => s.systemVitals);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchVitals = async () => {
        try {
            const data = await invoke<SystemVitals>("get_system_vitals");
            setVitals(data);
        } catch (err) {
            console.error("Failed to fetch system vitals:", err);
        }
    };

    useEffect(() => {
        // Fetch immediately on mount
        fetchVitals();

        if (autoRefresh) {
            timerRef.current = setInterval(fetchVitals, interval);
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [autoRefresh, interval]);

    return { vitals, refresh: fetchVitals };
}
