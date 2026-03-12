import { useState } from "react";
import {
    Search, Command, Moon, Sun, Zap, Settings, Gamepad2, Clock, Layers, BatteryMedium,
    MonitorCog, RefreshCcw, Power, HardDrive, Activity, Network, Package, Shield, ShieldCheck,
    Cpu, FileText, Timer, LayoutDashboard, Gauge, ShieldAlert, Globe, CircuitBoard, Terminal,
    ChevronDown, HelpCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../../hooks/useTheme";

const COLOR_SCHEMES = [
    { id: "default", color: "#4318FF", label: "Violet" },
    { id: "teal", color: "#05cd99", label: "Teal" },
    { id: "rose", color: "#f43f5e", label: "Rose" },
    { id: "amber", color: "#f59e0b", label: "Amber" },
    { id: "emerald", color: "#10b981", label: "Emerald" },
] as const;

interface NavItem {
    id: string;
    label: string;
    lucideIcon?: React.ElementType;
}

interface NavGroup {
    id: string;
    label: string;
    items: NavItem[];
}

const HOME_ITEM: NavItem = { id: "home", label: "Home", lucideIcon: LayoutDashboard };

const NAV_GROUPS: NavGroup[] = [
    {
        id: "tuning", label: "System Tuning", items: [
            { id: "dashboard", label: "System Dashboard", lucideIcon: Activity },
            { id: "performance", label: "Performance", lucideIcon: Gauge },
            { id: "privacy", label: "Privacy", lucideIcon: ShieldAlert },
            { id: "gaming", label: "Gaming", lucideIcon: Gamepad2 },
            { id: "network_tweaks", label: "Network", lucideIcon: Globe },
            { id: "power", label: "Power", lucideIcon: BatteryMedium },
            { id: "prebuilt_debloater", label: "Debloater Wizard", lucideIcon: Zap },
            { id: "windowsui", label: "Windows UI", lucideIcon: MonitorCog },
            { id: "windowsupdate", label: "Updates", lucideIcon: RefreshCcw },
        ]
    },
    {
        id: "apps", label: "Apps & Packages", items: [
            { id: "apps", label: "App Store", lucideIcon: Package },
            { id: "wsl_manager", label: "WSL Manager", lucideIcon: Terminal },
            { id: "drivers", label: "Driver Manager", lucideIcon: Cpu },
            { id: "gpu_driver", label: "GPU Driver Cleaner", lucideIcon: CircuitBoard },
            { id: "startup", label: "Startup Apps", lucideIcon: Power },
        ]
    },
    {
        id: "utilities", label: "Utilities", items: [
            { id: "gaming_optimizer", label: "Gaming Optimizer", lucideIcon: Gamepad2 },
            { id: "latency", label: "Latency Optimizer", lucideIcon: Timer },
            { id: "power_manager", label: "Power Manager", lucideIcon: BatteryMedium },
            { id: "privacy_audit", label: "Privacy Audit", lucideIcon: ShieldCheck },
            { id: "defender", label: "Defender Support", lucideIcon: Shield },
            { id: "processes", label: "Process Manager", lucideIcon: Activity },
            { id: "network", label: "Network Analyzer", lucideIcon: Network },
            { id: "storage", label: "Storage Optimizer", lucideIcon: HardDrive },
            { id: "system_report", label: "System Report", lucideIcon: FileText },
        ]
    },
    {
        id: "system", label: "System", items: [
            { id: "profiles", label: "Profiles", lucideIcon: Layers },
            { id: "history", label: "History", lucideIcon: Clock },
            { id: "settings", label: "Settings", lucideIcon: Settings },
            { id: "help", label: "Help & Docs", lucideIcon: HelpCircle },
        ]
    }
];

export function Sidebar({ currentView, setView }: { currentView: string, setView: (s: string) => void }) {
    const { theme, setTheme, colorScheme, setColorScheme } = useTheme();
    const [showColorPicker, setShowColorPicker] = useState(false);

    // Track expanded groups - all expanded by default
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
        "tuning": true,
        "apps": true,
        "utilities": true,
        "system": true
    });
    const [searchQuery, setSearchQuery] = useState("");

    const toggleGroup = (groupId: string) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupId]: !prev[groupId]
        }));
    };

    const renderNavItem = (item: NavItem) => {
        const isActive = currentView === item.id;
        return (
            <button
                key={item.id}
                title={item.label}
                onClick={() => setView(item.id)}
                className={`relative w-full flex items-center justify-center lg:justify-start space-x-0 lg:space-x-3 px-3 py-2.5 rounded-[12px] transition-all duration-200 group outline-none ${isActive
                    ? "text-primary font-semibold"
                    : "text-slate-500 dark:text-slate-300 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
                    }`}
            >
                {isActive && (
                    <motion.div
                        layoutId="sidebar-active"
                        className="absolute inset-x-1 lg:inset-x-0 inset-y-0 bg-primary/10 dark:bg-primary/20 rounded-[12px] border border-primary/20"
                        initial={false}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                )}

                {isActive && (
                    <motion.div layoutId="sidebar-pip" className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full shadow-[0_0_10px_var(--primary)]" />
                )}

                <div className="relative z-10 flex items-center justify-center">
                    {item.lucideIcon && (
                        <item.lucideIcon className={`w-5 h-5 transition-opacity ${isActive ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}`} strokeWidth={1.8} />
                    )}
                </div>
                <span className="hidden lg:block relative z-10 text-[13px] font-medium tracking-wide">{item.label}</span>
            </button>
        );
    };

    return (
        <div className="w-[80px] lg:w-[260px] h-full flex flex-col relative z-30 bg-background/80 backdrop-blur-3xl border-r border-border transition-all duration-300">
            {/* Brand Header */}
            <div className="px-4 lg:px-6 py-8 flex items-center lg:space-x-3 select-none justify-center lg:justify-start">
                <div className="relative flex items-center justify-center w-8 h-8 rounded-[10px] bg-gradient-to-tr from-primary to-blue-400 shadow-[0_0_20px_var(--primary)] shrink-0">
                    <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
                </div>
                <h1 className="hidden lg:flex text-xl font-bold font-heading tracking-tight text-foreground items-center">
                    WinOpt<span className="text-slate-500 dark:text-slate-200 font-medium">Pro</span>
                </h1>
            </div>

            {/* Search / Command Menu Trigger */}
            <div className="px-2 lg:px-5 mb-6">
                <div className="relative group/search text-slate-500 dark:text-slate-200 focus-within:text-primary transition-colors">
                    <Search className="absolute left-3 lg:left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none transition-colors" />
                    <input
                        type="text"
                        placeholder="Search modules..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-black/5 dark:bg-white/[0.03] hover:bg-black/10 dark:hover:bg-white/[0.06] focus:bg-white/5 border border-transparent focus:border-primary/30 rounded-xl px-3 pl-9 lg:pl-10 py-2 text-sm text-foreground placeholder-slate-500 outline-none transition-all placeholder:opacity-0 lg:placeholder:opacity-100"
                    />
                    {/* Fake hotkey hint that still delegates to global Ctrl+K anyway, just for aesthetics if empty */}
                    {!searchQuery && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 hidden lg:flex items-center text-[10px] bg-black/5 dark:bg-black/40 px-1.5 py-0.5 rounded shadow-inner font-mono font-medium opacity-50 pointer-events-none">
                            <Command className="w-3 h-3 mr-0.5" /> K
                        </span>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 px-2 lg:px-3 overflow-y-auto custom-scrollbar space-y-4 lg:space-y-6">

                {/* Flat Home Item */}
                <div className="mb-2 lg:mb-4">
                    {renderNavItem(HOME_ITEM)}
                </div>

                {/* Collapsible Groups */}
                {NAV_GROUPS.map(group => {
                    // Filter items if there is a search query
                    const query = searchQuery.toLowerCase().trim();
                    const filteredItems = query
                        ? group.items.filter(item => item.label.toLowerCase().includes(query))
                        : group.items;

                    if (filteredItems.length === 0) return null;

                    const isExpanded = query ? true : expandedGroups[group.id];
                    return (
                        <div key={group.id} className="group/section">
                            {/* Group Header - Only visible on desktop or as tooltip anchor on mobile */}
                            <button
                                onClick={() => !query && toggleGroup(group.id)}
                                className={`hidden w-full px-3 py-1.5 items-center justify-between transition-colors outline-none ${query ? 'lg:flex text-primary/70 cursor-default' : 'lg:flex text-slate-600 dark:text-slate-300 hover:text-foreground group-hover/section:text-foreground'}`}
                            >
                                <p className="text-[10px] font-bold uppercase tracking-widest select-none">
                                    {group.label} {query && <span className="ml-1 opacity-50">({filteredItems.length})</span>}
                                </p>
                                {!query && (
                                    <motion.div
                                        animate={{ rotate: isExpanded ? 0 : -90 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                                    </motion.div>
                                )}
                            </button>

                            {/* Mobile-only separator */}
                            <div className="lg:hidden mx-4 my-3 h-px bg-white/5" />

                            <AnimatePresence initial={false}>
                                {(isExpanded || window.innerWidth < 1024) && (
                                    <motion.div
                                        initial={window.innerWidth >= 1024 ? { height: 0, opacity: 0 } : undefined}
                                        animate={window.innerWidth >= 1024 ? { height: "auto", opacity: 1 } : undefined}
                                        exit={window.innerWidth >= 1024 ? { height: 0, opacity: 0 } : undefined}
                                        transition={{ duration: 0.2, ease: "easeInOut" }}
                                        className="space-y-1 overflow-hidden"
                                    >
                                        <div className="py-1">
                                            {filteredItems.map(renderNavItem)}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })}
            </div>

            {/* Theme Controls */}
            <div className="px-2 lg:px-5 mb-4 flex flex-col lg:flex-row lg:grid lg:grid-cols-2 gap-2">
                <button
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="flex items-center justify-center p-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors border border-black/5 dark:border-white/5"
                    title="Toggle Theme"
                >
                    {theme === "dark" ? <Sun className="w-4 h-4 text-slate-400" /> : <Moon className="w-4 h-4 text-slate-500 dark:text-slate-300" />}
                </button>
                <div className="relative">
                    {showColorPicker && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowColorPicker(false)} />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-card border border-border rounded-2xl shadow-2xl flex flex-col gap-1.5 z-50">
                                {COLOR_SCHEMES.map(scheme => (
                                    <button
                                        key={scheme.id}
                                        title={scheme.label}
                                        onClick={() => { setColorScheme(scheme.id as any); setShowColorPicker(false); }}
                                        className={`w-5 h-5 rounded-full transition-all hover:scale-110 active:scale-95 ${colorScheme === scheme.id ? "ring-2 ring-white/40 ring-offset-2 ring-offset-card scale-110" : ""}`}
                                        style={{ backgroundColor: scheme.color }}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                    <button
                        onClick={() => setShowColorPicker(!showColorPicker)}
                        className="flex items-center justify-center p-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors border border-black/5 dark:border-white/5"
                        title="Change Color Theme"
                    >
                        <div className="w-4 h-4 rounded-full border-2 border-current opacity-60" style={{ backgroundColor: COLOR_SCHEMES.find(s => s.id === colorScheme)?.color ?? "#4318FF" }} />
                    </button>
                </div>
            </div>

            {/* Command Palette Trigger */}
            <div className="hidden lg:block px-5 mb-2">
                <button
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors border border-black/5 dark:border-white/5 text-slate-500 dark:text-slate-300 text-xs"
                    onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }))}
                >
                    <Search className="w-3.5 h-3.5" />
                    <span>Jump to...</span>
                    <span className="ml-auto flex items-center text-[10px] bg-black/5 dark:bg-black/40 px-1.5 py-0.5 rounded font-mono opacity-50">
                        <Command className="w-2.5 h-2.5 mr-0.5" /> K
                    </span>
                </button>
            </div>

            {/* Footer */}
            <div className="p-2 lg:p-4 pt-0">
                <div className="relative glass-panel rounded-[14px] p-2 lg:p-3 flex items-center justify-center lg:justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer border border-border">
                    <div className="flex items-center lg:space-x-3">
                        <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                            <div className="w-2 h-2 bg-emerald-400 rounded-full shadow-[0_0_10px_rgba(52,211,153,0.8)] animate-pulse"></div>
                        </div>
                        <div className="hidden lg:flex flex-col items-start overflow-hidden">
                            <p className="text-[13px] font-semibold text-foreground leading-none truncate">Optimal</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-300 font-mono mt-1 leading-none truncate">Status: Secure</p>
                        </div>
                    </div>
                    <Settings className="hidden lg:block w-4 h-4 text-slate-500 dark:text-slate-300 hover:text-foreground transition-colors shrink-0" />
                </div>
            </div>
        </div>
    );
}
