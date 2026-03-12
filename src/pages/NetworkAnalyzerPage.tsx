import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Network, Activity, ArrowDownToLine, ArrowUpFromLine, SignalHigh, Globe2, AlertCircle } from "lucide-react";
import { useNetwork, PingResult } from "../hooks/useNetwork";

export function NetworkAnalyzerPage() {
    const { interfaces, isLoading, error, pingHost, pinging, pingResult, pingError } = useNetwork();
    const [targetHost, setTargetHost] = useState("8.8.8.8");
    const [baselinePing, setBaselinePing] = useState<PingResult | null>(null);

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB", "TB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
    };

    // Filter out loopback or totally inactive interfaces to keep the UI clean
    const activeInterfaces = useMemo(() => {
        return interfaces.filter(iface =>
            iface.name.toLowerCase() !== "lo" &&
            !iface.name.toLowerCase().includes("loopback") &&
            (iface.receivedBytes > 0 || iface.transmittedBytes > 0)
        ).sort((a, b) => b.receivedBytes - a.receivedBytes); // Sort by highest download size
    }, [interfaces]);

    const handlePing = (e: React.FormEvent) => {
        e.preventDefault();
        pingHost(targetHost);
    };

    return (
        <div className="space-y-6 pb-12">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
                        <Network className="w-8 h-8 text-primary" />
                        Network <span className="text-gradient">Analyzer</span>
                    </h2>
                    <p className="text-slate-500 dark:text-slate-300 mt-2 text-[15px] font-medium leading-relaxed max-w-lg">
                        Monitor active network adapters and test latency to ensure connection health and stability.
                    </p>
                </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Ping Tester Widget */}
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.15, ease: "easeOut" }} className="lg:col-span-1 border border-border/50 bg-card rounded-2xl overflow-hidden shadow-sm flex flex-col">
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
                                {pinging ? 'Pinging...' : 'PING'}
                            </button>
                        </form>

                        <div className="flex-1 flex flex-col items-center justify-center bg-black/20 rounded-xl border border-white/[0.02] p-6 relative">
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
                                                <span className={`text-4xl font-black tracking-tighter ${pingResult.latencyMs !== null && pingResult.latencyMs < 50 ? 'text-green-400' : pingResult.latencyMs !== null && pingResult.latencyMs < 120 ? 'text-yellow-400' : 'text-red-400'}`}>
                                                    {pingResult.latencyMs !== null ? pingResult.latencyMs.toFixed(0) : "N/A"}
                                                </span>
                                                <span className="text-sm font-bold text-slate-500 dark:text-slate-300">ms avg</span>
                                            </div>
                                            <p className="text-[11px] text-slate-400 dark:text-slate-200 font-medium mb-3">Reply from <span className="font-mono text-white/70">{pingResult.host}</span></p>

                                            <div className="grid grid-cols-2 gap-2 w-full mt-2 border-t border-white/5 pt-3">
                                                <div className="flex flex-col items-center p-2 bg-black/20 rounded-lg">
                                                    <span className="text-[10px] text-slate-500 dark:text-slate-300 uppercase font-bold tracking-wider mb-0.5">Jitter</span>
                                                    <span className={`text-[13px] font-bold font-mono ${pingResult.jitterMs !== null && pingResult.jitterMs > 20 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                                        {pingResult.jitterMs !== null ? `${pingResult.jitterMs.toFixed(1)} ms` : "---"}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col items-center p-2 bg-black/20 rounded-lg">
                                                    <span className="text-[10px] text-slate-500 dark:text-slate-300 uppercase font-bold tracking-wider mb-0.5">Loss</span>
                                                    <span className={`text-[13px] font-bold font-mono ${pingResult.packetLossPct > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                                        {pingResult.packetLossPct}%
                                                    </span>
                                                </div>
                                                <div className="flex flex-col items-center p-2 bg-black/20 rounded-lg col-span-2 flex-row justify-around">
                                                    <div className="text-center">
                                                        <span className="text-[10px] text-slate-500 dark:text-slate-300 uppercase font-bold tracking-wider mx-2">Min</span>
                                                        <span className="text-[12px] font-mono text-slate-300">{pingResult.minMs !== null ? `${pingResult.minMs.toFixed(0)} ms` : "---"}</span>
                                                    </div>
                                                    <div className="text-center">
                                                        <span className="text-[10px] text-slate-500 dark:text-slate-300 uppercase font-bold tracking-wider mx-2">Max</span>
                                                        <span className="text-[12px] font-mono text-slate-300">{pingResult.maxMs !== null ? `${pingResult.maxMs.toFixed(0)} ms` : "---"}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-4 pt-3 border-t border-white/5 w-full flex flex-col gap-2">
                                                <button
                                                    onClick={() => setBaselinePing(pingResult)}
                                                    className="w-full py-2 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold rounded-lg transition-colors border border-white/10"
                                                >
                                                    Set as Baseline (Before)
                                                </button>

                                                {baselinePing && baselinePing !== pingResult && (
                                                    <div className="mt-2 p-3 bg-primary/5 border border-primary/20 rounded-xl text-left w-full">
                                                        <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2 flex items-center gap-2">
                                                            <Activity className="w-3 h-3" /> Comparison vs Baseline
                                                        </p>
                                                        <div className="flex justify-between items-center text-xs">
                                                            <span className="text-slate-400 dark:text-slate-200">Lat. Delta:</span>
                                                            <span className={`font-mono font-bold ${(pingResult.latencyMs || 0) < (baselinePing.latencyMs || 0) ? 'text-green-400' : (pingResult.latencyMs || 0) > (baselinePing.latencyMs || 0) ? 'text-red-400' : 'text-slate-300'}`}>
                                                                {pingResult.latencyMs !== null && baselinePing.latencyMs !== null
                                                                    ? `${(pingResult.latencyMs - baselinePing.latencyMs) > 0 ? '+' : ''}${(pingResult.latencyMs - baselinePing.latencyMs).toFixed(1)} ms`
                                                                    : '---'}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-xs mt-1">
                                                            <span className="text-slate-400 dark:text-slate-200">Jitter Delta:</span>
                                                            <span className={`font-mono font-bold ${(pingResult.jitterMs || 0) < (baselinePing.jitterMs || 0) ? 'text-green-400' : (pingResult.jitterMs || 0) > (baselinePing.jitterMs || 0) ? 'text-red-400' : 'text-slate-300'}`}>
                                                                {pingResult.jitterMs !== null && baselinePing.jitterMs !== null
                                                                    ? `${(pingResult.jitterMs - baselinePing.jitterMs) > 0 ? '+' : ''}${(pingResult.jitterMs - baselinePing.jitterMs).toFixed(1)} ms`
                                                                    : '---'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
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

                {/* Interfaces List */}
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15, ease: "easeOut" }} className="lg:col-span-2 bento-card overflow-hidden flex flex-col min-h-[400px]">
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

                                            {/* Adapter Identity */}
                                            <div className="flex items-start gap-4 flex-1 mix-w-0">
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

                                            {/* Data Usage */}
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
        </div>
    );
}

// Ensure RefreshCcw is imported if used (added inline above where missing from lucide)
import { RefreshCcw } from "lucide-react";
