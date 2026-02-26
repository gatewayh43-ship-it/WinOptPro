import { useState } from "react";
import { Search, Command, Moon, Sun, Zap, Settings, Gamepad2, Clock, Layers, BatteryMedium, Trash2, MonitorCog, RefreshCcw, Power } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "../../hooks/useTheme";

// Import Flaticon/Nano vector assets
import dashIcon from "../../assets/icons/dashboard-flaticon.svg";
import perfIcon from "../../assets/icons/performance-flaticon.svg";
import privIcon from "../../assets/icons/privacy-flaticon.svg";
import netIcon from "../../assets/icons/network-flaticon.svg";

const COLOR_SCHEMES = [
    { id: "default", color: "#4318FF", label: "Violet" },
    { id: "teal", color: "#05cd99", label: "Teal" },
    { id: "rose", color: "#f43f5e", label: "Rose" },
    { id: "amber", color: "#f59e0b", label: "Amber" },
    { id: "emerald", color: "#10b981", label: "Emerald" },
] as const;

// Nav items grouped by section
interface NavItem {
    id: string;
    label: string;
    icon?: string;        // SVG asset path
    lucideIcon?: React.ElementType; // Lucide fallback
}

const mainNavItems: NavItem[] = [
    { id: "dashboard", label: "Overview", icon: dashIcon },
    { id: "performance", label: "Performance", icon: perfIcon },
    { id: "privacy", label: "Privacy", icon: privIcon },
    { id: "gaming", label: "Gaming", lucideIcon: Gamepad2 },
    { id: "network", label: "Network", icon: netIcon },
    { id: "power", label: "Power", lucideIcon: BatteryMedium },
    { id: "debloat", label: "Debloat", lucideIcon: Trash2 },
    { id: "windowsui", label: "Windows UI", lucideIcon: MonitorCog },
    { id: "windowsupdate", label: "Updates", lucideIcon: RefreshCcw },
];

const utilNavItems: NavItem[] = [
    { id: "startup", label: "Startup Apps", lucideIcon: Power },
    { id: "profiles", label: "Profiles", lucideIcon: Layers },
    { id: "history", label: "History", lucideIcon: Clock },
    { id: "settings", label: "Settings", lucideIcon: Settings },
];

export function Sidebar({ currentView, setView }: { currentView: string, setView: (s: string) => void }) {
    const { theme, setTheme, colorScheme, setColorScheme } = useTheme();
    const [showColorPicker, setShowColorPicker] = useState(false);

    const renderNavItem = (item: NavItem) => {
        const isActive = currentView === item.id;
        return (
            <button
                key={item.id}
                title={item.label}
                onClick={() => setView(item.id)}
                className={`relative w-full flex items-center justify-center lg:justify-start space-x-0 lg:space-x-3 px-3 py-2.5 rounded-[12px] transition-all duration-200 group outline-none ${isActive
                    ? "text-primary bg-primary/10 border border-primary/20"
                    : "text-slate-500 hover:text-foreground hover:bg-white/5"
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
                    {item.icon ? (
                        <img
                            src={item.icon}
                            alt={item.label}
                            className="w-5 h-5 opacity-80 group-hover:opacity-100 transition-opacity drop-shadow-sm"
                            style={{ filter: isActive ? 'drop-shadow(0 0 4px var(--primary)) brightness(1.2)' : 'grayscale(100%)' }}
                        />
                    ) : item.lucideIcon ? (
                        <item.lucideIcon className={`w-5 h-5 transition-opacity ${isActive ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}`} strokeWidth={1.8} />
                    ) : null}
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
                    WinOpt<span className="text-slate-400 font-medium">Pro</span>
                </h1>
            </div>

            {/* Search / Command Menu Trigger */}
            <div className="px-2 lg:px-5 mb-6">
                <button
                    onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
                    className="w-full flex items-center justify-center lg:justify-between px-3 py-2 bg-black/5 dark:bg-white/[0.03] hover:bg-black/10 dark:hover:bg-white/[0.06] border border-border rounded-xl text-sm text-slate-400 transition-colors"
                >
                    <span className="flex items-center"><Search className="w-4 h-4 lg:mr-2" /> <span className="hidden lg:inline">Jump to...</span></span>
                    <span className="hidden lg:flex items-center text-[10px] bg-black/5 dark:bg-black/40 px-1.5 py-0.5 rounded shadow-inner font-mono font-medium border border-border">
                        <Command className="w-3 h-3 mr-0.5" /> K
                    </span>
                </button>
            </div>

            {/* Navigation */}
            <div className="flex-1 px-2 lg:px-3 overflow-y-auto custom-scrollbar space-y-6">
                {/* System Tuning section */}
                <div>
                    <p className="hidden lg:block px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 select-none">System Tuning</p>
                    <nav className="space-y-1">
                        {mainNavItems.map(renderNavItem)}
                    </nav>
                </div>

                {/* Utilities section */}
                <div>
                    <p className="hidden lg:block px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 select-none">Utilities</p>
                    <nav className="space-y-1">
                        {utilNavItems.map(renderNavItem)}
                    </nav>
                </div>
            </div>

            {/* Theme Controls */}
            <div className="px-2 lg:px-5 mb-4 flex flex-col lg:flex-row lg:grid lg:grid-cols-2 gap-2">
                <button
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="flex items-center justify-center p-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors border border-black/5 dark:border-white/5"
                    title="Toggle Theme"
                >
                    {theme === "dark" ? <Sun className="w-4 h-4 text-slate-400" /> : <Moon className="w-4 h-4 text-slate-500" />}
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

            {/* Footer */}
            <div className="p-2 lg:p-4 pt-0">
                <div className="relative glass-panel rounded-[14px] p-2 lg:p-3 flex items-center justify-center lg:justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer border border-border">
                    <div className="flex items-center lg:space-x-3">
                        <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                            <div className="w-2 h-2 bg-emerald-400 rounded-full shadow-[0_0_10px_rgba(52,211,153,0.8)] animate-pulse"></div>
                        </div>
                        <div className="hidden lg:flex flex-col items-start overflow-hidden">
                            <p className="text-[13px] font-semibold text-foreground leading-none truncate">Optimal</p>
                            <p className="text-[10px] text-slate-500 font-mono mt-1 leading-none truncate">Status: Secure</p>
                        </div>
                    </div>
                    <Settings className="hidden lg:block w-4 h-4 text-slate-500 hover:text-foreground transition-colors shrink-0" />
                </div>
            </div>
        </div>
    );
}
