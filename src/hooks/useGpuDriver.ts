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

const MOCK_DRIVERS: GpuDriverInfo[] = [
    {
        vendor: "NVIDIA",
        name: "NVIDIA GeForce RTX 4090",
        version: "31.0.15.4633",
        date: "2024-01-15",
        pnpId: "PCI\\VEN_10DE&DEV_2684&SUBSYS_40963842&REV_A1",
        infName: "oem42.inf",
    },
    {
        vendor: "Intel",
        name: "Intel(R) UHD Graphics 770",
        version: "31.0.101.5186",
        date: "2023-11-20",
        pnpId: "PCI\\VEN_8086&DEV_4680&SUBSYS_88721043&REV_0C",
        infName: "oem18.inf",
    },
];

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
            // Use mock data in browser/dev
            setTimeout(() => {
                setDrivers(MOCK_DRIVERS);
                setIsLoading(false);
            }, 600);
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
            setTimeout(() => {
                const mockResult: DriverRemovalResult = {
                    success: true,
                    vendor,
                    removedPackages: ["oem42.inf"],
                    log: [
                        `Starting ${vendor} driver removal...`,
                        "Found 1 driver package(s): oem42.inf",
                        "Removing driver package: oem42.inf",
                        "  ✓ Removed oem42.inf",
                        "Sweeping registry...",
                        `  ✓ Deleted HKLM\\SOFTWARE\\${vendor} Corporation`,
                        `${vendor} driver removal complete. Reboot required.`,
                    ],
                    requiresReboot: true,
                };
                setRemovalResult(mockResult);
                setIsRemoving(false);
                addToast({ type: "success", title: "GPU Drivers Removed", message: `${vendor} drivers removed. Reboot required.` });
            }, 1500);
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
            addToast({ type: "success", title: "Safe Mode Scheduled", message: `Safe Mode removal scheduled for ${vendor}. Reboot when ready.` });
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
            addToast({ type: "info", title: "Dev Mode", message: "Reboot simulation (dev mode)." });
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
