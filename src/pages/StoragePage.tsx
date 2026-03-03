import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { HardDrive, RefreshCcw, Trash2, ShieldAlert, Clock, Plus, PlayCircle, X, Loader2, Database, Thermometer, AlertTriangle } from "lucide-react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { useStorage } from "../hooks/useStorage";
import { useScheduler, PREDEFINED_TASKS } from "../hooks/useScheduler";
import { useToast } from "@/components/ToastSystem";

interface DiskSmartInfo {
    friendlyName: string;
    mediaType: string;
    healthStatus: string;
    wearPct: number | null;
    temperatureC: number | null;
    readErrors: number | null;
    writeErrors: number | null;
    sizeGb: number;
}

function DriveHealthSection() {
    const [disks, setDisks] = useState<DiskSmartInfo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isTrimming, setIsTrimming] = useState(false);
    const { addToast } = useToast();

    useEffect(() => {
        if (!isTauri()) {
            setDisks([
                { friendlyName: "Samsung SSD 980 PRO 1TB", mediaType: "SSD", healthStatus: "Healthy", wearPct: 12, temperatureC: 38, readErrors: 0, writeErrors: 0, sizeGb: 931 },
                { friendlyName: "Seagate Barracuda 2TB", mediaType: "HDD", healthStatus: "Healthy", wearPct: null, temperatureC: 32, readErrors: 0, writeErrors: 0, sizeGb: 1863 },
            ]);
            setIsLoading(false);
            return;
        }
        invoke<DiskSmartInfo[]>("get_disk_smart_status")
            .then(setDisks)
            .catch(() => { })
            .finally(() => setIsLoading(false));
    }, []);

    const runTrim = async () => {
        setIsTrimming(true);
        try {
            const ok = await invoke<boolean>("run_trim_optimization");
            addToast({ type: ok ? "success" : "error", title: ok ? "TRIM complete" : "TRIM failed", message: ok ? "Drive C: optimized successfully." : "Run WinOpt Pro as Administrator." });
        } catch (e) {
            addToast({ type: "error", title: "Error", message: String(e) });
        } finally {
            setIsTrimming(false);
        }
    };

    const healthColor = (s: string) =>
        s === "Healthy" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            : s === "Warning" ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                : "bg-red-500/10 text-red-400 border-red-500/20";

    const mediaLabel = (m: string) =>
        m === "SSD" ? "SSD" : m === "HDD" ? "HDD" : m === "SCM" ? "NVMe" : m || "Disk";

    const hasSSD = disks.some(d => d.mediaType === "SSD" || d.mediaType === "SCM");

    return (
        <div className="bento-card p-5 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-primary" />
                    <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">Drive Health</span>
                </div>
                {hasSSD && (
                    <button
                        onClick={runTrim}
                        disabled={isTrimming}
                        title="Run TRIM on C: (requires admin)"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary text-[11px] font-bold transition-colors disabled:opacity-50"
                    >
                        {isTrimming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCcw className="w-3.5 h-3.5" />}
                        Run TRIM
                    </button>
                )}
            </div>

            {isLoading ? (
                <div className="flex items-center gap-2 text-slate-500 text-[12px] py-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Reading drive health...
                </div>
            ) : disks.length === 0 ? (
                <p className="text-[12px] text-slate-600 py-2">No physical disks detected.</p>
            ) : (
                <div className="space-y-3">
                    {disks.map((disk, i) => (
                        <div key={i} className="p-3 rounded-xl border border-border bg-white/[0.02] space-y-2">
                            <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-[13px] font-semibold text-foreground truncate">{disk.friendlyName}</p>
                                    <p className="text-[11px] text-slate-500">{mediaLabel(disk.mediaType)} · {disk.sizeGb} GB</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {disk.temperatureC != null && (
                                        <span className="flex items-center gap-1 text-[11px] text-slate-400">
                                            <Thermometer className="w-3 h-3" /> {disk.temperatureC}°C
                                        </span>
                                    )}
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${healthColor(disk.healthStatus)}`}>
                                        {disk.healthStatus}
                                    </span>
                                </div>
                            </div>

                            {(disk.mediaType === "SSD" || disk.mediaType === "SCM") && (
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[11px]">
                                        <span className="text-slate-500">Wear</span>
                                        <span className="text-slate-400 font-medium">
                                            {disk.wearPct != null ? `${disk.wearPct}%` : "N/A"}
                                        </span>
                                    </div>
                                    {disk.wearPct != null && (
                                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all ${disk.wearPct > 80 ? "bg-red-500" : disk.wearPct > 50 ? "bg-amber-500" : "bg-emerald-500"
                                                    }`}
                                                style={{ width: `${disk.wearPct}%` }}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {((disk.readErrors ?? 0) > 0 || (disk.writeErrors ?? 0) > 0) && (
                                <div className="flex items-center gap-1.5 text-[11px] text-red-400">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    R errors: {disk.readErrors ?? 0} · W errors: {disk.writeErrors ?? 0}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function ScheduledMaintenanceSection() {
    const { tasks, isLoading, isWorking, fetchTasks, createTask, deleteTask, runNow } = useScheduler();
    const [showAdd, setShowAdd] = useState(false);

    useEffect(() => { fetchTasks(); }, []);

    return (
        <div className="bento-card p-5 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">Scheduled Maintenance</span>
                </div>
                <button
                    onClick={() => setShowAdd(v => !v)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary text-[11px] font-bold transition-colors"
                >
                    <Plus className="w-3.5 h-3.5" /> Add Schedule
                </button>
            </div>

            {showAdd && (
                <div className="space-y-2 p-3 rounded-xl border border-border bg-white/[0.02]">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">Predefined Tasks</p>
                    {PREDEFINED_TASKS.map(task => (
                        <div key={task.name} className="flex items-center justify-between gap-3 py-2">
                            <div>
                                <p className="text-[13px] font-semibold text-foreground">{task.label}</p>
                                <p className="text-[11px] text-slate-500">{task.description}</p>
                            </div>
                            <button
                                onClick={() => createTask(task.name, task.schedule, task.action_cmd)}
                                disabled={isWorking}
                                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border hover:border-primary/30 text-[11px] font-bold transition-colors disabled:opacity-50"
                            >
                                {isWorking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                                Schedule {task.schedule.charAt(0) + task.schedule.slice(1).toLowerCase()}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {isLoading ? (
                <div className="flex items-center gap-2 text-slate-500 text-[12px] py-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading tasks...
                </div>
            ) : tasks.length === 0 ? (
                <p className="text-[12px] text-slate-600 py-2">No maintenance tasks scheduled. Click "Add Schedule" to create one.</p>
            ) : (
                <div className="space-y-2">
                    {tasks.map(task => (
                        <div key={task.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border bg-white/[0.02]">
                            <div className="min-w-0">
                                <p className="text-[13px] font-semibold text-foreground truncate">{task.name}</p>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                    {task.schedule} · Last: {task.last_run} · Next: {task.next_run}
                                </p>
                            </div>
                            <div className="flex gap-1.5 shrink-0">
                                <button
                                    onClick={() => runNow(task.name)}
                                    title="Run Now"
                                    className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-slate-500 hover:text-emerald-400 transition-colors"
                                >
                                    <PlayCircle className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => deleteTask(task.name)}
                                    title="Delete Task"
                                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export function StoragePage() {
    const { items, diskHealth, isScanning, isCleaning, error, scan, executeCleanup } = useStorage();
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Auto-select all items when scan results first load
    useEffect(() => {
        if (items.length > 0 && selectedIds.size === 0) {
            setSelectedIds(new Set(items.map(i => i.id)));
        }
    }, [items]);

    const handleToggleSelect = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const handleSelectAll = (select: boolean) => {
        if (select) setSelectedIds(new Set(items.map(i => i.id)));
        else setSelectedIds(new Set());
    };

    const totalCalculatedBytes = useMemo(() => {
        return items.reduce((acc, item) => acc + item.size_bytes, 0);
    }, [items]);

    const totalSelectedBytes = useMemo(() => {
        return items.filter(i => selectedIds.has(i.id)).reduce((acc, item) => acc + item.size_bytes, 0);
    }, [items, selectedIds]);

    const formatSize = (bytes: number) => {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
    };

    return (
        <div className="space-y-6 pb-12">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
                        <HardDrive className="w-8 h-8 text-primary" />
                        Storage <span className="text-gradient">Optimizer</span>
                    </h2>
                    <p className="text-slate-500 mt-2 text-[15px] font-medium leading-relaxed max-w-lg">
                        Reclaim disk space by safely removing temporary files, system caches, and application junk.
                    </p>
                </div>

                <button
                    onClick={() => scan(true)}
                    disabled={isScanning}
                    className="px-5 py-2.5 bg-white/[0.03] hover:bg-white/[0.08] text-white text-[13px] font-bold rounded-xl flex items-center gap-2 border border-white/10 transition-colors disabled:opacity-50 shadow-sm"
                    title="Rescan Drive"
                >
                    <RefreshCcw className={`w-5 h-5 ${isScanning ? "animate-spin" : ""}`} />
                </button>
            </motion.div>

            {/* Overview Card */}
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.15, ease: "easeOut" }} className="bento-card p-6 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
                    <div>
                        <p className="text-[13px] font-bold text-slate-400 uppercase tracking-widest mb-1">Potential Savings</p>
                        <div className="flex items-baseline gap-2 text-foreground">
                            <span className="text-5xl font-black tabular-nums tracking-tight">
                                {isScanning ? "..." : formatSize(totalCalculatedBytes).split(" ")[0]}
                            </span>
                            <span className="text-xl font-bold text-slate-500">
                                {isScanning ? "" : formatSize(totalCalculatedBytes).split(" ")[1]}
                            </span>
                        </div>
                        {!isScanning && totalCalculatedBytes > 0 && (
                            <p className="text-[13px] text-slate-500 font-medium mt-2">
                                <span className="text-primary font-bold">{formatSize(totalSelectedBytes)}</span> selected for cleanup
                            </p>
                        )}
                    </div>

                    {diskHealth.length > 0 && (
                        <div className="flex flex-col gap-2 relative z-10 w-full md:w-auto md:min-w-[280px]">
                            <p className="text-[13px] font-bold text-slate-400 uppercase tracking-widest mb-1 text-left md:text-right">Disk Health Info</p>
                            <div className="flex flex-col gap-2">
                                {diskHealth.map((disk, idx) => (
                                    <div key={idx} className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-black/20 border border-white/[0.05]">
                                        <div className="flex flex-col text-left mr-auto">
                                            <span className="text-sm font-bold text-foreground truncate max-w-[200px]" title={disk.name}>{disk.name}</span>
                                            <span className="text-xs text-slate-500 font-mono">{disk.media_type === "3" ? "HDD" : disk.media_type === "4" ? "SSD" : disk.media_type === "5" ? "SCM" : disk.media_type === "Unknown" ? "Unknown" : disk.media_type}</span>
                                        </div>
                                        <div className={`px-2.5 py-1 rounded text-xs font-bold tracking-widest uppercase ${disk.health_status === 'Healthy' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                            {disk.health_status}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>

            {/* List */}
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15, ease: "easeOut" }} className="bento-card overflow-hidden flex flex-col min-h-[400px]">
                <div className="p-4 border-b border-border/50 flex items-center justify-between bg-white/[0.01]">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => handleSelectAll(selectedIds.size !== items.length)}
                            disabled={isScanning || items.length === 0}
                            className="flex items-center justify-center w-5 h-5 rounded border border-slate-600 bg-transparent data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-colors disabled:opacity-50"
                            data-state={selectedIds.size === items.length && items.length > 0 ? "checked" : "unchecked"}
                        >
                            {selectedIds.size === items.length && items.length > 0 && <span className="w-2.5 h-2.5 bg-white rounded-sm" />}
                        </button>
                        <span className="text-sm font-bold text-slate-300">
                            {items.length} Categories Found
                        </span>
                    </div>

                    <button
                        onClick={() => executeCleanup(Array.from(selectedIds))}
                        disabled={selectedIds.size === 0 || isCleaning || isScanning}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-bold text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]"
                    >
                        {isCleaning ? (
                            <><RefreshCcw className="w-4 h-4 animate-spin" /> Cleaning...</>
                        ) : (
                            <><Trash2 className="w-4 h-4" /> Clean Selected</>
                        )}
                    </button>
                </div>

                {isScanning && items.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-500">
                        <RefreshCcw className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                        <p className="font-medium">Deep scanning temp directories...</p>
                        <p className="text-xs mt-2 opacity-60">This may take a few moments depending on drive speed.</p>
                    </div>
                ) : error ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                        <ShieldAlert className="w-10 h-10 text-red-500 mb-4 mx-auto" />
                        <p className="text-red-400 font-medium bg-red-500/10 px-4 py-2 rounded-xl inline-block border border-red-500/20">{error}</p>
                    </div>
                ) : items.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-500">
                        <HardDrive className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p className="font-medium text-[15px]">Your system is clean.</p>
                        <p className="text-xs mt-1 opacity-60">No temporary files or junk data found.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border/30 overflow-y-auto">
                        {items.map(item => {
                            const isSelected = selectedIds.has(item.id);
                            return (
                                <div
                                    key={item.id}
                                    className={`p-4 transition-colors flex items-start gap-4 group cursor-pointer ${isSelected ? 'bg-white/[0.03]' : 'hover:bg-white/[0.01]'}`}
                                    onClick={() => handleToggleSelect(item.id)}
                                >
                                    <div className="mt-1 flex-shrink-0">
                                        <div
                                            className="flex items-center justify-center w-5 h-5 rounded border border-slate-600 bg-transparent data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-colors"
                                            data-state={isSelected ? "checked" : "unchecked"}
                                        >
                                            {isSelected && <span className="w-2.5 h-2.5 bg-white rounded-sm" />}
                                        </div>
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className={`text-[15px] font-bold truncate ${isSelected ? 'text-foreground' : 'text-slate-300'}`}>
                                                    {item.category}
                                                </h4>
                                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-black/30 text-slate-400 border border-white/[0.05] truncate max-w-[150px] sm:max-w-[300px]">
                                                    {item.path}
                                                </span>
                                            </div>
                                            <span className={`text-[13px] font-bold tabular-nums whitespace-nowrap ${isSelected ? 'text-primary' : 'text-slate-500'}`}>
                                                {formatSize(item.size_bytes)}
                                            </span>
                                        </div>
                                        <p className="text-[12px] text-slate-500 leading-relaxed max-w-3xl">
                                            {item.description}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </motion.div>

            {/* Drive Health */}
            <DriveHealthSection />

            {/* Scheduled Maintenance */}
            <ScheduledMaintenanceSection />
        </div>
    );
}
