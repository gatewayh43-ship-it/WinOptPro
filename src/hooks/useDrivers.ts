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

const MOCK_DRIVERS: DriverInfo[] = [
    { device_name: "NVIDIA GeForce RTX 3080", inf_name: "nvlddmkm.inf", provider: "NVIDIA", version: "31.0.15.3623", date: "2024-01-15", device_class: "Display", is_signed: true },
    { device_name: "Intel(R) Wi-Fi 6 AX200", inf_name: "netwtw08.inf", provider: "Intel", version: "22.220.0.7", date: "2023-11-20", device_class: "Net", is_signed: true },
    { device_name: "Realtek High Definition Audio", inf_name: "hdxrtxs.inf", provider: "Realtek", version: "6.0.9305.1", date: "2023-08-10", device_class: "Media", is_signed: true },
    { device_name: "USB 3.0 eXtensible Host Controller", inf_name: "USBXHCI.INF", provider: "Microsoft", version: "10.0.22621.1", date: "2022-05-21", device_class: "USB", is_signed: true },
    { device_name: "Test Unsigned Driver", inf_name: "test.inf", provider: "Unknown", version: "1.0.0.0", date: "2021-01-01", device_class: "Unknown", is_signed: false },
];

export function useDrivers() {
    // Check initial cache synchronously to immediately render
    const [drivers, setDrivers] = useState<DriverInfo[]>(() => useGlobalCache.getState().getCacheObject("drivers") || []);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<"all" | "signed" | "unsigned">("all");
    const { addToast } = useToast();

    const fetchDrivers = useCallback(async (force = false) => {
        // Return instantly if cache exists and not forced
        if (!force) {
            const cached = useGlobalCache.getState().getCacheObject("drivers");
            if (cached) {
                setDrivers(cached);
                setIsLoading(false);
                return;
            }
        }

        setIsLoading(true);
        setError(null);
        try {
            if (!isTauri) {
                await new Promise(r => setTimeout(r, 1000));
                setDrivers(MOCK_DRIVERS);
                useGlobalCache.getState().setCacheObject("drivers", MOCK_DRIVERS);
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
            if (!isTauri) {
                addToast({ type: "info", title: "Export (Preview Mode)", message: "Export is only available in the desktop app." });
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

    const filteredDrivers = drivers.filter(d => {
        if (filter === "signed") return d.is_signed;
        if (filter === "unsigned") return !d.is_signed;
        return true;
    });

    const unsignedCount = drivers.filter(d => !d.is_signed).length;

    return { drivers: filteredDrivers, allDrivers: drivers, isLoading, error, filter, setFilter, fetchDrivers, exportList, unsignedCount };
}
