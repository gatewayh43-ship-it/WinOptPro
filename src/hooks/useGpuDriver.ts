import { useState, useCallback, useEffect } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { useToast } from "@/components/ToastSystem";

export interface GpuDriverInfo {
    vendor: string;      // "NVIDIA" | "AMD" | "Intel" | "Unknown"
    name: string;
    version: string;
    date: string;
    pnpId: string;
    infName: string;
}

export interface DriverRemovalResult {
    success: boolean;
    vendor: string;
    removedPackages: string[];
    log: string[];
    requiresReboot: boolean;
}

export function useGpuDriver() {
    const [drivers, setDrivers] = useState<GpuDriverInfo[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isRemoving, setIsRemoving] = useState(false);
    const [removalResult, setRemovalResult] = useState<DriverRemovalResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const { addToast } = useToast();

    const fetchDrivers = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        if (!isTauri()) {
            setDrivers([]);
            setError("GPU driver inventory requires the WinOpt Pro desktop runtime.");
            setIsLoading(false);
            return;
        }
        try {
            const data = await invoke<GpuDriverInfo[]>("get_gpu_drivers");
            setDrivers(data ?? []);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            setError(msg);
            addToast({ type: "error", title: "GPU Driver Error", message: `Failed to fetch GPU drivers: ${msg}` });
        } finally {
            setIsLoading(false);
        }
    }, [addToast]);

    const uninstallDrivers = useCallback(async (vendor: string, deleteDriverStore: boolean) => {
        setIsRemoving(true);
        setRemovalResult(null);
        if (!isTauri()) {
            setError("GPU driver removal requires the WinOpt Pro desktop runtime.");
            setIsRemoving(false);
            addToast({ type: "error", title: "Desktop runtime required", message: `GPU driver removal for ${vendor} requires the WinOpt Pro desktop app.` });
            return;
        }
        try {
            const result = await invoke<DriverRemovalResult>("uninstall_gpu_drivers", {
                vendor,
                deleteDriverStore,
            });
            setRemovalResult(result);
            if (result.success) {
                addToast({ type: "success", title: "GPU Drivers Removed", message: `${vendor} drivers removed. Reboot required.` });
            } else {
                addToast({ type: "error", title: "Removal Failed", message: `Driver removal failed for ${vendor}.` });
            }
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            setError(msg);
            addToast({ type: "error", title: "Uninstall Error", message: `Uninstall error: ${msg}` });
        } finally {
            setIsRemoving(false);
        }
    }, [addToast]);

    const scheduleBootRemoval = useCallback(async (vendor: string) => {
        if (!isTauri()) {
            addToast({ type: "error", title: "Desktop runtime required", message: `Safe Mode removal scheduling for ${vendor} requires the WinOpt Pro desktop app.` });
            return;
        }
        try {
            await invoke<boolean>("schedule_safe_mode_removal", { vendor });
            addToast({ type: "success", title: "Safe Mode Scheduled", message: `Safe Mode removal scheduled for ${vendor}. Reboot to apply.` });
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            addToast({ type: "error", title: "Schedule Failed", message: `Schedule failed: ${msg}` });
        }
    }, [addToast]);

    const rebootSystem = useCallback(async () => {
        if (!isTauri()) {
            addToast({ type: "error", title: "Desktop runtime required", message: "System reboot requires the WinOpt Pro desktop app." });
            return;
        }
        try {
            await invoke<boolean>("reboot_system");
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            addToast({ type: "error", title: "Reboot Failed", message: `Reboot failed: ${msg}` });
        }
    }, [addToast]);

    useEffect(() => {
        fetchDrivers();
    }, [fetchDrivers]);

    return {
        drivers,
        isLoading,
        isRemoving,
        removalResult,
        error,
        fetchDrivers,
        uninstallDrivers,
        scheduleBootRemoval,
        rebootSystem,
    };
}
