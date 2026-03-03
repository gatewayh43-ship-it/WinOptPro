import { useState, useCallback, useEffect } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { useToast } from "../components/ToastSystem";
import { useGlobalCache } from "./useGlobalCache";

export interface ProcessItem {
    pid: number;
    name: string;
    cpu_usage: number;
    memory_bytes: number;
    disk_read_bytes: number;
    disk_written_bytes: number;
    user: string;
}

export function useProcesses() {
    const cached = useGlobalCache.getState().getCacheObject("processes");
    const [processes, setProcesses] = useState<ProcessItem[]>(() => cached || []);
    const [isLoading, setIsLoading] = useState(() => !cached);
    const [error, setError] = useState<string | null>(null);
    const { addToast } = useToast();

    const fetchProcesses = useCallback(async (force = false) => {
        if (!force) {
            const cached = useGlobalCache.getState().getCacheObject("processes");
            if (cached) {
                setProcesses(cached);
                setIsLoading(false);
                return;
            }
        }

        if (!isTauri()) { setIsLoading(false); return; }

        try {
            const data = await invoke<ProcessItem[]>("get_processes");
            setProcesses(data);
            useGlobalCache.getState().setCacheObject("processes", data);
            setError(null);
        } catch (err) {
            console.error("Failed to fetch processes:", err);
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Initial fetch
    useEffect(() => {
        fetchProcesses();

        // Setup polling every 3 seconds to keep metrics updated
        const interval = setInterval(fetchProcesses, 3000);
        return () => clearInterval(interval);
    }, [fetchProcesses]);

    const killProcess = async (pid: number, name: string) => {
        try {
            await invoke("kill_process", { pid });
            addToast({
                type: "success",
                title: "Process Terminated",
                message: `Successfully closed ${name} (PID: ${pid}).`
            });
            // Instantly refresh list to show it's gone
            await fetchProcesses();
            return true;
        } catch (err) {
            console.error("Failed to kill process:", err);
            addToast({
                type: "error",
                title: "Access Denied",
                message: err instanceof Error ? err.message : String(err)
            });
            return false;
        }
    };

    const setProcessPriority = async (pid: number, priority: 'Realtime' | 'High' | 'AboveNormal' | 'Normal' | 'BelowNormal' | 'Idle') => {
        try {
            await invoke("set_process_priority", { pid, priority });
            addToast({
                type: "success",
                title: "Priority Updated",
                message: `Set priority to ${priority} for PID: ${pid}.`
            });
            return true;
        } catch (err) {
            console.error("Failed to set priority:", err);
            addToast({
                type: "error",
                title: "Access Denied",
                message: err instanceof Error ? err.message : String(err)
            });
            return false;
        }
    };

    const openFileLocation = async (pid: number) => {
        try {
            await invoke("open_file_location", { pid });
            return true;
        } catch (err) {
            console.error("Failed to open file location:", err);
            addToast({
                type: "error",
                title: "Action Failed",
                message: err instanceof Error ? err.message : String(err)
            });
            return false;
        }
    };

    return { processes, isLoading, error, refresh: () => fetchProcesses(true), killProcess, setProcessPriority, openFileLocation };
}
