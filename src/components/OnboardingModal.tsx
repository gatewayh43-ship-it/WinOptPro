import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, ShieldCheck, PlayCircle, ArrowRight, CheckCircle2, LayoutTemplate } from "lucide-react";

const steps = [
    {
        title: "Real-time Telemetry Dashboard",
        description: "Monitor your CPU, RAM, and Network with pinpoint accuracy. Identify bottlenecks before they impact your workflow.",
        icon: LayoutTemplate,
        color: "from-blue-500 to-indigo-500",
        visual: (
            <div className="flex flex-col gap-2.5 p-4 w-full h-full justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-blue-500/8 blur-2xl"></div>

                {/* Score + metrics row */}
                <div className="flex gap-2.5 relative z-10">
                    {/* Mini score ring */}
                    <div className="w-16 h-16 shrink-0 rounded-full border-4 border-slate-700 border-t-blue-500 relative flex items-center justify-center shadow-[0_0_16px_rgba(59,130,246,0.4)]">
                        <span className="text-[11px] font-black text-blue-400">92</span>
                    </div>
                    {/* Mini metric stack */}
                    <div className="flex-1 flex flex-col gap-1.5">
                        {[
                            { label: "CPU", value: "68°C", color: "bg-blue-500", w: "w-14" },
                            { label: "RAM", value: "18%", color: "bg-emerald-500", w: "w-10" },
                        ].map(m => (
                            <div key={m.label} className="bg-white/5 border border-white/8 rounded-xl p-2.5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className={`w-1.5 h-1.5 rounded-full ${m.color}`}></div>
                                    <div className={`h-1.5 ${m.w} bg-slate-600 rounded-full`}></div>
                                </div>
                                <span className="text-[9px] font-bold text-slate-400">{m.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Mini bento cards row */}
                <div className="flex gap-2 relative z-10">
                    {[
                        { color: "bg-purple-500/20", dot: "bg-purple-400", val: "42°C" },
                        { color: "bg-orange-500/20", dot: "bg-orange-400", val: "12ms" },
                    ].map((c, i) => (
                        <div key={i} className={`flex-1 ${c.color} border border-white/8 rounded-xl p-2.5`}>
                            <div className={`w-2 h-2 rounded-full ${c.dot} mb-1.5`}></div>
                            <div className="h-1 w-10 bg-white/20 rounded-full mb-1"></div>
                            <span className="text-[9px] font-bold text-white/60">{c.val}</span>
                        </div>
                    ))}
                </div>

                {/* Mini alert bar */}
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-2.5 flex items-center gap-2 relative z-10">
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60 shrink-0"></div>
                    <div className="flex-1 h-1.5 bg-yellow-500/30 rounded-full"></div>
                    <div className="w-3 h-3 rounded-full border border-white/10 flex items-center justify-center">
                        <div className="w-1 h-1 rounded-full bg-slate-400"></div>
                    </div>
                </div>
            </div>
        )
    },
    {
        title: "Granular OS Tuning",
        description: "Navigate to the Tuning modules to inject specific PowerShell scripts into your OS. Risk levels (Green, Yellow, Red) help you make informed decisions.",
        icon: Zap,
        color: "from-amber-500 to-red-500",
        visual: (
            <div className="flex flex-col gap-2.5 p-4 w-full h-full justify-center relative overflow-hidden">
                <div className="absolute right-0 top-0 w-28 h-28 bg-amber-500/10 blur-2xl"></div>

                {/* Filter chips */}
                <div className="flex gap-1.5 relative z-10">
                    {[
                        { label: "All", active: true, style: "bg-blue-500 text-white border-transparent" },
                        { label: "Green", active: false, style: "border-emerald-500/30 text-emerald-400" },
                        { label: "Yellow", active: false, style: "border-amber-500/30 text-amber-400" },
                    ].map(chip => (
                        <div key={chip.label} className={`text-[8px] font-bold px-2 py-1 rounded-full border ${chip.style}`}>
                            {chip.label}
                        </div>
                    ))}
                </div>

                {/* Tweak list */}
                {[
                    { label: "Disable SysMain", risk: "bg-emerald-400", on: true },
                    { label: "Search Indexer", risk: "bg-amber-400", on: false },
                    { label: "Network Throttle", risk: "bg-emerald-400", on: true },
                ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/6 relative z-10">
                        <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${item.risk}`}></div>
                            <div className="w-20 h-1.5 bg-slate-600 rounded-full"></div>
                        </div>
                        <div className={`w-8 h-4 ${item.on ? "bg-blue-500" : "bg-slate-700"} rounded-full flex ${item.on ? "justify-end" : "justify-start"} items-center p-0.5`}>
                            <div className="w-3 h-3 bg-white rounded-full shadow-sm"></div>
                        </div>
                    </div>
                ))}

                {/* Deploy bar */}
                <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-2.5 flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                        <span className="text-[9px] font-bold text-blue-300">2 tweaks ready</span>
                    </div>
                    <div className="bg-blue-500 px-2.5 py-1 rounded-full flex items-center gap-1">
                        <span className="text-[8px] font-black text-white">Deploy</span>
                        <div className="w-2 h-2 text-white">⚡</div>
                    </div>
                </div>
            </div>
        )
    },
    {
        title: "Contextual Education",
        description: "No more blind tweaks. The built-in Inspector instantly breaks down exactly what each optimization does, the performance gains, and the execution code.",
        icon: ShieldCheck,
        color: "from-emerald-500 to-teal-500",
        visual: (
            <div className="flex flex-col gap-2.5 p-4 w-full h-full justify-center relative overflow-hidden">
                <div className="absolute left-0 bottom-0 w-28 h-28 bg-emerald-500/10 blur-2xl"></div>

                {/* Inspector header */}
                <div className="flex items-center gap-2 relative z-10">
                    <div className="w-3 h-3 rounded-sm bg-blue-500/30 border border-blue-500/40"></div>
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Inspector</div>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-auto shadow-[0_0_6px_rgba(52,211,153,0.8)]"></div>
                </div>

                {/* Mechanical summary */}
                <div className="bg-white/5 border border-white/6 rounded-xl p-3 relative z-10">
                    <div className="text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Mechanical Summary</div>
                    <div className="space-y-1">
                        {[12, 16, 10].map((w, i) => (
                            <div key={i} className={`h-1 w-${w} bg-slate-600 rounded-full`} style={{ width: `${[75, 90, 60][i]}%` }}></div>
                        ))}
                    </div>
                </div>

                {/* Pro/con panels */}
                <div className="flex gap-2 relative z-10">
                    <div className="flex-1 bg-emerald-500/8 border border-emerald-500/15 rounded-xl p-2.5">
                        <div className="text-[8px] font-bold text-emerald-500 mb-1">Gains</div>
                        <div className="h-1 bg-emerald-500/30 rounded-full mb-1" style={{ width: "80%" }}></div>
                        <div className="h-1 bg-emerald-500/20 rounded-full" style={{ width: "60%" }}></div>
                    </div>
                    <div className="flex-1 bg-red-500/8 border border-red-500/15 rounded-xl p-2.5">
                        <div className="text-[8px] font-bold text-red-400 mb-1">Trade-offs</div>
                        <div className="h-1 bg-red-500/30 rounded-full mb-1" style={{ width: "65%" }}></div>
                        <div className="h-1 bg-red-500/20 rounded-full" style={{ width: "45%" }}></div>
                    </div>
                </div>

                {/* Code block */}
                <div className="bg-black/60 border border-white/10 rounded-xl p-3 font-mono relative z-10">
                    <div className="flex items-center gap-1 mb-2">
                        {["bg-red-400", "bg-yellow-400", "bg-emerald-400"].map((c, i) => (
                            <div key={i} className={`w-1.5 h-1.5 rounded-full ${c}`}></div>
                        ))}
                    </div>
                    <div className="space-y-1">
                        <div className="flex gap-2 items-center">
                            <span className="text-[8px] text-blue-400">PS&gt;</span>
                            <div className="h-1.5 w-28 bg-emerald-400/50 rounded-full"></div>
                        </div>
                        <div className="flex gap-2 items-center">
                            <span className="text-[8px] text-blue-400">PS&gt;</span>
                            <div className="h-1.5 w-20 bg-emerald-400/40 rounded-full"></div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
];

export function OnboardingModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    const [currentStep, setCurrentStep] = useState(0);

    if (!isOpen) return null;

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            onClose();
        }
    };

    const CurrentIcon = steps[currentStep].icon;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4 sm:px-0">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/60 backdrop-blur-md"
                    onClick={onClose}
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="relative w-full max-w-3xl bg-card border border-border rounded-[24px] shadow-[var(--bento-shadow)] overflow-hidden flex flex-col md:flex-row"
                >
                    {/* Visual Left Side */}
                    <div className="w-full md:w-1/2 min-h-[280px] md:min-h-[400px] bg-black/5 dark:bg-[#080810] p-5 relative flex items-center justify-center border-b md:border-b-0 md:border-r border-border overflow-hidden">
                        <div className={`absolute inset-0 bg-gradient-to-br opacity-8 ${steps[currentStep].color}`}></div>
                        {/* Ambient glow */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${steps[currentStep].color} opacity-5 blur-2xl`}></div>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentStep}
                                initial={{ opacity: 0, x: -20, filter: "blur(10px)" }}
                                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                                exit={{ opacity: 0, x: 20, filter: "blur(10px)" }}
                                transition={{ duration: 0.35 }}
                                className="w-full max-w-[280px] relative z-10"
                            >
                                {steps[currentStep].visual}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Content Right Side */}
                    <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center space-x-2 mb-6">
                                <PlayCircle className="w-5 h-5 text-blue-500" />
                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Interactive Guide</span>
                            </div>

                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentStep}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <div className={`inline-flex p-3 rounded-2xl bg-gradient-to-br ${steps[currentStep].color} bg-opacity-10 mb-5`}>
                                        <CurrentIcon className="w-6 h-6 text-foreground" />
                                    </div>
                                    <h2 className="text-2xl font-black text-foreground mb-3 tracking-tight">
                                        {steps[currentStep].title}
                                    </h2>
                                    <p className="text-[15px] leading-relaxed text-slate-500 dark:text-slate-400 font-medium">
                                        {steps[currentStep].description}
                                    </p>
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        <div className="mt-10">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex space-x-1.5">
                                        {steps.map((_, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setCurrentStep(i)}
                                                className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStep ? "w-6 bg-primary" : "w-1.5 bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20"}`}
                                            />
                                        ))}
                                    </div>
                                    <span className="text-[11px] text-slate-500 font-medium">{currentStep + 1} / {steps.length}</span>
                                </div>
                                <button
                                    onClick={handleNext}
                                    className="flex items-center justify-center group bg-primary text-primary-foreground dark:bg-white dark:text-black px-5 py-2.5 rounded-full font-bold transition-all hover:scale-105 active:scale-95 text-sm"
                                >
                                    {currentStep === steps.length - 1 ? (
                                        <>Get Started <CheckCircle2 className="w-4 h-4 ml-2" /></>
                                    ) : (
                                        <>Next <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" /></>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
