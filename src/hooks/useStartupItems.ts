import { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useToast } from "../components/ToastSystem";

export interface StartupItem {
    id: string;
    name: string;
    command: string;
    location: string;
    enabled: boolean;
}

export function useStartupItems() {
    const [items, setItems] = useState<StartupItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { addToast } = useToast();

    const fetchItems = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await invoke<StartupItem[]>("get_startup_items");
            setItems(data);
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

    return { items, isLoading, error, refresh: fetchItems, toggleItem };
}
