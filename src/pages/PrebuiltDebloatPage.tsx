import { useState } from "react";
import { Zap, ShieldCheck, ChevronRight, CheckCircle2, AlertTriangle, Monitor, Sparkles, Box, LayoutDashboard, Settings } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useApps } from "../hooks/useApps";
import { useTweakExecution } from "../hooks/useTweakExecution";
import { useToast } from "../components/ToastSystem";
import debloatProfiles from "../data/debloat_profiles.json";
import tweaksData from "../data/tweaks.json";

interface BloatApp {
    id: string;
    name: string;
    description: string;
}

interface Profile {
    id: string;
    name: string;
    logo: string;
    apps: BloatApp[];
    isWindows?: boolean;
}

// Generate the Windows General profile from our Tweaks data (Debloat category)
const windowsDebloatTweaks = tweaksData.filter(t => t.category === "Debloat");
const windowsProfile: Profile = {
    id: "windows_general",
    name: "Windows General Debloat",
    logo: "Settings",
    isWindows: true,
    apps: windowsDebloatTweaks.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description
    }))
};

const allProfiles: Profile[] = [windowsProfile, ...(debloatProfiles.profiles as Profile[])];

export function PrebuiltDebloatPage() {
    const { uninstallApp } = useApps();
    const { applyTweak } = useTweakExecution();
    const { addToast } = useToast();

    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
    const [selectedApps, setSelectedApps] = useState<Set<string>>(new Set());
    
    // Progress state
    const [isExecuting, setIsExecuting] = useState(false);
    const [progressLog, setProgressLog] = useState<{ id: string, name: string, status: "pending" | "running" | "success" | "failed" }[]>([]);

    const handleSelectProfile = (profile: Profile) => {
        setSelectedProfile(profile);
        // Auto-select all apps by default
        setSelectedApps(new Set(profile.apps.map(a => a.id)));
        setStep(2);
    };

    const toggleAppSelection = (id: string) => {
        const next = new Set(selectedApps);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedApps(next);
    };

    const handleExecute = async () => {
        if (!selectedProfile || selectedApps.size === 0) return;
        
        setStep(3);
        setIsExecuting(true);
        
        const appsToUninstall = selectedProfile.apps.filter(a => selectedApps.has(a.id));
        const initialLog = appsToUninstall.map(a => ({ id: a.id, name: a.name, status: "pending" as const }));
        setProgressLog(initialLog);

        let successCount = 0;

        for (let i = 0; i < appsToUninstall.length; i++) {
            const app = appsToUninstall[i];
            
            // Mark running
            setProgressLog(prev => prev.map(p => p.id === app.id ? { ...p, status: "running" } : p));
            
            try {
                if (selectedProfile.isWindows) {
                    // Execute as a generic tweaking command
                    const tweak = windowsDebloatTweaks.find(t => t.id === app.id);
                    if (tweak) {
                        const result = await applyTweak(tweak);
                        if (result?.success) {
                            successCount++;
                            setProgressLog(prev => prev.map(p => p.id === app.id ? { ...p, status: "success" } : p));
                        } else {
                            setProgressLog(prev => prev.map(p => p.id === app.id ? { ...p, status: "failed" } : p));
                        }
                    } else {
                        setProgressLog(prev => prev.map(p => p.id === app.id ? { ...p, status: "failed" } : p));
                    }
                } else {
                    // Standard Appx/Winget uninstall
                    const result = await uninstallApp(app.id, app.name);
                    if (result.success) {
                        successCount++;
                        setProgressLog(prev => prev.map(p => p.id === app.id ? { ...p, status: "success" } : p));
                    } else {
                        setProgressLog(prev => prev.map(p => p.id === app.id ? { ...p, status: "failed" } : p));
                    }
                }
            } catch (e) {
                setProgressLog(prev => prev.map(p => p.id === app.id ? { ...p, status: "failed" } : p));
            }
        }

        setIsExecuting(false);
        addToast({
            type: successCount === appsToUninstall.length ? "success" : "warning",
            title: "Debloat Complete",
            message: `Successfully processed ${successCount} out of ${appsToUninstall.length} targets.`
        });
    };

    const resetWizard = () => {
        setStep(1);
        setSelectedProfile(null);
        setSelectedApps(new Set());
        setProgressLog([]);
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-12 pt-6 px-4">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                <div>
                    <div className="inline-flex items-center space-x-2 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-3 py-1.5 rounded-full mb-4">
                        <Zap className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-widest">Wizard</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground font-heading">
                        Debloater <span className="text-yellow-500">Wizard</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-2xl font-medium">
                        Remove unnecessary manufacturer software and Windows built-in telemetry safely. Select a profile to see recommended targets to wipe.
                    </p>
                </div>
            </div>

            {/* Wizard Steps indicator */}
            <div className="flex items-center gap-2 mb-8 select-none overflow-x-auto pb-2 custom-scrollbar">
                <div className={`flex shrink-0 items-center gap-2 px-4 py-2 rounded-full border ${step >= 1 ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-black/5 dark:bg-white/5 border-border text-slate-500'}`}>
                    <Monitor className="w-4 h-4" /> <span className="text-sm font-bold">1. Profile</span>
                </div>
                <div className={`w-8 h-[2px] shrink-0 ${step >= 2 ? 'bg-primary' : 'bg-border'}`} />
                <div className={`flex shrink-0 items-center gap-2 px-4 py-2 rounded-full border ${step >= 2 ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-black/5 dark:bg-white/5 border-border text-slate-500'}`}>
                    <Box className="w-4 h-4" /> <span className="text-sm font-bold">2. Select Targets</span>
                </div>
                <div className={`w-8 h-[2px] shrink-0 ${step >= 3 ? 'bg-primary' : 'bg-border'}`} />
                <div className={`flex shrink-0 items-center gap-2 px-4 py-2 rounded-full border ${step >= 3 ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-black/5 dark:bg-white/5 border-border text-slate-500'}`}>
                    <Sparkles className="w-4 h-4" /> <span className="text-sm font-bold">3. Execute</span>
                </div>
            </div>

            <AnimatePresence mode="wait">
                
                {/* STEP 1: SELECT BRAND */}
                {step === 1 && (
                    <motion.div
                        key="step1"
                        initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
                    >
                        {allProfiles.map((profile) => (
                            <div 
                                key={profile.id}
                                onClick={() => handleSelectProfile(profile)}
                                className={`bento-card p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all group relative overflow-hidden ${profile.isWindows ? 'border-blue-500/30 hover:border-blue-500/70 hover:bg-blue-500/5' : 'hover:border-primary/50 hover:bg-primary/5'}`}
                            >
                                {profile.isWindows && (
                                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-400" />
                                )}
                                <div className={`w-12 h-12 rounded-xl shadow-inner flex items-center justify-center mb-3 p-2 overflow-hidden ${profile.isWindows ? 'bg-blue-500/10 text-blue-500' : 'bg-white text-slate-300'}`}>
                                    {profile.logo === "Settings" ? (
                                        <Settings className="w-6 h-6" />
                                    ) : (
                                        <LayoutDashboard className="w-6 h-6 group-hover:text-primary transition-colors" />
                                    )}
                                </div>
                                <h3 className="font-bold text-foreground text-sm">{profile.name}</h3>
                                <p className="text-[11px] text-slate-500 mt-1">{profile.apps.length} targets</p>
                            </div>
                        ))}
                    </motion.div>
                )}

                {/* STEP 2: SELECT APPS */}
                {step === 2 && selectedProfile && (
                    <motion.div
                        key="step2"
                        initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                        className="space-y-6"
                    >
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold flex items-center gap-3">
                                <button onClick={() => setStep(1)} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors mr-2">
                                    <ChevronRight className="w-5 h-5 rotate-180 text-slate-400" />
                                </button>
                                {selectedProfile.name} Targets
                            </h2>
                            <span className="text-sm font-semibold text-slate-500 bg-black/5 dark:bg-white/5 px-3 py-1 rounded-full border border-border">
                                {selectedApps.size} / {selectedProfile.apps.length} Selected
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {selectedProfile.apps.map(app => {
                                const isSelected = selectedApps.has(app.id);
                                return (
                                    <div 
                                        key={app.id} 
                                        onClick={() => toggleAppSelection(app.id)}
                                        className={`bento-card p-4 flex items-start gap-4 cursor-pointer transition-all border ${isSelected ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-border/80'}`}
                                    >
                                        <div className={`mt-0.5 w-5 h-5 rounded-md shrink-0 flex items-center justify-center border transition-colors ${isSelected ? 'bg-primary border-primary text-white' : 'border-slate-300 dark:border-slate-600'}`}>
                                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-foreground text-sm leading-tight">{app.name}</h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed line-clamp-2">{app.description}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        
                        <div className="flex justify-end pt-4 border-t border-border mt-8">
                            <button
                                onClick={handleExecute}
                                disabled={selectedApps.size === 0}
                                className="btn-tactile bg-primary text-primary-foreground px-8 py-3 rounded-xl font-bold flex items-center shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Zap className="w-4 h-4 mr-2" fill="currentColor" />
                                Wipe Selected Targets
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* STEP 3: EXECUTION / PROGRESS */}
                {step === 3 && selectedProfile && (
                    <motion.div
                        key="step3"
                        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                        className="max-w-3xl mx-auto"
                    >
                        <div className="bento-card p-8 text-center mb-8">
                            <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 relative">
                                {isExecuting ? (
                                    <>
                                        <div className="absolute inset-0 border-4 border-transparent border-t-primary rounded-full animate-spin" />
                                        <Zap className="w-8 h-8 text-primary animate-pulse" />
                                    </>
                                ) : progressLog.some(p => p.status === "failed") ? (
                                    <AlertTriangle className="w-8 h-8 text-amber-500" />
                                ) : (
                                    <ShieldCheck className="w-8 h-8 text-emerald-500" />
                                )}
                            </div>
                            
                            <h2 className="text-2xl font-black mb-2">
                                {isExecuting ? "Executing Removal Protocol" : "Operation Complete"}
                            </h2>
                            <p className="text-slate-500 text-sm font-medium">
                                {isExecuting ? "Please wait while targets are processed..." : "Review the results below."}
                            </p>
                        </div>

                        <div className="space-y-3">
                            {progressLog.map((log) => (
                                <div key={log.id} className="bento-card p-4 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3 min-w-0">
                                        {log.status === "pending" && <div className="w-2 h-2 shrink-0 rounded-full bg-slate-300" />}
                                        {log.status === "running" && <div className="w-2 h-2 shrink-0 rounded-full bg-blue-500 animate-pulse" />}
                                        {log.status === "success" && <div className="w-2 h-2 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />}
                                        {log.status === "failed" && <div className="w-2 h-2 shrink-0 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />}
                                        <span className="font-semibold text-sm truncate">{log.name}</span>
                                    </div>
                                    <div className="shrink-0">
                                        {log.status === "pending" && <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Queued</span>}
                                        {log.status === "running" && <span className="text-xs font-bold text-blue-500 uppercase tracking-wider animate-pulse">Processing...</span>}
                                        {log.status === "success" && <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Success</span>}
                                        {log.status === "failed" && <span className="text-xs font-bold text-red-500 uppercase tracking-wider">Failed</span>}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {!isExecuting && (
                            <div className="flex justify-center mt-8">
                                <button
                                    onClick={resetWizard}
                                    className="btn-tactile bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-foreground px-6 py-2.5 rounded-xl font-bold border border-border"
                                >
                                    Return to Selection
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}

            </AnimatePresence>
        </div>
    );
}
