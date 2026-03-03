import { useState, useCallback, useEffect } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { useToast } from "../components/ToastSystem";
import { useGlobalCache } from "./useGlobalCache";

export interface StartupItem {
    id: string;
    name: string;
    command: string;
    location: string;
    enabled: boolean;
}

export function useStartupItems() {
    const cached = useGlobalCache.getState().getCacheObject("startup_items");
    const [items, setItems] = useState<StartupItem[]>(() => cached || []);
    const [isLoading, setIsLoading] = useState(() => !cached);
    const [error, setError] = useState<string | null>(null);
    const { addToast } = useToast();

    const fetchItems = useCallback(async (force = false) => {
        if (!force) {
            const cached = useGlobalCache.getState().getCacheObject("startup_items");
            if (cached && cached.length > 0) {
                setItems(cached);
                setIsLoading(false);
                return;
            }
        }

        if (!isTauri()) { setItems([]); setIsLoading(false); return; }
        setIsLoading(true);
        setError(null);
        try {
            const data = await invoke<StartupItem[]>("get_startup_items");
            setItems(data);
            useGlobalCache.getState().setCacheObject("startup_items", data);
        } catch (err) {
            console.error("Failed to fetch startup items:", err);
            setError(err instanceof Error ? err.message : String(err));
            addToast({ type: "error", title: "Failed to load startup items" });
        } finally {
            setIsLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    const toggleItem = async (id: string, currentlyEnabled: boolean) => {
        try {
            await invoke("set_startup_item_state", {
                id,
                enabled: !currentlyEnabled,
            });
            // Optimistically update
            setItems(prev =>
                prev.map(i => (i.id === id ? { ...i, enabled: !currentlyEnabled } : i))
            );
            addToast({
                type: "success",
                title: `Startup item ${!currentlyEnabled ? "enabled" : "disabled"}`,
            });
        } catch (err) {
            console.error("Failed to toggle startup item:", err);
            addToast({ type: "error", title: "Failed to update startup item" });
            // Re-fetch to ensure sync
            fetchItems();
        }
    };

    return { items, isLoading, error, refresh: () => fetchItems(true), toggleItem };
}
