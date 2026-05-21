import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Gauge,
  Globe2,
  HardDrive,
  Info,
  Loader2,
  Network,
  Radio,
  RefreshCcw,
  Router,
  ShieldCheck,
  Signal,
  SlidersHorizontal,
  Sparkles,
  Wifi,
  Zap,
} from "lucide-react";
import { useNetworkOptimizer, NetworkRecommendation, NetworkRisk } from "@/hooks/useNetworkOptimizer";
import { useToast } from "@/components/ToastSystem";

const tabs = ["Overview", "Adapters", "Wi-Fi", "DNS", "Latency", "Profiles"] as const;
type Tab = (typeof tabs)[number];

const riskStyles: Record<NetworkRisk, string> = {
  SAFE: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  CAUTION: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "HIGH RISK": "bg-red-500/10 text-red-400 border-red-500/20",
};

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatLatency(value: number | null): string {
  return value == null ? "--" : `${value.toFixed(value < 10 ? 1 : 0)} ms`;
}

function riskTone(recommendations: NetworkRecommendation[]) {
  if (recommendations.some((r) => r.risk === "HIGH RISK")) return "text-red-400";
  if (recommendations.some((r) => r.risk === "CAUTION")) return "text-amber-400";
  return "text-emerald-400";
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = "blue",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  tone?: "blue" | "emerald" | "amber" | "purple" | "orange" | "red";
}) {
  const tones = {
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    orange: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    red: "bg-red-500/10 text-red-400 border-red-500/20",
  };

  return (
    <div className="bento-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${tones[tone]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-300">{label}</span>
      </div>
      <div className="mt-5">
        <p className="font-heading text-3xl font-black tracking-tight text-foreground">{value}</p>
        <p className="mt-1 text-[12px] font-medium text-slate-500 dark:text-slate-300">{sub}</p>
      </div>
    </div>
  );
}

function RecommendationCard({
  recommendation,
  onApply,
  disabled,
}: {
  recommendation: NetworkRecommendation;
  onApply: (recommendation: NetworkRecommendation) => void;
  disabled: boolean;
}) {
  return (
    <div className="bento-card p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${riskStyles[recommendation.risk]}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {recommendation.risk}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-300">{recommendation.category}</span>
          </div>
          <h3 className="mt-3 font-heading text-[17px] font-bold text-foreground">{recommendation.title}</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">{recommendation.summary}</p>
          <div className="mt-3 rounded-xl border border-border/60 bg-black/[0.03] dark:bg-black/20 p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-300">Evidence</p>
            <p className="mt-1 text-[12px] font-medium text-slate-600 dark:text-slate-300">{recommendation.evidence}</p>
            <p className="mt-2 text-[12px] text-primary font-medium">{recommendation.impact}</p>
          </div>
        </div>
        {recommendation.action ? (
          <button
            onClick={() => onApply(recommendation)}
            disabled={disabled}
            className="btn-tactile shrink-0 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-[12px] font-bold text-white shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            {disabled ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {recommendation.action.label}
          </button>
        ) : (
          <span className="shrink-0 rounded-full border border-border bg-black/[0.03] dark:bg-white/[0.04] px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-300">
            Diagnose
          </span>
        )}
      </div>
    </div>
  );
}

export function NetworkOptimizerPage() {
  const {
    report,
    connectedAdapters,
    primaryAdapter,
    isLoading,
    isApplying,
    error,
    lastApplyResult,
    refresh,
    applyAction,
    getRecommendationsForProfile,
  } = useNetworkOptimizer();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [selectedAdapter, setSelectedAdapter] = useState<string>("");
  const [customPrimaryDns, setCustomPrimaryDns] = useState("");
  const [customSecondaryDns, setCustomSecondaryDns] = useState("");

  const adapterName = selectedAdapter || primaryAdapter?.name || connectedAdapters[0]?.name || "";
  const avgProbe = useMemo(() => {
    const values = report?.probes.filter((probe) => probe.latencyMs != null) ?? [];
    if (!values.length) return null;
    return values.reduce((sum, probe) => sum + (probe.latencyMs ?? 0), 0) / values.length;
  }, [report]);
  const maxJitter = useMemo(() => Math.max(0, ...(report?.probes.map((probe) => probe.jitterMs ?? 0) ?? [0])), [report]);
  const loss = useMemo(() => Math.max(0, ...(report?.probes.map((probe) => probe.packetLossPct) ?? [0])), [report]);

  const safeCount = report?.recommendations.filter((r) => r.risk === "SAFE").length ?? 0;
  const actionableCount = report?.recommendations.filter((r) => r.action).length ?? 0;

  const handleApply = async (recommendation: NetworkRecommendation) => {
    if (!recommendation.action) return;
    try {
      const result = await applyAction({
        actionId: recommendation.action.actionId,
        adapterName,
      });
      addToast({ type: "success", title: result.title, message: result.message });
    } catch (err) {
      addToast({ type: "error", title: "Network action failed", message: err instanceof Error ? err.message : String(err) });
    }
  };

  const handleDirectAction = async (actionId: string, message: string) => {
    try {
      const result = await applyAction({
        actionId,
        adapterName,
        customPrimaryDns,
        customSecondaryDns,
      });
      addToast({ type: "success", title: result.title, message });
      setCustomPrimaryDns("");
      setCustomSecondaryDns("");
    } catch (err) {
      addToast({ type: "error", title: "Network action failed", message: err instanceof Error ? err.message : String(err) });
    }
  };

  if (isLoading && !report) {
    return (
      <div className="flex min-h-[520px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-bold text-foreground">Scanning network stack...</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">Adapters, DNS, TCP, Wi-Fi, routes, and latency probes.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="bento-card p-8 overflow-hidden">
        <div className="absolute inset-0 bg-noise opacity-50 mix-blend-overlay" />
        <div className="absolute -right-10 -top-16 w-80 h-80 rounded-full bg-primary/10 blur-[90px]" />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-300">Network telemetry utility</span>
            </div>
            <h2 className="mt-5 font-heading text-4xl font-black tracking-tight text-foreground">
              Network <span className="text-gradient">Optimizer</span>
            </h2>
            <p className="mt-3 max-w-2xl text-[14px] font-medium leading-relaxed text-slate-600 dark:text-slate-300">
              Diagnose wired and Wi-Fi paths, DNS, TCP, adapter capabilities, active traffic, jitter, packet loss, and profile-ready recommendations before applying any network changes.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={adapterName}
              onChange={(event) => setSelectedAdapter(event.target.value)}
              className="rounded-xl border border-border bg-black/[0.03] dark:bg-white/[0.04] px-3 py-2 text-[12px] font-semibold text-foreground outline-none"
              aria-label="Select adapter for network actions"
            >
              {connectedAdapters.map((adapter) => (
                <option key={adapter.name} value={adapter.name}>{adapter.name}</option>
              ))}
            </select>
            <button
              onClick={() => refresh()}
              disabled={isLoading}
              className="btn-tactile inline-flex items-center gap-2 rounded-full border border-border bg-black/[0.03] dark:bg-white/[0.04] px-4 py-2.5 text-[12px] font-bold text-foreground disabled:opacity-50"
            >
              <RefreshCcw className={`w-4 h-4 ${isLoading ? "animate-spin text-primary" : ""}`} />
              Rescan
            </button>
          </div>
        </div>
      </motion.div>

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-medium text-red-300">
          {error}
        </div>
      )}

      {lastApplyResult && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-300">
          {lastApplyResult.title}: {lastApplyResult.message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Network} label="Primary route" value={primaryAdapter?.name ?? "--"} sub={primaryAdapter?.linkSpeed ?? "No active route"} tone="blue" />
        <MetricCard icon={Gauge} label="Average ping" value={formatLatency(avgProbe)} sub={`${formatLatency(maxJitter)} max jitter`} tone={loss > 0 ? "red" : "emerald"} />
        <MetricCard icon={Wifi} label="Wi-Fi signal" value={report?.wifi?.signalPct != null ? `${report.wifi.signalPct}%` : "--"} sub={report?.wifi?.ssid ?? "No WLAN telemetry"} tone="purple" />
        <MetricCard icon={Sparkles} label="Recommendations" value={`${safeCount}/${report?.recommendations.length ?? 0}`} sub={`${actionableCount} reversible actions`} tone="amber" />
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-full px-4 py-2 text-[12px] font-bold transition-colors ${
              activeTab === tab
                ? "bg-primary text-white shadow-lg shadow-primary/20"
                : "border border-border bg-black/[0.03] text-slate-600 hover:text-foreground dark:bg-white/[0.04] dark:text-slate-300"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Overview" && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-xl font-bold text-foreground">Recommendation Engine</h3>
              <span className={`text-[12px] font-bold ${riskTone(report?.recommendations ?? [])}`}>Measurement-first</span>
            </div>
            {(report?.recommendations ?? []).map((recommendation) => (
              <RecommendationCard key={recommendation.id} recommendation={recommendation} onApply={handleApply} disabled={isApplying} />
            ))}
          </div>
          <div className="space-y-4">
            <div className="bento-card p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
                  <Info className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading text-[16px] font-bold">Safe action model</h3>
                  <p className="text-[12px] text-slate-500 dark:text-slate-300">Bundles consume profile recommendations, not raw PowerShell.</p>
                </div>
              </div>
              <div className="mt-5 space-y-3 text-[13px] text-slate-600 dark:text-slate-300">
                <p>DNS, route metrics, RSS, TCP defaults, Delivery Optimization policy, and QoS policy actions are explicit and reversible.</p>
                <p>Riskier adapter advanced-property and registry folklore is surfaced as diagnosis first, then can be promoted behind Expert Mode later.</p>
              </div>
            </div>
            <div className="bento-card p-5">
              <h3 className="font-heading text-[16px] font-bold">Active Talkers</h3>
              <div className="mt-4 space-y-2">
                {(report?.activeTalkers ?? []).slice(0, 8).map((talker) => (
                  <div key={`${talker.processId}-${talker.processName}`} className="flex items-center justify-between rounded-xl border border-border/60 bg-black/[0.03] dark:bg-black/20 px-3 py-2">
                    <span className="text-[13px] font-semibold text-foreground">{talker.processName}</span>
                    <span className="font-mono text-[11px] text-slate-500 dark:text-slate-300">{talker.connectionCount} conns</span>
                  </div>
                ))}
                {report?.activeTalkers.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-300">No established TCP talkers detected.</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "Adapters" && (
        <div className="space-y-4">
          {report?.adapters.map((adapter) => (
            <div key={adapter.name} className="bento-card p-5">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                      <Network className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-heading text-lg font-bold text-foreground">{adapter.name}</h3>
                      <p className="text-[12px] text-slate-500 dark:text-slate-300">{adapter.description}</p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                    {[
                      ["Status", adapter.status],
                      ["Link", adapter.linkSpeed],
                      ["IPv4", adapter.ipv4],
                      ["Metric", adapter.metric?.toString() ?? "--"],
                      ["MTU", adapter.mtu?.toString() ?? "--"],
                      ["RSS", adapter.rssEnabled == null ? "--" : adapter.rssEnabled ? "Enabled" : "Disabled"],
                      ["RX", formatBytes(adapter.receivedBytes)],
                      ["TX", formatBytes(adapter.transmittedBytes)],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-xl border border-border/60 bg-black/[0.03] dark:bg-black/20 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-300">{label}</p>
                        <p className="mt-1 truncate text-[13px] font-bold text-foreground">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="min-w-[240px] rounded-xl border border-border/60 bg-black/[0.03] dark:bg-black/20 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-300">Driver properties</p>
                  <div className="mt-2 max-h-40 space-y-1 overflow-y-auto custom-scrollbar">
                    {adapter.advancedProperties.slice(0, 10).map((prop) => (
                      <div key={`${prop.displayName}-${prop.displayValue}`} className="flex justify-between gap-3 text-[11px]">
                        <span className="text-slate-500 dark:text-slate-300">{prop.displayName}</span>
                        <span className="font-mono text-foreground">{prop.displayValue}</span>
                      </div>
                    ))}
                    {adapter.advancedProperties.length === 0 && <p className="text-[12px] text-slate-500 dark:text-slate-300">No tunable properties surfaced.</p>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "Wi-Fi" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="bento-card p-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold">Wireless Diagnostics</h3>
                <p className="text-[12px] text-slate-500 dark:text-slate-300">RF quality matters more than registry tweaks.</p>
              </div>
            </div>
            {report?.wifi ? (
              <div className="mt-5 grid grid-cols-2 gap-3">
                {[
                  ["SSID", report.wifi.ssid],
                  ["Signal", report.wifi.signalPct != null ? `${report.wifi.signalPct}%` : "--"],
                  ["Radio", report.wifi.radioType],
                  ["Channel", report.wifi.channel?.toString() ?? "--"],
                  ["RX rate", report.wifi.receiveRateMbps != null ? `${report.wifi.receiveRateMbps} Mbps` : "--"],
                  ["TX rate", report.wifi.transmitRateMbps != null ? `${report.wifi.transmitRateMbps} Mbps` : "--"],
                  ["Auth", report.wifi.authentication],
                  ["Cipher", report.wifi.cipher],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-border/60 bg-black/[0.03] dark:bg-black/20 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-300">{label}</p>
                    <p className="mt-1 truncate text-[13px] font-bold text-foreground">{value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-5 text-sm text-slate-500 dark:text-slate-300">No connected Wi-Fi interface reported by Windows.</p>
            )}
          </div>
          <div className="bento-card p-6">
            <h3 className="font-heading text-lg font-bold">Wi-Fi Tactics</h3>
            <div className="mt-4 space-y-3">
              {[
                ["Prefer 5 GHz/6 GHz for gaming when signal is strong.", Signal],
                ["Lower roaming aggressiveness on desktop setups to avoid AP hopping.", SlidersHorizontal],
                ["Use Ethernet for competitive play when both links are present.", Router],
                ["Fix channel congestion and router SQM before legacy TCP hacks.", AlertTriangle],
              ].map(([text, Icon]) => (
                <div key={text as string} className="flex items-start gap-3 rounded-xl border border-border/60 bg-black/[0.03] dark:bg-black/20 p-3">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p className="text-[13px] font-medium text-slate-600 dark:text-slate-300">{text as string}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "DNS" && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="bento-card p-6">
            <h3 className="font-heading text-lg font-bold">Resolver Actions</h3>
            <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-300">Applies to selected adapter: <span className="font-mono text-primary">{adapterName || "none"}</span></p>
            <div className="mt-5 grid grid-cols-1 gap-3">
              {[
                ["set_dns_cloudflare", "Cloudflare", "1.1.1.1 / 1.0.0.1"],
                ["set_dns_google", "Google", "8.8.8.8 / 8.8.4.4"],
                ["set_dns_quad9", "Quad9", "9.9.9.9 / 149.112.112.112"],
                ["reset_dns_dhcp", "Automatic DNS", "Reset adapter resolver"],
                ["clear_dns_cache", "Clear DNS cache", "Flush stale local entries"],
              ].map(([actionId, label, sub]) => (
                <button
                  key={actionId}
                  onClick={() => handleDirectAction(actionId, `${label} action completed.`)}
                  disabled={isApplying || (!adapterName && actionId !== "clear_dns_cache")}
                  className="flex items-center justify-between rounded-xl border border-border bg-black/[0.03] dark:bg-white/[0.04] px-4 py-3 text-left transition-colors hover:border-primary/30 disabled:opacity-50"
                >
                  <span>
                    <span className="block text-[13px] font-bold text-foreground">{label}</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-300">{sub}</span>
                  </span>
                  <Globe2 className="h-4 w-4 text-primary" />
                </button>
              ))}
            </div>
            <div className="mt-5 rounded-xl border border-border/60 bg-black/[0.03] dark:bg-black/20 p-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-300">Custom DNS</p>
              <div className="mt-3 grid grid-cols-1 gap-2">
                <input value={customPrimaryDns} onChange={(event) => setCustomPrimaryDns(event.target.value)} placeholder="Primary IPv4 DNS" className="rounded-lg border border-border bg-background px-3 py-2 text-[12px] font-mono outline-none focus:border-primary/40" />
                <input value={customSecondaryDns} onChange={(event) => setCustomSecondaryDns(event.target.value)} placeholder="Secondary IPv4 DNS (optional)" className="rounded-lg border border-border bg-background px-3 py-2 text-[12px] font-mono outline-none focus:border-primary/40" />
                <button onClick={() => handleDirectAction("set_dns_custom", "Custom DNS applied.")} disabled={isApplying || !adapterName || !customPrimaryDns.trim()} className="rounded-lg bg-primary px-3 py-2 text-[12px] font-bold text-white disabled:opacity-50">Apply Custom DNS</button>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            {report?.dnsBenchmarks.map((dns) => (
              <div key={dns.provider} className="bento-card p-5 flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-heading text-[16px] font-bold">{dns.provider}</h3>
                  <p className="mt-1 font-mono text-[12px] text-slate-500 dark:text-slate-300">{dns.primary} / {dns.secondary}</p>
                </div>
                <span className={`font-heading text-2xl font-black ${dns.success ? "text-emerald-400" : "text-red-400"}`}>{formatLatency(dns.latencyMs)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "Latency" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {(report?.probes ?? []).map((probe) => (
            <div key={probe.host} className="bento-card p-5">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Activity className="w-5 h-5" />
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${probe.success ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : "border-red-500/20 bg-red-500/10 text-red-400"}`}>
                  {probe.success ? "Reachable" : "Failed"}
                </span>
              </div>
              <h3 className="mt-4 font-mono text-[13px] font-bold text-foreground">{probe.host}</h3>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {[
                  ["Avg", formatLatency(probe.latencyMs)],
                  ["Jitter", formatLatency(probe.jitterMs)],
                  ["Min", formatLatency(probe.minMs)],
                  ["Max", formatLatency(probe.maxMs)],
                  ["Loss", `${probe.packetLossPct}%`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-border/60 bg-black/[0.03] dark:bg-black/20 p-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-300">{label}</p>
                    <p className="font-mono text-[12px] font-bold text-foreground">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="bento-card p-5 lg:col-span-3">
            <h3 className="font-heading text-lg font-bold">Bufferbloat Read</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
              Idle probes are only the first pass. If ping spikes while downloads, uploads, cloud sync, or game launchers are active, the next fix is usually traffic shaping on the router, not disabling modern Windows TCP features.
            </p>
          </div>
        </div>
      )}

      {activeTab === "Profiles" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {report?.profiles.map((profile) => {
            const recs = getRecommendationsForProfile(profile.id);
            return (
              <div key={profile.id} className="bento-card p-6">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
                    {profile.id.includes("gaming") ? <Zap className="w-5 h-5" /> : profile.id.includes("privacy") ? <ShieldCheck className="w-5 h-5" /> : profile.id.includes("download") ? <HardDrive className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-bold">{profile.name}</h3>
                    <p className="mt-1 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">{profile.description}</p>
                  </div>
                </div>
                <div className="mt-5 space-y-2">
                  {recs.map((recommendation) => (
                    <div key={recommendation.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-black/[0.03] dark:bg-black/20 px-3 py-2">
                      <span className="text-[13px] font-semibold text-foreground">{recommendation.title}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ${riskStyles[recommendation.risk]}`}>{recommendation.risk}</span>
                    </div>
                  ))}
                  {recs.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-300">No active recommendations for this profile.</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
