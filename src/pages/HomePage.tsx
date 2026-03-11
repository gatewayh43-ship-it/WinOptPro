import { useState, useEffect } from "react";
import { Search, Sparkles, Command, ShieldCheck, Gamepad2, Package, Cpu, Activity, HardDrive, Network, MonitorCog, Zap, Terminal } from "lucide-react";
import { motion } from "framer-motion";
import { useSystemVitals } from "../hooks/useSystemVitals";


// Reusing badge functions from Dashboard (you could move these to a utility file later, but we keep them here for now)
function tempBadge(tempC: number | null) {
    if (tempC === null) return { label: "N/A", bg: "bg-slate-400/10", text: "text-slate-400", border: "border-slate-400/20" };
    if (tempC > 80) return { label: "High Temp", bg: "bg-red-400/10", text: "text-red-400", border: "border-red-400/20" };
    if (tempC > 65) return { label: "Warm", bg: "bg-amber-400/10", text: "text-amber-400", border: "border-amber-400/20" };
    return { label: "Cool", bg: "bg-emerald-400/10", text: "text-emerald-400", border: "border-emerald-400/20" };
}

function ramBadge(pct: number) {
    if (pct > 85) return { label: "High Usage", bg: "bg-red-400/10", text: "text-red-400", border: "border-red-400/20" };
    if (pct > 60) return { label: "Moderate", bg: "bg-amber-400/10", text: "text-amber-400", border: "border-amber-400/20" };
    return { label: "Optimal", bg: "bg-emerald-400/10", text: "text-emerald-400", border: "border-emerald-400/20" };
}

function computeHealthScore(vitals: ReturnType<typeof useSystemVitals>["vitals"]): number {
    if (!vitals) return 0;
    let score = 100;
    const cpuTemp = vitals.cpu.tempC ?? 50;
    if (cpuTemp > 90) score -= 30;
    else if (cpuTemp > 80) score -= 20;
    else if (cpuTemp > 70) score -= 10;
    if (vitals.ram.usagePct > 90) score -= 25;
    else if (vitals.ram.usagePct > 80) score -= 15;
    else if (vitals.ram.usagePct > 70) score -= 5;
    if (vitals.cpu.usagePct > 90) score -= 15;
    else if (vitals.cpu.usagePct > 70) score -= 5;
    return Math.max(0, Math.min(100, score));
}

// ----------------------------------------------------------------------------
// Components
// ----------------------------------------------------------------------------

const SystemScore = ({ score }: { score: number }) => {
    const radius = 35;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    const colorClass = score >= 90 ? "text-emerald-400" : score >= 75 ? "text-blue-400" : score >= 60 ? "text-yellow-400" : "text-red-400";
    
    return (
        <div className="relative flex items-center justify-center w-24 h-24">
            <svg className="w-full h-full transform -rotate-90 pointer-events-none" viewBox="0 0 100 100">
                <circle className="text-white/5 dark:text-white/10 stroke-current" strokeWidth="8" cx="50" cy="50" r={radius} fill="transparent" />
                <motion.circle
                    className={`${colorClass} stroke-current transition-all duration-1000 ease-out`}
                    strokeWidth="8" strokeLinecap="round" cx="50" cy="50" r={radius} fill="transparent"
                    initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset }}
                    style={{ strokeDasharray: circumference }}
                />
            </svg>
            <div className="absolute flex flex-col items-center justify-center drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                <span className="text-2xl font-black font-heading tracking-tighter text-foreground">{score}</span>
            </div>
        </div>
    );
};

// A Bento box component with glassmorphism styling
const BentoBox = ({ 
    children, delay = 0, className = "", onClick 
}: { 
    children: React.ReactNode, delay?: number, className?: string, onClick?: () => void 
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, delay, ease: [0.25, 0.8, 0.25, 1] }}
            onClick={onClick}
            className={`
                relative overflow-hidden rounded-[24px] 
                bg-white/40 dark:bg-black/40 
                backdrop-blur-xl border border-white/20 dark:border-white/10
                shadow-[0_8px_32px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.2)]
                hover:bg-white/60 dark:hover:bg-black/60 hover:border-primary/30
                transition-all duration-300 group
                ${onClick ? 'cursor-pointer hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10' : ''}
                ${className}
            `}
        >
            {/* Subtle gradient overlay for glass effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent dark:from-white/5 opacity-50 pointer-events-none" />
            <div className="relative z-10 w-full h-full p-6">
                {children}
            </div>
        </motion.div>
    );
};

const FeatureModuleCard = ({ 
    icon: Icon, title, description, colorClass, onClick, delay 
}: { 
    icon: any, title: string, description: string, colorClass: string, onClick: () => void, delay: number 
}) => (
    <BentoBox delay={delay} onClick={onClick} className="flex flex-col h-full justify-between">
        <div className={`w-12 h-12 rounded-[16px] flex items-center justify-center mb-4 ${colorClass} bg-opacity-20 backdrop-blur-md border border-current/20 shadow-inner`}>
            <Icon className="w-6 h-6 currentColor" />
        </div>
        <div>
            <h3 className="text-lg font-bold text-foreground mb-1 group-hover:text-primary transition-colors">{title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{description}</p>
        </div>
    </BentoBox>
);

// ----------------------------------------------------------------------------
// Main Page Component
// ----------------------------------------------------------------------------

export function HomePage({ setView }: { setView: (v: string) => void }) {
    const { vitals } = useSystemVitals();
    const [greeting, setGreeting] = useState("Welcome back");

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting("Good morning");
        else if (hour < 18) setGreeting("Good afternoon");
        else setGreeting("Good evening");
    }, []);

    const healthScore = computeHealthScore(vitals);
    const cpuBadge = tempBadge(vitals?.cpu.tempC ?? null);
    const ramBdg = ramBadge(vitals?.ram.usagePct ?? 0);
    const primaryDrive = vitals?.drives?.["C:"] ?? (vitals?.drives ? Object.values(vitals.drives)[0] : null);

    const handleSearchClick = () => {
        // Trigger global command palette
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }));
    };

    return (
        <div className="max-w-[1400px] mx-auto min-h-screen px-4 pb-20 pt-6">
            
            {/* Background Ambient Effects */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/20 blur-[120px]" />
            </div>

            <div className="relative z-10 space-y-8">
                
                {/* 1. HERO SECTION & SEMANTIC SEARCH */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
                    className="flex flex-col items-center justify-center text-center py-10"
                >
                    <div className="inline-flex items-center space-x-2 bg-white/40 dark:bg-black/40 border border-white/20 dark:border-white/10 px-4 py-1.5 rounded-full mb-6 backdrop-blur-xl shadow-sm">
                        <span className={`w-2 h-2 rounded-full ${vitals ? 'bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.8)]' : 'bg-amber-400'}`}></span>
                        <span className="text-[12px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-widest leading-none mt-0.5">
                            {vitals ? 'System Optimal' : 'Analyzing…'}
                        </span>
                    </div>

                    <h1 className="text-4xl md:text-6xl font-black tracking-tight text-foreground mb-4 font-heading">
                        {greeting}, <span className="text-gradient">Commander</span>
                    </h1>
                    <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl font-medium mb-10">
                        What would you like to optimize today? Use natural language to search across all modules and tweaks.
                    </p>

                    {/* Massive Semantic Search Bar */}
                    <div className="w-full max-w-3xl relative group cursor-text" onClick={handleSearchClick}>
                        <div className="absolute -inset-1 bg-gradient-to-r from-primary/50 to-blue-500/50 rounded-[28px] blur opacity-30 group-hover:opacity-60 transition duration-500" />
                        <div className="relative flex items-center bg-white/60 dark:bg-black/60 backdrop-blur-2xl border border-white/40 dark:border-white/10 p-4 rounded-[24px] shadow-2xl">
                            <Search className="w-6 h-6 text-slate-500 ml-4 hidden sm:block" />
                            <Sparkles className="w-6 h-6 text-primary ml-4 sm:hidden animate-pulse" />
                            <div className="flex-1 px-4 text-left">
                                <span className="text-lg text-slate-400 font-medium select-none">Search "Optimize gaming performance"...</span>
                            </div>
                            <div className="flex items-center gap-2 pr-2 bg-black/5 dark:bg-white/10 px-3 py-1.5 rounded-xl">
                                <Command className="w-4 h-4 text-slate-500" />
                                <span className="text-sm font-bold text-slate-500">K</span>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* 2. BENTO GRID - LIVE METRICS */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Score */}
                    <BentoBox delay={0.1} className="flex flex-col items-center justify-center text-center">
                        <SystemScore score={healthScore} />
                        <h3 className="mt-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest relative z-10 text-center">Health Index</h3>
                    </BentoBox>

                    {/* CPU */}
                    <BentoBox delay={0.15} className="flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20"><Cpu className="w-5 h-5" /></div>
                            <span className={`text-[10px] font-bold ${cpuBadge.text} ${cpuBadge.bg} px-2 py-0.5 rounded-full border ${cpuBadge.border}`}>{cpuBadge.label}</span>
                        </div>
                        <div>
                            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-1">Processor</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-black text-foreground">{vitals?.cpu.tempC != null ? Math.round(vitals.cpu.tempC) : "—"}</span>
                                <span className="text-sm text-slate-500 font-medium">°C ({vitals ? vitals.cpu.usagePct.toFixed(0) : "—"}%)</span>
                            </div>
                        </div>
                    </BentoBox>

                    {/* RAM */}
                    <BentoBox delay={0.2} className="flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"><Activity className="w-5 h-5" /></div>
                            <span className={`text-[10px] font-bold ${ramBdg.text} ${ramBdg.bg} px-2 py-0.5 rounded-full border ${ramBdg.border}`}>{ramBdg.label}</span>
                        </div>
                        <div>
                            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-1">Memory</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-black text-foreground">{vitals ? Math.round(vitals.ram.usagePct) : "—"}</span>
                                <span className="text-sm text-slate-500 font-medium">% Used</span>
                            </div>
                        </div>
                    </BentoBox>

                    {/* Disk */}
                    <BentoBox delay={0.25} className="flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20"><HardDrive className="w-5 h-5" /></div>
                        </div>
                        <div>
                            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-1">C: Drive Free</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-black text-foreground">{primaryDrive ? Math.round(primaryDrive.freeGb) : "—"}</span>
                                <span className="text-sm text-slate-500 font-medium">GB</span>
                            </div>
                        </div>
                    </BentoBox>
                </div>

                {/* 3. BENTO GRID - FEATURE MODULES */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <FeatureModuleCard 
                        delay={0.3} icon={Gamepad2} title="Gaming Optimizer" 
                        description="Maximum FPS. Kill background tasks and dedicate system resources to your active game." 
                        colorClass="text-red-500" onClick={() => setView("gaming_optimizer")} 
                    />
                    <FeatureModuleCard 
                        delay={0.35} icon={ShieldCheck} title="Privacy Audit" 
                        description="Block Windows telemetry, disable targeted ads, and secure your personal data in one click." 
                        colorClass="text-emerald-500" onClick={() => setView("privacy")} 
                    />
                    <FeatureModuleCard 
                        delay={0.4} icon={Zap} title="Pre-built Debloater" 
                        description="Wipe out manufacturer bloatware from HP, Dell, Lenovo, and others effortlessly." 
                        colorClass="text-yellow-500" onClick={() => setView("prebuilt_debloater")} 
                    />
                    <FeatureModuleCard 
                        delay={0.45} icon={Package} title="App Store" 
                        description="Install safe, community-verified applications via Winget with a clean UI." 
                        colorClass="text-blue-500" onClick={() => setView("apps")} 
                    />
                    <FeatureModuleCard 
                        delay={0.5} icon={MonitorCog} title="System Tweaks" 
                        description="Access hundreds of registry and system tweaks for performance and UI customizations." 
                        colorClass="text-indigo-500" onClick={() => setView("performance")} 
                    />
                    <FeatureModuleCard 
                        delay={0.55} icon={Terminal} title="WSL Manager" 
                        description="Quickly install, manage, and remove Windows Subsystem for Linux distributions." 
                        colorClass="text-pink-500" onClick={() => setView("wsl_manager")} 
                    />
                </div>

                {/* Quick Actions / Spotlight Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Dashboard Spotlight */}
                    <BentoBox delay={0.6} className="bg-gradient-to-br from-primary/10 to-transparent border-primary/20 flex flex-col justify-center">
                        <div className="flex items-center gap-4 mb-3">
                            <div className="p-3 bg-primary/20 rounded-2xl"><Activity className="w-6 h-6 text-primary" /></div>
                            <div>
                                <h3 className="text-xl font-bold text-foreground">Detailed Dashboard</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">View full system telemetry and quick-scan optimizations.</p>
                            </div>
                        </div>
                        <button onClick={() => setView("dashboard")} className="mt-4 w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold transition-colors shadow-lg shadow-primary/20">
                            Open Dashboard
                        </button>
                    </BentoBox>

                    {/* Quick Network view */}
                    <BentoBox delay={0.65} className="flex flex-col justify-center">
                        <div className="flex items-center gap-4 mb-3">
                            <div className="p-3 bg-orange-500/10 text-orange-500 border border-orange-500/20 rounded-2xl"><Network className="w-6 h-6" /></div>
                            <div>
                                <h3 className="text-xl font-bold text-foreground">Network Analyzer</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Test ping, latency, and monitor adapter speeds.</p>
                            </div>
                        </div>
                        <button onClick={() => setView("network")} className="mt-4 w-full py-3 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-foreground font-bold transition-colors border border-border">
                            Analyze Network
                        </button>
                    </BentoBox>
                </div>
            </div>
        </div>
    );
}
