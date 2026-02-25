import { useState } from "react";
import tweaksData from "../data/tweaks.json";
import { Info, AlertTriangle, ShieldCheck, Cpu, Code2, Zap, X, Filter } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function TweaksPage({ categoryTitle }: { categoryTitle: string }) {
    const [selectedTweaks, setSelectedTweaks] = useState<string[]>([]);
    const [activeTweak, setActiveTweak] = useState<typeof tweaksData[0] | null>(null);
    const [filterRisk, setFilterRisk] = useState<string>("All");

    const tweaks = tweaksData.filter(t => t.category === categoryTitle);
    const visibleTweaks = tweaks.filter(t => filterRisk === "All" || t.riskLevel === filterRisk);

    const toggleTweak = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedTweaks(prev =>
            prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
        );
    };

    const riskStyles: Record<string, { badge: string, dot: string }> = {
        Green:  { badge: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", dot: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" },
        Yellow: { badge: "text-amber-400 bg-amber-500/10 border-amber-500/20",       dot: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" },
        Red:    { badge: "text-red-400 bg-red-500/10 border-red-500/20",             dot: "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.8)]" },
    };

    const riskFilterStyles: Record<string, { active: string; inactive: string }> = {
        All:    { active: "bg-primary text-white border-transparent", inactive: "bg-transparent text-slate-500 border-border hover:border-slate-500 hover:text-slate-300" },
        Green:  { active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40", inactive: "bg-transparent text-slate-500 border-border hover:border-emerald-500/40 hover:text-emerald-400" },
        Yellow: { active: "bg-amber-500/20 text-amber-400 border-amber-500/40",       inactive: "bg-transparent text-slate-500 border-border hover:border-amber-500/40 hover:text-amber-400" },
        Red:    { active: "bg-red-500/20 text-red-400 border-red-500/40",             inactive: "bg-transparent text-slate-500 border-border hover:border-red-500/40 hover:text-red-400" },
    };

    // Shared inspector content — reused in sidebar and mobile drawer
    const InspectorContent = ({ tweak }: { tweak: typeof tweaksData[0] }) => (
        <motion.div
            key={tweak.id}
            initial={{ opacity: 0, filter: "blur(4px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, filter: "blur(4px)" }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
        >
            <div>
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center">
                    <Cpu className="w-3.5 h-3.5 mr-1.5" /> Mechanical Summary
                </h4>
                <p className="text-slate-300 dark:text-slate-200 leading-relaxed text-[13px] font-medium bg-black/5 dark:bg-[#121215] p-4 rounded-2xl border border-border/50">
                    {tweak.educationalContext.howItWorks}
                </p>
            </div>

            <div className="space-y-3">
                <div className="p-4 bg-emerald-500/[0.04] border border-emerald-500/10 rounded-2xl">
                    <h4 className="text-[11px] font-bold text-emerald-500 uppercase tracking-widest mb-1.5 flex items-center">
                        <ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> Performance Gain
                    </h4>
                    <p className="text-[13px] text-emerald-100/90 font-medium leading-relaxed">{tweak.educationalContext.pros}</p>
                </div>

                <div className="p-4 bg-red-500/[0.04] border border-red-500/10 rounded-2xl">
                    <h4 className="text-[11px] font-bold text-red-500 uppercase tracking-widest mb-1.5 flex items-center">
                        <AlertTriangle className="w-3.5 h-3.5 mr-1.5" /> System Trade-offs
                    </h4>
                    <p className="text-[13px] text-red-100/90 font-medium leading-relaxed">{tweak.educationalContext.cons}</p>
                </div>
            </div>

            <div className="pt-2">
                <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center">
                    <Code2 className="w-3.5 h-3.5 mr-1.5" /> Payload Injection
                </h4>
                <div className="bg-slate-900 dark:bg-[#050505] rounded-xl p-4 border border-border shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]">
                    <code className="text-[11px] text-slate-400 font-mono break-all leading-loose">
                        <span className="text-blue-500 select-none mr-2">PS&gt;</span>
                        <span className="text-emerald-400 dark:text-emerald-300/80">{tweak.execution.code}</span>
                    </code>
                </div>
            </div>
        </motion.div>
    );

    return (
        <>
            <div className="flex flex-col lg:flex-row h-full gap-8">
                {/* Configuration Grid */}
                <div className="flex-1 flex flex-col h-full min-h-[500px]">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-6 gap-4">
                        <div className="flex-1">
                            <h2 className="text-3xl font-black tracking-tight text-foreground flex items-center">
                                {categoryTitle} <span className="text-gradient ml-2">Tuning</span>
                            </h2>
                            <p className="text-slate-500 mt-2 text-[15px] font-medium leading-relaxed max-w-lg">
                                Select granular registry optimizations to dynamically inject into the operating system.
                            </p>

                            {/* Risk Level Filter Chips */}
                            {tweaks.length > 0 && (
                                <div className="flex gap-2 flex-wrap mt-4">
                                    <span className="flex items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest mr-1 self-center">
                                        <Filter className="w-3 h-3 mr-1" />Filter
                                    </span>
                                    {(["All", "Green", "Yellow", "Red"] as const).map(risk => {
                                        const count = risk === "All" ? tweaks.length : tweaks.filter(t => t.riskLevel === risk).length;
                                        if (count === 0 && risk !== "All") return null;
                                        return (
                                            <button
                                                key={risk}
                                                onClick={() => setFilterRisk(risk)}
                                                className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full border transition-all ${filterRisk === risk ? riskFilterStyles[risk].active : riskFilterStyles[risk].inactive}`}
                                            >
                                                {risk !== "All" && (
                                                    <span className={`w-1.5 h-1.5 rounded-full ${riskStyles[risk].dot}`}></span>
                                                )}
                                                {risk}
                                                <span className="opacity-60 font-normal">({count})</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <button
                            className={`btn-tactile relative group overflow-hidden px-6 py-2.5 rounded-full font-bold shadow-xl text-sm border mt-2 md:mt-0 shrink-0 ${selectedTweaks.length === 0
                                ? "bg-black/5 dark:bg-white/5 text-slate-400 cursor-not-allowed border-border"
                                : "bg-primary text-white dark:bg-white dark:text-black shadow-[0_0_20px_rgba(255,255,255,0.2)] border-transparent"
                                }`}
                            disabled={selectedTweaks.length === 0}
                        >
                            <span className="relative z-10 flex items-center justify-center min-w-[120px]">
                                {selectedTweaks.length > 0 ? (
                                    <>Deploy ({selectedTweaks.length}) <Zap className="w-3.5 h-3.5 ml-1.5" fill="currentColor" /></>
                                ) : "Select Tweaks"}
                            </span>
                        </button>
                    </div>

                    <div className={`flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar transition-all ${selectedTweaks.length > 0 ? "pb-24" : "pb-10"}`}>
                        <AnimatePresence mode="popLayout">
                            {visibleTweaks.map((tweak, i) => {
                                const isSelected = selectedTweaks.includes(tweak.id);
                                const isActive = activeTweak?.id === tweak.id;

                                return (
                                    <motion.div
                                        layout
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.98 }}
                                        transition={{ delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                                        key={tweak.id}
                                        className={`bento-card relative overflow-hidden p-5 cursor-pointer flex items-start gap-4 ${isActive ? "" : "hover:bg-black/5 dark:hover:bg-white/5"}`}
                                        onClick={() => setActiveTweak(isActive ? null : tweak)}
                                    >
                                        {isActive && (
                                            <motion.div
                                                layoutId="active-tweak-bg"
                                                className="absolute inset-0 bg-primary/5 dark:bg-white/[0.04] rounded-2xl border border-primary/20 pointer-events-none z-0"
                                                initial={false}
                                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                            />
                                        )}

                                        {isSelected && !isActive && (
                                            <div className="absolute inset-0 bg-primary/[0.02] pointer-events-none z-0"></div>
                                        )}

                                        {/* iOS Style Custom Switch */}
                                        <div
                                            className="mt-0.5 flex-shrink-0 relative z-10"
                                            onClick={(e) => toggleTweak(tweak.id, e)}
                                        >
                                            <div className={`w-[42px] h-[24px] rounded-full transition-colors relative flex items-center px-0.5 ${isSelected ? "bg-primary" : "bg-black/10 dark:bg-[#27272a] shadow-inner border border-border"}`}>
                                                <motion.div
                                                    layout
                                                    className="w-[20px] h-[20px] rounded-full bg-white shadow-sm absolute"
                                                    initial={false}
                                                    animate={{ left: isSelected ? "calc(100% - 22px)" : "2px" }}
                                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                                />
                                            </div>
                                        </div>

                                        <div className="flex-1 min-w-0 relative z-10">
                                            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                                                <h3 className={`text-[15px] font-bold truncate transition-colors ${isSelected ? "text-primary dark:text-white" : "text-card-foreground"}`}>
                                                    {tweak.name}
                                                </h3>
                                                <span className={`flex items-center text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-widest ${riskStyles[tweak.riskLevel].badge}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${riskStyles[tweak.riskLevel].dot}`}></span>
                                                    {tweak.riskLevel}
                                                </span>
                                            </div>
                                            <p className={`text-[13px] leading-relaxed font-medium transition-colors ${isSelected ? "text-slate-600 dark:text-slate-300" : "text-slate-500"}`}>
                                                {tweak.description}
                                            </p>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>

                        {/* Empty State */}
                        {tweaks.length === 0 ? (
                            <div className="h-64 flex flex-col items-center justify-center text-center bento-card border-dashed bg-transparent">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                                    <Zap className="w-5 h-5 text-primary opacity-50" />
                                </div>
                                <p className="text-[14px] font-bold text-slate-400">No optimizations yet</p>
                                <p className="text-[12px] text-slate-600 mt-1 max-w-[200px] leading-relaxed">Configurations for this module are being developed.</p>
                            </div>
                        ) : visibleTweaks.length === 0 ? (
                            <div className="h-48 flex flex-col items-center justify-center text-center bento-card border-dashed bg-transparent">
                                <p className="text-[14px] font-bold text-slate-400">No {filterRisk.toLowerCase()} tweaks</p>
                                <button onClick={() => setFilterRisk("All")} className="text-[12px] text-primary mt-2 hover:underline">Clear filter</button>
                            </div>
                        ) : null}
                    </div>
                </div>

                {/* Inspector Sidebar — desktop only */}
                <div className="lg:w-[380px] shrink-0 h-full hidden lg:block pb-10">
                    <div className="sticky top-0 h-full max-h-[calc(100vh-8rem)]">
                        <div className="bento-card h-full flex flex-col overflow-hidden relative shadow-2xl bg-card border-border">
                            <div className="p-5 border-b border-border bg-black/5 dark:bg-[#0A0A0E] flex items-center justify-between">
                                <h3 className="font-bold text-foreground flex items-center text-[13px] uppercase tracking-widest">
                                    <Info className="w-4 h-4 mr-2 text-primary" />
                                    Inspector
                                </h3>
                                {activeTweak && (
                                    <div className="flex items-center gap-3">
                                        <span className={`w-2 h-2 rounded-full ${riskStyles[activeTweak.riskLevel].dot}`}></span>
                                        <button onClick={() => setActiveTweak(null)} className="text-slate-500 hover:text-foreground transition-colors">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                                <AnimatePresence mode="wait">
                                    {activeTweak ? (
                                        <InspectorContent key={activeTweak.id} tweak={activeTweak} />
                                    ) : (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50"
                                        >
                                            <Info className="w-10 h-10 text-slate-600 stroke-1" />
                                            <p className="text-[13px] font-medium text-slate-400 max-w-[200px] leading-relaxed">
                                                Select a configuration module to intercept its behavioral profile.
                                            </p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Inspector Drawer — shown below lg breakpoint */}
            <AnimatePresence>
                {activeTweak && (
                    <div className="lg:hidden">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => setActiveTweak(null)}
                            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", stiffness: 380, damping: 35 }}
                            className="fixed bottom-0 inset-x-0 z-50 bg-card border-t border-border rounded-t-3xl overflow-hidden max-h-[82vh] flex flex-col"
                        >
                            {/* Drag handle */}
                            <div className="flex justify-center pt-3 pb-1 shrink-0">
                                <div className="w-10 h-1 rounded-full bg-border"></div>
                            </div>

                            {/* Header */}
                            <div className="px-5 py-3 border-b border-border flex items-center justify-between shrink-0">
                                <div>
                                    <h3 className="font-bold text-foreground flex items-center text-[13px] uppercase tracking-widest">
                                        <Info className="w-4 h-4 mr-2 text-primary" />
                                        Inspector
                                    </h3>
                                    <p className="text-[12px] text-slate-500 mt-0.5 font-medium truncate max-w-[220px]">{activeTweak.name}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`w-2 h-2 rounded-full ${riskStyles[activeTweak.riskLevel].dot}`}></span>
                                    <button onClick={() => setActiveTweak(null)} className="text-slate-400 hover:text-foreground transition-colors p-1">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Scrollable content */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
                                <AnimatePresence mode="wait">
                                    <InspectorContent key={activeTweak.id} tweak={activeTweak} />
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Floating Batch Selection Bar */}
            <AnimatePresence>
                {selectedTweaks.length > 0 && (
                    <motion.div
                        initial={{ y: 80, opacity: 0, scale: 0.95 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 80, opacity: 0, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-2.5 bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-[13px] font-bold text-foreground whitespace-nowrap">
                                {selectedTweaks.length} tweak{selectedTweaks.length > 1 ? "s" : ""} ready
                            </span>
                            <div className="hidden sm:flex gap-1.5 ml-1">
                                {(["Green", "Yellow", "Red"] as const).map(risk => {
                                    const count = selectedTweaks.filter(id => tweaksData.find(t => t.id === id)?.riskLevel === risk).length;
                                    if (count === 0) return null;
                                    return (
                                        <span key={risk} className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${riskStyles[risk].badge}`}>
                                            {count} {risk}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="w-px h-5 bg-border shrink-0" />

                        <button
                            onClick={() => setSelectedTweaks([])}
                            className="text-[12px] font-medium text-slate-400 hover:text-foreground transition-colors whitespace-nowrap"
                        >
                            Clear
                        </button>

                        <button className="btn-tactile bg-primary text-white dark:bg-white dark:text-black px-4 py-1.5 rounded-full font-bold text-sm flex items-center gap-1.5 shadow-lg whitespace-nowrap">
                            Deploy <Zap className="w-3.5 h-3.5" fill="currentColor" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
