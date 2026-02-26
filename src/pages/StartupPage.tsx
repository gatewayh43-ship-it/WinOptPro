import { motion } from "framer-motion";
import { useStartupItems } from "../hooks/useStartupItems";
import { RefreshCcw, Search, Power, Settings2, Trash2 } from "lucide-react";
import { useState } from "react";

export function StartupPage() {
    const { items, isLoading, error, refresh, toggleItem } = useStartupItems();
    const [search, setSearch] = useState("");

    const filteredItems = items.filter(
        i => i.name.toLowerCase().includes(search.toLowerCase()) ||
            i.command.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6 pb-12">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
                        <Power className="w-8 h-8 text-primary" />
                        Startup <span className="text-gradient">Manager</span>
                    </h2>
                    <p className="text-slate-500 mt-2 text-[15px] font-medium leading-relaxed max-w-lg">
                        Control which applications launch automatically when Windows starts. Maximize your boot speed.
                    </p>
                </div>

                <button
                    onClick={refresh}
                    disabled={isLoading}
                    className="p-2 rounded-xl bg-white/[0.02] border border-border/50 text-slate-400 hover:text-primary hover:border-primary/50 transition-colors disabled:opacity-50"
                    title="Refresh List"
                >
                    <RefreshCcw className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
                </button>
            </motion.div>

            {/* Search */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search startup items by name or path..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-black/20 border border-border/50 rounded-2xl pl-12 pr-4 py-4 text-[15px] text-foreground placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all font-medium"
                    />
                </div>
            </motion.div>

            {/* List */}
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bento-card overflow-hidden">
                <div className="p-4 border-b border-border/50 flex items-center justify-between bg-white/[0.01]">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-300">
                        <Settings2 className="w-4 h-4 text-primary" />
                        {items.length} Startup Items Detected
                    </div>
                </div>

                {isLoading && items.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">
                        <RefreshCcw className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                        <p>Scanning registry run keys...</p>
                    </div>
                ) : error ? (
                    <div className="p-12 text-center">
                        <p className="text-red-400 font-medium bg-red-500/10 px-4 py-2 rounded-lg inline-block border border-red-500/20">{error}</p>
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">
                        <Trash2 className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p>No startup items found.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border/30">
                        {filteredItems.map(item => (
                            <div key={item.id} className="p-4 hover:bg-white/[0.02] transition-colors flex items-center justify-between group">
                                <div className="flex items-start gap-4 flex-1 min-w-0 pr-4">
                                    <div className="mt-1">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${item.enabled ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-slate-800/50 border-slate-700/50 text-slate-500'}`}>
                                            <Power className="w-5 h-5" />
                                        </div>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className={`text-[15px] font-bold truncate ${item.enabled ? 'text-foreground' : 'text-slate-400'}`}>
                                                {item.name}
                                            </h4>
                                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/[0.05] text-slate-400 border border-white/[0.05]">
                                                {item.location.split('\\')[0]}
                                            </span>
                                        </div>
                                        <p className="text-[12px] text-slate-500 font-mono truncate bg-black/20 px-2 py-1 rounded inline-block max-w-full">
                                            {item.command}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex-shrink-0">
                                    <button
                                        onClick={() => toggleItem(item.id, item.enabled)}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background ${item.enabled ? 'bg-primary' : 'bg-slate-700'}`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${item.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </motion.div>
        </div>
    );
}
