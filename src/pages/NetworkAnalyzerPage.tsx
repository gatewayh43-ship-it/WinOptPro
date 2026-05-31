import { useMemo, useState } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { motion } from "framer-motion";
import {
    Activity,
    AlertCircle,
    ArrowDownToLine,
    ArrowUpFromLine,
    Gauge,
    Globe2,
    Loader2,
    Network,
    RefreshCcw,
    ShieldCheck,
    SignalHigh,
    SlidersHorizontal,
    Wifi,
} from "lucide-react";
import { useNetwork, PingResult } from "../hooks/useNetwork";
import { useNetworkOptimizer, NetworkRecommendation } from "../hooks/useNetworkOptimizer";

interface SpeedTestResult {
    downloadMbps: number;
    pingMs: number | null;
    jitterMs: number | null;
    packetLossPct: number;
    serverName: string;
    bytesDownloaded: number;
}

type SpeedStatus = "idle" | "running" | "done" | "error";

function formatBytes(bytes: number) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatMetric(value: number | null | undefined, unit: string, decimals = 1) {
    return value == null || Number.isNaN(value) ? "--" : `${value.toFixed(decimals)} ${unit}`;
}

function speedLabel(mbps: number) {
    if (mbps >= 500) return { label: "Excellent", color: "text-emerald-400" };
    if (mbps >= 100) return { label: "Fast", color: "text-green-400" };
    if (mbps >= 25) return { label: "Usable", color: "text-amber-400" };
    return { label: "Limited", color: "text-red-400" };
}

function QuickActionButton({
    label,
    description,
    disabled,
    onClick,
}: {
    label: string;
    description: string;
    disabled: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="group flex h-full min-h-[92px] flex-col items-start justify-between rounded-xl border border-border/60 bg-black/[0.03] p-4 text-left transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/[0.04]"
        >
            <span className="text-[13px] font-bold text-foreground group-hover:text-primary">{label}</span>
            <span className="mt-2 text-[11px] font-medium leading-relaxed text-slate-500 dark:text-slate-300">{description}</span>
        </button>
    );
}

export function NetworkAnalyzerPage() {
    const { interfaces, isLoading, error, refresh, pingHost, pinging, pingResult, pingError } = useNetwork();
    const {
        report,
        connectedAdapters,
        primaryAdapter,
        isLoading: optimizerLoading,
        isApplying,
        error: optimizerError,
        lastApplyResult,
        refresh: refreshOptimizer,
        applyAction,
    } = useNetworkOptimizer();

    const [targetHost, setTargetHost] = useState("8.8.8.8");
    const [baselinePing, setBaselinePing] = useState<PingResult | null>(null);
    const [speedStatus, setSpeedStatus] = useState<SpeedStatus>("idle");
    const [speedResult, setSpeedResult] = useState<SpeedTestResult | null>(null);
    const [speedError, setSpeedError] = useState("");
    const [actionMessage, setActionMessage] = useState("");

    const activeInterfaces = useMemo(() => {
        return interfaces.filter(iface =>
            iface.name.toLowerCase() !== "lo" &&
            !iface.name.toLowerCase().includes("loopback") &&
            (iface.receivedBytes > 0 || iface.transmittedBytes > 0)
        ).sort((a, b) => b.receivedBytes - a.receivedBytes);
    }, [interfaces]);

    const adapterName = primaryAdapter?.name || connectedAdapters[0]?.name || activeInterfaces[0]?.name || "";
    const actionableRecommendations = useMemo(
        () => (report?.recommendations ?? []).filter((recommendation) => recommendation.action).slice(0, 3),
        [report]
    );
    const speedRating = speedResult ? speedLabel(speedResult.downloadMbps) : null;

    const handlePing = (e: React.FormEvent) => {
        e.preventDefault();
        pingHost(targetHost);
    };

    const runSpeedTest = async () => {
        setSpeedStatus("running");
        setSpeedError("");
        setSpeedResult(null);

        if (!isTauri()) {
            setSpeedStatus("error");
            setSpeedError("Internet speed tests require the WinOpt Pro desktop runtime.");
            return;
        }

        try {
            const result = await invoke<SpeedTestResult>("run_speed_test");
            setSpeedResult(result);
            setSpeedStatus("done");
            const history = JSON.parse(localStorage.getItem("winopt_speed_history") || "[]");
            history.unshift({ ...result, ts: Date.now() });
            localStorage.setItem("winopt_speed_history", JSON.stringify(history.slice(0, 5)));
        } catch (err) {
            setSpeedStatus("error");
            setSpeedError(err instanceof Error ? err.message : String(err));
        }
    };

    const applyNetworkAction = async (actionId: string, label: string, extra?: Partial<{ adapterName: string }>) => {
        setActionMessage("");
        try {
            const result = await applyAction({
                actionId,
                adapterName: extra?.adapterName ?? adapterName,
            });
            setActionMessage(`${result.title}: ${result.message || label}`);
        } catch (err) {
            setActionMessage(`Failed to apply ${label}: ${err instanceof Error ? err.message : String(err)}`);
        }
    };

    const applyRecommendation = async (recommendation: NetworkRecommendation) => {
        if (!recommendation.action) return;
        await applyNetworkAction(recommendation.action.actionId, recommendation.action.label);
    };

    return (
        <div className="space-y-6 pb-12">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h2 className="flex items-center gap-3 text-3xl font-black tracking-tight text-foreground">
                        <Network className="h-8 w-8 text-primary" />
                        Network <span className="text-gradient">Analyzer</span>
                    </h2>
                    <p className="mt-2 max-w-2xl text-[15px] font-medium leading-relaxed text-slate-500 dark:text-slate-300">
                        Monitor adapters, test latency and internet speed, then apply safe DNS, Wi-Fi route, and TCP optimizations from the same diagnostic surface.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            refresh();
                            refreshOptimizer();
                        }}
                        disabled={isLoading || optimizerLoading}
                        className="btn-tactile inline-flex items-center gap-2 rounded-full border border-border bg-black/[0.03] px-4 py-2 text-[12px] font-bold text-foreground disabled:opacity-50 dark:bg-white/[0.04]"
                    >
                        <RefreshCcw className={`h-4 w-4 ${isLoading || optimizerLoading ? "animate-spin text-primary" : ""}`} />
                        Rescan
                    </button>
                </div>
            </motion.div>

            {(error || optimizerError || actionMessage || lastApplyResult) && (
                <div className="rounded-2xl border border-border/60 bg-card p-4 text-[13px] font-medium text-slate-600 dark:text-slate-300">
                    {error && <p className="text-red-400">{error}</p>}
                    {optimizerError && <p className="text-red-400">{optimizerError}</p>}
                    {actionMessage && <p>{actionMessage}</p>}
                    {lastApplyResult && !actionMessage && <p>{lastApplyResult.title}: {lastApplyResult.message}</p>}
                </div>
            )}

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.15, ease: "easeOut" }} className="border border-border/50 bg-card rounded-2xl overflow-hidden shadow-sm flex flex-col">
                    <div className="p-4 border-b border-border/50 bg-white/[0.02] flex justify-between items-center">
                        <h3 className="font-bold text-foreground flex items-center gap-2">
                            <Activity className="w-4 h-4 text-primary" />
                            Latency Test
                        </h3>
                        {baselinePing && (
                            <button
                                onClick={() => setBaselinePing(null)}
                                className="text-[10px] text-slate-500 dark:text-slate-300 hover:text-red-400 uppercase font-bold tracking-widest px-2 py-1 rounded bg-white/5 hover:bg-red-500/10 transition-colors"
                            >
                                Clear Baseline
                            </button>
                        )}
                    </div>

                    <div className="p-5 flex-1 flex flex-col overflow-y-auto">
                        <form onSubmit={handlePing} className="mb-6 relative">
                            <Globe2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-300" />
                            <input
                                type="text"
                                value={targetHost}
                                onChange={e => setTargetHost(e.target.value)}
                                placeholder="e.g. 8.8.8.8 or google.com"
                                className="w-full bg-black/5 dark:bg-black/20 border border-border/50 rounded-xl pl-9 pr-24 py-3 text-[14px] text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-mono"
                                required
                            />
                            <button
                                type="submit"
                                disabled={pinging || !targetHost.trim()}
                                className="absolute right-1 top-1/2 -translate-y-1/2 px-4 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
                            >
                                {pinging ? "Pinging..." : "PING"}
                            </button>
                        </form>

                        <div className="flex-1 flex flex-col items-center justify-center bg-black/20 rounded-xl border border-white/[0.02] p-6 relative min-h-[230px]">
                            {pinging ? (
                                <Activity className="w-10 h-10 text-primary animate-pulse" />
                            ) : pingError ? (
                                <div className="text-center">
                                    <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                                    <p className="text-xs text-red-400 font-medium px-2">{pingError}</p>
                                </div>
                            ) : pingResult ? (
                                <div className="text-center w-full">
                                    {pingResult.success && pingResult.latencyMs !== null ? (
                                        <>
                                            <div className="flex items-baseline justify-center gap-1 mb-2">
                                                <span data-testid="ping-latency-ms" className={`text-4xl font-black tracking-tighter ${pingResult.latencyMs < 50 ? "text-green-400" : pingResult.latencyMs < 120 ? "text-yellow-400" : "text-red-400"}`}>
                                                    {pingResult.latencyMs.toFixed(0)}
                                                </span>
                                                <span className="text-sm font-bold text-slate-500 dark:text-slate-300">ms avg</span>
                                            </div>
                                            <p className="text-[11px] text-slate-400 dark:text-slate-200 font-medium mb-3">Reply from <span className="font-mono text-white/70">{pingResult.host}</span></p>

                                            <div className="grid grid-cols-2 gap-2 w-full mt-2 border-t border-white/5 pt-3">
                                                <div className="flex flex-col items-center p-2 bg-black/20 rounded-lg">
                                                    <span className="text-[10px] text-slate-500 dark:text-slate-300 uppercase font-bold tracking-wider mb-0.5">Jitter</span>
                                                    <span className={`text-[13px] font-bold font-mono ${pingResult.jitterMs !== null && pingResult.jitterMs > 20 ? "text-amber-400" : "text-emerald-400"}`}>
                                                        {pingResult.jitterMs !== null ? `${pingResult.jitterMs.toFixed(1)} ms` : "---"}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col items-center p-2 bg-black/20 rounded-lg">
                                                    <span className="text-[10px] text-slate-500 dark:text-slate-300 uppercase font-bold tracking-wider mb-0.5">Loss</span>
                                                    <span className={`text-[13px] font-bold font-mono ${pingResult.packetLossPct > 0 ? "text-red-400" : "text-emerald-400"}`}>
                                                        {pingResult.packetLossPct}%
                                                    </span>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => setBaselinePing(pingResult)}
                                                className="mt-4 w-full py-2 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold rounded-lg transition-colors border border-white/10"
                                            >
                                                Set as Baseline
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <SignalHigh className="w-10 h-10 text-red-500/50 mx-auto mb-3" />
                                            <p className="text-sm font-bold text-red-400">Request Timed Out</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-300 mt-1">Host unreachable.</p>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center opacity-40">
                                    <SignalHigh className="w-8 h-8 mx-auto mb-2" />
                                    <p className="text-xs font-medium uppercase tracking-widest text-slate-500 dark:text-slate-300">Awaiting Ping</p>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bento-card overflow-hidden">
                    <div className="border-b border-border/50 p-4">
                        <h3 className="flex items-center gap-2 font-bold text-foreground">
                            <Gauge className="h-4 w-4 text-primary" />
                            Internet Speed Test
                        </h3>
                    </div>
                    <div className="flex min-h-[360px] flex-col p-5">
                        <button
                            type="button"
                            onClick={runSpeedTest}
                            disabled={speedStatus === "running"}
                            data-testid="run-speed-test"
                            className="btn-tactile inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-[13px] font-bold text-white shadow-lg shadow-primary/20 disabled:opacity-50"
                        >
                            {speedStatus === "running" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
                            {speedStatus === "running" ? "Testing..." : "Run Speed Test"}
                        </button>

                        <div className="mt-5 flex flex-1 flex-col items-center justify-center rounded-xl border border-border/50 bg-black/[0.03] p-5 text-center dark:bg-black/20">
                            {speedStatus === "running" ? (
                                <>
                                    <Wifi className="mb-4 h-10 w-10 animate-pulse text-primary" />
                                    <p className="text-sm font-bold text-foreground">Downloading from Cloudflare</p>
                                    <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-300">This measures real internet throughput and latency.</p>
                                </>
                            ) : speedResult ? (
                                <>
                                    <p data-testid="speed-download-mbps" className={`font-heading text-6xl font-black tracking-tight ${speedRating?.color}`}>
                                        {speedResult.downloadMbps.toFixed(1)}
                                    </p>
                                    <p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-300">Mbps download</p>
                                    <p className={`mt-2 text-sm font-bold ${speedRating?.color}`}>{speedRating?.label}</p>
                                    <div className="mt-5 grid w-full grid-cols-3 gap-2 border-t border-border/40 pt-4">
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-300">Ping</p>
                                            <p className="mt-1 text-xs font-bold text-foreground">{formatMetric(speedResult.pingMs, "ms", 0)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-300">Jitter</p>
                                            <p className="mt-1 text-xs font-bold text-foreground">{formatMetric(speedResult.jitterMs, "ms", 1)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-300">Loss</p>
                                            <p className="mt-1 text-xs font-bold text-foreground">{speedResult.packetLossPct.toFixed(1)}%</p>
                                        </div>
                                    </div>
                                    <p className="mt-4 text-[11px] text-slate-500 dark:text-slate-300">Server: {speedResult.serverName}</p>
                                </>
                            ) : speedError ? (
                                <div className="text-center text-red-400">
                                    <AlertCircle className="mx-auto mb-3 h-8 w-8" />
                                    <p className="text-xs font-medium">{speedError}</p>
                                </div>
                            ) : (
                                <>
                                    <Gauge className="mb-3 h-10 w-10 text-slate-500 opacity-40" />
                                    <p className="text-sm font-bold text-foreground">Ready to test internet speed</p>
                                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">Downloads a 10 MB sample and pings 1.1.1.1.</p>
                                </>
                            )}
                        </div>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bento-card overflow-hidden">
                    <div className="border-b border-border/50 p-4">
                        <h3 className="flex items-center gap-2 font-bold text-foreground">
                            <SlidersHorizontal className="h-4 w-4 text-primary" />
                            Quick Optimizations
                        </h3>
                    </div>
                    <div className="space-y-4 p-5">
                        <div className="rounded-xl border border-border/60 bg-black/[0.03] p-4 dark:bg-white/[0.04]">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-300">Target adapter</p>
                            <p className="mt-1 text-sm font-bold text-foreground">{adapterName || "No active adapter"}</p>
                            {report?.wifi && (
                                <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-300">
                                    Wi-Fi: {report.wifi.ssid} - {report.wifi.signalPct ?? "--"}% signal - {report.wifi.radioType}
                                </p>
                            )}
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                            <QuickActionButton
                                label="Clear DNS Cache"
                                description="Flush stale resolver entries after network or DNS changes."
                                disabled={isApplying}
                                onClick={() => applyNetworkAction("clear_dns_cache", "Clear DNS Cache", { adapterName: "" })}
                            />
                            <QuickActionButton
                                label="Cloudflare DNS"
                                description="Set 1.1.1.1 and 1.0.0.1 on the selected adapter."
                                disabled={isApplying || !adapterName}
                                onClick={() => applyNetworkAction("set_dns_cloudflare", "Cloudflare DNS")}
                            />
                            <QuickActionButton
                                label="Enable RSS"
                                description="Spread receive processing across CPU cores when supported."
                                disabled={isApplying}
                                onClick={() => applyNetworkAction("enable_rss", "Enable RSS", { adapterName: "" })}
                            />
                            <QuickActionButton
                                label="Prefer Ethernet"
                                description="Give wired adapters priority over Wi-Fi for lower jitter."
                                disabled={isApplying}
                                onClick={() => applyNetworkAction("prefer_ethernet", "Prefer Ethernet", { adapterName: "" })}
                            />
                        </div>

                        {actionableRecommendations.length > 0 && (
                            <div className="space-y-2 border-t border-border/40 pt-4">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-300">Recommended from scan</p>
                                {actionableRecommendations.map((recommendation) => (
                                    <button
                                        key={recommendation.id}
                                        type="button"
                                        onClick={() => applyRecommendation(recommendation)}
                                        disabled={isApplying}
                                        className="flex w-full items-start gap-3 rounded-xl border border-border/60 bg-black/[0.03] p-3 text-left hover:border-primary/40 hover:bg-primary/5 disabled:opacity-50 dark:bg-white/[0.04]"
                                    >
                                        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                                        <span>
                                            <span className="block text-xs font-bold text-foreground">{recommendation.action?.label}</span>
                                            <span className="mt-1 block text-[11px] font-medium leading-relaxed text-slate-500 dark:text-slate-300">{recommendation.summary}</span>
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>

            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15, ease: "easeOut" }} className="bento-card overflow-hidden flex flex-col min-h-[400px]">
                <div className="p-4 border-b border-border/50 bg-white/[0.01] flex items-center justify-between">
                    <h3 className="font-bold text-foreground">Active Adapters</h3>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-300 bg-white/5 px-2 py-1 rounded max-w-xs truncate">
                        {activeInterfaces.length} Found
                    </span>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {isLoading && interfaces.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full p-12 text-slate-500 dark:text-slate-300">
                            <RefreshCcw className="w-6 h-6 animate-spin mb-3 text-primary" />
                            <p className="text-sm font-medium">Reading interfaces...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center text-red-500">
                            <p className="font-bold">{error}</p>
                        </div>
                    ) : activeInterfaces.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full p-12 text-slate-500 dark:text-slate-300">
                            <Network className="w-10 h-10 opacity-30 mx-auto mb-4" />
                            <p className="font-medium text-[15px]">No active network adapters found.</p>
                            <p className="text-xs mt-1 opacity-60">Try reconnecting to Wi-Fi or Ethernet.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border/20">
                            {activeInterfaces.map((iface, i) => (
                                <div key={`${iface.name}-${i}`} className="p-5 hover:bg-white/[0.02] transition-colors relative group">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex items-start gap-4 flex-1 min-w-0">
                                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20 group-hover:bg-primary/20 transition-colors">
                                                <Network className="w-5 h-5" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h4 className="text-[15px] font-bold text-foreground truncate flex items-center gap-2">
                                                    {iface.name}
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">{iface.ipV4 || "No IPv4"}</span>
                                                </h4>
                                                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-300 uppercase tracking-wider mt-0.5">
                                                    MAC: {iface.macAddress || "Virtual / Hidden"}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6 md:gap-8 justify-end">
                                            <div className="text-right">
                                                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-300 uppercase flex items-center justify-end gap-1 mb-0.5">
                                                    <ArrowDownToLine className="w-3 h-3 text-blue-400" /> Received
                                                </p>
                                                <p className="text-[15px] font-black text-foreground tabular-nums tracking-tight">
                                                    {formatBytes(iface.receivedBytes)}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-300 uppercase flex items-center justify-end gap-1 mb-0.5">
                                                    <ArrowUpFromLine className="w-3 h-3 text-primary" /> Sent
                                                </p>
                                                <p className="text-[15px] font-black text-foreground tabular-nums tracking-tight">
                                                    {formatBytes(iface.transmittedBytes)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
