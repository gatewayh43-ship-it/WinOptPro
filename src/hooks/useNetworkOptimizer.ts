import { useCallback, useEffect, useMemo, useState } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { useGlobalCache } from "./useGlobalCache";

export type NetworkRisk = "SAFE" | "CAUTION" | "HIGH RISK";

export interface AdapterAdvancedProperty {
  displayName: string;
  displayValue: string;
}

export interface NetworkOptimizerAdapter {
  name: string;
  description: string;
  status: string;
  linkSpeed: string;
  macAddress: string;
  ifIndex: number;
  mediaType: string;
  physicalMediaType: string;
  ipv4: string;
  mtu: number | null;
  metric: number | null;
  dhcp: string;
  dnsServers: string[];
  rssEnabled: boolean | null;
  receivedBytes: number;
  transmittedBytes: number;
  advancedProperties: AdapterAdvancedProperty[];
}

export interface WifiDiagnostics {
  ssid: string;
  bssid: string;
  radioType: string;
  authentication: string;
  cipher: string;
  channel: number | null;
  signalPct: number | null;
  receiveRateMbps: number | null;
  transmitRateMbps: number | null;
  profile: string;
}

export interface TcpDiagnostics {
  activeSetting: string;
  autoTuningLevel: string;
  congestionProvider: string;
  ecnCapability: string;
  scalingHeuristics: string;
}

export interface OffloadDiagnostics {
  receiveSegmentCoalescing: string;
  receiveSideScaling: string;
  chimney: string;
  taskOffload: string;
}

export interface RouteDiagnostics {
  interfaceAlias: string;
  interfaceIndex: number;
  nextHop: string;
  routeMetric: number;
  interfaceMetric: number;
}

export interface PingResult {
  host: string;
  latencyMs: number | null;
  maxMs: number | null;
  minMs: number | null;
  jitterMs: number | null;
  packetLossPct: number;
  success: boolean;
}

export interface DnsBenchmark {
  provider: string;
  primary: string;
  secondary: string;
  latencyMs: number | null;
  success: boolean;
}

export interface NetworkProcessUsage {
  processId: number;
  processName: string;
  connectionCount: number;
}

export interface NetworkActionSpec {
  actionId: string;
  label: string;
  requiresAdmin: boolean;
  reversible: boolean;
}

export interface NetworkRecommendation {
  id: string;
  title: string;
  summary: string;
  evidence: string;
  risk: NetworkRisk;
  category: string;
  impact: string;
  action: NetworkActionSpec | null;
  appliesToProfiles: string[];
}

export interface NetworkOptimizationProfile {
  id: string;
  name: string;
  description: string;
  recommendationIds: string[];
}

export interface NetworkOptimizerReport {
  generatedAt: string;
  adapters: NetworkOptimizerAdapter[];
  wifi: WifiDiagnostics | null;
  tcp: TcpDiagnostics;
  offload: OffloadDiagnostics;
  routes: RouteDiagnostics[];
  probes: PingResult[];
  dnsBenchmarks: DnsBenchmark[];
  activeTalkers: NetworkProcessUsage[];
  recommendations: NetworkRecommendation[];
  profiles: NetworkOptimizationProfile[];
}

export interface NetworkOptimizerApplyRequest {
  actionId: string;
  adapterName?: string;
  customPrimaryDns?: string;
  customSecondaryDns?: string;
  executablePath?: string;
}

export interface NetworkOptimizerApplyResult {
  success: boolean;
  title: string;
  message: string;
  stdout: string;
  revertActionId: string | null;
}

const CACHE_KEY = "network_optimizer_report";

export function useNetworkOptimizer() {
  const [report, setReport] = useState<NetworkOptimizerReport | null>(
    () => useGlobalCache.getState().getCacheObject(CACHE_KEY) ?? null
  );
  const [isLoading, setIsLoading] = useState(!report);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastApplyResult, setLastApplyResult] = useState<NetworkOptimizerApplyResult | null>(null);

  const scan = useCallback(async (force = false) => {
    if (!force) {
      const cached = useGlobalCache.getState().getCacheObject(CACHE_KEY);
      if (cached) {
        setReport(cached);
        setIsLoading(false);
        return cached as NetworkOptimizerReport;
      }
    }

    setIsLoading(true);
    setError(null);
    try {
      if (!isTauri()) {
        const message = "Network optimizer telemetry requires the WinOpt Pro desktop runtime.";
        setReport(null);
        setError(message);
        return null;
      }
      const nextReport = await invoke<NetworkOptimizerReport>("scan_network_optimizer");
      setReport(nextReport);
      useGlobalCache.getState().setCacheObject(CACHE_KEY, nextReport);
      return nextReport;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    scan().catch(() => undefined);
  }, [scan]);

  const applyAction = useCallback(async (request: NetworkOptimizerApplyRequest) => {
    setIsApplying(true);
    setLastApplyResult(null);
    setError(null);
    try {
      if (!isTauri()) {
        const result: NetworkOptimizerApplyResult = {
          success: false,
          title: "Desktop runtime required",
          message: "Network changes require the WinOpt Pro desktop app running with Administrator privileges.",
          stdout: "",
          revertActionId: null,
        };
        setLastApplyResult(result);
        return result;
      }
      const result = await invoke<NetworkOptimizerApplyResult>("apply_network_optimizer_action", { request });
      setLastApplyResult(result);
      useGlobalCache.getState().clearCache(CACHE_KEY);
      await scan(true);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      throw err;
    } finally {
      setIsApplying(false);
    }
  }, [scan]);

  const connectedAdapters = useMemo(
    () => report?.adapters.filter((adapter) => adapter.status.toLowerCase() === "up" && adapter.ipv4 !== "Not Connected") ?? [],
    [report]
  );

  const primaryAdapter = useMemo(
    () => connectedAdapters.find((adapter) => adapter.metric === Math.min(...connectedAdapters.map((a) => a.metric ?? 9999))) ?? connectedAdapters[0] ?? null,
    [connectedAdapters]
  );

  const getRecommendationsForProfile = useCallback((profileId: string) => {
    if (!report) return [];
    return report.recommendations.filter((recommendation) => recommendation.appliesToProfiles.includes(profileId));
  }, [report]);

  return {
    report,
    connectedAdapters,
    primaryAdapter,
    isLoading,
    isApplying,
    error,
    lastApplyResult,
    scan,
    refresh: () => scan(true),
    applyAction,
    getRecommendationsForProfile,
  };
}
