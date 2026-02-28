import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useToast } from "../components/ToastSystem";

export interface MaintenanceTask {
    id: string;
    name: string;
    schedule: string;
    last_run: string;
    next_run: string;
    enabled: boolean;
}

export const PREDEFINED_TASKS = [
    {
        name: "WeeklyTempCleanup",
        label: "Weekly Temp Cleanup",
        schedule: "WEEKLY",
        description: "Clears %TEMP%, Windows Temp, and Prefetch files every week.",
        action_cmd: "Remove-Item -Path $env:TEMP\\* -Recurse -Force -ErrorAction SilentlyContinue; Remove-Item -Path C:\\Windows\\Temp\\* -Recurse -Force -ErrorAction SilentlyContinue",
    },
    {
        name: "MonthlyDiskScan",
        label: "Monthly Disk Health Scan",
        schedule: "MONTHLY",
        description: "Runs a SMART disk health check and logs results monthly.",
        action_cmd: "Get-WmiObject -Class Win32_DiskDrive | ForEach-Object { $status = $_.Status; Add-Content -Path $env:TEMP\\winopt-disk-health.log -Value \"$(Get-Date) $($_.Model) Status:$status\" }",
    },
] as const;

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export function useScheduler() {
    const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isWorking, setIsWorking] = useState(false);
    const { addToast } = useToast();

    const fetchTasks = useCallback(async () => {
        setIsLoading(true);
        try {
            if (!isTauri) {
                setTasks([]);
                return;
            }
            const result = await invoke<MaintenanceTask[]>("list_maintenance_tasks");
            setTasks(result);
        } catch (err) {
            addToast({ type: "error", title: "Failed to load tasks", message: String(err) });
        } finally {
            setIsLoading(false);
        }
    }, [addToast]);

    const createTask = useCallback(async (name: string, schedule: string, actionCmd: string) => {
        setIsWorking(true);
        try {
            if (!isTauri) {
                addToast({ type: "info", title: "Preview Mode", message: "Task scheduling requires the desktop app." });
                return false;
            }
            await invoke("create_maintenance_task", { name, schedule, actionCmd });
            await fetchTasks();
            addToast({ type: "success", title: "Task Scheduled", message: `"${name}" will run ${schedule.toLowerCase()}.` });
            return true;
        } catch (err) {
            addToast({ type: "error", title: "Failed to create task", message: String(err) });
            return false;
        } finally {
            setIsWorking(false);
        }
    }, [fetchTasks, addToast]);

    const deleteTask = useCallback(async (name: string) => {
        setIsWorking(true);
        try {
            if (!isTauri) return false;
            await invoke("delete_maintenance_task", { name });
            setTasks(prev => prev.filter(t => t.name !== name));
            addToast({ type: "success", title: "Task Removed", message: `"${name}" has been deleted.` });
            return true;
        } catch (err) {
            addToast({ type: "error", title: "Failed to delete task", message: String(err) });
            return false;
        } finally {
            setIsWorking(false);
        }
    }, [addToast]);

    const runNow = useCallback(async (name: string) => {
        try {
            if (!isTauri) {
                addToast({ type: "info", title: "Preview Mode", message: "Running tasks requires the desktop app." });
                return false;
            }
            await invoke("run_maintenance_task_now", { name });
            addToast({ type: "success", title: "Task Started", message: `"${name}" is running.` });
            return true;
        } catch (err) {
            addToast({ type: "error", title: "Failed to run task", message: String(err) });
            return false;
        }
    }, [addToast]);

    return { tasks, isLoading, isWorking, fetchTasks, createTask, deleteTask, runNow };
}
