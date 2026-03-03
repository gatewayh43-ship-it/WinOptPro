import { useState, useEffect } from "react";
import tweaksData from "../data/tweaks.json";
import { Info, AlertTriangle, ShieldCheck, Cpu, Code2, Zap, X, Filter, RotateCcw, Lock, CheckCircle2, BookOpen, GitMerge } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTweakExecution } from "../hooks/useTweakExecution";
import { useToast } from "../components/ToastSystem";
import { ConfirmDeployModal } from "../components/ConfirmDeployModal";
import { ProgressModal, type ProgressItem } from "../components/ProgressModal";
import { useAppStore } from "../store/appStore";

export function TweaksPage({ categoryTitle }: { categoryTitle: string }) {
    const [selectedTweaks, setSelectedTweaks] = useState<string[]>([]);
    const [activeTweak, setActiveTweak] = useState<typeof tweaksData[0] | null>(null);
    const [filterRisk, setFilterRisk] = useState<string>("All");
    const [showConfirm, setShowConfirm] = useState(false);
    const [showProgress, setShowProgress] = useState(false);
    const [progressItems, setProgressItems] = useState<ProgressItem[]>([]);
    const [showFailureActions, setShowFailureActions] = useState(false);
    const [failedBatchIndex, setFailedBatchIndex] = useState(-1);
    const [revertTarget, setRevertTarget] = useState<typeof tweaksData[0] | null>(null);
    const [isReverting, setIsReverting] = useState(false);
    const [isValidating] = useState(false);
    const [showBannerExpertConfirm, setShowBannerExpertConfirm] = useState(false);

    const { applyTweak, revertTweak, validateTweak, rollbackTweaks, isExecuting } = useTweakExecution();
    const { addToast } = useToast();

    const appliedTweaks = useAppStore(s => s.appliedTweaks);
    const expertModeEnabled = useAppStore(s => s.userSettings.expertModeEnabled);
    const updateSettings = useAppStore(s => s.updateSettings);
    const addAppliedTweak = useAppStore(s => s.addAppliedTweak);
    const removeAppliedTweak = useAppStore(s => s.removeAppliedTweak);

    // All tweaks in this category
    const allCategoryTweaks = tweaksData.filter(t => t.category === categoryTitle);

    // Count tweaks hidden by expert mode
    const hiddenByExpertMode = allCategoryTweaks.filter(t => t.requiresExpertMode && !expertModeEnabled).length;

    // Tweaks visible after expert mode filter
    const tweaks = allCategoryTweaks.filter(t => expertModeEnabled || !t.requiresExpertMode);

    const visibleTweaks = tweaks.filter(t => filterRisk === "All" || t.riskLevel === filterRisk);

    // FR-03: Validate current system state on category mount
    useEffect(() => {
        const tweaksToValidate = tweaksData.filter(
            t => t.category === categoryTitle && t.validationCmd
        );
        if (tweaksToValidate.length === 0) return;

        let cancelled = false;

        (async () => {
            const settled = await Promise.allSettled(
                tweaksToValidate.map(async (tweak) => {
                    const timeout = new Promise<null>(res => setTimeout(() => res(null), 5000));
                    const result = await Promise.race([validateTweak(tweak), timeout]);
                    return { tweak, result };
                })
            );

            if (cancelled) return;

            // Reconcile: detect tweaks applied/reverted outside the app
            for (const item of settled) {
                if (item.status !== 'fulfilled' || !item.value.result) continue;
                const { tweak, result } = item.value;
                const currentlyApplied = useAppStore.getState().appliedTweaks.includes(tweak.id);
                if (result.state === 'Applied' && !currentlyApplied) {
                    addAppliedTweak(tweak.id);
                } else if (result.state === 'Reverted' && currentlyApplied) {
                    removeAppliedTweak(tweak.id);
                }
            }
        })();

        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [categoryTitle]);

    const handleToggle = (tweak: typeof tweaksData[0], e: React.MouseEvent) => {
        e.stopPropagation();
        if (appliedTweaks.includes(tweak.id)) {
            setRevertTarget(tweak);
        } else {
            setSelectedTweaks(prev =>
                prev.includes(tweak.id) ? prev.filter(id => id !== tweak.id) : [...prev, tweak.id]
            );
        }
    };

    const handleConfirmRevert = async () => {
        if (!revertTarget) return;
        setIsReverting(true);
        try {
            const result = await revertTweak(revertTarget);
            if (result?.success) {
                addToast({ type: 'success', title: `Reverted: ${revertTarget.name}` });
            } else {
                addToast({ type: 'error', title: `Revert failed: ${revertTarget.name}`, message: result?.stderr || '' });
            }
        } finally {
            setIsReverting(false);
            setRevertTarget(null);
        }
    };

    const riskStyles: Record<string, { badge: string, dot: string }> = {
        Green: { badge: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", dot: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" },
        Yellow: { badge: "text-amber-400 bg-amber-500/10 border-amber-500/20", dot: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" },
        Red: { badge: "text-red-400 bg-red-500/10 border-red-500/20", dot: "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.8)]" },
    };

    const riskFilterStyles: Record<string, { active: string; inactive: string }> = {
        All: { active: "bg-primary text-white border-transparent", inactive: "bg-transparent text-slate-500 border-border hover:border-slate-500 hover:text-slate-300" },
        Green: { active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40", inactive: "bg-transparent text-slate-500 border-border hover:border-emerald-500/40 hover:text-emerald-400" },
        Yellow: { active: "bg-amber-500/20 text-amber-400 border-amber-500/40", inactive: "bg-transparent text-slate-500 border-border hover:border-amber-500/40 hover:text-amber-400" },
        Red: { active: "bg-red-500/20 text-red-400 border-red-500/40", inactive: "bg-transparent text-slate-500 border-border hover:border-red-500/40 hover:text-red-400" },
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

            {/* @ts-ignore - added dynamically via patch scripts */}
            {tweak.educationalContext.expertDetails && (
                <div className="pt-2">
                    <h4 className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest mb-2 flex items-center">
                        <BookOpen className="w-3.5 h-3.5 mr-1.5" /> Deep Research
                    </h4>
                    <p className="text-slate-300 dark:text-slate-200 leading-relaxed text-[13px] font-medium bg-indigo-500/[0.04] p-4 rounded-2xl border border-indigo-500/10">
                        {/* @ts-ignore */}
                        {tweak.educationalContext.expertDetails}
                    </p>
                </div>
            )}

            {/* @ts-ignore */}
            {tweak.educationalContext.interactions && (
                <div className="pt-2">
                    <h4 className="text-[11px] font-bold text-pink-400 uppercase tracking-widest mb-2 flex items-center">
                        <GitMerge className="w-3.5 h-3.5 mr-1.5" /> Interactions & Conflicts
                    </h4>
                    <p className="text-slate-300 dark:text-slate-200 leading-relaxed text-[13px] font-medium bg-pink-500/[0.04] p-4 rounded-2xl border border-pink-500/10">
                        {/* @ts-ignore */}
                        {tweak.educationalContext.interactions}
                    </p>
                </div>
            )}

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
                {tweak.execution.revertCode && (
                    <div className="mt-3 bg-slate-900 dark:bg-[#050505] rounded-xl p-4 border border-border shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]">
                        <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1.5 flex items-center">
                            <RotateCcw className="w-3 h-3 mr-1" /> Revert Code
                        </p>
                        <code className="text-[11px] text-slate-500 font-mono break-all leading-loose">
                            <span className="text-blue-500 select-none mr-2">PS&gt;</span>
                            {tweak.execution.revertCode}
                        </code>
                    </div>
                )}
            </div>
        </motion.div>
    );

    const SkeletonCard = ({ delay = 0 }: { delay?: number }) => (
        <div
            className="bento-card relative overflow-hidden p-5 flex items-start gap-4"
            style={{ animationDelay: `${delay}ms` }}
        >
            <div className="mt-0.5 w-[42px] h-[24px] rounded-full bg-white/[0.05] shrink-0 animate-pulse" />
            <div className="flex-1 min-w-0 space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                    <div className="h-4 bg-white/[0.05] rounded-full w-44 animate-pulse" />
                    <div className="h-5 bg-white/[0.05] rounded-full w-14 animate-pulse" />
                </div>
                <div className="h-3 bg-white/[0.04] rounded-full w-full animate-pulse" />
                <div className="h-3 bg-white/[0.04] rounded-full w-4/5 animate-pulse" />
            </div>
        </div>
    );

    return (
        <>
            <div className="flex flex-col lg:flex-row h-full gap-8">
                {/* Configuration Grid */}
                <div className="flex-1 flex flex-col h-full min-h-[500px]">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-4 gap-4">
                        <div className="flex-1 min-w-0">
                            <h2 className="text-3xl font-black tracking-tight text-foreground flex items-center">
                                {categoryTitle} <span className="text-gradient ml-2">Tuning</span>
                            </h2>
                            <p className="text-slate-500 mt-2 text-[15px] font-medium leading-relaxed max-w-lg">
                                Select granular registry optimizations to dynamically inject into the operating system.
                            </p>
                        </div>

                        {selectedTweaks.length === 0 && (
                            <button
                                className="btn-tactile relative group overflow-hidden px-6 py-2.5 rounded-full font-bold shadow-xl text-sm border mt-2 md:mt-0 shrink-0 bg-black/5 dark:bg-white/5 text-slate-400 cursor-not-allowed border-border"
                                disabled
                            >
                                <span className="relative z-10 flex items-center justify-center min-w-[120px]">
                                    Select Tweaks
                                </span>
                            </button>
                        )}
                    </div>

                    {/* Risk Level Filter Chips */}
                    {tweaks.length > 0 && (
                        <div className="flex items-center gap-2 mb-4 flex-wrap">
                            <span className="flex items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest mr-1 shrink-0">
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

                    {/* Expert mode banner */}
                    {hiddenByExpertMode > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/[0.06] border border-amber-500/20 text-amber-400"
                        >
                            <Lock className="w-4 h-4 shrink-0" />
                            <p className="text-[13px] font-medium flex-1">
                                <span className="font-bold">{hiddenByExpertMode} advanced tweak{hiddenByExpertMode > 1 ? 's' : ''} hidden</span>
                                {" "}— enable Expert Mode in{" "}
                                <button
                                    onClick={() => setShowBannerExpertConfirm(true)}
                                    className="underline hover:text-amber-300 transition-colors"
                                >
                                    Settings
                                </button>
                                {" "}to unlock.
                            </p>
                        </motion.div>
                    )}

                    <div className={`flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar transition-all ${selectedTweaks.length > 0 ? "pb-24" : "pb-10"}`}>
                        {isValidating ? (
                            (tweaks.length > 0 ? tweaks : Array.from({ length: 4 })).map((_, i) => (
                                <SkeletonCard key={i} delay={i * 60} />
                            ))
                        ) : (<>
                            <AnimatePresence mode="popLayout">
                                {visibleTweaks.map((tweak) => {
                                    const isSelected = selectedTweaks.includes(tweak.id);
                                    const isApplied = appliedTweaks.includes(tweak.id);
                                    const isActive = activeTweak?.id === tweak.id;

                                    // Toggle visual state
                                    const toggleBg = isApplied
                                        ? "bg-emerald-500"
                                        : isSelected
                                            ? "bg-primary"
                                            : "bg-black/10 dark:bg-[#27272a] shadow-inner border border-border";

                                    const thumbPosition = (isApplied || isSelected) ? "calc(100% - 22px)" : "2px";

                                    return (
                                        <motion.div
                                            layout
                                            initial={{ opacity: 0, y: 15 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.98 }}
                                            transition={{ duration: 0.15, ease: "easeOut" }}
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

                                            {isApplied && (
                                                <div className="absolute inset-0 bg-emerald-500/[0.03] pointer-events-none z-0 rounded-2xl border border-emerald-500/10" />
                                            )}

                                            {isSelected && !isActive && !isApplied && (
                                                <div className="absolute inset-0 bg-primary/[0.02] pointer-events-none z-0"></div>
                                            )}

                                            {/* iOS Style Custom Switch */}
                                            <div
                                                className="mt-0.5 flex-shrink-0 relative z-10"
                                                onClick={(e) => handleToggle(tweak, e)}
                                                title={isApplied ? "Click to revert this tweak" : "Toggle selection"}
                                            >
                                                <div className={`w-[42px] h-[24px] rounded-full transition-colors relative flex items-center px-0.5 ${toggleBg}`}>
                                                    <motion.div
                                                        layout
                                                        className="w-[20px] h-[20px] rounded-full bg-white shadow-sm absolute"
                                                        initial={false}
                                                        animate={{ left: thumbPosition }}
                                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex-1 min-w-0 relative z-10">
                                                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                                                    <h3 className={`text-[15px] font-bold truncate transition-colors ${isApplied ? "text-emerald-400" : isSelected ? "text-primary dark:text-white" : "text-card-foreground"}`}>
                                                        {tweak.name}
                                                    </h3>
                                                    <div className="flex items-center gap-2">
                                                        {isApplied && (
                                                            <span className="flex items-center text-[10px] font-bold px-2.5 py-1 rounded-full border text-emerald-400 bg-emerald-500/10 border-emerald-500/20 gap-1">
                                                                <CheckCircle2 className="w-3 h-3" /> Applied
                                                            </span>
                                                        )}
                                                        {tweak.requiresExpertMode && (
                                                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border text-amber-400 bg-amber-500/10 border-amber-500/20 uppercase tracking-widest">
                                                                Expert
                                                            </span>
                                                        )}
                                                        <span className={`flex items-center text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-widest ${riskStyles[tweak.riskLevel].badge}`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${riskStyles[tweak.riskLevel].dot}`}></span>
                                                            {tweak.riskLevel}
                                                        </span>
                                                    </div>
                                                </div>
                                                <p className={`text-[13px] leading-relaxed font-medium transition-colors ${isApplied ? "text-emerald-100/60 dark:text-emerald-100/50" : isSelected ? "text-slate-600 dark:text-slate-300" : "text-slate-500"}`}>
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
                        </>)}
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

                        <button
                            onClick={() => setShowConfirm(true)}
                            disabled={isExecuting}
                            className="btn-tactile bg-primary text-white dark:bg-white dark:text-black px-4 py-1.5 rounded-full font-bold text-sm flex items-center gap-1.5 shadow-lg whitespace-nowrap disabled:opacity-50"
                        >
                            Deploy <Zap className="w-3.5 h-3.5" fill="currentColor" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Confirmation Modal */}
            <ConfirmDeployModal
                isOpen={showConfirm}
                tweaks={selectedTweaks.map(id => tweaksData.find(t => t.id === id)!).filter(Boolean)}
                onCancel={() => setShowConfirm(false)}
                isExecuting={isExecuting}
                onConfirm={async () => {
                    setShowConfirm(false);
                    const tweaksToApply = selectedTweaks.map(id => tweaksData.find(t => t.id === id)!).filter(Boolean);

                    setProgressItems(tweaksToApply.map(t => ({ id: t.id, name: t.name, status: 'pending' as const })));
                    setShowProgress(true);
                    setShowFailureActions(false);
                    setFailedBatchIndex(-1);

                    for (let i = 0; i < tweaksToApply.length; i++) {
                        const tweak = tweaksToApply[i];
                        setProgressItems(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'running' as const } : item));

                        const result = await applyTweak(tweak);

                        if (result?.success) {
                            setProgressItems(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'success' as const, result } : item));
                        } else {
                            setProgressItems(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'failed' as const, result: result ?? undefined } : item));
                            setFailedBatchIndex(i);
                            if (i < tweaksToApply.length - 1) {
                                setShowFailureActions(true);
                            }
                            break;
                        }
                    }

                    const currentFailedIndex = failedBatchIndex;
                    if (currentFailedIndex === -1) {
                        addToast({ type: 'success', title: `${tweaksToApply.length} tweak${tweaksToApply.length > 1 ? 's' : ''} deployed successfully` });
                        setSelectedTweaks([]);
                    } else {
                        addToast({ type: 'error', title: `Deployment failed on tweak ${currentFailedIndex + 1}/${tweaksToApply.length}` });
                    }
                }}
            />

            {/* Progress Modal */}
            <ProgressModal
                isOpen={showProgress}
                items={progressItems}
                showFailureActions={showFailureActions}
                onClose={() => {
                    setShowProgress(false);
                    setShowFailureActions(false);
                }}
                onRollback={async () => {
                    setShowFailureActions(false);
                    const appliedInBatch = selectedTweaks
                        .slice(0, failedBatchIndex)
                        .map(id => tweaksData.find(t => t.id === id)!)
                        .filter(Boolean);
                    await rollbackTweaks(appliedInBatch);
                    addToast({ type: 'warning', title: `Rolled back ${appliedInBatch.length} tweak${appliedInBatch.length > 1 ? 's' : ''}` });
                    setSelectedTweaks([]);
                    setShowProgress(false);
                }}
                onSkipAndContinue={async () => {
                    setShowFailureActions(false);
                    const tweaksToApply = selectedTweaks.map(id => tweaksData.find(t => t.id === id)!).filter(Boolean);
                    for (let i = failedBatchIndex + 1; i < tweaksToApply.length; i++) {
                        const tweak = tweaksToApply[i];
                        setProgressItems(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'running' as const } : item));
                        const result = await applyTweak(tweak);
                        if (result?.success) {
                            setProgressItems(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'success' as const, result } : item));
                        } else {
                            setProgressItems(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'failed' as const, result: result ?? undefined } : item));
                            break;
                        }
                    }
                }}
            />

            {/* Revert Confirmation Modal */}
            <AnimatePresence>
                {revertTarget && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => !isReverting && setRevertTarget(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="bg-card border border-border/80 rounded-2xl shadow-2xl p-6 max-w-md w-full relative z-10"
                        >
                            <div className="flex items-start gap-4 mb-5">
                                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">
                                    <RotateCcw className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-[15px] font-bold text-foreground">Revert Tweak?</h3>
                                    <p className="text-[13px] text-slate-400 mt-1">
                                        <span className="font-bold text-foreground">{revertTarget.name}</span> will be reversed and the system restored to its previous state.
                                    </p>
                                </div>
                            </div>

                            <div className="mb-5">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Revert Command</p>
                                <div className="bg-slate-900 dark:bg-[#050505] rounded-xl p-3 border border-border">
                                    <code className="text-[11px] text-blue-400/80 font-mono break-all leading-loose">
                                        <span className="text-blue-500 select-none mr-2">PS&gt;</span>
                                        {revertTarget.execution.revertCode}
                                    </code>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3">
                                <button
                                    onClick={() => setRevertTarget(null)}
                                    disabled={isReverting}
                                    className="px-4 py-2 rounded-xl text-[13px] font-bold text-slate-400 hover:text-foreground hover:bg-white/5 transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirmRevert}
                                    disabled={isReverting}
                                    className="px-5 py-2 rounded-xl text-[13px] font-bold bg-blue-500 hover:bg-blue-600 text-white transition-colors shadow-[0_0_15px_rgba(59,130,246,0.3)] disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isReverting ? (
                                        <><RotateCcw className="w-4 h-4 animate-spin" /> Reverting…</>
                                    ) : (
                                        <><RotateCcw className="w-4 h-4" /> Revert</>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Expert Mode Confirmation (from banner) */}
            <AnimatePresence>
                {showBannerExpertConfirm && (
                    <>
                        <motion.div
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setShowBannerExpertConfirm(false)}
                        />
                        <motion.div
                            className="fixed inset-0 z-50 flex items-center justify-center p-4"
                            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                        >
                            <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl shadow-2xl max-w-md w-full">
                                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
                                            <AlertTriangle className="w-5 h-5 text-red-400" />
                                        </div>
                                        <h2 className="text-lg font-bold text-white">Expert Mode Warning</h2>
                                    </div>
                                    <button onClick={() => setShowBannerExpertConfirm(false)} className="p-2 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-colors">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="px-6 py-5">
                                    <p className="text-[14px] text-slate-300 leading-relaxed">
                                        Expert Mode enables high-risk tweaks that can affect system stability.
                                        These tweaks are labeled <span className="text-red-400 font-semibold">Red</span> and
                                        carry a higher risk of causing system issues or requiring a restore point.
                                    </p>
                                    <p className="text-[13px] text-slate-500 mt-3 leading-relaxed">
                                        Only enable this if you understand the risks and have a system restore point ready.
                                    </p>
                                </div>
                                <div className="px-6 py-4 border-t border-white/10 flex items-center justify-end gap-3">
                                    <button onClick={() => setShowBannerExpertConfirm(false)} className="px-4 py-2 text-sm font-medium rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => { updateSettings({ expertModeEnabled: true }); setShowBannerExpertConfirm(false); }}
                                        className="px-5 py-2 text-sm font-bold rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30 transition-colors"
                                    >
                                        I Understand, Enable
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
