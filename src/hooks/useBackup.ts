import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useToast } from "../components/ToastSystem";
import { useAppStore } from "../store/appStore";

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
const LAST_BACKUP_KEY = "winopt_last_backup";

export function useBackup() {
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [lastBackupTime, setLastBackupTime] = useState<string | null>(
        () => localStorage.getItem(LAST_BACKUP_KEY)
    );
    const [importPath, setImportPath] = useState("");
    const { addToast } = useToast();
    const store = useAppStore();

    const getDefaultExportPath = () => {
        const date = new Date().toISOString().slice(0, 10);
        return `${(window as any).__TAURI_INTERNALS__?.path?.documentDir ?? "C:\\Users\\Public\\Documents"}\\WinOpt-backup-${date}.winopt`;
    };

    const exportBackup = useCallback(async (customPath?: string) => {
        setIsExporting(true);
        try {
            const path = customPath ?? getDefaultExportPath();
            const data = {
                version: "1.0",
                created_at: new Date().toISOString(),
                applied_tweaks: Array.from(store.appliedTweaks),
                user_settings: store.userSettings,
            };

            if (!isTauri) {
                // Browser fallback: download as file
                const json = JSON.stringify(data, null, 2);
                const blob = new Blob([json], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `WinOpt-backup-${data.created_at.slice(0, 10)}.winopt`;
                a.click();
                URL.revokeObjectURL(url);
                const now = new Date().toLocaleString();
                localStorage.setItem(LAST_BACKUP_KEY, now);
                setLastBackupTime(now);
                addToast({ type: "success", title: "Backup Downloaded", message: "Backup file downloaded to your Downloads folder." });
                return true;
            }

            await invoke("export_backup", { path, data });
            const now = new Date().toLocaleString();
            localStorage.setItem(LAST_BACKUP_KEY, now);
            setLastBackupTime(now);
            addToast({ type: "success", title: "Backup Exported", message: `Saved to: ${path}` });
            return true;
        } catch (err) {
            addToast({ type: "error", title: "Export Failed", message: String(err) });
            return false;
        } finally {
            setIsExporting(false);
        }
    }, [store, addToast]);

    const importBackup = useCallback(async (path?: string) => {
        const filePath = path ?? importPath;
        if (!filePath.trim()) {
            addToast({ type: "warning", title: "No Path Provided", message: "Please enter the path to your .winopt backup file." });
            return false;
        }
        setIsImporting(true);
        try {
            if (!isTauri) {
                addToast({ type: "info", title: "Import (Preview Mode)", message: "Backup import is only available in the desktop app." });
                return false;
            }
            const data = await invoke<{
                version: string;
                created_at: string;
                applied_tweaks: string[];
                user_settings: typeof store.userSettings;
            }>("import_backup", { path: filePath });

            useAppStore.setState({
                appliedTweaks: data.applied_tweaks,
                userSettings: { ...store.userSettings, ...data.user_settings },
            });
            addToast({ type: "success", title: "Backup Restored", message: `Restored ${data.applied_tweaks.length} tweaks from backup (${data.created_at.slice(0, 10)}).` });
            return true;
        } catch (err) {
            addToast({ type: "error", title: "Import Failed", message: String(err) });
            return false;
        } finally {
            setIsImporting(false);
        }
    }, [importPath, store, addToast]);

    return { isExporting, isImporting, lastBackupTime, importPath, setImportPath, exportBackup, importBackup };
}
