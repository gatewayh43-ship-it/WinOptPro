import { BatteryMedium, Zap, Activity, Info, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { usePower } from "../hooks/usePower";

export function PowerPage() {
    const { plans, isLoading, isChanging, setActivePlan } = usePower();

    const getPlanIcon = (name: string) => {
        const lower = name.toLowerCase();
        if (lower.includes("ultimate") || lower.includes("high") || lower.includes("max")) return <Zap className="w-6 h-6 text-amber-500" />;
        if (lower.includes("power saver") || lower.includes("eco")) return <BatteryMedium className="w-6 h-6 text-emerald-500" />;
        return <Activity className="w-6 h-6 text-blue-500" />;
    };

    const activePlan = plans.find(p => p.is_active);

    return (
        <div className="flex flex-col h-full overflow-hidden p-6 max-w-[1200px] mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black tracking-tight text-foreground flex items-center">
                        Power <span className="text-gradient ml-2">Manager</span>
                    </h2>
                    <p className="text-slate-500 mt-2 text-[15px] font-medium leading-relaxed max-w-lg">
                        Configure Windows energy profiles to prioritize either raw performance or thermal efficiency.
                    </p>
                </div>
            </div>

            {/* Active Plan Dashboard */}
            <motion.div
                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                className="bento-card relative overflow-hidden p-6 md:p-8 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent flex flex-col md:flex-row items-center gap-6"
            >
                {/* Glow effect */}
                <div className="absolute top-0 right-0 p-8 opacity-20 pointer-events-none">
                    <Zap className="w-48 h-48 text-primary blur-3xl mix-blend-plus-lighter" />
                </div>

                <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0 shadow-[0_0_30px_rgba(var(--primary-rgb),0.2)]">
                    <BatteryMedium className="w-10 h-10 text-primary" strokeWidth={1.5} />
                </div>

                <div className="flex-1 text-center md:text-left relative z-10">
                    <h3 className="text-sm font-bold text-primary uppercase tracking-widest mb-1.5 opacity-80">
                        Current Active Profile
                    </h3>
                    {isLoading ? (
                        <div className="h-10 w-64 bg-white/5 rounded-lg animate-pulse mx-auto md:mx-0"></div>
                    ) : (
                        <h1 className="text-2xl md:text-4xl font-black text-foreground">
                            {activePlan?.name || "Unknown"}
                        </h1>
                    )}
                </div>
            </motion.div>

            {/* Available Plans Grid */}
            <div className="flex-1 flex flex-col min-h-0">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center px-1">
                    <Info className="w-4 h-4 mr-2" />
                    Available Profiles
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 flex-1 overflow-y-auto custom-scrollbar pr-2 pb-10">
                    {isLoading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="bento-card p-6 border-dashed bg-transparent animate-pulse h-[140px] flex items-center justify-center">
                                <div className="w-8 h-8 rounded-full bg-white/5"></div>
                            </div>
                        ))
                    ) : plans.map((plan) => (
                        <motion.div
                            layout
                            key={plan.guid}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className={`bento-card relative overflow-hidden group transition-all duration-300 ${plan.is_active
                                ? "bg-primary/5 border-primary/30 shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)]"
                                : "bg-surface hover:bg-white/[0.03] hover:border-white/20"
                                } flex flex-col justify-between p-5 min-h-[140px] cursor-pointer`}
                            onClick={() => {
                                if (!plan.is_active && !isChanging) {
                                    setActivePlan(plan.guid);
                                }
                            }}
                        >
                            {plan.is_active && (
                                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-primary/30 to-transparent blur-xl pointer-events-none" />
                            )}

                            <div className="flex items-start justify-between">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${plan.is_active ? 'bg-primary/20 border-primary/30' : 'bg-black/20 border-white/5'}`}>
                                    {getPlanIcon(plan.name)}
                                </div>
                                {plan.is_active && (
                                    <span className="flex items-center text-[10px] font-bold px-2.5 py-1 rounded-full border text-primary bg-primary/10 border-primary/20 gap-1 uppercase tracking-widest leading-none">
                                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Active
                                    </span>
                                )}
                            </div>

                            <div className="mt-4 flex flex-col gap-1 items-start">
                                <h4 className={`text-base font-bold truncate ${plan.is_active ? 'text-foreground' : 'text-slate-300'}`}>
                                    {plan.name}
                                </h4>
                                <code className="text-[10px] text-slate-500 font-mono tracking-tight truncate w-full group-hover:text-slate-400 transition-colors">
                                    {plan.guid}
                                </code>
                            </div>

                            {!plan.is_active && (
                                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-[var(--bento-radius)] flex flex-col items-center justify-center backdrop-blur-sm">
                                    <div className="bg-primary px-4 py-2 rounded-full font-bold text-white text-xs shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4" /> Apply Profile
                                    </div>
                                </div>
                            )}

                            {isChanging && !plan.is_active && (
                                <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px] z-10 rounded-[var(--bento-radius)]" />
                            )}
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}
