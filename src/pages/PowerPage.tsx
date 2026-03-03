import { useState } from "react";
import { BatteryMedium, Zap, Activity, Info, CheckCircle2, BatteryCharging, BatteryFull, BatteryLow, Settings2, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { usePower } from "../hooks/usePower";
import type { PowerSettings } from "../hooks/usePower";

// ─── Battery Section ─────────────────────────────────────────────────────────

function BatterySection({ batteryHealth }: { batteryHealth: import("../hooks/usePower").BatteryHealth | null }) {
    if (!batteryHealth) return null;
    if (!batteryHealth.has_battery) {
        return (
            <div className="bento-card p-5 flex items-center gap-4 opacity-60">
                <BatteryMedium className="w-6 h-6 text-slate-500" />
                <div>
                    <p className="text-sm font-bold text-slate-400">Battery</p>
                    <p className="text-[12px] text-slate-600">No battery detected — desktop system</p>
                </div>
            </div>
        );
    }

    const pct = batteryHealth.charge_percent;
    const BatIcon = batteryHealth.is_charging ? BatteryCharging : pct > 60 ? BatteryFull : pct > 20 ? BatteryMedium : BatteryLow;
    const barColor = pct > 60 ? "bg-emerald-500" : pct > 20 ? "bg-amber-500" : "bg-red-500";

    return (
        <div className="bento-card p-5 flex flex-col md:flex-row items-center gap-5">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shrink-0 ${pct > 60 ? "bg-emerald-500/10 border-emerald-500/20" : pct > 20 ? "bg-amber-500/10 border-amber-500/20" : "bg-red-500/10 border-red-500/20"}`}>
                <BatIcon className={`w-7 h-7 ${pct > 60 ? "text-emerald-400" : pct > 20 ? "text-amber-400" : "text-red-400"}`} strokeWidth={1.5} />
            </div>
            <div className="flex-1 w-full">
                <div className="flex items-center justify-between mb-2">
                    <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Battery Health</p>
                        <p className="text-sm font-semibold text-foreground mt-0.5">{batteryHealth.status}</p>
                    </div>
                    <span className="text-2xl font-black text-foreground">{pct}%</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full ${barColor} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                </div>
                {batteryHealth.is_charging && (
                    <p className="text-[11px] text-emerald-400 font-semibold mt-1.5 flex items-center gap-1">
                        <BatteryCharging className="w-3.5 h-3.5" /> Charging
                    </p>
                )}
            </div>
        </div>
    );
}

// ─── Power Settings Panel ────────────────────────────────────────────────────

function SliderRow({ label, value, min, max, unit, onChange }: {
    label: string;
    value: number;
    min: number;
    max: number;
    unit: string;
    onChange: (v: number) => void;
}) {
    const displayValue = unit === "min"
        ? value === 0 ? "Never" : `${Math.round(value / 60)} min`
        : `${value}%`;

    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold text-slate-400">{label}</span>
                <span className="text-[12px] font-bold text-foreground tabular-nums">{displayValue}</span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={unit === "min" ? 60 : 5}
                value={value}
                onChange={e => onChange(Number(e.target.value))}
                className="w-full accent-primary h-1.5 rounded-full appearance-none bg-white/10 cursor-pointer"
            />
        </div>
    );
}

function PowerSettingsPanel({
    settings,
    isLoading,
    onUpdate,
}: {
    settings: PowerSettings | null;
    isLoading: boolean;
    onUpdate: (key: keyof PowerSettings, value: number) => void;
}) {
    const [tab, setTab] = useState<"ac" | "dc">("ac");

    if (isLoading) return (
        <div className="bento-card p-6 flex items-center justify-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-sm text-slate-400">Loading settings...</span>
        </div>
    );

    if (!settings) return null;

    return (
        <div className="bento-card p-5 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-primary" />
                    <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">Power Settings</span>
                </div>
                <div className="flex gap-1.5">
                    {(["ac", "dc"] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-colors border ${tab === t ? "bg-primary/10 border-primary/30 text-primary" : "border-border text-slate-500 hover:text-foreground"}`}
                        >
                            {t === "ac" ? "Plugged In" : "Battery"}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                {tab === "ac" ? (
                    <>
                        <SliderRow label="Min CPU State" value={settings.cpu_min_ac} min={0} max={100} unit="%" onChange={v => onUpdate("cpu_min_ac", v)} />
                        <SliderRow label="Max CPU State" value={settings.cpu_max_ac} min={0} max={100} unit="%" onChange={v => onUpdate("cpu_max_ac", v)} />
                        <SliderRow label="Display Timeout" value={settings.display_timeout_ac} min={0} max={3600} unit="min" onChange={v => onUpdate("display_timeout_ac", v)} />
                        <SliderRow label="Sleep Timeout" value={settings.sleep_timeout_ac} min={0} max={7200} unit="min" onChange={v => onUpdate("sleep_timeout_ac", v)} />
                    </>
                ) : (
                    <>
                        <SliderRow label="Min CPU State" value={settings.cpu_min_dc} min={0} max={100} unit="%" onChange={v => onUpdate("cpu_min_dc", v)} />
                        <SliderRow label="Max CPU State" value={settings.cpu_max_dc} min={0} max={100} unit="%" onChange={v => onUpdate("cpu_max_dc", v)} />
                        <SliderRow label="Display Timeout" value={settings.display_timeout_dc} min={0} max={3600} unit="min" onChange={v => onUpdate("display_timeout_dc", v)} />
                        <SliderRow label="Sleep Timeout" value={settings.sleep_timeout_dc} min={0} max={7200} unit="min" onChange={v => onUpdate("sleep_timeout_dc", v)} />
                    </>
                )}
            </div>
            <p className="text-[10px] text-slate-600">Changes apply immediately after sliding.</p>
        </div>
    );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function PowerPage() {
    const {
        plans, isLoading, isChanging, setActivePlan,
        batteryHealth,
        powerSettings, isLoadingSettings,
        fetchPowerSettings, updatePowerSetting,
    } = usePower();

    const [selectedGuid, setSelectedGuid] = useState<string | null>(null);

    const getPlanIcon = (name: string) => {
        const lower = name.toLowerCase();
        if (lower.includes("ultimate") || lower.includes("high") || lower.includes("max")) return <Zap className="w-6 h-6 text-amber-500" />;
        if (lower.includes("power saver") || lower.includes("eco")) return <BatteryMedium className="w-6 h-6 text-emerald-500" />;
        return <Activity className="w-6 h-6 text-blue-500" />;
    };

    const activePlan = plans.find(p => p.is_active);

    const handlePlanClick = (guid: string, isActive: boolean) => {
        if (!isActive && !isChanging) {
            setActivePlan(guid);
        }
        if (selectedGuid !== guid) {
            setSelectedGuid(guid);
            fetchPowerSettings(guid);
        }
    };

    const handleSettingUpdate = async (key: keyof PowerSettings, value: number) => {
        if (!selectedGuid) return;
        await updatePowerSetting(selectedGuid, key as any, value);
    };

    return (
        <div className="flex flex-col h-full overflow-hidden p-6 max-w-[1200px] mx-auto space-y-6">
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

            {/* Active Plan Banner */}
            <motion.div
                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                className="bento-card relative overflow-hidden p-6 md:p-8 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent flex flex-col md:flex-row items-center gap-6"
            >
                <div className="absolute top-0 right-0 p-8 opacity-20 pointer-events-none">
                    <Zap className="w-48 h-48 text-primary blur-3xl mix-blend-plus-lighter" />
                </div>
                <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0 shadow-[0_0_30px_rgba(var(--primary-rgb),0.2)]">
                    <BatteryMedium className="w-10 h-10 text-primary" strokeWidth={1.5} />
                </div>
                <div className="flex-1 text-center md:text-left relative z-10">
                    <h3 className="text-sm font-bold text-primary uppercase tracking-widest mb-1.5 opacity-80">Current Active Profile</h3>
                    {isLoading ? (
                        <div className="h-10 w-64 bg-white/5 rounded-lg animate-pulse mx-auto md:mx-0" />
                    ) : (
                        <h1 className="text-2xl md:text-4xl font-black text-foreground">{activePlan?.name || "Unknown"}</h1>
                    )}
                </div>
            </motion.div>

            {/* Battery Health */}
            <BatterySection batteryHealth={batteryHealth} />

            {/* Available Plans Grid */}
            <div className="flex flex-col min-h-0">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center px-1">
                    <Info className="w-4 h-4 mr-2" />
                    Available Profiles
                    <span className="ml-2 text-[10px] text-slate-600">(click to select + edit settings)</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-2">
                    {isLoading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="bento-card p-6 border-dashed bg-transparent animate-pulse h-[140px] flex items-center justify-center">
                                <div className="w-8 h-8 rounded-full bg-white/5" />
                            </div>
                        ))
                    ) : plans.map((plan) => (
                        <motion.div
                            layout
                            key={plan.guid}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className={`bento-card relative overflow-hidden group transition-all duration-300 ${
                                plan.is_active
                                    ? "bg-primary/5 border-primary/30 shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)]"
                                    : selectedGuid === plan.guid
                                    ? "border-white/20 bg-white/[0.03]"
                                    : "bg-surface hover:bg-white/[0.03] hover:border-white/20"
                            } flex flex-col justify-between p-5 min-h-[140px] cursor-pointer`}
                            onClick={() => handlePlanClick(plan.guid, plan.is_active)}
                        >
                            {plan.is_active && (
                                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-primary/30 to-transparent blur-xl pointer-events-none" />
                            )}
                            <div className="flex items-start justify-between">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${plan.is_active ? "bg-primary/20 border-primary/30" : "bg-black/20 border-white/5"}`}>
                                    {getPlanIcon(plan.name)}
                                </div>
                                {plan.is_active && (
                                    <span className="flex items-center text-[10px] font-bold px-2.5 py-1 rounded-full border text-primary bg-primary/10 border-primary/20 gap-1 uppercase tracking-widest leading-none">
                                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Active
                                    </span>
                                )}
                            </div>
                            <div className="mt-4 flex flex-col gap-1 items-start">
                                <h4 className={`text-base font-bold truncate ${plan.is_active ? "text-foreground" : "text-slate-300"}`}>{plan.name}</h4>
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

            {/* Power Settings for selected plan */}
            {selectedGuid && (
                <PowerSettingsPanel
                    settings={powerSettings}
                    isLoading={isLoadingSettings}
                    onUpdate={handleSettingUpdate}
                />
            )}
        </div>
    );
}
