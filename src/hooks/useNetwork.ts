import { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

export interface NetworkInterface {
    name: string;
    macAddress: string;
    receivedBytes: number;
    transmittedBytes: number;
    ipV4: string;
}

export interface PingResult {
    host: string;
    latencyMs: number | null;
    minMs: number | null;
    maxMs: number | null;
    jitterMs: number | null;
    packetLossPct: number;
    success: boolean;
}

export function useNetwork() {
    const [interfaces, setInterfaces] = useState<NetworkInterface[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [pinging, setPinging] = useState(false);
    const [pingResult, setPingResult] = useState<PingResult | null>(null);
    const [pingError, setPingError] = useState<string | null>(null);

    const fetchInterfaces = useCallback(async () => {
        try {
            const data = await invoke<NetworkInterface[]>("get_network_interfaces");
            setInterfaces(data);
            setError(null);
        } catch (err) {
            console.error("Failed to fetch network interfaces:", err);
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchInterfaces();
        const interval = setInterval(fetchInterfaces, 3000);
        return () => clearInterval(interval);
    }, [fetchInterfaces]);

    const pingHost = async (host: string) => {
        if (!host.trim()) return;
        setPinging(true);
        setPingResult(null);
        setPingError(null);

        try {
            const result = await invoke<PingResult>("ping_host", { host: host.trim() });
            setPingResult(result);
        } catch (err) {
            setPingError(err instanceof Error ? err.message : String(err));
        } finally {
            setPinging(false);
        }
    };

    return {
        interfaces,
        isLoading,
        error,
        refresh: fetchInterfaces,
        pingHost,
        pinging,
        pingResult,
        pingError
    };
}
