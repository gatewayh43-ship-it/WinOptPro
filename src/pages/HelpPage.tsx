import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    BookOpen, Search, Zap, ShieldAlert, Gamepad2, Terminal, CircuitBoard, Timer,
    HelpCircle, Keyboard, ChevronDown, ChevronRight, AlertTriangle, CheckCircle,
    Info, ExternalLink, Gauge, Activity, Network, HardDrive, BatteryMedium,
    Package, Cpu, FileText, Clock, Settings, Layers, Power, Shield,
    Star, MonitorCog, RefreshCcw, Eye, Lock, Wrench,
    LayoutGrid, List, TriangleAlert, MousePointer
} from "lucide-react";
import tweaksData from "../data/tweaks.json";
import featuresData from "../data/features.json";
import { useTweakExecution } from "../hooks/useTweakExecution";
import { useAppStore } from "../store/appStore";

// ─── Types ───────────────────────────────────────────────────────────────────

interface FeatureData {
    id: string;
    title: string;
    description: string;
    technicalDeepDive: string;
    keyCapabilities: string[];
    expertNote: string;
}

interface Tweak {
    id: string;
    name: string;
    category: string;
    riskLevel: "Green" | "Yellow" | "Red";
    requiresExpertMode?: boolean;
    description: string;
    educationalContext?: {
        howItWorks?: string;
        pros?: string;
        cons?: string;
        expertDetails?: string;
        interactions?: string;
    };
    execution: { code: string; revertCode: string };
    validationCmd?: string;
}

const ALL_TWEAKS = tweaksData as Tweak[];
const CATEGORIES = ["All", ...Array.from(new Set(ALL_TWEAKS.map(t => t.category)))];

// ─── Nav sections ─────────────────────────────────────────────────────────────

const SECTIONS = [
    { id: "home", icon: BookOpen, label: "Overview", color: "text-violet-400" },
    { id: "setup", icon: Zap, label: "Setup Guide", color: "text-blue-400" },
    { id: "guides", icon: Star, label: "User Guides", color: "text-amber-400" },
    { id: "features", icon: LayoutGrid, label: "All Features", color: "text-emerald-400" },
    { id: "tweaks", icon: Gauge, label: "Tweaks Browser", color: "text-cyan-400" },
    { id: "faq", icon: HelpCircle, label: "FAQ", color: "text-pink-400" },
    { id: "troubleshoot", icon: Wrench, label: "Troubleshooting", color: "text-orange-400" },
    { id: "shortcuts", icon: Keyboard, label: "Shortcuts", color: "text-slate-500 dark:text-slate-400" },
];

// ─── Shared animation variants ────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fadeUp: any = {
    hidden: { opacity: 0, y: 18 },
    visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.35, ease: "easeOut" } }),
    exit: { opacity: 0, y: -10, transition: { duration: 0.2 } }
};

// ─── Risk badge ───────────────────────────────────────────────────────────────

function RiskBadge({ level }: { level: string }) {
    const map: Record<string, string> = {
        Green: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
        Yellow: "bg-amber-500/15   text-amber-400   border-amber-500/30",
        Red: "bg-red-500/15     text-red-400     border-red-500/30",
    };
    const emoji: Record<string, string> = { Green: "🟢", Yellow: "🟡", Red: "🔴" };
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold tracking-wide ${map[level] ?? ""}`}>
            {emoji[level]} {level}
        </span>
    );
}

// ─── Accordion item ───────────────────────────────────────────────────────────

function AccordionItem({ q, a, defaultOpen = false }: { q: string; a: string | React.ReactNode; defaultOpen?: boolean }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className={`rounded-xl border transition-colors overflow-hidden ${open ? "border-primary/25 bg-primary/5" : "border-border bg-black/5 dark:bg-white/[0.02]"}`}>
            <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left outline-none">
                <div className="flex items-center gap-2.5 min-w-0">
                    <HelpCircle className={`w-4 h-4 shrink-0 ${open ? "text-primary" : "text-slate-500"}`} />
                    <span className={`text-[13px] font-semibold leading-snug ${open ? "text-primary" : "text-foreground"}`}>{q}</span>
                </div>
                {open ? <ChevronDown className="w-4 h-4 text-primary shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />}
            </button>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                        <div className="px-4 pb-4 ml-[26px] text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed space-y-2">{a}</div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── Code block ───────────────────────────────────────────────────────────────

function Code({ children }: { children: string }) {
    return <code className="block bg-black/40 border border-white/10 rounded-lg px-3 py-2 font-mono text-[11px] text-emerald-300 mt-1.5 overflow-x-auto whitespace-pre">{children}</code>;
}

// ─── Step card ────────────────────────────────────────────────────────────────

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
    return (
        <div className="flex gap-4">
            <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-[13px] font-bold text-primary shrink-0">{n}</div>
                <div className="w-px flex-1 bg-border/50 mt-2" />
            </div>
            <div className="flex-1 pb-6">
                <p className="font-bold text-[14px] text-foreground mb-2">{title}</p>
                <div className="text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed space-y-1">{children}</div>
            </div>
        </div>
    );
}

// ─── Feature card ─────────────────────────────────────────────────────────────

function FeatureCard({ icon: Icon, title, color, badge, onClick, children }: {
    icon: React.ElementType; title: string; color: string; badge?: string; onClick: () => void; children: React.ReactNode;
}) {
    return (
        <motion.button variants={fadeUp} onClick={onClick} className="rounded-2xl border border-slate-200 dark:border-border bg-slate-50/80 dark:bg-white/[0.02] p-5 flex flex-col gap-3 hover:border-primary/30 outline-none text-left transition-all active:scale-[0.98] hover:shadow-lg">
            <div className="flex w-full items-start justify-between">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-black/[0.03] dark:bg-black/20 border border-slate-200 dark:border-white/5`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                </div>
                {badge && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary">{badge}</span>}
            </div>
            <p className="font-bold text-[14px] text-foreground">{title}</p>
            <p className="text-[12px] text-slate-500 dark:text-slate-500 dark:text-slate-400 leading-relaxed">{children}</p>
        </motion.button>
    );
}

// ─── Trouble card ─────────────────────────────────────────────────────────────

function TroubleCard({ title, symptoms, solutions }: { title: string; symptoms: string[]; solutions: { cause: string; steps: string[] }[] }) {
    const [open, setOpen] = useState(false);
    return (
        <div className={`rounded-xl border transition-colors ${open ? "border-orange-500/25 bg-orange-500/5" : "border-border bg-black/5 dark:bg-white/[0.02]"}`}>
            <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left outline-none">
                <div className="flex items-center gap-2.5">
                    <TriangleAlert className={`w-4 h-4 shrink-0 ${open ? "text-orange-400" : "text-slate-500"}`} />
                    <span className={`text-[13px] font-semibold ${open ? "text-orange-400" : "text-foreground"}`}>{title}</span>
                </div>
                {open ? <ChevronDown className="w-4 h-4 text-orange-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />}
            </button>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                        <div className="px-4 pb-4 space-y-3 text-[13px]">
                            <div>
                                <p className="font-semibold text-slate-600 dark:text-slate-300 mb-1">Symptoms</p>
                                <ul className="list-disc list-inside text-slate-500 dark:text-slate-400 space-y-0.5">
                                    {symptoms.map((s, i) => <li key={i}>{s}</li>)}
                                </ul>
                            </div>
                            {solutions.map((sol, i) => (
                                <div key={i} className="bg-black/20 rounded-lg p-3 border border-white/5">
                                    <p className="font-semibold text-slate-200 mb-1.5">{sol.cause}</p>
                                    <ol className="list-decimal list-inside text-slate-500 dark:text-slate-400 space-y-1">
                                        {sol.steps.map((s, j) => <li key={j}>{s}</li>)}
                                    </ol>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── Tweak card ───────────────────────────────────────────────────────────────

function TweakCard({ tweak, isApplied, isExecutingThis, onToggle }: {
    tweak: Tweak;
    isApplied: boolean;
    isExecutingThis: boolean;
    onToggle: () => void;
}) {
    const [open, setOpen] = useState(false);
    return (
        <div className={`rounded-xl border transition-colors ${open ? "border-cyan-500/25 bg-cyan-500/5" : isApplied ? "border-emerald-500/25 bg-emerald-500/5" : "border-border bg-black/5 dark:bg-white/[0.02]"}`}>
            <div className="flex items-start gap-3 px-4 py-3">
                <button onClick={() => setOpen(v => !v)} className="flex-1 min-w-0 text-left outline-none">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[13px] font-semibold truncate ${isApplied ? "text-emerald-400" : "text-foreground"}`}>{tweak.name}</span>
                        {isApplied && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">✓ Applied</span>}
                        {tweak.requiresExpertMode && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/15 border border-red-500/30 text-red-400">Expert</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                        <RiskBadge level={tweak.riskLevel} />
                        <span className="text-[11px] text-slate-500">{tweak.category}</span>
                    </div>
                    {!open && <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-1">{tweak.description}</p>}
                </button>
                <div className="flex items-center gap-2 shrink-0 mt-0.5">
                    <button
                        onClick={onToggle}
                        disabled={isExecutingThis}
                        className={`px-3 py-1 rounded-lg text-[11px] font-bold border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${isApplied
                            ? "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
                            : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                            }`}
                    >
                        {isExecutingThis ? "…" : isApplied ? "Disable" : "Enable"}
                    </button>
                    <button onClick={() => setOpen(v => !v)} className="outline-none">
                        {open ? <ChevronDown className="w-4 h-4 text-cyan-400" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                    </button>
                </div>
            </div>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                        <div className="px-4 pb-4 space-y-3 text-[12px] text-slate-600 dark:text-slate-300">
                            <p className="leading-relaxed">{tweak.description}</p>
                            {tweak.educationalContext?.howItWorks && (
                                <div className="bg-black/20 rounded-lg p-3 border border-white/5">
                                    <p className="font-semibold text-slate-200 mb-1">How it works</p>
                                    <p className="text-slate-500 dark:text-slate-400 leading-relaxed">{tweak.educationalContext.howItWorks}</p>
                                </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {tweak.educationalContext?.pros && (
                                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
                                        <p className="font-semibold text-emerald-400 mb-1">Benefits</p>
                                        <p className="text-slate-500 dark:text-slate-400 leading-relaxed">{tweak.educationalContext.pros}</p>
                                    </div>
                                )}
                                {tweak.educationalContext?.cons && (
                                    <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                                        <p className="font-semibold text-red-400 mb-1">Risks / Cons</p>
                                        <p className="text-slate-500 dark:text-slate-400 leading-relaxed">{tweak.educationalContext.cons}</p>
                                    </div>
                                )}
                            </div>
                            {tweak.educationalContext?.expertDetails && (
                                <div className="bg-violet-500/5 border border-violet-500/20 rounded-lg p-3">
                                    <p className="font-semibold text-violet-400 mb-1">Expert Details</p>
                                    <p className="text-slate-500 dark:text-slate-400 leading-relaxed">{tweak.educationalContext.expertDetails}</p>
                                </div>
                            )}
                            {tweak.educationalContext?.interactions && (
                                <p className="text-slate-500 italic text-[11px]">Interactions: {tweak.educationalContext.interactions}</p>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── HOME section ─────────────────────────────────────────────────────────────

function HomeSection({ onNavigate }: { onNavigate: (id: string, tab?: number) => void }) {
    return (
        <div className="flex flex-col gap-8">
            {/* Hero */}
            <motion.div variants={fadeUp} custom={0} initial="hidden" animate="visible"
                className="relative rounded-3xl overflow-hidden border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-cyan-500/5 pointer-events-none" />
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                            <BookOpen className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-foreground">WinOpt Pro Help</h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Complete documentation for every feature</p>
                        </div>
                    </div>
                    <p className="text-[14px] text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                        WinOpt Pro is an all-in-one Windows optimization tool with <strong className="text-foreground">165 system tweaks</strong>, a gaming optimizer, GPU driver cleaner, WSL manager, privacy audit, latency optimizer, and much more — all fully reversible.
                    </p>
                    <div className="flex flex-wrap gap-2 mt-4">
                        {[
                            { label: "165 tweaks", color: "bg-violet-500/15 text-violet-400 border-violet-500/30" },
                            { label: "418 tests passing", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
                            { label: "All reversible", color: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
                            { label: "Windows 10/11", color: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30" },
                        ].map(b => (
                            <span key={b.label} className={`px-3 py-1 rounded-full border text-[11px] font-bold ${b.color}`}>{b.label}</span>
                        ))}
                    </div>
                </div>
            </motion.div>

            {/* Quick-access cards */}
            <div>
                <motion.p variants={fadeUp} custom={1} initial="hidden" animate="visible" className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3">Quick Access</motion.p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { icon: Zap, label: "New User?", sub: "Setup guide", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", target: "setup", tab: undefined },
                        { icon: Gamepad2, label: "Gamer?", sub: "Gaming guide", color: "text-green-400", bg: "bg-green-500/10 border-green-500/20", target: "guides", tab: 1 },
                        { icon: Settings, label: "Power User?", sub: "Expert guide", color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20", target: "guides", tab: 2 },
                        { icon: HelpCircle, label: "Need help?", sub: "Troubleshoot", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20", target: "troubleshoot", tab: undefined },
                    ].map((c, i) => (
                        <motion.button key={c.label} onClick={() => onNavigate(c.target, c.tab)} variants={fadeUp} custom={2 + i} initial="hidden" animate="visible"
                            className={`rounded-2xl border p-4 flex flex-col items-start gap-2 text-left outline-none hover:brightness-110 active:scale-[0.98] transition-all ${c.bg}`}>
                            <c.icon className={`w-5 h-5 ${c.color}`} />
                            <p className="font-bold text-[13px] text-foreground">{c.label}</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">{c.sub}</p>
                        </motion.button>
                    ))}
                </div>
            </div>

            {/* Risk level guide */}
            <motion.div variants={fadeUp} custom={6} initial="hidden" animate="visible">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3">Risk Level System</p>
                <div className="flex flex-col gap-2">
                    {[
                        { emoji: "🟢", label: "Green — Safe", desc: "Recommended for all users. No meaningful side effects. Fully reversible instantly.", examples: "Disable Telemetry, Disable Mouse Acceleration, Disable Advertising ID", color: "border-emerald-500/20 bg-emerald-500/5" },
                        { emoji: "🟡", label: "Yellow — Caution", desc: "Read the description first. May affect system behavior you rely on. Reversible.", examples: "Disable Network Throttling, Disable Fast Startup, Disable Driver Updates via Windows Update", color: "border-amber-500/20 bg-amber-500/5" },
                        { emoji: "🔴", label: "Red — Expert Only", desc: "Requires Expert Mode. Significant security or stability trade-offs. Only apply if you understand the change.", examples: "Disable VBS, Disable HVCI, Disable Spectre Mitigations, Enable Write-Back Cache", color: "border-red-500/20 bg-red-500/5" },
                    ].map(r => (
                        <div key={r.label} className={`rounded-xl border p-4 ${r.color}`}>
                            <div className="flex items-start gap-3">
                                <span className="text-xl mt-0.5">{r.emoji}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-[13px] text-foreground">{r.label}</p>
                                    <p className="text-[12px] text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">{r.desc}</p>
                                    <p className="text-[11px] text-slate-500 mt-1"><span className="font-medium">Examples: </span>{r.examples}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </motion.div>

            {/* Key principles */}
            <motion.div variants={fadeUp} custom={9} initial="hidden" animate="visible">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3">Key Principles</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                        { icon: RefreshCcw, color: "text-blue-400", title: "Every tweak is reversible", desc: "Every change stores the original value. Revert any tweak individually or restore from a backup." },
                        { icon: Eye, color: "text-violet-400", title: "Full transparency", desc: "The app shows you exactly which registry key or command it runs before applying anything." },
                        { icon: Lock, color: "text-emerald-400", title: "Expert gate protects you", desc: "Dangerous Red tweaks are hidden behind Expert Mode. You have to deliberately unlock them." },
                    ].map((p) => (
                        <div key={p.title} className="rounded-xl border border-border bg-black/5 dark:bg-white/[0.02] p-4 flex flex-col gap-2">
                            <p.icon className={`w-5 h-5 ${p.color}`} />
                            <p className="font-bold text-[13px] text-foreground">{p.title}</p>
                            <p className="text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed">{p.desc}</p>
                        </div>
                    ))}
                </div>
            </motion.div>

            {/* Tip banner */}
            <motion.div variants={fadeUp} custom={12} initial="hidden" animate="visible"
                className="flex items-start gap-3 px-4 py-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300">
                <Info className="w-4 h-4 mt-0.5 shrink-0" />
                <p className="text-[13px]">
                    Press <kbd className="px-1.5 py-0.5 rounded bg-black/30 border border-white/15 text-[11px] font-mono mx-0.5">Ctrl+K</kbd> anywhere in WinOpt Pro to instantly jump to any feature or tweak using the Command Palette.
                </p>
            </motion.div>
        </div>
    );
}

// ─── SETUP section ────────────────────────────────────────────────────────────

function SetupSection() {
    return (
        <div className="flex flex-col gap-6">
            <motion.div variants={fadeUp} custom={0} initial="hidden" animate="visible">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-1"><Zap className="w-5 h-5 text-blue-400" /> Setup Guide</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Everything you need to install, configure, and safely start using WinOpt Pro.</p>
            </motion.div>

            {/* Requirements */}
            <motion.div variants={fadeUp} custom={1} initial="hidden" animate="visible" className="rounded-2xl border border-border bg-black/5 dark:bg-white/[0.02] overflow-hidden">
                <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                    <MonitorCog className="w-4 h-4 text-blue-400" />
                    <p className="font-bold text-[14px] text-foreground">System Requirements</p>
                </div>
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2">Minimum</p>
                        <div className="space-y-2 text-[13px]">
                            {[
                                ["OS", "Windows 10 2004+ (Build 19041)"],
                                ["RAM", "4 GB"],
                                ["Disk", "200 MB free"],
                                ["Arch", "64-bit (x86-64) only"],
                                ["Rights", "Administrator account"],
                            ].map(([k, v]) => (
                                <div key={k} className="flex gap-2"><span className="text-slate-500 w-12 shrink-0">{k}</span><span className="text-slate-600 dark:text-slate-300">{v}</span></div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2">Recommended</p>
                        <div className="space-y-2 text-[13px]">
                            {[
                                ["OS", "Windows 11 22H2 or later"],
                                ["RAM", "8 GB or more"],
                                ["Disk", "500 MB free"],
                                ["Display", "1280×720 or higher"],
                                ["Internet", "For App Store & AI Assistant"],
                            ].map(([k, v]) => (
                                <div key={k} className="flex gap-2"><span className="text-slate-500 w-14 shrink-0">{k}</span><span className="text-slate-600 dark:text-slate-300">{v}</span></div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="px-5 pb-5">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2">Feature-Specific</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[12px]">
                        {[
                            { f: "AI Assistant", r: "Ollama installed locally, at least one model pulled (ollama pull llama3)" },
                            { f: "GPU Overlay", r: "NVIDIA: nvidia-smi must be in PATH (installed with NVIDIA drivers)" },
                            { f: "WSL / Linux Mode", r: "Windows 11 or Win10 21H2+ for WSLg desktop environments" },
                            { f: "Scheduled Tasks", r: "Windows Task Scheduler service must be running" },
                        ].map(({ f, r }) => (
                            <div key={f} className="rounded-lg bg-black/20 border border-white/5 p-3">
                                <p className="font-semibold text-slate-200">{f}</p>
                                <p className="text-slate-500 dark:text-slate-400 mt-0.5">{r}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>

            {/* SmartScreen warning info */}
            <motion.div variants={fadeUp} custom={2} initial="hidden" animate="visible"
                className="flex items-start gap-3 px-4 py-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-[13px]">
                    <p className="font-semibold text-amber-300 mb-1">Windows SmartScreen Warning — Expected</p>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">WinOpt Pro is an unsigned application (code-signing certificates cost ~$400/yr for open-source projects). SmartScreen may show "Windows protected your PC." To proceed: click <strong className="text-white">More info</strong> → <strong className="text-white">Run anyway</strong>. Verify the download hash against the SHA256SUMS file in the GitHub release if you want to confirm authenticity.</p>
                </div>
            </motion.div>

            {/* Steps */}
            <motion.div variants={fadeUp} custom={3} initial="hidden" animate="visible" className="flex flex-col">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-5">Getting Started — Step by Step</p>
                <Step n={1} title="Download the installer">
                    <p>Go to the <a href="https://github.com" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">GitHub Releases page</a> and download the latest <code className="text-emerald-400 bg-black/30 px-1 rounded">.msi</code> file.</p>
                </Step>
                <Step n={2} title="Run the installer as Administrator">
                    <p>Double-click the .msi. Accept the SmartScreen prompt if shown. Follow the install wizard.</p>
                </Step>
                <Step n={3} title="Launch WinOpt Pro and accept the UAC prompt">
                    <p>Click Yes when Windows asks for administrator permissions. Without admin rights most tweaks cannot be applied.</p>
                </Step>
                <Step n={4} title="Complete the onboarding guide">
                    <p>On first launch, the guided onboarding modal walks you through the interface and key concepts.</p>
                </Step>
                <Step n={5} title="Create a backup before tweaking">
                    <p>Go to <strong className="text-white">Settings → Backup & Restore</strong> and click <strong className="text-white">Export Backup</strong>. Save the <code className="text-emerald-400 bg-black/30 px-1 rounded">.winopt</code> file somewhere safe.</p>
                </Step>
                <Step n={6} title="Start with the Privacy Audit">
                    <p>Navigate to <strong className="text-white">Utilities → Privacy Audit</strong> and click Scan. This is the safest, most impactful first action for every user.</p>
                </Step>
                <Step n={7} title="Browse Green tweaks in each category">
                    <p>Start with <strong className="text-white">Performance</strong> and <strong className="text-white">Debloat</strong> categories. All Green tweaks are safe. Read the description panel before applying Yellow ones.</p>
                </Step>
                <div className="flex gap-4">
                    <div className="w-8 shrink-0" />
                    <div className="flex items-start gap-2 px-4 py-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[13px] flex-1">
                        <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" /> You're ready. Use the History page to review everything applied, and revert anything you don't like.
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

// ─── GUIDES section ───────────────────────────────────────────────────────────

const GUIDE_TABS = ["Beginners", "Gamers", "Experts"];

function GuidesSection({ defaultTab = 0 }: { defaultTab?: number }) {
    const [tab, setTab] = useState(defaultTab);

    const guides = [
        {
            icon: Star,
            color: "text-amber-400",
            title: "Beginner Guide",
            intro: "New to system optimization? Start here. This guide uses plain language and sticks to safe tweaks only.",
            content: (
                <div className="flex flex-col gap-5">
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-[13px] text-amber-300 flex items-start gap-2">
                        <Info className="w-4 h-4 shrink-0 mt-0.5" />
                        <p>As a beginner, only apply <strong>Green tweaks</strong>. Leave Yellow for when you've read the descriptions, and ignore Red entirely for now.</p>
                    </div>

                    <div>
                        <p className="font-bold text-[14px] text-foreground mb-3">What WinOpt Pro can do for you</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[12px]">
                            {[
                                { icon: Gauge, title: "Faster PC", desc: "Disable background services and bloat that slow down your daily use." },
                                { icon: ShieldAlert, title: "Better privacy", desc: "Stop Windows from collecting and sending data about your activity." },
                                { icon: Gamepad2, title: "More FPS", desc: "Reduce OS overhead so your games get more CPU and GPU time." },
                            ].map(c => (
                                <div key={c.title} className="rounded-xl border border-border bg-black/5 p-3 flex flex-col gap-2">
                                    <c.icon className="w-4 h-4 text-primary" />
                                    <p className="font-bold text-foreground">{c.title}</p>
                                    <p className="text-slate-500 dark:text-slate-400">{c.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <p className="font-bold text-[14px] text-foreground mb-3">Recommended starter tweaks 🟢</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {[
                                { cat: "Performance", tweaks: ["Disable SysMain (Superfetch)", "Disable Search Indexer", "Disable Startup Delay", "Speed Up Shutdown Time"] },
                                { cat: "Privacy", tweaks: ["Disable Telemetry", "Disable Advertising ID", "Disable Bing Search in Start Menu", "Disable Activity History", "Disable Cortana"] },
                                { cat: "Debloat", tweaks: ["Disable Widgets Board", "Disable Windows Copilot", "Disable Meet Now", "Disable Teams Autostart"] },
                                { cat: "Windows UI", tweaks: ["Show File Extensions", "Restore Classic Right-Click Menu", "Disable Sticky Keys Popup", "Align Taskbar to Left"] },
                            ].map(({ cat, tweaks }) => (
                                <div key={cat} className="rounded-xl border border-border bg-black/5 p-3">
                                    <p className="font-bold text-[12px] text-slate-600 dark:text-slate-300 mb-2">{cat}</p>
                                    <ul className="space-y-1">
                                        {tweaks.map(t => <li key={t} className="text-[12px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><span className="text-emerald-400">✓</span>{t}</li>)}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <p className="font-bold text-[14px] text-foreground mb-3">Step by step: Your first privacy scan</p>
                        <div className="flex flex-col gap-3 text-[13px]">
                            {[
                                "Click Privacy Audit in the sidebar (under Utilities).",
                                "Click the Scan button. Wait a few seconds.",
                                "Review the results — Critical items are shown in red.",
                                'Click "Fix All Issues" to apply all recommended fixes at once.',
                                "Done! You can re-scan anytime — the Privacy Audit is read-only until you click Fix.",
                            ].map((s, i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <span className="w-6 h-6 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-[11px] font-bold text-primary shrink-0">{i + 1}</span>
                                    <p className="text-slate-600 dark:text-slate-300 pt-0.5">{s}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <p className="font-bold text-[14px] text-foreground mb-3">Glossary of terms</p>
                        <div className="space-y-2 text-[12px]">
                            {[
                                ["Registry", "Windows' database of settings for the OS and applications. Like a giant config file."],
                                ["Telemetry", "Data Windows collects about your usage and sends to Microsoft."],
                                ["Service", "A background program that runs without a visible window. Many are safe to disable."],
                                ["SysMain / Superfetch", "A Windows service that tries to pre-load apps into RAM. Rarely helpful on modern SSDs."],
                                ["VBS / HVCI", "Advanced security features. Don't touch as a beginner."],
                                ["Reboot required", "The change only takes effect after you restart Windows."],
                            ].map(([t, d]) => (
                                <div key={t as string} className="rounded-lg bg-black/20 border border-white/5 p-3">
                                    <p className="font-semibold text-slate-200">{t}</p>
                                    <p className="text-slate-500 dark:text-slate-400 mt-0.5">{d}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )
        },
        {
            icon: Gamepad2,
            color: "text-green-400",
            title: "Gaming Optimization Guide",
            intro: "Maximize FPS, reduce input lag, and get the most out of your gaming sessions.",
            content: (
                <div className="flex flex-col gap-5">
                    <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-[13px] text-green-300 flex items-start gap-2">
                        <Gamepad2 className="w-4 h-4 shrink-0 mt-0.5" />
                        <p>None of these changes modify game files. They're OS-level optimizations — no anti-cheat bans.</p>
                    </div>

                    <div>
                        <p className="font-bold text-[14px] text-foreground mb-3">Recommended Gaming Tweaks</p>
                        <div className="flex flex-col gap-2">
                            {[
                                { risk: "Green", tweaks: ["Increase Game CPU/GPU Priority", "Disable Game DVR Background Recording", "Disable Network Adapter Power Saving", "Disable Mouse Acceleration", "Disable Xbox Game Monitoring Service", "Optimize System Responsiveness", "Enable CPU Priority Boost"] },
                                { risk: "Yellow", tweaks: ["Enable Hardware-Accelerated GPU Scheduling (HAGS)", "Disable Full-Screen Optimizations", "Disable Multiplane Overlay (MPO)", "Disable Windows Game Mode", "Maximize MMCSS Gaming Thread Priority"] },
                                { risk: "Red", tweaks: ["Disable Dynamic Tick (Consistent Timer)", "Disable HPET (High Precision Timer)", "Disable CPU Power Throttling", "Enable GPU MSI Mode (Interrupt Signaling)", "CSRSSHighPriority", "Disable Memory Integrity (HVCI)"] },
                            ].map(({ risk, tweaks }) => (
                                <div key={risk} className="rounded-xl border border-border bg-black/5 p-3">
                                    <div className="flex items-center gap-2 mb-2"><RiskBadge level={risk} /></div>
                                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                                        {tweaks.map(t => <span key={t} className="text-[12px] text-slate-500 dark:text-slate-400 flex items-center gap-1"><span className={risk === "Green" ? "text-emerald-400" : risk === "Yellow" ? "text-amber-400" : "text-red-400"}>•</span>{t}</span>)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <p className="font-bold text-[14px] text-foreground mb-3">Gaming Optimizer Module</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12px]">
                            {[
                                { title: "Game Detection", desc: "Monitors processes every 5s against 32+ game executables. Automatically detects Fortnite, Valorant, CS2, GTA V, Cyberpunk 2077, and more." },
                                { title: "Auto-Optimize", desc: "When enabled, automatically applies the gaming tweak pack the moment a game is detected. Reverts when you exit." },
                                { title: "Performance Overlay", desc: "Always-on-top transparent widget showing CPU%, GPU%, VRAM, Temperature, and Power draw. Drag anywhere on screen." },
                                { title: "Before/After Baseline", desc: "Snapshot your GPU/CPU metrics before tweaking, then compare after to see real measured improvement." },
                            ].map(c => (
                                <div key={c.title} className="rounded-xl border border-border bg-black/5 p-3">
                                    <p className="font-bold text-slate-200 mb-1">{c.title}</p>
                                    <p className="text-slate-500 dark:text-slate-400 leading-relaxed">{c.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <p className="font-bold text-[14px] text-foreground mb-3">Power Settings for Gaming</p>
                        <div className="text-[13px] text-slate-600 dark:text-slate-300 space-y-2">
                            <p>Go to <strong className="text-white">Utilities → Power Manager</strong> and:</p>
                            {[
                                "Apply the Ultimate Performance power plan (or use the tweak to create it if missing).",
                                "Set CPU Minimum Performance to 100% (AC only). This prevents the CPU from downclocking between frames.",
                                "Disable USB Selective Suspend and PCIe Link State Power Management.",
                                "Set display timeout to a longer value so the screen doesn't dim mid-game.",
                            ].map((s, i) => (
                                <div key={i} className="flex items-start gap-2.5">
                                    <span className="text-green-400 shrink-0 mt-0.5">→</span>
                                    <p>{s}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <p className="font-bold text-[14px] text-foreground mb-3">Latency Optimizer</p>
                        <p className="text-[13px] text-slate-600 dark:text-slate-300 mb-3">Navigate to <strong className="text-white">Utilities → Latency Optimizer</strong> for timer resolution and standby RAM management:</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[12px]">
                            {[
                                { title: "Timer Resolution", desc: "Shows your current resolution. Games request ~1ms via DirectX. Optimal is 0.5–1ms." },
                                { title: "Flush Standby RAM", desc: "Before a long gaming session, flush standby memory to free RAM for the game. Shows MB freed." },
                            ].map(c => (
                                <div key={c.title} className="rounded-lg bg-black/20 border border-white/5 p-3">
                                    <p className="font-semibold text-slate-200">{c.title}</p>
                                    <p className="text-slate-500 dark:text-slate-400 mt-0.5">{c.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
                        <p className="font-bold text-[14px] text-green-300 mb-3">Full Gaming Optimization Checklist</p>
                        <div className="space-y-1.5 text-[13px] text-slate-600 dark:text-slate-300">
                            {[
                                "Apply all Green gaming tweaks in the Gaming category",
                                "Enable HAGS (requires modern GPU + driver)",
                                "Enable Ultimate Performance power plan",
                                "Set CPU Min to 100% AC in Power Manager",
                                "Disable USB Selective Suspend + PCIe power management",
                                "Flush standby RAM before sessions (Latency Optimizer)",
                                "Enable Gaming Overlay for real-time monitoring",
                                "Enable Auto-Optimize in Gaming Optimizer",
                                "Optional (Expert): Disable Dynamic Tick, HPET, enable MSI mode",
                            ].map((s, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <span className="w-4 h-4 rounded border border-green-500/30 bg-green-500/10 flex items-center justify-center shrink-0">
                                        <CheckCircle className="w-2.5 h-2.5 text-green-400" />
                                    </span>
                                    {s}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )
        },
        {
            icon: Settings,
            color: "text-violet-400",
            title: "Expert Guide",
            intro: "Deep dives into security trade-offs, timer internals, memory management, and advanced features.",
            content: (
                <div className="flex flex-col gap-6">
                    <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-[13px] text-red-300 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <p>Expert mode unlocks Red tweaks. These are documented below with full context. Enable Expert Mode in Settings before proceeding.</p>
                    </div>

                    {[
                        {
                            title: "VBS and HVCI — Security vs Performance",
                            content: (
                                <div className="text-[13px] text-slate-600 dark:text-slate-300 space-y-3">
                                    <p><strong className="text-white">Virtualization-Based Security (VBS)</strong> isolates a secure memory region using the hardware hypervisor. <strong className="text-white">HVCI (Memory Integrity)</strong> uses VBS to verify kernel code before it executes — preventing malicious drivers from loading.</p>
                                    <p>Performance cost: <strong className="text-amber-300">5–15% GPU/CPU throughput reduction</strong> on some systems, particularly notable in GPU-bound scenarios (games). On modern CPUs with dedicated MBEC hardware support, the cost is smaller (~2–5%).</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                                            <p className="font-semibold text-red-400 mb-1">When to disable</p>
                                            <ul className="list-disc list-inside space-y-0.5 text-slate-500 dark:text-slate-400 text-[12px]">
                                                <li>Dedicated gaming machine, isolated network</li>
                                                <li>GPU bottlenecked and want every % back</li>
                                                <li>Software incompatible with HVCI (some hypervisors)</li>
                                            </ul>
                                        </div>
                                        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
                                            <p className="font-semibold text-emerald-400 mb-1">Keep enabled if</p>
                                            <ul className="list-disc list-inside space-y-0.5 text-slate-500 dark:text-slate-400 text-[12px]">
                                                <li>Corporate/work machine</li>
                                                <li>Playing Valorant (Vanguard requires HVCI)</li>
                                                <li>You download software from varied sources</li>
                                            </ul>
                                        </div>
                                    </div>
                                    <p className="text-slate-500 text-[12px]">Registry: HKLM\SYSTEM\CurrentControlSet\Control\DeviceGuard\Scenarios\HypervisorEnforcedCodeIntegrity Enabled=0. Requires reboot.</p>
                                </div>
                            )
                        },
                        {
                            title: "Timer Resolution and Scheduling Internals",
                            content: (
                                <div className="text-[13px] text-slate-600 dark:text-slate-300 space-y-3">
                                    <p>Windows' system timer drives thread scheduling. The default resolution is <strong className="text-white">~15.6ms</strong> (64 ticks/sec). Applications can call <code className="text-emerald-400 bg-black/30 px-1 rounded">NtSetTimerResolution</code> to request finer resolution — down to <strong className="text-white">0.5ms</strong> on most hardware. DirectX games do this automatically.</p>
                                    <p><strong className="text-white">Dynamic Tick</strong> (DisableDynamicTick) — Windows slows the timer during CPU idle states to save power. This adds jitter to wake-up latency. Disabling it forces a constant tick rate. Cost: ~0.5–2W additional power draw, prevents deep CPU sleep states.</p>
                                    <p><strong className="text-white">HPET (DisableHPET)</strong> — On modern systems, the TSC (Timestamp Counter) timer is more accurate and lower-latency than the legacy HPET. Disabling HPET forces Windows to use TSC. On some motherboards this can reduce DPC (Deferred Procedure Call) latency by 20–50%.</p>
                                    <Code>{`bcdedit /set disabledynamictick yes\nbcdedit /set useplatformclock false`}</Code>
                                </div>
                            )
                        },
                        {
                            title: "Spectre / Meltdown Mitigations",
                            content: (
                                <div className="text-[13px] text-slate-600 dark:text-slate-300 space-y-3">
                                    <p>CVE-2017-5753 (Spectre v1), CVE-2017-5715 (Spectre v2), and CVE-2017-5754 (Meltdown) are CPU microarchitecture vulnerabilities. Windows applies software mitigations that incur a performance cost — worst on older CPUs (Haswell/Broadwell: 10–30% reduction on I/O-heavy workloads).</p>
                                    <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                                        <p className="font-semibold text-red-400 mb-1">⚠️ Only disable on isolated machines</p>
                                        <p className="text-slate-500 dark:text-slate-400 text-[12px]">Disabling mitigations allows a malicious program or browser JS to read kernel memory. Only consider this on a gaming-only machine that runs no untrusted code and has no sensitive data.</p>
                                    </div>
                                    <p>Performance gain on modern CPUs (Zen 4, 12th/13th gen Intel): ~1–3%. On 4th-7th gen Intel: potentially 10–25% on I/O-heavy workloads.</p>
                                </div>
                            )
                        },
                        {
                            title: "Memory Management Deep Dive",
                            content: (
                                <div className="text-[13px] text-slate-600 dark:text-slate-300 space-y-3">
                                    <p><strong className="text-white">Memory Compression (DisableMemoryCompression)</strong> — Windows 10+ compresses infrequently-accessed RAM pages to store more in physical RAM. The CPU overhead is low on modern CPUs (~0.5–1% CPU for compression). Disabling it means RAM pressure causes disk paging sooner. Only beneficial on systems with 32GB+ RAM where compression is never needed anyway.</p>
                                    <p><strong className="text-white">Standby List Flush</strong> — Windows keeps a "standby" list of recently-evicted memory pages as a soft cache. Before a game session, flushing the standby list (NtSetSystemInformation SystemMemoryListCommand=4) clears these cached pages so the game gets fresh RAM immediately instead of waiting for gradual eviction.</p>
                                    <p><strong className="text-white">Write-Back Cache (EnableWriteBackCache)</strong> — Enables disk write-back caching at the controller level. Data writes are acknowledged immediately and flushed to disk asynchronously. Performance benefit: significant on HDD systems. Risk: data loss on power failure before the cache is written to disk. Always use with a UPS or on SSDs with power-loss protection.</p>
                                </div>
                            )
                        },
                        {
                            title: "Audit Log Encryption Details",
                            content: (
                                <div className="text-[13px] text-slate-600 dark:text-slate-300 space-y-3">
                                    <p>The History page reads from <code className="text-emerald-400 bg-black/30 px-1 rounded">history.db</code> (SQLite). Sensitive fields (<code className="text-emerald-400 bg-black/30 px-1 rounded">command_executed</code>, <code className="text-emerald-400 bg-black/30 px-1 rounded">stdout</code>, <code className="text-emerald-400 bg-black/30 px-1 rounded">stderr</code>) are encrypted with <strong className="text-white">AES-256-GCM</strong>.</p>
                                    <p>Key derivation: <code className="text-emerald-400 bg-black/30 px-1 rounded">key = SHA-256(MachineGuid)</code> where MachineGuid is read from <code className="text-emerald-400 bg-black/30 px-1 rounded">HKLM\SOFTWARE\Microsoft\Cryptography</code>. This key is unique per Windows installation and never leaves your machine.</p>
                                    <p>Encrypted entries are stored as <code className="text-emerald-400 bg-black/30 px-1 rounded">enc:&lt;base64(nonce + ciphertext + tag)&gt;</code>. Legacy unencrypted entries (before v0.7) are readable as plaintext.</p>
                                </div>
                            )
                        },
                    ].map(({ title, content }) => (
                        <div key={title} className="rounded-2xl border border-border bg-black/5 dark:bg-white/[0.02] overflow-hidden">
                            <div className="px-5 py-4 border-b border-border">
                                <p className="font-bold text-[14px] text-foreground">{title}</p>
                            </div>
                            <div className="p-5">{content}</div>
                        </div>
                    ))}
                </div>
            )
        }
    ];

    const guide = guides[tab];

    return (
        <div className="flex flex-col gap-5">
            <motion.div variants={fadeUp} custom={0} initial="hidden" animate="visible">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-1"><Star className="w-5 h-5 text-amber-400" /> User Guides</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Tailored guidance based on your experience level and goals.</p>
            </motion.div>

            <motion.div variants={fadeUp} custom={1} initial="hidden" animate="visible" className="flex gap-2">
                {GUIDE_TABS.map((t, i) => {
                    const G = guides[i];
                    return (
                        <button key={t} onClick={() => setTab(i)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold border transition-colors outline-none ${tab === i ? "bg-primary/10 border-primary/30 text-primary" : "bg-black/5 dark:bg-white/5 border-border text-slate-500 dark:text-slate-400 hover:text-foreground"}`}>
                            <G.icon className={`w-4 h-4 ${tab === i ? "text-primary" : G.color}`} />
                            {t}
                        </button>
                    );
                })}
            </motion.div>

            <AnimatePresence mode="wait">
                <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                    <div className="mb-4">
                        <div className="flex items-center gap-2 mb-1">
                            <guide.icon className={`w-5 h-5 ${guide.color}`} />
                            <p className="font-bold text-[16px] text-foreground">{guide.title}</p>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{guide.intro}</p>
                    </div>
                    {guide.content}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}

// ─── FEATURES section ─────────────────────────────────────────────────────────

function FeaturesSection() {
    const features = [
        { icon: LayoutGrid, color: "text-violet-400", title: "System Tweaks", badge: "165 tweaks", desc: "Registry, service, and policy tweaks across 10 categories. Risk-rated, searchable, and fully reversible with per-tweak educational context." },
        { icon: Activity, color: "text-red-400", title: "Dashboard", badge: "Live", desc: "Real-time system vitals — CPU, RAM, GPU, disk usage. Health score, quick-action cards, and recent activity feed." },
        { icon: Gamepad2, color: "text-green-400", title: "Gaming Optimizer", badge: "Auto", desc: "Detects running games, applies a gaming tweak pack automatically, shows an always-on-top GPU/CPU/VRAM overlay, before/after performance baseline." },
        { icon: CircuitBoard, color: "text-orange-400", title: "GPU Driver Cleaner", badge: "DDU-style", desc: "Clean uninstall NVIDIA, AMD, or Intel display drivers via pnputil + registry sweep. Schedule removal in Safe Mode for cleanest results." },
        { icon: Terminal, color: "text-cyan-400", title: "WSL Manager", badge: "WSLg", desc: "Full Linux subsystem lifecycle: enable WSL, install 8 distros, edit .wslconfig, launch XFCE4/KDE/GNOME desktop via WSLg. 7-step setup wizard." },
        { icon: Timer, color: "text-yellow-400", title: "Latency Optimizer", badge: null, desc: "Windows timer resolution display, standby RAM flusher (shows MB freed), boot config viewer (dynamic tick, platform clock, hypervisor state)." },
        { icon: ShieldAlert, color: "text-rose-400", title: "Privacy Audit", badge: "9 checks", desc: "Scans telemetry services, registry keys, and privacy settings. Shows severity (Critical/Warning/OK). One-click fix all." },
        { icon: Cpu, color: "text-teal-400", title: "Driver Manager", badge: null, desc: "List all installed PnP drivers via WMI. Detect unsigned drivers. Export driver list. Links to Windows Update for updates." },
        { icon: Activity, color: "text-purple-400", title: "Process Manager", badge: "Live", desc: "Real-time CPU%, memory, disk read/write per process. Kill processes, set priority (Realtime to Idle), open file location." },
        { icon: Network, color: "text-sky-400", title: "Network Analyzer", badge: null, desc: "Network interface list with MAC, IP, rx/tx bytes. Ping tool with min/max/average/jitter/packet loss. Auto-refreshes every 3s." },
        { icon: HardDrive, color: "text-amber-400", title: "Storage Optimizer", badge: "SMART", desc: "Drive health via SMART (wear %, temp, errors). TRIM optimization. Storage Sense integration. Scheduled maintenance tasks." },
        { icon: BatteryMedium, color: "text-emerald-400", title: "Power Manager", badge: null, desc: "Switch power plans. Battery health status. Per-plan CPU min/max, display timeout, sleep timeout (separate AC/DC settings)." },
        { icon: Power, color: "text-indigo-400", title: "Startup Apps", badge: null, desc: "View and manage all startup entries (registry + startup folder). Enable or disable with a toggle. Instant effect." },
        { icon: Package, color: "text-pink-400", title: "App Store", badge: "winget", desc: "Curated catalog of popular Windows apps with logos and descriptions. Install via winget or Chocolatey. Tracks installation status." },
        { icon: FileText, color: "text-slate-500 dark:text-slate-400", title: "System Report", badge: "HTML", desc: "Generate a full HTML system report covering hardware, software, tweaks applied, and health status. Save to disk." },
        { icon: Layers, color: "text-blue-400", title: "Profiles & Backup", badge: null, desc: "Save named configuration profiles. Export settings as .winopt JSON files. Restore on any machine." },
        { icon: Clock, color: "text-zinc-400", title: "History / Audit Log", badge: "Encrypted", desc: "Every tweak operation is logged with timestamp, command, and output. Fields encrypted with AES-256-GCM. Revert from history." },
        { icon: Shield, color: "text-red-300", title: "Windows Defender", badge: null, desc: "View and toggle Defender components, quarantine, real-time protection, and exclusions." },
        { icon: Star, color: "text-yellow-300", title: "AI Assistant", badge: "Offline", desc: "Chat with a local Ollama LLM for optimization advice. Fully offline — your data never leaves your machine. Configurable endpoint." },
        { icon: Search, color: "text-violet-300", title: "Command Palette", badge: "Ctrl+K", desc: "Instantly search and navigate to any feature or tweak using fuzzy text search. Semantic Web Worker for fast matching." },
    ];

    const featureDb = featuresData as FeatureData[];
    const [selectedFeature, setSelectedFeature] = useState<FeatureData | null>(null);

    const getIconForTitle = (title: string) => {
        return features.find(f => f.title === title)?.icon || LayoutGrid;
    };

    const getColorForTitle = (title: string) => {
        return features.find(f => f.title === title)?.color || "text-slate-500 dark:text-slate-400";
    };

    if (selectedFeature) {
        const Icon = getIconForTitle(selectedFeature.title);
        const color = getColorForTitle(selectedFeature.title);

        return (
            <motion.div key="details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-6">
                <button onClick={() => setSelectedFeature(null)} className="flex items-center gap-2 text-[13px] font-medium text-slate-500 dark:text-slate-500 dark:text-slate-400 hover:text-primary transition-colors hover:-translate-x-1 outline-none self-start">
                    <ChevronRight className="w-4 h-4 rotate-180" /> Back to Features
                </button>

                <div className="relative rounded-3xl overflow-hidden border border-slate-200 dark:border-border bg-slate-50/80 dark:bg-white/[0.02] p-8 mt-2">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] rounded-full pointer-events-none" />
                    <div className="relative z-10 flex flex-col gap-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-black/5 dark:bg-black/20 border border-slate-200 dark:border-white/5`}>
                            <Icon className={`w-7 h-7 ${color}`} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-foreground mb-2">{selectedFeature.title}</h2>
                            <p className="text-[15px] text-slate-600 dark:text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">{selectedFeature.description}</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <div className="lg:col-span-2 flex flex-col gap-5">
                        <div className="rounded-2xl border border-slate-200 dark:border-border p-6 bg-slate-50/80 dark:bg-white/[0.02]">
                            <h3 className="text-[15px] font-bold text-foreground mb-3 flex items-center gap-2">
                                <CircuitBoard className="w-4 h-4 text-cyan-600 dark:text-cyan-400" /> Technical Deep Dive
                            </h3>
                            <p className="text-[13px] text-slate-600 dark:text-slate-600 dark:text-slate-300 leading-relaxed max-w-none">
                                {selectedFeature.technicalDeepDive}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 dark:border-border p-6 bg-slate-50/80 dark:bg-white/[0.02]">
                            <h3 className="text-[15px] font-bold text-foreground mb-4 flex items-center gap-2">
                                <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Key Engineering Capabilities
                            </h3>
                            <div className="space-y-3">
                                {selectedFeature.keyCapabilities.map((cap, i) => (
                                    <div key={i} className="flex items-start gap-3">
                                        <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                                            <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                        <p className="text-[13px] text-slate-600 dark:text-slate-600 dark:text-slate-300">{cap}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-5">
                        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 relative overflow-hidden">
                            <ShieldAlert className="absolute -right-4 -bottom-4 w-24 h-24 text-red-500/10 pointer-events-none" />
                            <h3 className="text-[14px] font-bold text-red-600 dark:text-red-400 mb-3 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" /> Expert Note
                            </h3>
                            <p className="text-[12px] text-slate-700 dark:text-slate-600 dark:text-slate-300 leading-relaxed relative z-10">
                                {selectedFeature.expertNote}
                            </p>
                        </div>
                    </div>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-5">
            <motion.div variants={fadeUp} custom={0} initial="hidden" animate="visible">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-1"><LayoutGrid className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> All Features</h2>
                <p className="text-sm text-slate-500 dark:text-slate-500 dark:text-slate-400">Every module in WinOpt Pro, documented. Click a card for an engineering deep-dive.</p>
            </motion.div>
            <motion.div variants={fadeUp} custom={1} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {features.map((f) => {
                    // Match to database
                    const stringId = f.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
                    const mappedId = `features-${stringId}`;
                    const targetData = featureDb.find(db => db.id === mappedId) || featureDb[0];

                    return (
                        <FeatureCard
                            key={f.title}
                            icon={f.icon}
                            title={f.title}
                            color={f.color}
                            badge={f.badge ?? undefined}
                            onClick={() => setSelectedFeature({ ...targetData, title: f.title, description: f.desc })}
                        >
                            {f.desc}
                        </FeatureCard>
                    );
                })}
            </motion.div>
        </motion.div>
    );
}

// ─── TWEAKS BROWSER section ───────────────────────────────────────────────────

function TweaksBrowserSection() {
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("All");
    const [risk, setRisk] = useState("All");
    const [expertOnly, setExpertOnly] = useState(false);
    const [viewMode, setViewMode] = useState<"grid" | "list">("list");

    const { applyTweak, revertTweak, executingTweakId } = useTweakExecution();
    const appliedTweaks = useAppStore(s => s.appliedTweaks);

    const handleToggle = useCallback(async (tweak: Tweak) => {
        const t = { ...tweak, validationCmd: tweak.validationCmd ?? "" };
        if (appliedTweaks.includes(tweak.id)) {
            await revertTweak(t);
        } else {
            await applyTweak(t);
        }
    }, [appliedTweaks, applyTweak, revertTweak]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();
        return ALL_TWEAKS.filter(t => {
            if (category !== "All" && t.category !== category) return false;
            if (risk !== "All" && t.riskLevel !== risk) return false;
            if (expertOnly && !t.requiresExpertMode) return false;
            if (q && !t.name.toLowerCase().includes(q) && !t.description.toLowerCase().includes(q) && !t.id.toLowerCase().includes(q)) return false;
            return true;
        });
    }, [search, category, risk, expertOnly]);

    const counts = useMemo(() => {
        const g = ALL_TWEAKS.filter(t => t.riskLevel === "Green").length;
        const y = ALL_TWEAKS.filter(t => t.riskLevel === "Yellow").length;
        const r = ALL_TWEAKS.filter(t => t.riskLevel === "Red").length;
        return { g, y, r };
    }, []);

    return (
        <div className="flex flex-col gap-5">
            <motion.div variants={fadeUp} custom={0} initial="hidden" animate="visible">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-1"><Gauge className="w-5 h-5 text-cyan-400" /> Tweaks Browser</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Browse, search, and read documentation for all {ALL_TWEAKS.length} tweaks.</p>
            </motion.div>

            {/* Stats pills */}
            <motion.div variants={fadeUp} custom={1} initial="hidden" animate="visible" className="flex flex-wrap gap-2">
                {[
                    { label: `${ALL_TWEAKS.length} total`, color: "bg-white/5 border-border text-slate-500 dark:text-slate-400" },
                    { label: `${counts.g} 🟢 Safe`, color: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" },
                    { label: `${counts.y} 🟡 Caution`, color: "bg-amber-500/10 border-amber-500/20 text-amber-400" },
                    { label: `${counts.r} 🔴 Expert`, color: "bg-red-500/10 border-red-500/20 text-red-400" },
                ].map(p => <span key={p.label} className={`px-3 py-1 rounded-full border text-[11px] font-bold ${p.color}`}>{p.label}</span>)}
            </motion.div>

            {/* Filters */}
            <motion.div variants={fadeUp} custom={2} initial="hidden" animate="visible" className="flex flex-col gap-2">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400 pointer-events-none" />
                    <input type="text" placeholder="Search tweaks by name, description, or ID..."
                        value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder-slate-500 outline-none focus:border-primary/40 transition-colors" />
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                    <select value={category} onChange={e => setCategory(e.target.value)}
                        className="bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-1.5 text-[12px] text-foreground outline-none focus:border-primary/40">
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {["All", "Green", "Yellow", "Red"].map(r => (
                        <button key={r} onClick={() => setRisk(r)}
                            className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors ${risk === r ? "bg-primary/10 border-primary/30 text-primary" : "bg-black/5 dark:bg-white/5 border-border text-slate-500 dark:text-slate-400 hover:text-foreground"}`}>
                            {r === "All" ? "All Risks" : <><RiskBadge level={r} /></>}
                        </button>
                    ))}
                    <label className="flex items-center gap-1.5 cursor-pointer text-[12px] text-slate-500 dark:text-slate-400 select-none">
                        <input type="checkbox" checked={expertOnly} onChange={e => setExpertOnly(e.target.checked)} className="rounded" />
                        Expert only
                    </label>
                    <div className="ml-auto flex gap-1">
                        <button onClick={() => setViewMode("list")} className={`p-1.5 rounded-lg border ${viewMode === "list" ? "bg-primary/10 border-primary/30 text-primary" : "border-border text-slate-500"}`}><List className="w-4 h-4" /></button>
                        <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded-lg border ${viewMode === "grid" ? "bg-primary/10 border-primary/30 text-primary" : "border-border text-slate-500"}`}><LayoutGrid className="w-4 h-4" /></button>
                    </div>
                </div>
                <p className="text-[11px] text-slate-500">Showing {filtered.length} of {ALL_TWEAKS.length} tweaks</p>
            </motion.div>

            {/* Results */}
            <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 gap-2" : "flex flex-col gap-2"}>
                {filtered.map(tweak => (
                    <TweakCard
                        key={tweak.id}
                        tweak={tweak}
                        isApplied={appliedTweaks.includes(tweak.id)}
                        isExecutingThis={executingTweakId === tweak.id}
                        onToggle={() => handleToggle(tweak)}
                    />
                ))}
                {filtered.length === 0 && (
                    <div className="flex flex-col items-center py-16 text-slate-500">
                        <Search className="w-10 h-10 opacity-20 mb-3" />
                        <p className="font-medium">No tweaks match your filters</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── FAQ section ──────────────────────────────────────────────────────────────

function FAQSection() {
    const [search, setSearch] = useState("");
    const sq = search.toLowerCase().trim();

    const allFAQ = [
        { q: "Is WinOpt Pro safe to use? Will it break my PC?", a: "For Green tweaks: yes, completely safe. Yellow tweaks may affect behavior you rely on — read the description. Red tweaks require Expert Mode and understanding the trade-off. Every change is reversible via the Revert button or History page. The worst case for Red tweaks is booting into Safe Mode and reverting a registry key — documented in Troubleshooting." },
        { q: "Do I need to run WinOpt Pro as an administrator?", a: "Yes. Most tweaks write to HKLM registry hives or modify system services, which require admin rights. Accept the UAC prompt when WinOpt Pro launches. Without admin rights, most tweaks will fail silently or return Access Denied." },
        { q: "What is Expert Mode?", a: "Expert Mode unlocks Red-risk tweaks that are hidden from standard users. Enable it in Settings → Expert Mode. Once active, a persistent warning banner is shown on the Tweaks page as a reminder. Expert Mode state persists across sessions." },
        { q: "What are the three risk levels?", a: "🟢 Green: safe for everyone, instantly reversible. Examples: disable telemetry, show file extensions. 🟡 Yellow: moderate risk, read the description, may affect a feature. Examples: disable Delivery Optimization, disable Fast Startup. 🔴 Red: significant security or stability trade-offs, Expert Mode required. Examples: disable VBS, disable Spectre mitigations." },
        { q: "How do I undo a change?", a: "Three ways: (1) Click the Revert button on the tweak card — restores the exact original value. (2) Go to History and click Revert on any log entry. (3) Import a .winopt backup from Settings → Backup & Restore." },
        { q: "What does 'requires reboot' mean?", a: "Some tweaks write to boot configuration data (bcdedit) or registry keys that Windows only reads during startup. The change is written immediately but takes effect after the next restart. You can apply multiple such tweaks and reboot once at the end." },
        { q: "How do I know if a tweak worked?", a: "Check the History page — it confirms the command ran without error. For registry tweaks, open regedit.exe and navigate to the key shown in the tweak's educational overlay. For service tweaks, check services.msc. Some tweaks can be verified with PowerShell commands shown in the overlay." },
        { q: "Will applying tweaks affect Windows Update?", a: "Only tweaks in the Windows Update category change how updates behave. All other categories don't touch Windows Update. Note: Microsoft sometimes resets privacy/telemetry settings during major annual feature updates (23H2, 24H2). Re-run Privacy Audit after major updates." },
        { q: "Will WinOpt Pro get me banned from games / anti-cheat?", a: "No. All changes are OS-level registry and system settings — not game file modifications. Anti-cheat systems (EAC, Battleye, Vanguard, FACEIT) check game files and memory, not Windows power plans or TCP stack settings. However: if you disable HVCI/Memory Integrity, Valorant's Vanguard may refuse to launch since it requires that feature." },
        { q: "What does the Gaming Optimizer actually do?", a: "Three things: (1) Detects active games by polling processes every 5s against 32+ known game executables. (2) Auto-optimize: batch-applies gaming tweaks the moment a game is detected, reverts when you exit. (3) Overlay: transparent always-on-top widget showing CPU%, GPU%, VRAM, temp, and power draw." },
        { q: "My game is not detected. What can I do?", a: "The detection list covers 32 common game processes. If your game uses an unusual executable name, submit a GitHub Issue with the process name (find it in Task Manager). You can also manually trigger auto-optimize from the Gaming page without game detection." },
        { q: "Is the AI Assistant sending data to the cloud?", a: "No. The AI Assistant uses Ollama which runs entirely on your local machine. Your prompts never leave your computer. No account required. The Ollama endpoint is configurable in Settings — default is http://localhost:11434." },
        { q: "What is the audit log and how is it encrypted?", a: "The History page reads from history.db (SQLite). Sensitive fields (command_executed, stdout, stderr) are encrypted with AES-256-GCM. The key is derived from SHA-256(MachineGuid), unique to your Windows installation. The database cannot be read on another machine." },
        { q: "How often should I run the Privacy Audit?", a: "After a fresh Windows install, after each major feature update (annual releases reset some settings), and monthly as a routine check. The audit is read-only and non-destructive — running it frequently has no downside." },
        { q: "What is VBS / HVCI and should I disable it?", a: "VBS (Virtualization-Based Security) isolates secure memory using the CPU hypervisor. HVCI (Memory Integrity) uses VBS to verify kernel code. Disabling VBS/HVCI recovers 5–15% GPU/CPU on some systems. Keep it enabled on corporate machines, if you play Valorant (Vanguard requires HVCI), or if security matters more than max FPS." },
        { q: "Will these tweaks affect Windows Defender?", a: "Tweaks in the Security category can affect Defender-related settings. The dedicated Windows Defender page has explicit toggles for Defender components. Privacy tweaks (like disabling Defender auto sample submission) are Yellow-risk — read the descriptions." },
        { q: "Does WinOpt Pro work on Windows 10?", a: "Yes, Windows 10 version 2004 (Build 19041) or later. Some features require Windows 11: WSLg (Linux Mode desktop environments), certain UI tweaks (Copilot, Widgets). The app runs fine on Windows 10 — those features simply don't apply." },
        { q: "Why does SmartScreen warn about the installer?", a: "WinOpt Pro is unsigned — code-signing certificates cost ~$400/yr, which is a significant cost for an open-source project. The warning does NOT mean the software is malicious. Click 'More info' then 'Run anyway'. Verify the file hash against SHA256SUMS on the GitHub release if you want to confirm authenticity." },
        { q: "Is there auto-update?", a: "Not yet. Check the GitHub Releases page for new versions. Auto-update is planned for a future release via the GitHub Releases API." },
        { q: "Can I use this on a work / corporate machine?", a: "Proceed with caution. Corporate machines often have Group Policy applied that will override registry changes WinOpt Pro makes. Some tweaks (disabling security features, modifying network settings) may violate corporate IT policies. Check with your IT department before applying anything beyond Green tweaks." },
        { q: "Can I export my settings and share them?", a: "Yes. Go to Settings → Backup & Restore → Export Backup. The .winopt file is a JSON file containing your applied tweak state. You can share it with others. Import via the same section. Profiles (named configuration sets) can also be exported." },
        { q: "How do I clean install GPU drivers?", a: "Go to Apps → GPU Driver Cleaner. Select your GPU vendor, check 'Delete Driver Store' for cleanest removal, and click 'Schedule Safe Mode Boot' (recommended) or 'Uninstall Now'. Download fresh drivers from NVIDIA/AMD/Intel before rebooting. After removal your display will drop to low resolution until drivers are reinstalled." },
        { q: "What is the Latency Optimizer actually doing?", a: "It reads your current Windows timer resolution via NtQueryTimerResolution (Windows system call), shows the min/max/current values. The Flush Standby List button calls NtSetSystemInformation to evict cached-but-unused RAM pages, freeing memory for games. The boot settings viewer reads bcdedit output." },
        { q: "What is WSL / Linux Mode?", a: "WSL (Windows Subsystem for Linux) lets you run a real Linux kernel on Windows. Linux Mode uses WSLg (WSL with GUI support, Windows 11 only) to launch a full desktop environment (XFCE4, KDE Plasma, or GNOME) in a window — without dual-booting." },
        { q: "What if my PC won't boot after applying tweaks?", a: "Boot into Safe Mode: hold Shift while clicking Restart, or press F8 during boot. In Safe Mode, open WinOpt Pro and use History to revert the problematic tweak, or open regedit.exe manually and restore the key. The Troubleshooting section of this Help has step-by-step recovery instructions." },
    ];

    const filtered = allFAQ.filter(({ q, a }) => !sq || q.toLowerCase().includes(sq) || a.toLowerCase().includes(sq));

    return (
        <div className="flex flex-col gap-5">
            <motion.div variants={fadeUp} custom={0} initial="hidden" animate="visible">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-1"><HelpCircle className="w-5 h-5 text-pink-400" /> Frequently Asked Questions</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{allFAQ.length} questions answered. Search to find anything quickly.</p>
            </motion.div>
            <motion.div variants={fadeUp} custom={1} initial="hidden" animate="visible" className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400 pointer-events-none" />
                <input type="text" placeholder="Search questions..." value={search} onChange={e => setSearch(e.target.value)}
                    className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder-slate-500 outline-none focus:border-primary/40 transition-colors" />
            </motion.div>
            <motion.div variants={fadeUp} custom={2} initial="hidden" animate="visible" className="flex flex-col gap-2">
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center py-16 text-slate-500">
                        <HelpCircle className="w-10 h-10 opacity-20 mb-3" />
                        <p className="font-medium">No results for "{search}"</p>
                    </div>
                ) : filtered.map((item, i) => (
                    <AccordionItem key={i} q={item.q} a={item.a} defaultOpen={i === 0 && !sq} />
                ))}
            </motion.div>
        </div>
    );
}

// ─── TROUBLESHOOTING section ──────────────────────────────────────────────────

function TroubleshootingSection() {
    const issues = [
        {
            title: "App won't start",
            symptoms: ["Nothing happens when double-clicking the executable", "Blank window appears then closes immediately"],
            solutions: [
                { cause: "Missing WebView2 runtime", steps: ["Open Settings → Apps → Installed Apps", "Search for 'Microsoft Edge WebView2 Runtime'", "If missing, download from developer.microsoft.com/microsoft-edge/webview2", "Re-launch WinOpt Pro"] },
                { cause: "Not running as administrator", steps: ["Right-click the WinOpt Pro shortcut", "Select 'Run as administrator'", "Accept the UAC prompt", "Re-launch"] },
                { cause: "Antivirus quarantined the file", steps: ["Check your antivirus quarantine log", "Restore the WinOpt Pro executable", "Add an exclusion for the install directory", "Re-download and verify file hash if needed"] },
            ]
        },
        {
            title: "Tweak apply fails / Access Denied",
            symptoms: ["'Access Denied' error on apply", "UAC prompt doesn't appear", "PowerShell execution policy error"],
            solutions: [
                { cause: "Not running as admin", steps: ["Close WinOpt Pro", "Right-click → Run as administrator", "Accept UAC prompt", "Retry the tweak"] },
                { cause: "PowerShell execution policy", steps: ["Open PowerShell as admin", "Run: Set-ExecutionPolicy RemoteSigned -Scope Process", "Retry from WinOpt Pro"] },
                { cause: "Group Policy override", steps: ["Run gpresult /r in an admin command prompt", "Check if the relevant setting is enforced by policy", "On domain machines, contact IT admin"] },
            ]
        },
        {
            title: "System instability after a Red tweak",
            symptoms: ["Windows fails to boot", "Crash loop", "Black screen on boot"],
            solutions: [
                { cause: "Revert via Safe Mode", steps: ["Hold Shift and click Restart (or press F8 during boot)", "Select Troubleshoot → Advanced Options → Startup Settings → Restart", "Press 4 or F4 to boot into Safe Mode", "Launch WinOpt Pro in Safe Mode", "Go to History and revert the problematic tweak", "Restart normally"] },
                { cause: "Manual VBS revert (if VBS tweak caused boot failure)", steps: ["Boot into Safe Mode (see above)", "Open an admin Command Prompt", "Run: bcdedit /set hypervisorlaunchtype auto", "Restart — VBS will re-enable on next boot"] },
            ]
        },
        {
            title: "GPU Driver Cleaner issues",
            symptoms: ["Screen goes black after uninstall", "Display stays at low resolution", "pnputil not found error"],
            solutions: [
                { cause: "Screen going black is expected", steps: ["After driver removal, the screen will show at low resolution (800×600 or 1024×768)", "This is normal — generic display adapter is in use", "Download fresh drivers from NVIDIA.com / AMD.com / Intel.com", "Run the installer to restore normal resolution"] },
                { cause: "pnputil error on old Windows", steps: ["pnputil /delete-driver requires Windows 10 1903+", "Update Windows to at least version 1903", "Alternatively, use Display Driver Uninstaller (DDU) as a standalone tool"] },
            ]
        },
        {
            title: "WSL / Linux Mode not working",
            symptoms: ["WSL feature can't be enabled", "Linux Mode button not shown", "wsl --install fails"],
            solutions: [
                { cause: "Virtualization not enabled in BIOS", steps: ["Reboot into BIOS/UEFI (usually Del or F2 during boot)", "Find CPU Virtualization settings (Intel VT-x or AMD-V)", "Enable it", "Save and boot into Windows", "Retry WSL installation"] },
                { cause: "Windows Home — no gpedit", steps: ["WSL itself works on Windows Home", "WSLg (Linux Mode desktop) requires Windows 11 or Win10 21H2+ Insider Preview", "Upgrade to Windows 11 for full Linux Mode support"] },
                { cause: "WSL kernel update needed", steps: ["Open Windows Update", "Check for optional updates", "Install 'Windows Subsystem for Linux' update if shown", "Alternatively run: wsl --update"] },
            ]
        },
        {
            title: "Gaming Optimizer: game not detected",
            symptoms: ["Gaming page shows 'No game detected'", "Overlay doesn't appear automatically"],
            solutions: [
                { cause: "Game process not in detection list", steps: ["Open Task Manager while game is running", "Find the game's .exe process name", "Submit a GitHub Issue requesting it be added to the detection list", "Manually click 'Apply Gaming Tweaks' on the Gaming page in the meantime"] },
            ]
        },
        {
            title: "Process Manager: can't kill a process",
            symptoms: ["'Access Denied' when killing a process", "Process reappears after kill"],
            solutions: [
                { cause: "System-protected process", steps: ["Some processes (csrss.exe, lsass.exe, svchost.exe with SYSTEM token) are kernel-protected", "Killing them would crash Windows — this protection is intentional", "Use Task Manager's 'End Process Tree' for normal user-owned processes"] },
                { cause: "Process restarted by supervisor", steps: ["Some apps (Windows Defender, Windows Update) are supervised by the Service Control Manager", "Disable the service instead: go to Settings → Tweaks → Performance and disable the relevant service tweak"] },
            ]
        },
        {
            title: "AI Assistant not responding",
            symptoms: ["'Connection refused' error in AI chat", "No response from the assistant"],
            solutions: [
                { cause: "Ollama not running", steps: ["Open a Command Prompt or PowerShell", "Run: ollama serve", "Wait for 'Listening on 127.0.0.1:11434'", "Retry the AI Assistant"] },
                { cause: "No model pulled", steps: ["Run: ollama list to see installed models", "If empty, run: ollama pull llama3", "Wait for download to complete", "Retry"] },
                { cause: "Wrong endpoint in Settings", steps: ["Go to WinOpt Pro Settings → AI Assistant", "Verify the endpoint is http://localhost:11434", "Correct it if changed and retry"] },
            ]
        },
    ];

    return (
        <div className="flex flex-col gap-5">
            <motion.div variants={fadeUp} custom={0} initial="hidden" animate="visible">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-1"><Wrench className="w-5 h-5 text-orange-400" /> Troubleshooting</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Common issues and step-by-step solutions. Click any issue to expand it.</p>
            </motion.div>
            <motion.div variants={fadeUp} custom={1} initial="hidden" animate="visible"
                className="flex items-start gap-3 px-4 py-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300">
                <Info className="w-4 h-4 mt-0.5 shrink-0" />
                <p className="text-[13px]">For issues not listed here, check the <strong className="text-white">History</strong> page to identify which tweak caused the problem, then use its Revert button. If the app won't open, boot into Safe Mode and revert from there.</p>
            </motion.div>
            <motion.div variants={fadeUp} custom={2} initial="hidden" animate="visible" className="flex flex-col gap-2">
                {issues.map(issue => <TroubleCard key={issue.title} {...issue} />)}
            </motion.div>
        </div>
    );
}

// ─── SHORTCUTS section ────────────────────────────────────────────────────────

function ShortcutsSection() {
    const shortcuts = [
        { keys: ["Ctrl", "K"], desc: "Open Command Palette", note: "Search any feature or tweak by name. Press Enter to navigate." },
        { keys: ["Escape"], desc: "Close Command Palette / Modal", note: "Dismisses any open overlay, color picker, or dialog." },
        { keys: ["↑", "↓"], desc: "Navigate Command Palette results", note: "Arrow keys move through the filtered list." },
        { keys: ["Enter"], desc: "Select Command Palette item", note: "Navigates to the selected feature." },
        { keys: ["Click + drag"], desc: "Move Gaming Overlay", note: "Drag the overlay widget anywhere on screen during a game." },
    ];

    return (
        <div className="flex flex-col gap-5">
            <motion.div variants={fadeUp} custom={0} initial="hidden" animate="visible">
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-1"><Keyboard className="w-5 h-5 text-slate-500 dark:text-slate-400" /> Keyboard Shortcuts</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Speed up your workflow with these keyboard shortcuts.</p>
            </motion.div>
            <motion.div variants={fadeUp} custom={1} initial="hidden" animate="visible" className="flex flex-col gap-2">
                {shortcuts.map(({ keys, desc, note }) => (
                    <div key={desc} className="rounded-xl border border-border bg-black/5 dark:bg-white/[0.02] p-4 flex items-start gap-4">
                        <div className="flex items-center gap-1 shrink-0 flex-wrap">
                            {keys.map((k, i) => (
                                <span key={k} className="flex items-center gap-1">
                                    <kbd className="px-2.5 py-1.5 rounded-lg bg-black/30 border border-white/15 text-[12px] font-mono text-slate-200 shadow-sm">{k}</kbd>
                                    {i < keys.length - 1 && <span className="text-slate-500 text-[11px] font-medium mx-0.5">+</span>}
                                </span>
                            ))}
                        </div>
                        <div className="flex-1">
                            <p className="font-semibold text-[13px] text-foreground">{desc}</p>
                            <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">{note}</p>
                        </div>
                    </div>
                ))}
            </motion.div>

            <motion.div variants={fadeUp} custom={2} initial="hidden" animate="visible">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3 mt-2">Tips & Tricks</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                        { icon: Search, title: "Use the Command Palette", desc: "The fastest way to navigate. Press Ctrl+K and type the name of any tweak, feature, or page." },
                        { icon: MousePointer, title: "Sidebar search", desc: "Type in the sidebar search box to filter navigation items. Clear it to show everything again." },
                        { icon: Clock, title: "History for safety", desc: "Review everything WinOpt Pro has applied in the History page. Revert individual tweaks from there." },
                        { icon: Layers, title: "Profiles for quick switching", desc: "Save different optimization states as named profiles. Great for switching between gaming and everyday use." },
                    ].map(({ icon: Icon, title, desc }) => (
                        <div key={title} className="rounded-xl border border-border bg-black/5 p-4 flex gap-3">
                            <Icon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold text-[13px] text-foreground">{title}</p>
                                <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">{desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </motion.div>

            <motion.div variants={fadeUp} custom={3} initial="hidden" animate="visible"
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-slate-500/10 border border-slate-500/20 text-slate-600 dark:text-slate-300">
                <ExternalLink className="w-4 h-4 shrink-0" />
                <p className="text-[13px]">Found a bug or want a new feature? <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Open an issue on GitHub</a>.</p>
            </motion.div>
        </div>
    );
}

// ─── Root component ───────────────────────────────────────────────────────────

export function HelpPage() {
    const [section, setSection] = useState("home");
    const [guideTab, setGuideTab] = useState(0);

    const SECTION_COMPONENTS: Record<string, React.ReactNode> = {
        home: <HomeSection onNavigate={(s, t) => { setSection(s); if (t !== undefined) setGuideTab(t); }} />,
        setup: <SetupSection />,
        guides: <GuidesSection defaultTab={guideTab} />,
        features: <FeaturesSection />,
        tweaks: <TweaksBrowserSection />,
        faq: <FAQSection />,
        troubleshoot: <TroubleshootingSection />,
        shortcuts: <ShortcutsSection />,
    };

    return (
        <div className="flex h-full min-h-0">
            {/* Left nav */}
            <div className="w-[200px] shrink-0 border-r border-border overflow-y-auto hidden md:flex flex-col gap-1 p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-2 pt-1 pb-2">Documentation</p>
                {SECTIONS.map(s => {
                    const Icon = s.icon;
                    const active = section === s.id;
                    return (
                        <button key={s.id} onClick={() => setSection(s.id)}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-colors text-left outline-none ${active ? "bg-primary/10 text-primary border border-primary/20" : "text-slate-500 dark:text-slate-400 hover:text-foreground hover:bg-white/5"}`}>
                            <Icon className={`w-4 h-4 shrink-0 ${active ? "text-primary" : s.color}`} />
                            {s.label}
                        </button>
                    );
                })}

                {/* Footer */}
                <div className="mt-auto pt-4 border-t border-border/50 px-2">
                    <div className="flex flex-col gap-1.5 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1.5"><CheckCircle className="w-3 h-3 text-emerald-500" /> 418 tests passing</span>
                        <span className="flex items-center gap-1.5"><Gauge className="w-3 h-3 text-cyan-400" /> 165 tweaks</span>
                        <span className="flex items-center gap-1.5"><RefreshCcw className="w-3 h-3 text-blue-400" /> All reversible</span>
                    </div>
                </div>
            </div>

            {/* Main */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-[920px] mx-auto p-5 lg:p-8 flex flex-col gap-5">
                    {/* Mobile nav */}
                    <div className="flex flex-wrap gap-1.5 md:hidden">
                        {SECTIONS.map(s => {
                            const Icon = s.icon;
                            return (
                                <button key={s.id} onClick={() => setSection(s.id)}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-colors ${section === s.id ? "bg-primary/10 border-primary/30 text-primary" : "bg-black/5 dark:bg-white/5 border-border text-slate-500 dark:text-slate-400"}`}>
                                    <Icon className="w-3 h-3" />{s.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Section content */}
                    <AnimatePresence mode="wait">
                        <motion.div key={section} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22, ease: "easeOut" }}>
                            {SECTION_COMPONENTS[section]}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
