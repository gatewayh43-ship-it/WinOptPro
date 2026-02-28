import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Cpu, RefreshCw, Download, AlertTriangle, CheckCircle2, Loader2, Search } from "lucide-react";
import { useDrivers } from "../hooks/useDrivers";

export function DriverManagerPage() {
    const {
        drivers,
        allDrivers,
        isLoading,
        error,
        filter,
        setFilter,
        fetchDrivers,
        exportList,
        unsignedCount,
    } = useDrivers();

    const [search, setSearch] = useState("");
    const savePath = "C:\\Users\\Public\\Documents\\drivers.json";

    useEffect(() => {
        fetchDrivers();
    }, []);

    const displayed = drivers.filter(d =>
        !search.trim() ||
        d.device_name.toLowerCase().includes(search.toLowerCase()) ||
        d.provider.toLowerCase().includes(search.toLowerCase()) ||
        d.device_class.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full overflow-hidden p-6 max-w-[1200px] mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
                        Driver <span className="text-gradient">Manager</span>
                    </h2>
                    <p className="text-slate-500 mt-2 text-[15px] font-medium leading-relaxed max-w-lg">
                        View installed device drivers, identify unsigned drivers, and export the full driver inventory.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => exportList(savePath)}
                        disabled={isLoading || allDrivers.length === 0}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-surface hover:bg-white/5 font-bold text-sm transition-colors disabled:opacity-50"
                        title={`Export to: ${savePath}`}
                    >
                        <Download className="w-4 h-4" />
                        Export JSON
                    </button>
                    <button
                        onClick={fetchDrivers}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-surface hover:bg-white/5 font-bold text-sm transition-colors disabled:opacity-50"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        Refresh
                    </button>
                </div>
            </div>

            {/* Summary bar */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bento-card p-4 text-center">
                    <p className="text-2xl font-black text-foreground">{allDrivers.length}</p>
                    <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-1">Total Drivers</p>
                </div>
                <div className="bento-card p-4 text-center">
                    <p className="text-2xl font-black text-emerald-400">{allDrivers.length - unsignedCount}</p>
                    <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-1">Signed</p>
                </div>
                <div className="bento-card p-4 text-center">
                    <p className={`text-2xl font-black ${unsignedCount > 0 ? "text-amber-400" : "text-slate-400"}`}>{unsignedCount}</p>
                    <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-1">Unsigned</p>
                </div>
            </div>

            {/* Filter + Search */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex gap-2">
                    {(["all", "signed", "unsigned"] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-colors border ${
                                filter === f
                                    ? "bg-primary/10 border-primary/30 text-primary"
                                    : "border-border text-slate-500 hover:text-foreground hover:border-white/20"
                            }`}
                        >
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search drivers, providers, classes..."
                        className="w-full pl-9 pr-4 py-2 bg-surface border border-border rounded-xl text-sm text-foreground placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar bento-card">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="w-10 h-10 text-primary animate-spin" />
                        <p className="text-slate-400 font-medium">Loading drivers (this may take a moment)...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
                        <AlertTriangle className="w-10 h-10 opacity-40" />
                        <p className="font-semibold">Failed to load drivers</p>
                        <p className="text-[12px] text-slate-600 max-w-xs text-center">{error}</p>
                    </div>
                ) : displayed.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
                        <Cpu className="w-10 h-10 opacity-30" />
                        <p className="font-semibold">{search ? "No drivers match your search" : "No drivers found"}</p>
                    </div>
                ) : (
                    <table className="w-full text-[12px]">
                        <thead className="sticky top-0 bg-card border-b border-border z-10">
                            <tr>
                                <th className="text-left px-4 py-3 text-slate-500 font-bold uppercase tracking-widest text-[10px]">Device</th>
                                <th className="text-left px-4 py-3 text-slate-500 font-bold uppercase tracking-widest text-[10px] hidden md:table-cell">Class</th>
                                <th className="text-left px-4 py-3 text-slate-500 font-bold uppercase tracking-widest text-[10px] hidden lg:table-cell">Provider</th>
                                <th className="text-left px-4 py-3 text-slate-500 font-bold uppercase tracking-widest text-[10px] hidden lg:table-cell">Version</th>
                                <th className="text-left px-4 py-3 text-slate-500 font-bold uppercase tracking-widest text-[10px] hidden xl:table-cell">Date</th>
                                <th className="text-left px-4 py-3 text-slate-500 font-bold uppercase tracking-widest text-[10px]">Signed</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayed.map((d, i) => (
                                <motion.tr
                                    key={`${d.inf_name}-${i}`}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: Math.min(i * 0.01, 0.3) }}
                                    className="border-b border-border/50 hover:bg-white/[0.02] transition-colors"
                                >
                                    <td className="px-4 py-3">
                                        <p className="font-medium text-foreground truncate max-w-[200px]" title={d.device_name}>{d.device_name}</p>
                                        <p className="text-slate-600 font-mono text-[10px] mt-0.5">{d.inf_name}</p>
                                    </td>
                                    <td className="px-4 py-3 hidden md:table-cell">
                                        <span className="px-2 py-0.5 rounded-md bg-white/5 border border-border text-[10px] font-bold text-slate-400">{d.device_class || "—"}</span>
                                    </td>
                                    <td className="px-4 py-3 text-slate-400 hidden lg:table-cell">{d.provider || "—"}</td>
                                    <td className="px-4 py-3 text-slate-400 font-mono hidden lg:table-cell">{d.version || "—"}</td>
                                    <td className="px-4 py-3 text-slate-500 hidden xl:table-cell">{d.date || "—"}</td>
                                    <td className="px-4 py-3">
                                        {d.is_signed ? (
                                            <span className="flex items-center gap-1 text-emerald-400 text-[11px] font-bold">
                                                <CheckCircle2 className="w-3.5 h-3.5" /> Signed
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-amber-400 text-[11px] font-bold">
                                                <AlertTriangle className="w-3.5 h-3.5" /> Unsigned
                                            </span>
                                        )}
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
