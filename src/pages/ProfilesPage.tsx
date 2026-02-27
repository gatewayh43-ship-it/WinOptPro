import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Shield, Gamepad2, Wifi, Leaf, CheckCircle2, Play, Trash2 } from "lucide-react";
import tweaksData from "../data/tweaks.json";
import { useAppStore } from "../store/appStore";
import { useTweakExecution } from "../hooks/useTweakExecution";
import { useToast } from "../components/ToastSystem";
import { ConfirmDeployModal } from "../components/ConfirmDeployModal";
import { ProgressModal, type ProgressItem } from "../components/ProgressModal";

interface Profile {
    id: string;
    name: string;
    description: string;
    icon: React.ElementType;
    tweakIds: string[];
    isBuiltIn: boolean;
    color: string;
}

const BUILT_IN_PROFILES: Profile[] = [
    {
        id: "profile-gaming",
        name: "Gaming Mode",
        description: "Maximize FPS and minimize system overhead. Disables background services, tuning CPU scheduling, and prioritizes gaming threads.",
        icon: Gamepad2,
        tweakIds: tweaksData.filter(t => t.category === "Gaming" && t.riskLevel !== "Red").map(t => t.id),
        isBuiltIn: true,
        color: "#8b5cf6",
    },
    {
        id: "profile-privacy",
        name: "Privacy Fortress",
        description: "Lock down telemetry, disable activity history, block diagnostic data collection, and comprehensively restrict Windows tracking.",
        icon: Shield,
        tweakIds: tweaksData.filter(t => t.category === "Privacy" && t.riskLevel !== "Red").map(t => t.id),
        isBuiltIn: true,
        color: "#f43f5e",
    },
    {
        id: "profile-performance",
        name: "System Speedup",
        description: "Disable all unnecessary background services, optimize memory, and prioritize foreground UI responsiveness.",
        icon: Zap,
        tweakIds: tweaksData.filter(t => t.category === "Performance" && t.riskLevel !== "Red").map(t => t.id),
        isBuiltIn: true,
        color: "#05cd99",
    },
    {
        id: "profile-network",
        name: "Network Optimizer",
        description: "Optimize TCP/IP settings, set Cloudflare DNS, disable Nagle's Algorithm, and tune for low latency.",
        icon: Wifi,
        tweakIds: tweaksData.filter(t => t.category === "Network" && t.riskLevel !== "Red").map(t => t.id),
        isBuiltIn: true,
        color: "#f59e0b",
    },
    {
        id: "profile-debloat",
        name: "Clean Windows",
        description: "Remove pre-installed bloatware, telemetry tasks, and unneeded Windows integrations (OneDrive, Xbox, Copilot).",
        icon: Trash2,
        tweakIds: tweaksData.filter(t => t.category === "Debloat" && t.riskLevel !== "Red").map(t => t.id),
        isBuiltIn: true,
        color: "#3b82f6",
    },
    {
        id: "profile-minimal",
        name: "Safe & Minimal",
        description: "Only apply the safest, Green-rated tweaks across all categories. No system trade-offs.",
        icon: Leaf,
        tweakIds: tweaksData.filter(t => t.riskLevel === "Green").map(t => t.id),
        isBuiltIn: true,
        color: "#10b981",
    },
];

export function ProfilesPage() {
    const [profiles] = useState<Profile[]>(BUILT_IN_PROFILES);
    const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
    const appliedTweaks = useAppStore((s) => s.appliedTweaks);
    const { applyTweak, rollbackTweaks, isExecuting } = useTweakExecution();
    const { addToast } = useToast();

    // Batch deploy state
    const [pendingProfile, setPendingProfile] = useState<Profile | null>(null);
    const [pendingTweaks, setPendingTweaks] = useState<typeof tweaksData>([]);
    const [showConfirm, setShowConfirm] = useState(false);
    const [showProgress, setShowProgress] = useState(false);
    const [progressItems, setProgressItems] = useState<ProgressItem[]>([]);
    const [showFailureActions, setShowFailureActions] = useState(false);

    const handleApplyProfile = (profile: Profile) => {
        const tweaksToApply = profile.tweakIds
            .filter(id => !appliedTweaks.includes(id))
            .map(id => tweaksData.find(t => t.id === id))
            .filter(Boolean) as typeof tweaksData;

        if (tweaksToApply.length === 0) {
            addToast({ type: "info", title: "All tweaks in this profile are already applied" });
            return;
        }

        setPendingProfile(profile);
        setPendingTweaks(tweaksToApply);
        setShowConfirm(true);
    };

    const closeBatchModals = () => {
        setShowConfirm(false);
        setShowProgress(false);
        setShowFailureActions(false);
        setPendingProfile(null);
        setPendingTweaks([]);
    };

    return (
        <>
        <div className="space-y-6 pb-12">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h2 className="text-3xl font-black tracking-tight text-foreground">
                    Optimization <span className="text-gradient">Profiles</span>
                </h2>
                <p className="text-slate-500 mt-2 text-[15px] font-medium leading-relaxed max-w-lg">
                    Pre-configured bundles of tweaks for common use cases. Apply an entire set with one click.
                </p>
            </motion.div>

            {/* Profile cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profiles.map((profile, i) => {
                    const Icon = profile.icon;
                    const matchingTweaks = profile.tweakIds
                        .map(id => tweaksData.find(t => t.id === id))
                        .filter(Boolean) as typeof tweaksData;
                    const appliedCount = profile.tweakIds.filter(id => appliedTweaks.includes(id)).length;
                    const isFullyApplied = appliedCount === profile.tweakIds.length;
                    const isSelected = selectedProfile?.id === profile.id;

                    return (
                        <motion.div
                            key={profile.id}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className={`bento-card relative overflow-hidden p-6 cursor-pointer transition-all ${isSelected ? "ring-2 ring-primary/30" : "hover:bg-white/[0.02]"
                                }`}
                            onClick={() => setSelectedProfile(isSelected ? null : profile)}
                        >
                            {/* Color accent bar */}
                            <div
                                className="absolute top-0 left-0 right-0 h-1 opacity-60"
                                style={{ background: `linear-gradient(to right, ${profile.color}, transparent)` }}
                            />

                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-10 h-10 rounded-xl flex items-center justify-center border"
                                        style={{
                                            backgroundColor: `${profile.color}15`,
                                            borderColor: `${profile.color}30`,
                                        }}
                                    >
                                        <Icon className="w-5 h-5" style={{ color: profile.color }} />
                                    </div>
                                    <div>
                                        <h3 className="text-[15px] font-bold text-foreground">{profile.name}</h3>
                                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                                            {profile.tweakIds.length} tweaks · {appliedCount} active
                                        </p>
                                    </div>
                                </div>

                                {isFullyApplied ? (
                                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                        <CheckCircle2 className="w-3 h-3" /> Applied
                                    </span>
                                ) : appliedCount > 0 ? (
                                    <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                                        {appliedCount}/{profile.tweakIds.length}
                                    </span>
                                ) : null}
                            </div>

                            <p className="text-[13px] text-slate-400 leading-relaxed mb-4">{profile.description}</p>

                            {/* Expanded detail */}
                            <AnimatePresence>
                                {isSelected && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="border-t border-border/50 pt-4 space-y-2 mb-4">
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Included Tweaks</p>
                                            {matchingTweaks.map(tweak => (
                                                <div
                                                    key={tweak.id}
                                                    className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-white/[0.02]"
                                                >
                                                    <span className="text-[12px] font-medium text-slate-300 truncate">{tweak.name}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tweak.riskLevel === "Green" ? "text-emerald-400 bg-emerald-500/10" :
                                                            tweak.riskLevel === "Yellow" ? "text-amber-400 bg-amber-500/10" :
                                                                "text-red-400 bg-red-500/10"
                                                            }`}>
                                                            {tweak.riskLevel}
                                                        </span>
                                                        {appliedTweaks.includes(tweak.id) && (
                                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleApplyProfile(profile); }}
                                            disabled={isExecuting || isFullyApplied}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-40"
                                        >
                                            <Play className="w-4 h-4" />
                                            {isFullyApplied ? "All Applied" : `Apply ${profile.tweakIds.length - appliedCount} Remaining`}
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    );
                })}
            </div>
        </div>

        {/* Profile batch deploy — Confirm modal */}
        <ConfirmDeployModal
            isOpen={showConfirm}
            tweaks={pendingTweaks}
            onCancel={closeBatchModals}
            isExecuting={isExecuting}
            onConfirm={async () => {
                setShowConfirm(false);
                setProgressItems(pendingTweaks.map(t => ({ id: t.id, name: t.name, status: "pending" as const })));
                setShowProgress(true);
                setShowFailureActions(false);

                for (let i = 0; i < pendingTweaks.length; i++) {
                    const tweak = pendingTweaks[i];
                    setProgressItems(prev => prev.map((item, idx) => idx === i ? { ...item, status: "running" as const } : item));
                    const result = await applyTweak(tweak);
                    if (result?.success) {
                        setProgressItems(prev => prev.map((item, idx) => idx === i ? { ...item, status: "success" as const, result } : item));
                    } else {
                        setProgressItems(prev => prev.map((item, idx) => idx === i ? { ...item, status: "failed" as const, result: result ?? undefined } : item));
                        setShowFailureActions(true);
                        return;
                    }
                }
                addToast({ type: "success", title: `${pendingProfile?.name} applied (${pendingTweaks.length} tweaks)` });
            }}
        />

        {/* Profile batch deploy — Progress modal */}
        <ProgressModal
            isOpen={showProgress}
            items={progressItems}
            showFailureActions={showFailureActions}
            onClose={closeBatchModals}
            onRollback={async () => {
                setShowFailureActions(false);
                const applied = progressItems
                    .filter(i => i.status === "success")
                    .map(i => tweaksData.find(t => t.id === i.id)!)
                    .filter(Boolean);
                await rollbackTweaks(applied);
                addToast({ type: "warning", title: `Rolled back ${applied.length} tweak${applied.length > 1 ? "s" : ""}` });
                closeBatchModals();
            }}
            onSkipAndContinue={async () => {
                setShowFailureActions(false);
                const failedIdx = progressItems.findIndex(i => i.status === "failed");
                for (let i = failedIdx + 1; i < pendingTweaks.length; i++) {
                    const tweak = pendingTweaks[i];
                    setProgressItems(prev => prev.map((item, idx) => idx === i ? { ...item, status: "running" as const } : item));
                    const result = await applyTweak(tweak);
                    if (result?.success) {
                        setProgressItems(prev => prev.map((item, idx) => idx === i ? { ...item, status: "success" as const, result } : item));
                    } else {
                        setProgressItems(prev => prev.map((item, idx) => idx === i ? { ...item, status: "failed" as const, result: result ?? undefined } : item));
                        setShowFailureActions(true);
                        return;
                    }
                }
            }}
        />
        </>
    );
}
