import { useState, useCallback, useEffect } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { useToast } from "../components/ToastSystem";
import { useGlobalCache } from "./useGlobalCache";

export interface CleanupItem {
    id: string;
    category: string;
    path: string;
    size_bytes: number;
    description: string;
}

export interface CleanupResult {
    success: boolean;
    bytes_freed: number;
    items_removed: number;
    errors: string[];
}

export interface DiskHealth {
    name: string;
    status: string;
    media_type: string;
    health_status: string;
}

export function useStorage() {
    // Read from cache synchronously
    const cachedItems = useGlobalCache.getState().getCacheObject("storage_items");
    const cachedHealth = useGlobalCache.getState().getCacheObject("storage_health");

    const [items, setItems] = useState<CleanupItem[]>(() => cachedItems || []);
    const [diskHealth, setDiskHealth] = useState<DiskHealth[]>(() => cachedHealth || []);
    const [isScanning, setIsScanning] = useState(() => !cachedItems);
    const [isCleaning, setIsCleaning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { addToast } = useToast();

    const scan = useCallback(async (force = true) => {
        if (!force) {
            const cachedItems = useGlobalCache.getState().getCacheObject("storage_items");
            const cachedHealth = useGlobalCache.getState().getCacheObject("storage_health");
            if (cachedItems && cachedHealth) {
                setItems(cachedItems);
                setDiskHealth(cachedHealth);
                setIsScanning(false);
                return;
            }
        }

        setIsScanning(true);
        setError(null);
        try {
            if (!isTauri()) {
                useGlobalCache.getState().setCacheObject("storage_items", []);
                useGlobalCache.getState().setCacheObject("storage_health", []);
                setItems([]);
                setDiskHealth([]);
                setIsScanning(false);
                return;
            }
            const [data, healthData] = await Promise.all([
                invoke<CleanupItem[]>("scan_junk_files"),
                invoke<DiskHealth[]>("get_disk_health").catch(e => {
                    console.error("Failed to fetch disk health:", e);
                    return [];
                })
            ]);
            setItems(data);
            setDiskHealth(healthData);
            useGlobalCache.getState().setCacheObject("storage_items", data);
            useGlobalCache.getState().setCacheObject("storage_health", healthData);
        } catch (err) {
            console.error("Failed to scan junk files:", err);
            setError(err instanceof Error ? err.message : String(err));
            addToast({ type: "error", title: "Storage Scan Failed", message: "Could not analyze system directories." });
        } finally {
            setIsScanning(false);
        }
    }, [addToast]);

    useEffect(() => {
        scan(false);
    }, [scan]);

    const executeCleanup = async (itemIds: string[]) => {
        if (itemIds.length === 0) return;

        setIsCleaning(true);
        try {
            const result = await invoke<CleanupResult>("execute_cleanup", {
                itemIds,
            });

            const mbFreed = (result.bytes_freed / (1024 * 1024)).toFixed(1);

            if (result.items_removed > 0) {
                addToast({
                    type: "success",
                    title: "Cleanup Complete",
                    message: `Freed ${mbFreed} MB by removing ${result.items_removed} files.`,
                });
            } else {
                addToast({
                    type: "warning",
                    title: "Cleanup Skipped",
                    message: "No files were removed. Files might be locked by running processes.",
                });
            }

            if (result.errors.length > 0) {
                console.warn("Cleanup encountered locked files:", result.errors);
            }

            // Re-scan after cleanup to get accurate new sizes
            await scan(true);

        } catch (err) {
            console.error("Cleanup failed:", err);
            addToast({ type: "error", title: "Cleanup Failed", message: "An error occurred during deletion." });
            await scan(true);
        } finally {
            setIsCleaning(false);
        }
    };

    return { items, diskHealth, isScanning, isCleaning, error, scan, executeCleanup };
}
