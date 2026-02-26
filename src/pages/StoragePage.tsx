import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { HardDrive, RefreshCcw, Trash2, ShieldAlert } from "lucide-react";
import { useStorage } from "../hooks/useStorage";

export function StoragePage() {
    const { items, isScanning, isCleaning, error, scan, executeCleanup } = useStorage();
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Auto-select safe items by default on load
    useMemo(() => {
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
                    onClick={scan}
                    disabled={isScanning || isCleaning}
                    className="p-2 rounded-xl bg-white/[0.02] border border-border/50 text-slate-400 hover:text-primary hover:border-primary/50 transition-colors disabled:opacity-50"
                    title="Rescan Drive"
                >
                    <RefreshCcw className={`w-5 h-5 ${isScanning ? "animate-spin" : ""}`} />
                </button>
            </motion.div>

            {/* Overview Card */}
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="bento-card p-6 overflow-hidden relative">
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
                </div>
            </motion.div>

            {/* List */}
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bento-card overflow-hidden flex flex-col min-h-[400px]">
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
        </div>
    );
}
