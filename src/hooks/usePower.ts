import { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useToast } from "../components/ToastSystem";

export interface PowerPlan {
    guid: string;
    name: string;
    is_active: boolean;
}

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export function usePower() {
    const [plans, setPlans] = useState<PowerPlan[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isChanging, setIsChanging] = useState(false);
    const { addToast } = useToast();

    const fetchPlans = useCallback(async () => {
        setIsLoading(true);
        try {
            if (!isTauri) {
                await new Promise(r => setTimeout(r, 800));
                setPlans([
                    { guid: "381b4222-f694-41f0-9685-ff5bb260df2e", name: "Balanced", is_active: false },
                    { guid: "8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c", name: "High performance", is_active: true },
                    { guid: "a1841308-3541-4fab-bc81-f71556f20b4a", name: "Power saver", is_active: false }
                ]);
                return;
            }
            const result = await invoke<PowerPlan[]>("get_power_plans");
            setPlans(result);
        } catch (error) {
            console.error("Failed to fetch power plans:", error);
            addToast({ type: "error", title: "Power Config Error", message: String(error) });
        } finally {
            setIsLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        fetchPlans();
    }, [fetchPlans]);

    const setActivePlan = async (guid: string) => {
        setIsChanging(true);
        try {
            if (!isTauri) {
                await new Promise(r => setTimeout(r, 600));
                setPlans(prev => prev.map(p => ({ ...p, is_active: p.guid === guid })));
                addToast({ type: "success", title: "Power Profile Applied", message: "Your system's active power plan has been updated." });
                return true;
            }
            await invoke("set_active_power_plan", { guid });
            await fetchPlans();
            addToast({ type: "success", title: "Power Profile Applied", message: "Your system's active power plan has been updated." });
            return true;
        } catch (error) {
            console.error("Failed to set power plan:", error);
            addToast({ type: "error", title: "Failed to apply power profile", message: String(error) });
            return false;
        } finally {
            setIsChanging(false);
        }
    };

    return {
        plans,
        isLoading,
        isChanging,
        fetchPlans,
        setActivePlan
    };
}
