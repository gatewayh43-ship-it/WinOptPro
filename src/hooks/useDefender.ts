import { useState, useCallback, useEffect } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { useToast } from "../components/ToastSystem";

export interface DefenderStatus {
    realtimeProtectionEnabled: boolean;
    signatureOutOfDate: boolean;
    antivirusSignatureAge: number;
    quickScanAge: number;
    fullScanAge: number;
}

export function useDefender() {
    const [status, setStatus] = useState<DefenderStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const { addToast } = useToast();

    const fetchStatus = useCallback(async () => {
        if (!isTauri()) { setLoading(false); return; }
        setLoading(true);
        try {
            const data = await invoke<DefenderStatus>("defender_get_status");
            setStatus(data);
        } catch (err) {
            console.error("Failed to get Defender status", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    const runScan = async (scanType: "Quick" | "Full") => {
        setActionLoading(true);
        try {
            const result = await invoke<string>("defender_run_scan", { scanType });
            addToast({ type: "success", title: `${scanType} scan finished`, message: result || "Scan completed." });
            await fetchStatus();
        } catch (err) {
            addToast({ type: "error", title: `${scanType} scan failed`, message: String(err) });
        } finally {
            setActionLoading(false);
        }
    };

    const updateSignatures = async () => {
        setActionLoading(true);
        try {
            const result = await invoke<string>("defender_update_signatures");
            addToast({ type: "success", title: "Signatures Updated", message: result || "Definitions are now up to date." });
            await fetchStatus();
        } catch (err) {
            addToast({ type: "error", title: "Update failed", message: String(err) });
        } finally {
            setActionLoading(false);
        }
    };

    const setRealtime = async (enabled: boolean) => {
        setActionLoading(true);
        try {
            await invoke<string>("defender_set_realtime", { enabled });
            addToast({ type: "success", title: "Real-time protection changed", message: enabled ? "Protection enabled" : "Protection disabled" });
            await fetchStatus();
        } catch (err) {
            addToast({ type: "error", title: "Failed to change protection state", message: String(err) });
        } finally {
            setActionLoading(false);
        }
    };

    return { status, loading, actionLoading, fetchStatus, runScan, updateSignatures, setRealtime };
}
