import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Search, ShieldAlert, Cpu, MemoryStick, X, MoreVertical, FolderOpen, AlertTriangle, Gamepad2 } from "lucide-react";
import { useProcesses, ProcessItem } from "../hooks/useProcesses";
import { useElevation } from "../hooks/useElevation";

type SortField = 'name' | 'cpu_usage' | 'memory_bytes' | 'pid';
type SortOrder = 'asc' | 'desc';

export function ProcessPage() {
    const { processes, isLoading, killProcess, setProcessPriority, openFileLocation } = useProcesses();
    const { isAdmin } = useElevation();
    const [search, setSearch] = useState("");

    // Default sort by memory usage highest first
    const [sortField, setSortField] = useState<SortField>('memory_bytes');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

    const [processToKill, setProcessToKill] = useState<ProcessItem | null>(null);
    const [contextMenuPid, setContextMenuPid] = useState<number | null>(null);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('desc'); // Default to desc when changing fields
        }
    };

    const filteredAndSorted = useMemo(() => {
        let result = [...processes];

        if (search) {
            const lowerSearch = search.toLowerCase();
            result = result.filter(p =>
                p.name.toLowerCase().includes(lowerSearch) ||
                p.pid.toString().includes(lowerSearch)
            );
        }

        result.sort((a, b) => {
            let comparison = 0;
            if (sortField === 'name') {
                comparison = a.name.localeCompare(b.name);
            } else if (sortField === 'cpu_usage') {
                comparison = a.cpu_usage - b.cpu_usage;
            } else if (sortField === 'memory_bytes') {
                comparison = a.memory_bytes - b.memory_bytes;
            } else if (sortField === 'pid') {
                comparison = a.pid - b.pid;
            }
            return sortOrder === 'asc' ? comparison : -comparison;
        });

        return result;
    }, [processes, search, sortField, sortOrder]);

    const formatMemory = (bytes: number) => {
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    };

    const formatCpu = (pct: number) => {
        if (pct < 0.1) return "0.0%";
        return pct.toFixed(1) + "%";
    };

    const totalMemory = useMemo(() => processes.reduce((acc, p) => acc + p.memory_bytes, 0), [processes]);
    const totalCpu = useMemo(() => processes.reduce((acc, p) => acc + p.cpu_usage, 0), [processes]);

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return <span className="text-slate-600 opacity-50 ml-1">↕</span>;
        return <span className="text-primary ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>;
    };

    // System critical processes that users should be warned about killing
    const criticalProcesses = ['explorer.exe', 'svchost.exe', 'csrss.exe', 'wininit.exe', 'services.exe', 'lsass.exe', 'smss.exe', 'winlogon.exe', 'System'];
    const isCritical = (name: string) => criticalProcesses.includes(name.toLowerCase());

    const knownGames = ['csgo.exe', 'dota2.exe', 'valorant.exe', 'vgc.exe', 'leagueoflegends.exe', 'overwatch.exe', 'wow.exe', 'ffxiv_dx11.exe', 'destiny2.exe', 'r5apex.exe', 'modernwarfare.exe', 'cyberpunk2077.exe', 'gta5.exe', 'minecraft.exe', 'javaw.exe', 'robloxplayerbeta.exe', 'eldenring.exe', 'bg3.exe', 'helldivers2.exe', 'rdr2.exe', 'rustclient.exe', 'hl2.exe', 'portal2.exe'];
    const isGame = (name: string) => knownGames.includes(name.toLowerCase());

    const confirmKill = async () => {
        if (!processToKill) return;
        await killProcess(processToKill.pid, processToKill.name);
        setProcessToKill(null);
    };

    const handlePriorityChange = async (pid: number, priority: 'Realtime' | 'High' | 'AboveNormal' | 'Normal' | 'BelowNormal' | 'Idle') => {
        await setProcessPriority(pid, priority);
        setContextMenuPid(null);
    };

    return (
        <div className="space-y-6 pb-12 relative">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
                        <Activity className="w-8 h-8 text-primary" />
                        Process <span className="text-gradient">Manager</span>
                    </h2>
                    <p className="text-slate-500 mt-2 text-[15px] font-medium leading-relaxed max-w-lg">
                        Monitor system resource usage in real-time and terminate unresponsive applications.
                    </p>
                </div>
            </motion.div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.15, ease: "easeOut" }} className="bento-card p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 border border-orange-500/20">
                        <Activity className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Total Processes</p>
                        <p className="text-2xl font-black text-foreground">{processes.length}</p>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.15, ease: "easeOut" }} className="bento-card p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
                        <MemoryStick className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Used by Processes</p>
                        <p className="text-2xl font-black text-foreground">{formatMemory(totalMemory)}</p>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.15, ease: "easeOut" }} className="bento-card p-4 flex items-center gap-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl -translate-y-1/2 translate-x-1/4 rounded-full" />
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 relative z-10">
                        <Cpu className="w-6 h-6" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Total User CPU</p>
                        <p className="text-2xl font-black text-foreground">{formatCpu(totalCpu)}</p>
                    </div>
                </motion.div>

                {!isAdmin && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.15, ease: "easeOut" }} className="bento-card p-4 flex items-center gap-4 bg-orange-500/5 border-orange-500/20">
                        <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400">
                            <ShieldAlert className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[12px] font-bold text-orange-400 uppercase tracking-wider">Limited Privileges</p>
                            <p className="text-[13px] text-slate-400 font-medium">Restart as Admin to kill any system process.</p>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* List */}
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15, ease: "easeOut" }} className="bento-card overflow-hidden flex flex-col h-[600px]">
                {/* Header Controls */}
                <div className="p-4 border-b border-border/50 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/[0.01]">
                    <div className="relative max-w-md w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Filter by name or PID..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full bg-black/20 border border-border/50 rounded-xl pl-10 pr-4 py-2 text-[14px] text-foreground placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-medium"
                        />
                    </div>
                </div>

                {/* Table Header */}
                <div className="grid grid-cols-[3fr_1fr_1fr_1.5fr_1fr] gap-4 px-6 py-3 border-b border-border/30 text-[12px] font-bold text-slate-500 uppercase tracking-wider bg-black/20 select-none">
                    <div className="cursor-pointer hover:text-slate-300" onClick={() => handleSort('name')}>
                        Name <SortIcon field="name" />
                    </div>
                    <div className="cursor-pointer hover:text-slate-300" onClick={() => handleSort('pid')}>
                        PID <SortIcon field="pid" />
                    </div>
                    <div className="cursor-pointer hover:text-slate-300 text-right" onClick={() => handleSort('cpu_usage')}>
                        CPU <SortIcon field="cpu_usage" />
                    </div>
                    <div className="cursor-pointer hover:text-slate-300 text-right" onClick={() => handleSort('memory_bytes')}>
                        Memory <SortIcon field="memory_bytes" />
                    </div>
                    <div className="text-right">Action</div>
                </div>

                {/* Table Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {isLoading && processes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500 h-full">
                            <Activity className="w-8 h-8 animate-pulse mx-auto mb-4 text-primary" />
                            <p className="font-medium">Loading active processes...</p>
                        </div>
                    ) : filteredAndSorted.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500 h-full">
                            <Search className="w-8 h-8 mx-auto mb-4 opacity-20" />
                            <p className="font-medium">No associated processes found.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border/20">
                            {filteredAndSorted.map(process => {
                                const critical = isCritical(process.name);
                                const game = isGame(process.name);
                                const highCpu = process.cpu_usage > 20;
                                const highMem = process.memory_bytes > 500 * 1024 * 1024; // 500MB

                                return (
                                    <div key={process.pid} className="grid grid-cols-[3fr_1fr_1fr_1.5fr_1fr] gap-4 px-6 py-3 items-center hover:bg-white/[0.02] transition-colors group">
                                        <div className="font-medium text-[14px] text-foreground truncate pl-1 border-l-2 border-transparent group-hover:border-primary/50 transition-colors flex items-center pr-2">
                                            <span className="truncate">{process.name}</span>
                                            {critical && (
                                                <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest bg-orange-500/10 text-orange-400 border border-orange-500/20 shrink-0 select-none">Sys</span>
                                            )}
                                            {game && (
                                                <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-widest bg-violet-500/10 text-violet-400 border border-violet-500/20 shrink-0 select-none flex items-center gap-1">
                                                    <Gamepad2 className="w-3 h-3" /> GAME
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-[13px] text-slate-400 font-mono">{process.pid}</div>
                                        <div className={`text-[13px] font-mono text-right ${highCpu ? 'text-amber-400 font-bold' : 'text-slate-300'}`}>
                                            {formatCpu(process.cpu_usage)}
                                        </div>
                                        <div className="text-[13px] font-mono text-right flex items-center justify-end relative">
                                            <span className={`mr-4 ${highMem ? 'text-primary font-bold' : 'text-slate-300'}`}>
                                                {formatMemory(process.memory_bytes)}
                                            </span>
                                        </div>
                                        <div className="text-right flex items-center justify-end gap-1">
                                            <div className="relative">
                                                <button
                                                    onClick={() => setContextMenuPid(contextMenuPid === process.pid ? null : process.pid)}
                                                    className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 outline-none"
                                                    title={`More options for ${process.name}`}
                                                >
                                                    <MoreVertical className="w-4 h-4" />
                                                </button>

                                                {/* Context Menu Dropdown */}
                                                <AnimatePresence>
                                                    {contextMenuPid === process.pid && (
                                                        <motion.div
                                                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                                            className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden text-left"
                                                        >
                                                            <div className="p-1">
                                                                <button
                                                                    onClick={() => { openFileLocation(process.pid); setContextMenuPid(null); }}
                                                                    className="w-full text-left px-3 py-2 text-[13px] text-slate-300 hover:text-white hover:bg-white/5 rounded-lg flex items-center gap-2 transition-colors"
                                                                >
                                                                    <FolderOpen className="w-4 h-4" />
                                                                    Open file location
                                                                </button>
                                                            </div>
                                                            <div className="border-t border-border/50 my-1" />
                                                            <div className="p-1">
                                                                <div className="px-3 py-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                                    Set Priority
                                                                </div>
                                                                <button onClick={() => handlePriorityChange(process.pid, 'Realtime')} className="w-full text-left px-3 py-1.5 text-[13px] text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex justify-between items-center group">
                                                                    Realtime <AlertTriangle className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                                                                </button>
                                                                <button onClick={() => handlePriorityChange(process.pid, 'High')} className="w-full text-left px-3 py-1.5 text-[13px] text-orange-400 hover:bg-orange-500/10 rounded-lg transition-colors">High</button>
                                                                <button onClick={() => handlePriorityChange(process.pid, 'AboveNormal')} className="w-full text-left px-3 py-1.5 text-[13px] text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors">Above Normal</button>
                                                                <button onClick={() => handlePriorityChange(process.pid, 'Normal')} className="w-full text-left px-3 py-1.5 text-[13px] text-slate-300 hover:bg-white/5 rounded-lg transition-colors">Normal</button>
                                                                <button onClick={() => handlePriorityChange(process.pid, 'BelowNormal')} className="w-full text-left px-3 py-1.5 text-[13px] text-slate-400 hover:bg-white/5 rounded-lg transition-colors">Below Normal</button>
                                                                <button onClick={() => handlePriorityChange(process.pid, 'Idle')} className="w-full text-left px-3 py-1.5 text-[13px] text-slate-500 hover:bg-white/5 rounded-lg transition-colors">Idle</button>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>

                                            <button
                                                onClick={() => setProcessToKill(process)}
                                                className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-red-500 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 outline-none"
                                                title={`End Task: ${process.name}`}
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Kill Confirmation Modal */}
            <AnimatePresence>
                {processToKill && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setProcessToKill(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="bg-card border border-border/80 rounded-2xl shadow-2xl p-6 max-w-md w-full relative z-10"
                        >
                            <div className="flex items-start gap-4 mb-6">
                                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
                                    <ShieldAlert className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-foreground">End Process?</h3>
                                    <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                                        Are you sure you want to forcibly terminate <span className="text-foreground font-mono bg-white/5 px-1 rounded">{processToKill.name}</span> (PID: {processToKill.pid})?
                                    </p>

                                    {isCritical(processToKill.name) && (
                                        <div className="mt-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl text-[13px] text-orange-200 leading-relaxed font-medium">
                                            <strong className="text-orange-400 block mb-1">Warning! Critical System Process</strong>
                                            Terminating this process will likely cause Windows to become unstable, freeze, or immediately crash (BSOD). Save all work before proceeding.
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3">
                                <button
                                    onClick={() => setProcessToKill(null)}
                                    className="px-4 py-2 rounded-xl text-sm font-bold text-slate-400 hover:text-foreground hover:bg-white/5 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmKill}
                                    className="px-6 py-2 rounded-xl text-sm font-bold bg-red-500 hover:bg-red-600 text-white transition-colors shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                                >
                                    Force Kill
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
