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

const MOCK_REPORT: NetworkOptimizerReport = {
  generatedAt: new Date().toISOString(),
  adapters: [
    {
      name: "Ethernet",
      description: "Intel Ethernet Controller I225-V",
      status: "Up",
      linkSpeed: "1 Gbps",
      macAddress: "AA-BB-CC-DD-EE-FF",
      ifIndex: 12,
      mediaType: "802.3",
      physicalMediaType: "802.3",
      ipv4: "192.168.1.42",
      mtu: 1500,
      metric: 10,
      dhcp: "Enabled",
      dnsServers: ["1.1.1.1", "1.0.0.1"],
      rssEnabled: true,
      receivedBytes: 92_400_000_000,
      transmittedBytes: 12_800_000_000,
      advancedProperties: [
        { displayName: "Receive Side Scaling", displayValue: "Enabled" },
        { displayName: "Interrupt Moderation", displayValue: "Enabled" },
        { displayName: "Energy Efficient Ethernet", displayValue: "Disabled" },
      ],
    },
    {
      name: "Wi-Fi",
      description: "Intel Wi-Fi 6E AX211",
      status: "Up",
      linkSpeed: "866 Mbps",
      macAddress: "11-22-33-44-55-66",
      ifIndex: 16,
      mediaType: "Native 802.11",
      physicalMediaType: "Native 802.11",
      ipv4: "192.168.1.57",
      mtu: 1500,
      metric: 15,
      dhcp: "Enabled",
      dnsServers: [],
      rssEnabled: null,
      receivedBytes: 18_600_000_000,
      transmittedBytes: 3_200_000_000,
      advancedProperties: [
        { displayName: "Preferred Band", displayValue: "Prefer 5GHz band" },
        { displayName: "Roaming Aggressiveness", displayValue: "Medium-Low" },
      ],
    },
  ],
  wifi: {
    ssid: "WinOpt-Lab-6E",
    bssid: "90:9A:4A:11:22:33",
    radioType: "802.11ax",
    authentication: "WPA3-Personal",
    cipher: "CCMP",
    channel: 149,
    signalPct: 82,
    receiveRateMbps: 866,
    transmitRateMbps: 720,
    profile: "WinOpt-Lab-6E",
  },
  tcp: {
    activeSetting: "Internet",
    autoTuningLevel: "Normal",
    congestionProvider: "CUBIC",
    ecnCapability: "Disabled",
    scalingHeuristics: "Disabled",
  },
  offload: {
    receiveSegmentCoalescing: "Enabled",
    receiveSideScaling: "Enabled",
    chimney: "Disabled",
    taskOffload: "Enabled",
  },
  routes: [
    { interfaceAlias: "Ethernet", interfaceIndex: 12, nextHop: "192.168.1.1", routeMetric: 0, interfaceMetric: 10 },
  ],
  probes: [
    { host: "192.168.1.1", latencyMs: 1.2, minMs: 1, maxMs: 2, jitterMs: 0.4, packetLossPct: 0, success: true },
    { host: "1.1.1.1", latencyMs: 9.4, minMs: 8, maxMs: 14, jitterMs: 1.8, packetLossPct: 0, success: true },
    { host: "8.8.8.8", latencyMs: 13.6, minMs: 11, maxMs: 22, jitterMs: 3.2, packetLossPct: 0, success: true },
  ],
  dnsBenchmarks: [
    { provider: "Cloudflare", primary: "1.1.1.1", secondary: "1.0.0.1", latencyMs: 9.4, success: true },
    { provider: "Google", primary: "8.8.8.8", secondary: "8.8.4.4", latencyMs: 13.6, success: true },
    { provider: "Quad9", primary: "9.9.9.9", secondary: "149.112.112.112", latencyMs: 18.1, success: true },
  ],
  activeTalkers: [
    { processId: 6124, processName: "steam", connectionCount: 18 },
    { processId: 1008, processName: "OneDrive", connectionCount: 6 },
  ],
  recommendations: [
    {
      id: "dns_explicit_resolver",
      title: "Use an explicit fast DNS resolver where appropriate",
      summary: "DNS changes improve lookup time and reliability, not in-session game ping. Apply per adapter only when it beats the current resolver and matches your privacy goals.",
      evidence: "Fastest sampled resolver: Cloudflare at 9.4 ms.",
      risk: "SAFE",
      category: "DNS",
      impact: "Improves browsing/app startup resolution and makes DNS behavior explicit.",
      action: { actionId: "set_dns_cloudflare", label: "Set Cloudflare DNS", requiresAdmin: true, reversible: true },
      appliesToProfiles: ["privacy_dns", "streaming_stability"],
    },
    {
      id: "background_network_contention",
      title: "Background traffic may be competing with latency-sensitive apps",
      summary: "Launchers, cloud sync, and update services can create upload queueing and bufferbloat while games or calls are active.",
      evidence: "Active network processes include likely updater, launcher, or sync traffic.",
      risk: "SAFE",
      category: "Contention",
      impact: "Reduces ping spikes during gaming, calls, and streaming.",
      action: { actionId: "disable_delivery_optimization_peer", label: "Limit Delivery Optimization peer sharing", requiresAdmin: true, reversible: true },
      appliesToProfiles: ["gaming_latency", "streaming_stability"],
    },
    {
      id: "bufferbloat_loaded_test",
      title: "Run a loaded latency test before deep tuning",
      summary: "Idle ping does not reveal upload/download queueing. Bufferbloat is usually fixed on the router with SQM/CAKE/fq_codel; Windows can only reduce local background contention.",
      evidence: "Loaded latency test is recommended for every network profile.",
      risk: "SAFE",
      category: "Latency",
      impact: "Separates real queueing problems from cosmetic TCP tweaks.",
      action: null,
      appliesToProfiles: ["gaming_latency", "streaming_stability", "download_throughput"],
    },
  ],
  profiles: [
    {
      id: "gaming_latency",
      name: "Gaming Low Latency",
      description: "Reduce jitter, packet loss, route mistakes, and background contention before launching games.",
      recommendationIds: ["background_network_contention", "bufferbloat_loaded_test"],
    },
    {
      id: "streaming_stability",
      name: "Streaming Stability",
      description: "Prioritize steady DNS, Wi-Fi health, and upload contention checks for calls and streaming.",
      recommendationIds: ["dns_explicit_resolver", "background_network_contention", "bufferbloat_loaded_test"],
    },
    {
      id: "download_throughput",
      name: "Download Throughput",
      description: "Favor wired routes, RSS, sane TCP auto-tuning, and adapter health for large transfers.",
      recommendationIds: ["bufferbloat_loaded_test"],
    },
    {
      id: "privacy_dns",
      name: "Privacy DNS Baseline",
      description: "Review resolver configuration and make DNS choices explicit per adapter.",
      recommendationIds: ["dns_explicit_resolver"],
    },
  ],
};

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
      const nextReport = isTauri()
        ? await invoke<NetworkOptimizerReport>("scan_network_optimizer")
        : await new Promise<NetworkOptimizerReport>((resolve) => setTimeout(() => resolve(MOCK_REPORT), 450));
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
      const result = isTauri()
        ? await invoke<NetworkOptimizerApplyResult>("apply_network_optimizer_action", { request })
        : await new Promise<NetworkOptimizerApplyResult>((resolve) => setTimeout(() => resolve({
            success: true,
            title: "Simulated network action",
            message: "Browser-mode preview completed. Tauri will run the real PowerShell action.",
            stdout: "",
            revertActionId: request.actionId === "reset_dns_dhcp" ? null : "reset_dns_dhcp",
          }), 500));
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

