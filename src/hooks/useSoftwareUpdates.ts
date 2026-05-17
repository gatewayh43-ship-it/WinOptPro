import { useCallback, useState } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";

export type ReleaseChannel = "stable" | "beta";

export interface SoftwareUpdateItem {
    name: string;
    packageId: string;
    currentVersion: string;
    availableVersion: string;
    source: string;
    betaPackageId?: string | null;
}

export interface SoftwareUpdateResult {
    success: boolean;
    method: string;
    packageId: string;
    targetPackageId: string;
    channel: ReleaseChannel;
    output: string;
    error: string;
}

export type UpdateAutomationFrequency = "DAILY" | "WEEKLY" | "MONTHLY";
export type UpdateAutomationScope = "all" | "selected";

export interface SoftwareUpdateAutomationPackage {
    packageId: string;
    betaPackageId?: string | null;
}

export interface SoftwareUpdateAutomationSettings {
    enabled: boolean;
    frequency: UpdateAutomationFrequency;
    time: string;
    channel: ReleaseChannel;
    scope: UpdateAutomationScope;
    includePinned: boolean;
    allowReboot: boolean;
    packages: SoftwareUpdateAutomationPackage[];
}

export interface SoftwareUpdateAutomationState {
    settings: SoftwareUpdateAutomationSettings;
    task?: {
        id: string;
        name: string;
        schedule: string;
        last_run: string;
        next_run: string;
        enabled: boolean;
    } | null;
}

export function useSoftwareUpdates() {
    const [updates, setUpdates] = useState<SoftwareUpdateItem[]>([]);
    const [isScanning, setIsScanning] = useState(false);
    const [scanError, setScanError] = useState<string | null>(null);
    const [updatingIds, setUpdatingIds] = useState<Record<string, boolean>>({});
    const [updateResults, setUpdateResults] = useState<Record<string, SoftwareUpdateResult>>({});
    const [automation, setAutomation] = useState<SoftwareUpdateAutomationState | null>(null);
    const [isLoadingAutomation, setIsLoadingAutomation] = useState(false);
    const [isSavingAutomation, setIsSavingAutomation] = useState(false);

    const scanUpdates = useCallback(async () => {
        if (!isTauri()) {
            setUpdates([]);
            setScanError("Software update scanning is only available in the desktop app.");
            return [];
        }

        setIsScanning(true);
        setScanError(null);
        try {
            const result = await invoke<SoftwareUpdateItem[]>("scan_software_updates");
            setUpdates(result);
            return result;
        } catch (error) {
            const message = String(error);
            setScanError(message);
            setUpdates([]);
            return [];
        } finally {
            setIsScanning(false);
        }
    }, []);

    const updatePackage = useCallback(
        async (item: SoftwareUpdateItem, channel: ReleaseChannel = "stable") => {
            if (!isTauri()) {
                const result: SoftwareUpdateResult = {
                    success: false,
                    method: "none",
                    packageId: item.packageId,
                    targetPackageId: item.packageId,
                    channel,
                    output: "",
                    error: "Software updates are only available in the desktop app.",
                };
                setUpdateResults((prev) => ({ ...prev, [item.packageId]: result }));
                return result;
            }

            setUpdatingIds((prev) => ({ ...prev, [item.packageId]: true }));
            try {
                const result = await invoke<SoftwareUpdateResult>("update_software_package", {
                    packageId: item.packageId,
                    channel,
                    betaPackageId: item.betaPackageId ?? null,
                });
                setUpdateResults((prev) => ({ ...prev, [item.packageId]: result }));
                if (result.success) {
                    setUpdates((prev) => prev.filter((candidate) => candidate.packageId !== item.packageId));
                }
                return result;
            } catch (error) {
                const result: SoftwareUpdateResult = {
                    success: false,
                    method: "winget",
                    packageId: item.packageId,
                    targetPackageId: channel === "beta" && item.betaPackageId ? item.betaPackageId : item.packageId,
                    channel,
                    output: "",
                    error: String(error),
                };
                setUpdateResults((prev) => ({ ...prev, [item.packageId]: result }));
                return result;
            } finally {
                setUpdatingIds((prev) => ({ ...prev, [item.packageId]: false }));
            }
        },
        []
    );

    const loadAutomation = useCallback(async () => {
        if (!isTauri()) return null;

        setIsLoadingAutomation(true);
        try {
            const result = await invoke<SoftwareUpdateAutomationState | null>("get_software_update_automation");
            setAutomation(result);
            return result;
        } catch {
            setAutomation(null);
            return null;
        } finally {
            setIsLoadingAutomation(false);
        }
    }, []);

    const saveAutomation = useCallback(async (settings: SoftwareUpdateAutomationSettings) => {
        if (!isTauri()) return false;

        setIsSavingAutomation(true);
        try {
            await invoke("configure_software_update_automation", { settings });
            await loadAutomation();
            return true;
        } catch (error) {
            throw error;
        } finally {
            setIsSavingAutomation(false);
        }
    }, [loadAutomation]);

    const deleteAutomation = useCallback(async () => {
        if (!isTauri()) return false;

        setIsSavingAutomation(true);
        try {
            await invoke("delete_software_update_automation");
            setAutomation(null);
            return true;
        } finally {
            setIsSavingAutomation(false);
        }
    }, []);

    return {
        updates,
        isScanning,
        scanError,
        updatingIds,
        updateResults,
        automation,
        isLoadingAutomation,
        isSavingAutomation,
        scanUpdates,
        updatePackage,
        loadAutomation,
        saveAutomation,
        deleteAutomation,
    };
}
