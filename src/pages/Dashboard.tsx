import { useState } from "react";
import { ShieldAlert, Zap, Cpu, Activity, HardDrive, Wifi, Sparkles, ChevronRight, PlayCircle, Trophy, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { useSystemVitals } from "../hooks/useSystemVitals";
import { useAppStore } from "../store/appStore";
import { useTweakExecution } from "../hooks/useTweakExecution";
import { useToast } from "../components/ToastSystem";
import { ConfirmDeployModal } from "../components/ConfirmDeployModal";
import { ProgressModal, type ProgressItem } from "../components/ProgressModal";
import tweaksData from "../data/tweaks.json";

// System Score Circular Progress Component
const SystemScore = ({ score }: { score: number }) => {
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    // Determine color based on score
    const colorClass = score >= 90 ? "text-emerald-400" : score >= 75 ? "text-blue-400" : score >= 60 ? "text-yellow-400" : "text-red-400";
    const dropShadowClass = score >= 90 ? "drop-shadow-[0_0_15px_rgba(52,211,153,0.6)]" : score >= 75 ? "drop-shadow-[0_0_15px_rgba(96,165,250,0.6)]" : "drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]";

    return (
        <div className="relative flex items-center justify-center w-32 h-32 md:w-36 md:h-36">
            <svg className="w-full h-full transform -rotate-90 pointer-events-none" viewBox="0 0 100 100">
                {/* Background Circle */}
                <circle
                    className="text-white/5 dark:text-white/10 stroke-current"
                    strokeWidth="8"
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="transparent"
                ></circle>
                {/* Progress Circle */}
                <motion.circle
                    className={`${colorClass} stroke-current transition-all duration-1000 ease-out`}
                    strokeWidth="8"
                    strokeLinecap="round"
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="transparent"
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset }}
                    style={{ strokeDasharray: circumference, filter: 'url(#glow)' }}
                ></motion.circle>

                {/* SVG Filter for actual stroke glow */}
                <defs>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>
            </svg>
            <div className={`absolute flex flex-col items-center justify-center ${dropShadowClass}`}>
                <span className="text-3xl md:text-4xl font-black font-heading tracking-tighter text-foreground">{score}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-300 font-bold uppercase tracking-widest mt-0.5">Vitals</span>
            </div>
        </div>
    );
};

const BentoCard = ({ children, delay, className = "" }: { children: React.ReactNode, delay: number, className?: string }) => (
    <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
        className={`bento-card p-6 ${className}`}
    >
        {children}
    </motion.div>
);

const BlinkistIcon = ({ icon: Icon, colorClass }: { icon: any, colorClass: string }) => (
    <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${colorClass}`}>
        <Icon className="w-5 h-5" strokeWidth={2} />
    </div>
);

/** Compute a health score from live vitals. */
function computeHealthScore(vitals: ReturnType<typeof useSystemVitals>["vitals"]): number {
    if (!vitals) return 0;
    let score = 100;
    // CPU temperature penalty
    const cpuTemp = vitals.cpu.tempC ?? 50;
    if (cpuTemp > 90) score -= 30;
    else if (cpuTemp > 80) score -= 20;
    else if (cpuTemp > 70) score -= 10;
    // RAM usage penalty
    if (vitals.ram.usagePct > 90) score -= 25;
    else if (vitals.ram.usagePct > 80) score -= 15;
    else if (vitals.ram.usagePct > 70) score -= 5;
    // CPU usage penalty
    if (vitals.cpu.usagePct > 90) score -= 15;
    else if (vitals.cpu.usagePct > 70) score -= 5;
    return Math.max(0, Math.min(100, score));
}

/** Get a status badge for CPU temperature. */
function tempBadge(tempC: number | null) {
    if (tempC === null) return { label: "N/A", bg: "bg-slate-400/10", text: "text-slate-400 dark:text-slate-200", border: "border-slate-400/20" };
    if (tempC > 80) return { label: "High Temp", bg: "bg-red-400/10", text: "text-red-400", border: "border-red-400/20" };
    if (tempC > 65) return { label: "Warm", bg: "bg-amber-400/10", text: "text-amber-400", border: "border-amber-400/20" };
    return { label: "Cool", bg: "bg-emerald-400/10", text: "text-emerald-400", border: "border-emerald-400/20" };
}

function ramBadge(pct: number) {
    if (pct > 85) return { label: "High Usage", bg: "bg-red-400/10", text: "text-red-400", border: "border-red-400/20" };
    if (pct > 60) return { label: "Moderate", bg: "bg-amber-400/10", text: "text-amber-400", border: "border-amber-400/20" };
    return { label: "Optimal", bg: "bg-emerald-400/10", text: "text-emerald-400", border: "border-emerald-400/20" };
}

function formatUptime(seconds: number): string {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

export function Dashboard({ onTriggerGuide, setView }: { onTriggerGuide?: () => void; setView?: (v: string) => void }) {
    const { vitals } = useSystemVitals();

    // Quick Scan state
    const [showScanConfirm, setShowScanConfirm] = useState(false);
    const [showScanProgress, setShowScanProgress] = useState(false);
    const [scanProgressItems, setScanProgressItems] = useState<ProgressItem[]>([]);
    const [showScanFailureActions, setShowScanFailureActions] = useState(false);

    const appliedTweaks = useAppStore(s => s.appliedTweaks);
    const { applyTweak, rollbackTweaks, isExecuting } = useTweakExecution();
    const { addToast } = useToast();

    // All Green tweaks not yet applied — candidates for Quick Scan
    const greenCandidates = tweaksData.filter(t => t.riskLevel === "Green" && !appliedTweaks.includes(t.id));

    const handleQuickScan = () => {
        if (greenCandidates.length === 0) {
            addToast({ type: "success", title: "Already optimized!", message: "All safe (Green) tweaks are already applied." });
            return;
        }
        setShowScanConfirm(true);
    };

    const healthScore = computeHealthScore(vitals);
    const scoreTier = healthScore >= 90 ? "Top 5% Optimal Performance" : healthScore >= 75 ? "Good System Health" : healthScore >= 60 ? "Room for Improvement" : "Needs Attention";

    // Primary drive (C: or first available)
    const primaryDrive = vitals?.drives?.["C:"] ?? (vitals?.drives ? Object.values(vitals.drives)[0] : null);
    const primaryDriveName = primaryDrive?.name || "System Drive";
    const primaryDriveFree = primaryDrive ? `${primaryDrive.freeGb} GB free` : "—";

    // Network: first adapter
    const netEntries = vitals?.network ? Object.entries(vitals.network) : [];
    const primaryNet = netEntries.length > 0 ? { name: netEntries[0][0], data: netEntries[0][1] } : null;

    const cpuBadge = tempBadge(vitals?.cpu.tempC ?? null);
    const ramBdg = ramBadge(vitals?.ram.usagePct ?? 0);

    return (
        <>
        <div className="space-y-6 pb-12 mix-blend-plus-lighter relative z-10">

            {/* Hero Banner (Webflow Dark style) */}
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="relative overflow-hidden rounded-[24px] bg-card border border-border p-10 shadow-[var(--bento-shadow)]"
            >
                <div className="absolute inset-0 bg-noise opacity-50 mix-blend-overlay"></div>
                <div className="absolute top-0 right-0 p-8 opacity-30 pointer-events-none">
                    <Sparkles className="w-48 h-48 text-primary blur-2xl mix-blend-plus-lighter" />
                </div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="max-w-xl">
                        <div className="inline-flex items-center space-x-2 bg-white/[0.04] border border-white/[0.08] px-3 py-1.5 rounded-full mb-6 backdrop-blur-md">
                            <span className={`w-2 h-2 rounded-full ${vitals ? 'bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.8)]' : 'bg-amber-400'}`}></span>
                            <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-widest leading-none mt-0.5">
                                {vitals ? 'Live Telemetry Active' : 'Connecting…'}
                            </span>
                        </div>
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground mb-3 font-heading">
                            System <span className="text-gradient">Engine</span>
                        </h2>
                        <p className="text-sm sm:text-[15px] text-slate-400 dark:text-slate-200/90 max-w-lg leading-relaxed font-medium">
                            {vitals?.system.osVersion ?? 'Loading system information…'}
                            {vitals?.system.isAdmin === false && (
                                <span className="ml-2 text-amber-400 text-xs">(non-admin)</span>
                            )}
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 items-center mt-6 md:mt-0 w-full md:w-auto">
                        {onTriggerGuide && (
                            <button
                                onClick={onTriggerGuide}
                                className="btn-tactile w-full sm:w-auto relative group overflow-hidden bg-black/5 dark:bg-white/[0.05] hover:bg-black/10 dark:hover:bg-white/[0.1] border border-border text-foreground px-5 py-3 rounded-full font-semibold flex justify-center items-center shadow-lg"
                            >
                                <PlayCircle className="w-5 h-5 mr-2 text-primary transition-colors" />
                                <span className="text-[13px] tracking-wide">Interactive Guide</span>
                            </button>
                        )}

                        <button
                            onClick={handleQuickScan}
                            disabled={isExecuting}
                            className="btn-tactile w-full sm:w-auto relative group overflow-hidden bg-primary text-primary-foreground px-6 py-3 rounded-full font-bold shadow-lg dark:bg-white dark:text-[#0A0A0E] dark:shadow-[0_0_20px_rgba(255,255,255,0.2)] text-white flex justify-center items-center disabled:opacity-60"
                        >
                            <span className="relative z-10 flex items-center text-sm">
                                <Zap className="w-4 h-4 mr-2" fill="currentColor" />
                                {greenCandidates.length > 0 ? `Quick Scan (${greenCandidates.length})` : "All Safe Tweaks Applied ✓"}
                            </span>
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* Gamified System Vitals Dashboard Layer */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Main Score Widget */}
                <BentoCard delay={0.05} className="lg:col-span-1 flex flex-col items-center justify-center text-center relative overflow-hidden group">
                    {/* Background Ambient Glow Based on Score */}
                    <div className="absolute inset-0 bg-emerald-500/5 blur-3xl opacity-50 group-hover:opacity-80 transition-opacity pointer-events-none"></div>

                    <h3 className="text-sm font-bold text-slate-400 dark:text-slate-200 uppercase tracking-widest mb-6 relative z-10">System Health Score</h3>
                    <SystemScore score={healthScore} />

                    <div className="mt-8 flex items-center bg-black/5 dark:bg-white/5 px-4 py-2 rounded-full border border-border relative z-10">
                        <Trophy className="w-4 h-4 text-yellow-400 mr-2" />
                        <span className="text-xs font-semibold text-slate-300">{scoreTier}</span>
                    </div>
                </BentoCard>

                {/* Sub-Metrics Grid */}
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* CPU Card */}
                    <BentoCard delay={0.1}>
                        <div className="flex justify-between items-start mb-6">
                            <BlinkistIcon icon={Cpu} colorClass="bg-blue-500/10 text-blue-400 border border-blue-500/20" />
                            <span className={`flex items-center text-[11px] font-bold ${cpuBadge.text} ${cpuBadge.bg} px-2.5 py-1 rounded-full border ${cpuBadge.border}`}>
                                <Activity className="w-3 h-3 mr-1" /> {cpuBadge.label}
                            </span>
                        </div>
                        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest mb-1">Processor</p>
                        <h3 className="text-[15px] font-bold text-card-foreground mb-3 truncate">
                            {vitals?.cpu.model ?? "Loading…"}
                        </h3>
                        <div className="flex items-baseline justify-between mt-auto">
                            <p className="text-3xl font-black text-foreground tracking-tighter">
                                {vitals?.cpu.tempC != null ? Math.round(vitals.cpu.tempC) : "—"}
                                <span className="text-lg text-slate-400 dark:text-slate-200 font-medium">°C</span>
                            </p>
                            <p className="text-sm font-semibold text-blue-500 dark:text-blue-400">
                                {vitals ? `${vitals.cpu.freqGhz} GHz` : "—"}
                            </p>
                        </div>
                    </BentoCard>

                    {/* RAM Card */}
                    <BentoCard delay={0.15}>
                        <div className="flex justify-between items-start mb-6">
                            <BlinkistIcon icon={Activity} colorClass="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" />
                            <span className={`flex items-center text-[11px] font-bold ${ramBdg.text} ${ramBdg.bg} px-2.5 py-1 rounded-full border ${ramBdg.border}`}>
                                {ramBdg.label}
                            </span>
                        </div>
                        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest mb-1">System Memory</p>
                        <h3 className="text-[15px] font-bold text-card-foreground mb-3 truncate">
                            {vitals ? `${Math.round(vitals.ram.totalMb / 1024)} GB RAM` : "Loading…"}
                        </h3>
                        <div className="flex items-baseline justify-between mt-auto">
                            <p className="text-3xl font-black text-foreground tracking-tighter">
                                {vitals ? Math.round(vitals.ram.usagePct) : "—"}
                                <span className="text-lg text-slate-400 dark:text-slate-200 font-medium">%</span>
                            </p>
                            <p className="text-sm font-semibold text-emerald-500 dark:text-emerald-400">
                                {vitals ? `${(vitals.ram.usedMb / 1024).toFixed(1)} GB Used` : "—"}
                            </p>
                        </div>
                    </BentoCard>

                    {/* Drive Card */}
                    <BentoCard delay={0.2} className="relative overflow-hidden group">
                        <div className="absolute right-0 bottom-0 opacity-10 blur-xl w-32 h-32 bg-purple-500 rounded-full pointer-events-none group-hover:opacity-20 transition-opacity"></div>
                        <div className="flex justify-between items-start mb-6 relative z-10">
                            <BlinkistIcon icon={HardDrive} colorClass="bg-purple-500/10 text-purple-400 border border-purple-500/20" />
                        </div>
                        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest mb-1 relative z-10">Primary Drive</p>
                        <h3 className="text-[15px] font-bold text-card-foreground mb-3 truncate relative z-10">
                            {primaryDriveName || "Loading…"}
                        </h3>
                        <div className="flex items-baseline justify-between mt-auto relative z-10">
                            <p className="text-3xl font-black text-foreground tracking-tighter">
                                {primaryDrive ? Math.round(primaryDrive.totalGb - primaryDrive.freeGb) : "—"}
                                <span className="text-lg text-slate-400 dark:text-slate-200 font-medium"> GB</span>
                            </p>
                            <p className="text-sm font-semibold text-purple-500 dark:text-purple-400">{primaryDriveFree}</p>
                        </div>
                    </BentoCard>

                    {/* Network Card */}
                    <BentoCard delay={0.25}>
                        <div className="flex justify-between items-start mb-6">
                            <BlinkistIcon icon={Wifi} colorClass="bg-orange-500/10 text-orange-400 border border-orange-500/20" />
                        </div>
                        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest mb-1">Network Adapter</p>
                        <h3 className="text-[15px] font-bold text-card-foreground mb-3 truncate">
                            {primaryNet?.name ?? "Loading…"}
                        </h3>
                        <div className="flex items-baseline justify-between mt-auto">
                            <p className="text-2xl font-black text-foreground tracking-tighter">
                                {primaryNet ? `${(primaryNet.data.receivedBytes / (1024 * 1024 * 1024)).toFixed(1)}` : "—"}
                                <span className="text-sm text-slate-400 dark:text-slate-200 font-medium ml-1">GB recv</span>
                            </p>
                            <p className="text-sm font-semibold text-orange-500 dark:text-orange-400">
                                {primaryNet ? `${(primaryNet.data.transmittedBytes / (1024 * 1024 * 1024)).toFixed(1)} GB sent` : "—"}
                            </p>
                        </div>
                    </BentoCard>

                    {/* Uptime Card */}
                    <BentoCard delay={0.3}>
                        <div className="flex justify-between items-start mb-6">
                            <BlinkistIcon icon={Clock} colorClass="bg-sky-500/10 text-sky-400 border border-sky-500/20" />
                        </div>
                        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-300 uppercase tracking-widest mb-1">Uptime</p>
                        <h3 className="text-[15px] font-bold text-card-foreground mb-3 truncate">
                            System Session
                        </h3>
                        <div className="flex items-baseline justify-between mt-auto">
                            <p className="text-3xl font-black text-foreground tracking-tighter">
                                {vitals?.system?.uptimeSeconds != null
                                    ? formatUptime(vitals.system.uptimeSeconds)
                                    : "—"}
                            </p>
                            <p className="text-sm font-semibold text-sky-500 dark:text-sky-400">
                                {vitals?.system?.uptimeSeconds != null
                                    ? `${Math.floor(vitals.system.uptimeSeconds / 3600)}h total`
                                    : ""}
                            </p>
                        </div>
                    </BentoCard>
                </div>
            </div>

            {/* Grid layer 2 - Alert Banner */}
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="bento-card relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between p-1 group cursor-pointer"
                onClick={() => setView?.("privacy")}
            >
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 via-transparent to-transparent opacity-50 group-hover:opacity-100 transition-opacity"></div>
                <div className="flex items-center space-x-5 p-5 relative z-10 w-full">
                    <BlinkistIcon icon={ShieldAlert} colorClass="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.2)]" />
                    <div className="flex-1">
                        <h3 className="text-base font-bold text-foreground mb-0.5">Privacy Intervention Recommended</h3>
                        <p className="text-[14px] text-slate-500 dark:text-slate-200 leading-relaxed font-medium">
                            Diagnostic tracking is active. Deploy countermeasures to secure OS telemetry output.
                        </p>
                    </div>
                    <div className="hidden md:flex bg-white/5 group-hover:bg-white/10 p-2 rounded-full border border-white/10 transition-all group-hover:translate-x-0.5">
                        <ChevronRight className="w-5 h-5 text-slate-400 dark:text-slate-200 group-hover:text-foreground transition-colors" />
                    </div>
                </div>
            </motion.div>
        </div>

        {/* Quick Scan — Confirm modal */}
        <ConfirmDeployModal
            isOpen={showScanConfirm}
            tweaks={greenCandidates}
            onCancel={() => setShowScanConfirm(false)}
            isExecuting={isExecuting}
            onConfirm={async () => {
                setShowScanConfirm(false);
                setScanProgressItems(greenCandidates.map(t => ({ id: t.id, name: t.name, status: "pending" as const })));
                setShowScanProgress(true);
                setShowScanFailureActions(false);

                for (let i = 0; i < greenCandidates.length; i++) {
                    const tweak = greenCandidates[i];
                    setScanProgressItems(prev => prev.map((item, idx) => idx === i ? { ...item, status: "running" as const } : item));
                    const result = await applyTweak(tweak);
                    if (result?.success) {
                        setScanProgressItems(prev => prev.map((item, idx) => idx === i ? { ...item, status: "success" as const, result } : item));
                    } else {
                        setScanProgressItems(prev => prev.map((item, idx) => idx === i ? { ...item, status: "failed" as const, result: result ?? undefined } : item));
                        setShowScanFailureActions(true);
                        return;
                    }
                }
                addToast({ type: "success", title: `${greenCandidates.length} safe tweak${greenCandidates.length > 1 ? "s" : ""} applied!` });
            }}
        />

        {/* Quick Scan — Progress modal */}
        <ProgressModal
            isOpen={showScanProgress}
            items={scanProgressItems}
            showFailureActions={showScanFailureActions}
            onClose={() => { setShowScanProgress(false); setShowScanFailureActions(false); }}
            onRollback={async () => {
                setShowScanFailureActions(false);
                const applied = scanProgressItems
                    .filter(i => i.status === "success")
                    .map(i => tweaksData.find(t => t.id === i.id)!)
                    .filter(Boolean);
                await rollbackTweaks(applied);
                addToast({ type: "warning", title: `Rolled back ${applied.length} tweak${applied.length > 1 ? "s" : ""}` });
                setShowScanProgress(false);
            }}
            onSkipAndContinue={async () => {
                setShowScanFailureActions(false);
                const failedIdx = scanProgressItems.findIndex(i => i.status === "failed");
                for (let i = failedIdx + 1; i < greenCandidates.length; i++) {
                    const tweak = greenCandidates[i];
                    setScanProgressItems(prev => prev.map((item, idx) => idx === i ? { ...item, status: "running" as const } : item));
                    const result = await applyTweak(tweak);
                    if (result?.success) {
                        setScanProgressItems(prev => prev.map((item, idx) => idx === i ? { ...item, status: "success" as const, result } : item));
                    } else {
                        setScanProgressItems(prev => prev.map((item, idx) => idx === i ? { ...item, status: "failed" as const, result: result ?? undefined } : item));
                        break;
                    }
                }
            }}
        />
        </>
    );
}
