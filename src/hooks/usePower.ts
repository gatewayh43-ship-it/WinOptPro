import { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useToast } from "../components/ToastSystem";

export interface PowerPlan {
    guid: string;
    name: string;
    is_active: boolean;
}

export interface BatteryHealth {
    has_battery: boolean;
    charge_percent: number;
    is_charging: boolean;
    status: string;
}

export interface PowerSettings {
    cpu_min_ac: number;
    cpu_max_ac: number;
    display_timeout_ac: number;
    sleep_timeout_ac: number;
    cpu_min_dc: number;
    cpu_max_dc: number;
    display_timeout_dc: number;
    sleep_timeout_dc: number;
}

const PROC_SUB = "54533251-82be-4824-96c1-47b60b740d00";
const PROC_MIN = "893dee8e-2bef-41e0-89c6-b55d0929964c";
const PROC_MAX = "bc5038f7-23e0-4960-96da-33abaf5935ec";
const DISP_SUB = "7516b95f-f776-4464-8c53-06167f40cc99";
const DISP_OFF = "3c0bc021-c8a8-4e07-a973-6b14cbcb2b7e";
const SLEEP_SUB = "238c9fa8-0aad-41ed-83f4-97be242c8f20";
const SLEEP_TO = "29f6c1db-86da-48c5-9fdb-f2b67b1f44da";

export const POWER_SETTING_KEYS = {
    cpu_min_ac: { sub: PROC_SUB, setting: PROC_MIN, is_dc: false },
    cpu_max_ac: { sub: PROC_SUB, setting: PROC_MAX, is_dc: false },
    display_timeout_ac: { sub: DISP_SUB, setting: DISP_OFF, is_dc: false },
    sleep_timeout_ac: { sub: SLEEP_SUB, setting: SLEEP_TO, is_dc: false },
    cpu_min_dc: { sub: PROC_SUB, setting: PROC_MIN, is_dc: true },
    cpu_max_dc: { sub: PROC_SUB, setting: PROC_MAX, is_dc: true },
    display_timeout_dc: { sub: DISP_SUB, setting: DISP_OFF, is_dc: true },
    sleep_timeout_dc: { sub: SLEEP_SUB, setting: SLEEP_TO, is_dc: true },
} as const;

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export function usePower() {
    const [plans, setPlans] = useState<PowerPlan[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isChanging, setIsChanging] = useState(false);
    const [batteryHealth, setBatteryHealth] = useState<BatteryHealth | null>(null);
    const [powerSettings, setPowerSettings] = useState<PowerSettings | null>(null);
    const [isLoadingSettings, setIsLoadingSettings] = useState(false);
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

    const fetchBatteryHealth = useCallback(async () => {
        try {
            if (!isTauri) {
                setBatteryHealth({
                    has_battery: false,
                    charge_percent: 0,
                    is_charging: false,
                    status: "No battery detected"
                });
                return;
            }
            const result = await invoke<BatteryHealth>("get_battery_health");
            setBatteryHealth(result);
        } catch (error) {
            console.error("Failed to fetch battery health:", error);
        }
    }, []);

    const fetchPowerSettings = useCallback(async (guid: string) => {
        setIsLoadingSettings(true);
        try {
            if (!isTauri) {
                setPowerSettings({
                    cpu_min_ac: 5, cpu_max_ac: 100,
                    display_timeout_ac: 600, sleep_timeout_ac: 1800,
                    cpu_min_dc: 5, cpu_max_dc: 100,
                    display_timeout_dc: 300, sleep_timeout_dc: 900,
                });
                return;
            }
            const result = await invoke<PowerSettings>("get_power_settings", { guid });
            setPowerSettings(result);
        } catch (error) {
            console.error("Failed to fetch power settings:", error);
        } finally {
            setIsLoadingSettings(false);
        }
    }, []);

    const updatePowerSetting = useCallback(async (
        guid: string,
        key: keyof typeof POWER_SETTING_KEYS,
        value: number
    ) => {
        const { sub, setting, is_dc } = POWER_SETTING_KEYS[key];
        try {
            if (!isTauri) {
                setPowerSettings(prev => prev ? { ...prev, [key]: value } : prev);
                return true;
            }
            await invoke("set_power_setting", {
                guid,
                subGuid: sub,
                settingGuid: setting,
                value,
                isDc: is_dc,
            });
            setPowerSettings(prev => prev ? { ...prev, [key]: value } : prev);
            return true;
        } catch (error) {
            addToast({ type: "error", title: "Failed to update setting", message: String(error) });
            return false;
        }
    }, [addToast]);

    useEffect(() => {
        fetchPlans();
        fetchBatteryHealth();
    }, [fetchPlans, fetchBatteryHealth]);

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
        setActivePlan,
        batteryHealth,
        powerSettings,
        isLoadingSettings,
        fetchBatteryHealth,
        fetchPowerSettings,
        updatePowerSetting,
    };
}
