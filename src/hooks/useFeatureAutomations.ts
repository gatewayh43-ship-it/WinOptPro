import { useCallback, useEffect, useRef, useState } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { useToast } from "@/components/ToastSystem";

export type AutomationFrequency = "DAILY" | "WEEKLY" | "MONTHLY";

export interface FeatureAutomationPreset {
    id: string;
    label: string;
    category: string;
    description: string;
    defaultFrequency: AutomationFrequency;
    requiresAdmin: boolean;
    risk: string;
}

export interface FeatureAutomationConfig {
    id: string;
    enabled: boolean;
    frequency: AutomationFrequency;
    time: string;
}

export interface FeatureAutomationState {
    preset: FeatureAutomationPreset;
    config?: FeatureAutomationConfig | null;
    task?: {
        id: string;
        name: string;
        schedule: string;
        last_run: string;
        next_run: string;
        enabled: boolean;
    } | null;
}

export function useFeatureAutomations() {
    const [automations, setAutomations] = useState<FeatureAutomationState[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [workingIds, setWorkingIds] = useState<Record<string, boolean>>({});
    const { addToast } = useToast();
    const didInitialFetch = useRef(false);

    const fetchAutomations = useCallback(async () => {
        setIsLoading(true);
        try {
            if (!isTauri()) {
                setAutomations([]);
                return [];
            }
            const result = await invoke<FeatureAutomationState[]>("list_feature_automations");
            setAutomations(result);
            return result;
        } catch (error) {
            addToast({ type: "error", title: "Failed to load automations", message: String(error) });
            return [];
        } finally {
            setIsLoading(false);
        }
    }, [addToast]);

    const setWorking = (id: string, value: boolean) => {
        setWorkingIds((prev) => ({ ...prev, [id]: value }));
    };

    const configureAutomation = useCallback(
        async (config: FeatureAutomationConfig) => {
            setWorking(config.id, true);
            try {
                if (!isTauri()) return false;
                await invoke("configure_feature_automation", { config });
                await fetchAutomations();
                addToast({
                    type: config.enabled ? "success" : "info",
                    title: config.enabled ? "Automation scheduled" : "Automation saved disabled",
                    message: `${config.id} · ${config.frequency.toLowerCase()} at ${config.time}`,
                });
                return true;
            } catch (error) {
                addToast({ type: "error", title: "Failed to save automation", message: String(error) });
                return false;
            } finally {
                setWorking(config.id, false);
            }
        },
        [addToast, fetchAutomations]
    );

    const deleteAutomation = useCallback(
        async (id: string) => {
            setWorking(id, true);
            try {
                if (!isTauri()) return false;
                await invoke("delete_feature_automation", { id });
                await fetchAutomations();
                addToast({ type: "success", title: "Automation removed" });
                return true;
            } catch (error) {
                addToast({ type: "error", title: "Failed to remove automation", message: String(error) });
                return false;
            } finally {
                setWorking(id, false);
            }
        },
        [addToast, fetchAutomations]
    );

    const runAutomationNow = useCallback(
        async (id: string) => {
            setWorking(id, true);
            try {
                if (!isTauri()) return false;
                await invoke("run_feature_automation_now", { id });
                addToast({ type: "success", title: "Automation started" });
                return true;
            } catch (error) {
                addToast({ type: "error", title: "Failed to run automation", message: String(error) });
                return false;
            } finally {
                setWorking(id, false);
            }
        },
        [addToast]
    );

    useEffect(() => {
        if (didInitialFetch.current) return;
        didInitialFetch.current = true;
        fetchAutomations();
    }, [fetchAutomations]);

    return {
        automations,
        isLoading,
        workingIds,
        fetchAutomations,
        configureAutomation,
        deleteAutomation,
        runAutomationNow,
    };
}
