import { useState, useCallback } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";

export interface AppCheckResult {
    installed: boolean;
    method: string;
}

export interface AppInstallResult {
    success: boolean;
    method: string; // "winget" | "chocolatey" | "none"
    output: string;
    error: string;
}

export function useApps() {
    const [installingId, setInstallingId] = useState<string | null>(null);
    const [installResults, setInstallResults] = useState<
        Record<string, AppInstallResult>
    >({});
    const [installedApps, setInstalledApps] = useState<Record<string, boolean>>(
        {}
    );
    const [chocoAvailable, setChocoAvailable] = useState<boolean | null>(null);

    const checkChocoAvailable = useCallback(async () => {
        if (!isTauri()) { setChocoAvailable(false); return false; }
        try {
            const available = await invoke<boolean>("check_choco_available");
            setChocoAvailable(available);
            return available;
        } catch {
            setChocoAvailable(false);
            return false;
        }
    }, []);

    const checkInstalled = useCallback(async (wingetId: string, appId: string) => {
        if (!isTauri()) return false;
        try {
            const result = await invoke<AppCheckResult>("check_app_installed", {
                wingetId,
            });
            setInstalledApps((prev) => ({ ...prev, [appId]: result.installed }));
            return result.installed;
        } catch {
            return false;
        }
    }, []);

    const installApp = useCallback(
        async (wingetId: string, chocoId: string, appId: string) => {
            if (!isTauri()) return { success: false, method: "none", output: "", error: "Not running in Tauri" };
            setInstallingId(appId);
            try {
                const result = await invoke<AppInstallResult>("install_app", {
                    wingetId,
                    chocoId,
                });
                setInstallResults((prev) => ({ ...prev, [appId]: result }));
                if (result.success) {
                    setInstalledApps((prev) => ({ ...prev, [appId]: true }));
                }
                return result;
            } catch (e) {
                const errorResult: AppInstallResult = {
                    success: false,
                    method: "none",
                    output: "",
                    error: String(e),
                };
                setInstallResults((prev) => ({ ...prev, [appId]: errorResult }));
                return errorResult;
            } finally {
                setInstallingId(null);
            }
        },
        []
    );

    return {
        installingId,
        installResults,
        installedApps,
        chocoAvailable,
        checkChocoAvailable,
        checkInstalled,
        installApp,
    };
}
