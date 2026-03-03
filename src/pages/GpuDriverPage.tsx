import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CircuitBoard, RefreshCw, AlertTriangle, Trash2, Clock, CheckCircle, RotateCcw, Terminal } from "lucide-react";
import { useGpuDriver } from "@/hooks/useGpuDriver";
import type { GpuDriverInfo } from "@/hooks/useGpuDriver";

type VendorFilter = "All" | "NVIDIA" | "AMD" | "Intel";

const VENDOR_COLORS: Record<string, string> = {
    NVIDIA: "bg-green-500/20 text-green-400 border-green-500/30",
    AMD: "bg-red-500/20 text-red-400 border-red-500/30",
    Intel: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    Unknown: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

function DriverCard({ driver }: { driver: GpuDriverInfo }) {
    const colorClass = VENDOR_COLORS[driver.vendor] ?? VENDOR_COLORS.Unknown;
    return (
        <div className="glass-panel p-4 rounded-xl border border-border flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <CircuitBoard className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${colorClass}`}>
                        {driver.vendor}
                    </span>
                    <span className="text-[13px] font-semibold text-foreground truncate">{driver.name}</span>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-[11px] text-slate-400 font-mono">v{driver.version}</span>
                    <span className="text-[11px] text-slate-500">{driver.date}</span>
                    {driver.infName && (
                        <span className="text-[11px] text-slate-500 font-mono bg-black/20 px-2 py-0.5 rounded">
                            {driver.infName}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

function LogLine({ line }: { line: string }) {
    const isSuccess = line.includes("✓");
    const isError = line.includes("✗");
    const cls = isSuccess
        ? "text-green-400"
        : isError
            ? "text-red-400"
            : "text-slate-300";
    return <div className={`font-mono text-[12px] ${cls} leading-5`}>{line}</div>;
}

export function GpuDriverPage() {
    const { drivers, isLoading, isRemoving, removalResult, error, fetchDrivers, uninstallDrivers, scheduleBootRemoval, rebootSystem } = useGpuDriver();
    const [vendorFilter, setVendorFilter] = useState<VendorFilter>("All");
    const [deleteDriverStore, setDeleteDriverStore] = useState(true);
    const [showRebootPrompt, setShowRebootPrompt] = useState(false);



    const handleUninstallNow = async () => {
        const vendors = vendorFilter === "All"
            ? [...new Set(drivers.map(d => d.vendor).filter(v => v !== "Unknown"))]
            : [vendorFilter];

        for (const vendor of vendors) {
            await uninstallDrivers(vendor, deleteDriverStore);
        }
        setShowRebootPrompt(true);
    };

    const handleScheduleSafeBoot = async () => {
        const vendors = vendorFilter === "All"
            ? [...new Set(drivers.map(d => d.vendor).filter(v => v !== "Unknown"))]
            : [vendorFilter];

        for (const vendor of vendors) {
            await scheduleBootRemoval(vendor);
        }
        setShowRebootPrompt(true);
    };

    const vendorTabs: VendorFilter[] = ["All", "NVIDIA", "AMD", "Intel"];

    return (
        <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <CircuitBoard className="w-5 h-5 text-primary" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-foreground">GPU Driver Cleaner</h1>
                    <p className="text-[13px] text-slate-400">DDU-style clean uninstall for display drivers</p>
                </div>
            </div>

            {/* Warning Banner */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                    <p className="text-[13px] font-semibold text-amber-300 mb-1">Important — Save Your Work First</p>
                    <p className="text-[12px] text-amber-200/80 leading-relaxed">
                        This tool removes all GPU driver files and registry entries. Your display may go blank until
                        drivers are reinstalled. Save all open work before proceeding.
                    </p>
                </div>
            </div>

            {/* Detected Drivers */}
            <div className="glass-panel rounded-2xl border border-border overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                    <h2 className="text-[14px] font-semibold text-foreground">Detected GPU Drivers</h2>
                    <button
                        onClick={fetchDrivers}
                        disabled={isLoading}
                        className="flex items-center gap-1.5 text-[12px] text-slate-400 hover:text-foreground transition-colors"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                        Refresh
                    </button>
                </div>
                <div className="p-4 flex flex-col gap-3">
                    {isLoading ? (
                        <div className="flex items-center gap-2 py-4 text-slate-400 text-[13px]">
                            <div className="w-4 h-4 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
                            Scanning installed drivers...
                        </div>
                    ) : error ? (
                        <p className="text-[13px] text-red-400 py-4">{error}</p>
                    ) : drivers.length === 0 ? (
                        <p className="text-[13px] text-slate-400 py-4">No display drivers found.</p>
                    ) : (
                        drivers.map(d => <DriverCard key={d.pnpId || d.name} driver={d} />)
                    )}
                </div>
            </div>

            {/* Clean Uninstall */}
            <div className="glass-panel rounded-2xl border border-border overflow-hidden">
                <div className="px-5 py-4 border-b border-border">
                    <h2 className="text-[14px] font-semibold text-foreground">Clean Uninstall</h2>
                </div>
                <div className="p-5 flex flex-col gap-5">
                    {/* Vendor tabs */}
                    <div className="flex gap-1.5 flex-wrap">
                        {vendorTabs.map(v => (
                            <button
                                key={v}
                                onClick={() => setVendorFilter(v)}
                                className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${vendorFilter === v
                                    ? "bg-primary text-white"
                                    : "bg-white/5 text-slate-400 hover:text-foreground hover:bg-white/10"
                                    }`}
                            >
                                {v}
                            </button>
                        ))}
                    </div>

                    {/* Driver store option */}
                    <label className="flex items-start gap-3 cursor-pointer group">
                        <div
                            onClick={() => setDeleteDriverStore(v => !v)}
                            className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center shrink-0 transition-colors ${deleteDriverStore
                                ? "bg-primary border-primary"
                                : "border-border bg-transparent"
                                }`}
                        >
                            {deleteDriverStore && <span className="text-white text-[10px] font-bold leading-none">✓</span>}
                        </div>
                        <div>
                            <p className="text-[13px] font-medium text-foreground">Delete from Driver Store</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                                Prevents Windows Update from automatically reinstalling this driver version
                            </p>
                        </div>
                    </label>

                    {/* Info box */}
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <Clock className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                        <p className="text-[12px] text-blue-200/80 leading-relaxed">
                            <strong className="text-blue-300">Recommended:</strong> Use "Schedule Safe Mode Boot" for the cleanest removal.
                            Reboot into Safe Mode and the cleanup runs automatically on login.
                        </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-3 flex-wrap">
                        <button
                            onClick={handleUninstallNow}
                            disabled={isRemoving || drivers.length === 0}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 text-[13px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isRemoving ? (
                                <div className="w-4 h-4 border-2 border-red-400/40 border-t-red-400 rounded-full animate-spin" />
                            ) : (
                                <Trash2 className="w-4 h-4" />
                            )}
                            Uninstall Now
                        </button>

                        <button
                            onClick={handleScheduleSafeBoot}
                            disabled={isRemoving || drivers.length === 0}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[13px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Schedule Safe Mode Boot
                        </button>
                    </div>
                </div>
            </div>

            {/* Removal Log */}
            <AnimatePresence>
                {removalResult && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="glass-panel rounded-2xl border border-border overflow-hidden"
                    >
                        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                            <div className="flex items-center gap-2">
                                <Terminal className="w-4 h-4 text-slate-400" />
                                <h2 className="text-[14px] font-semibold text-foreground">Removal Log</h2>
                            </div>
                            {removalResult.success ? (
                                <span className="text-[11px] font-semibold text-green-400 flex items-center gap-1">
                                    <CheckCircle className="w-3.5 h-3.5" /> Success
                                </span>
                            ) : (
                                <span className="text-[11px] font-semibold text-red-400">Failed</span>
                            )}
                        </div>
                        <div className="p-4 max-h-56 overflow-y-auto bg-black/20 rounded-b-2xl">
                            {removalResult.log.map((line, i) => (
                                <LogLine key={i} line={line} />
                            ))}
                        </div>
                        {removalResult.requiresReboot && showRebootPrompt && (
                            <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-amber-500/5">
                                <p className="text-[12px] text-amber-300">Reboot required to complete driver removal</p>
                                <button
                                    onClick={rebootSystem}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[12px] font-semibold transition-colors"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    Restart Now
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
