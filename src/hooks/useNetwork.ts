import { useState, useCallback, useEffect } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { useGlobalCache } from "./useGlobalCache";

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

function toNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function toNetworkInterface(value: unknown, fallbackName = ""): NetworkInterface | null {
    if (!value || typeof value !== "object") return null;
    const item = value as Record<string, unknown>;
    const name = String(item.name ?? fallbackName).trim();
    if (!name) return null;

    return {
        name,
        macAddress: String(item.macAddress ?? item.mac_address ?? ""),
        receivedBytes: toNumber(item.receivedBytes ?? item.received_bytes),
        transmittedBytes: toNumber(item.transmittedBytes ?? item.transmitted_bytes),
        ipV4: String(item.ipV4 ?? item.ip_v4 ?? item.ipv4 ?? ""),
    };
}

export function normalizeNetworkInterfaces(value: unknown): NetworkInterface[] {
    if (Array.isArray(value)) {
        return value
            .map((item) => toNetworkInterface(item))
            .filter((item): item is NetworkInterface => item !== null);
    }

    if (value && typeof value === "object") {
        const item = toNetworkInterface(value);
        if (item) return [item];

        return Object.entries(value as Record<string, unknown>)
            .map(([name, entry]) => toNetworkInterface(entry, name))
            .filter((entry): entry is NetworkInterface => entry !== null);
    }

    return [];
}

export function useNetwork() {
    const [interfaces, setInterfaces] = useState<NetworkInterface[]>(() =>
        normalizeNetworkInterfaces(useGlobalCache.getState().getCacheObject("network"))
    );
    const [isLoading, setIsLoading] = useState(() =>
        normalizeNetworkInterfaces(useGlobalCache.getState().getCacheObject("network")).length === 0
    );
    const [error, setError] = useState<string | null>(null);

    const [pinging, setPinging] = useState(false);
    const [pingResult, setPingResult] = useState<PingResult | null>(null);
    const [pingError, setPingError] = useState<string | null>(null);

    const fetchInterfaces = useCallback(async (force = false) => {
        if (!force) {
            const cached = useGlobalCache.getState().getCacheObject("network");
            const cachedInterfaces = normalizeNetworkInterfaces(cached);
            if (cachedInterfaces.length > 0) {
                setInterfaces(cachedInterfaces);
                setIsLoading(false);
                return;
            }
        }

        try {
            if (!isTauri()) {
                setInterfaces([]);
                setError("Network interface inventory requires the WinOpt Pro desktop runtime.");
                return;
            }
            const data = normalizeNetworkInterfaces(await invoke<unknown>("get_network_interfaces"));
            setInterfaces(data);
            useGlobalCache.getState().setCacheObject("network", data);
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

        if (!isTauri()) {
            setPingError("Latency tests require the WinOpt Pro desktop runtime.");
            setPinging(false);
            return;
        }

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
        refresh: () => fetchInterfaces(true),
        pingHost,
        pinging,
        pingResult,
        pingError
    };
}
