import { useState, useCallback } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { useToast } from "../components/ToastSystem";
import { useGlobalCache } from "./useGlobalCache";

export interface DriverInfo {
    device_name: string;
    inf_name: string;
    provider: string;
    version: string;
    date: string;
    device_class: string;
    is_signed: boolean;
}

export function useDrivers() {
    // Check initial cache synchronously to immediately render
    const [drivers, setDrivers] = useState<DriverInfo[]>(() => useGlobalCache.getState().getCacheObject("drivers") || []);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [driverUpdateStatus, setDriverUpdateStatus] = useState<string | null>(null);
    const [isScanningUpdates, setIsScanningUpdates] = useState(false);
    const [isOpeningUpdates, setIsOpeningUpdates] = useState(false);
    const [filter, setFilter] = useState<"all" | "signed" | "unsigned">("all");
    const { addToast } = useToast();

    const fetchDrivers = useCallback(async (force = false) => {
        // Return instantly if cache exists and not forced
        if (!force) {
            const cached = useGlobalCache.getState().getCacheObject("drivers");
            if (Array.isArray(cached) && cached.length > 0) {
                setDrivers(cached);
                setIsLoading(false);
                return;
            }
        }

        setIsLoading(true);
        setError(null);
        try {
            if (!isTauri()) {
                setDrivers([]);
                setError("Driver inventory requires the WinOpt Pro desktop runtime.");
                return;
            }
            const result = await invoke<DriverInfo[]>("list_drivers");
            setDrivers(result);
            useGlobalCache.getState().setCacheObject("drivers", result);
        } catch (err) {
            const msg = String(err);
            setError(msg);
            addToast({ type: "error", title: "Failed to list drivers", message: msg });
        } finally {
            setIsLoading(false);
        }
    }, [addToast]);

    const exportList = useCallback(async (path: string) => {
        try {
            if (!isTauri()) {
                addToast({ type: "error", title: "Desktop runtime required", message: "Driver export is only available in the WinOpt Pro desktop app." });
                return false;
            }
            await invoke("export_driver_list", { path });
            addToast({ type: "success", title: "Driver List Exported", message: `Saved to ${path} ` });
            return true;
        } catch (err) {
            addToast({ type: "error", title: "Export Failed", message: String(err) });
            return false;
        }
    }, [addToast]);

    const scanDriverUpdates = useCallback(async () => {
        if (!isTauri()) {
            const message = "Driver update scanning is only available in the WinOpt Pro desktop app.";
            setDriverUpdateStatus(message);
            addToast({ type: "error", title: "Desktop runtime required", message });
            return false;
        }

        setIsScanningUpdates(true);
        setDriverUpdateStatus(null);
        try {
            const message = await invoke<string>("scan_driver_updates");
            setDriverUpdateStatus(message);
            addToast({ type: "success", title: "Driver scan started", message });
            return true;
        } catch (err) {
            const message = String(err);
            setDriverUpdateStatus(message);
            addToast({ type: "error", title: "Driver scan failed", message });
            return false;
        } finally {
            setIsScanningUpdates(false);
        }
    }, [addToast]);

    const openDriverUpdates = useCallback(async () => {
        if (!isTauri()) {
            const message = "Driver updates are only available in the WinOpt Pro desktop app.";
            setDriverUpdateStatus(message);
            addToast({ type: "error", title: "Desktop runtime required", message });
            return false;
        }

        setIsOpeningUpdates(true);
        try {
            await invoke("open_driver_updates_settings");
            setDriverUpdateStatus("Opened Windows Optional Updates. Install available driver updates from that Windows page.");
            return true;
        } catch (err) {
            const message = String(err);
            setDriverUpdateStatus(message);
            addToast({ type: "error", title: "Could not open Driver Updates", message });
            return false;
        } finally {
            setIsOpeningUpdates(false);
        }
    }, [addToast]);

    const filteredDrivers = drivers.filter(d => {
        if (filter === "signed") return d.is_signed;
        if (filter === "unsigned") return !d.is_signed;
        return true;
    });

    const unsignedCount = drivers.filter(d => !d.is_signed).length;

    return {
        drivers: filteredDrivers,
        allDrivers: drivers,
        isLoading,
        error,
        filter,
        setFilter,
        fetchDrivers,
        exportList,
        unsignedCount,
        driverUpdateStatus,
        isScanningUpdates,
        isOpeningUpdates,
        scanDriverUpdates,
        openDriverUpdates,
    };
}
