import { motion } from "framer-motion";
import { Moon, Sun, Palette, Shield, RotateCcw, Gauge } from "lucide-react";
import { useAppStore } from "../store/appStore";
import { useTheme } from "../hooks/useTheme";
import { useToast } from "../components/ToastSystem";

const COLOR_SCHEMES = [
    { id: "default", color: "#4318FF", label: "Violet" },
    { id: "teal", color: "#05cd99", label: "Teal" },
    { id: "rose", color: "#f43f5e", label: "Rose" },
    { id: "amber", color: "#f59e0b", label: "Amber" },
    { id: "emerald", color: "#10b981", label: "Emerald" },
    { id: "violet", color: "#8b5cf6", label: "Purple" },
] as const;

function SettingSection({ icon: Icon, title, description, children }: {
    icon: React.ElementType; title: string; description: string; children: React.ReactNode;
}) {
    return (
        <div className="bento-card p-6 space-y-5">
            <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                    <h3 className="text-[15px] font-bold text-foreground">{title}</h3>
                    <p className="text-[13px] text-slate-500 mt-0.5 leading-relaxed">{description}</p>
                </div>
            </div>
            <div className="space-y-4 pl-14">{children}</div>
        </div>
    );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
    return (
        <label className="flex items-center justify-between group cursor-pointer">
            <span className="text-[13px] font-medium text-slate-300 group-hover:text-foreground transition-colors">{label}</span>
            <button
                onClick={() => onChange(!checked)}
                className={`relative w-[42px] h-[24px] rounded-full transition-colors ${checked ? "bg-primary" : "bg-white/10 border border-border"}`}
            >
                <motion.div
                    className="w-[20px] h-[20px] rounded-full bg-white shadow-sm absolute top-[2px]"
                    animate={{ left: checked ? "calc(100% - 22px)" : "2px" }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
            </button>
        </label>
    );
}

function SelectOption({ value, options, onChange, label }: {
    value: string | number; options: { label: string; value: string | number }[]; onChange: (v: any) => void; label: string;
}) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-slate-300">{label}</span>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="bg-white/5 border border-border rounded-lg px-3 py-1.5 text-[12px] font-medium text-foreground outline-none focus:border-primary/40 transition-colors appearance-none cursor-pointer"
            >
                {options.map(o => (
                    <option key={o.value} value={o.value} className="bg-[#1a1a2e]">{o.label}</option>
                ))}
            </select>
        </div>
    );
}

export function SettingsPage() {
    const { userSettings, updateSettings } = useAppStore();
    const { theme, setTheme, colorScheme, setColorScheme } = useTheme();
    const { addToast } = useToast();

    const handleResetDefaults = () => {
        updateSettings({
            expertModeEnabled: false,
            autoRefreshVitals: true,
            autoRefreshIntervalMs: 3000,
            showDeployConfirmation: true,
        });
        setTheme("dark");
        setColorScheme("default");
        addToast({ type: "success", title: "Settings reset to defaults" });
    };

    return (
        <div className="space-y-6 pb-12 max-w-3xl">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-end justify-between"
            >
                <div>
                    <h2 className="text-3xl font-black tracking-tight text-foreground">
                        <span className="text-gradient">Settings</span>
                    </h2>
                    <p className="text-slate-500 mt-2 text-[15px] font-medium leading-relaxed">
                        Customize your WinOpt Pro experience.
                    </p>
                </div>
                <button
                    onClick={handleResetDefaults}
                    className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium text-slate-400 hover:text-foreground hover:bg-white/5 rounded-lg transition-colors"
                >
                    <RotateCcw className="w-3.5 h-3.5" /> Reset Defaults
                </button>
            </motion.div>

            <div className="space-y-4">
                {/* Appearance */}
                <SettingSection icon={Palette} title="Appearance" description="Theme, color scheme, and visual preferences.">
                    <div className="flex items-center justify-between">
                        <span className="text-[13px] font-medium text-slate-300">Theme</span>
                        <div className="flex gap-2 bg-white/[0.02] border border-border rounded-xl p-1">
                            <button
                                onClick={() => setTheme("dark")}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${theme === "dark" ? "bg-primary/15 text-primary border border-primary/20" : "text-slate-500 hover:text-foreground"
                                    }`}
                            >
                                <Moon className="w-3.5 h-3.5" /> Dark
                            </button>
                            <button
                                onClick={() => setTheme("light")}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${theme === "light" ? "bg-primary/15 text-primary border border-primary/20" : "text-slate-500 hover:text-foreground"
                                    }`}
                            >
                                <Sun className="w-3.5 h-3.5" /> Light
                            </button>
                        </div>
                    </div>

                    <div>
                        <span className="text-[13px] font-medium text-slate-300 block mb-3">Accent Color</span>
                        <div className="flex gap-2.5">
                            {COLOR_SCHEMES.map(scheme => (
                                <button
                                    key={scheme.id}
                                    title={scheme.label}
                                    onClick={() => setColorScheme(scheme.id as any)}
                                    className={`w-7 h-7 rounded-full transition-all hover:scale-110 active:scale-95 ${colorScheme === scheme.id
                                        ? "ring-2 ring-white/40 ring-offset-2 ring-offset-card scale-110"
                                        : "opacity-60 hover:opacity-100"
                                        }`}
                                    style={{ backgroundColor: scheme.color }}
                                />
                            ))}
                        </div>
                    </div>
                </SettingSection>

                {/* System Monitoring */}
                <SettingSection icon={Gauge} title="System Monitoring" description="Configure live telemetry behavior.">
                    <Toggle
                        checked={userSettings.autoRefreshVitals}
                        onChange={(v) => updateSettings({ autoRefreshVitals: v })}
                        label="Auto-refresh system vitals"
                    />
                    <SelectOption
                        value={userSettings.autoRefreshIntervalMs}
                        onChange={(v: string) => updateSettings({ autoRefreshIntervalMs: parseInt(v) })}
                        label="Refresh interval"
                        options={[
                            { label: "1 second", value: 1000 },
                            { label: "3 seconds", value: 3000 },
                            { label: "5 seconds", value: 5000 },
                            { label: "10 seconds", value: 10000 },
                        ]}
                    />
                </SettingSection>

                {/* Safety */}
                <SettingSection icon={Shield} title="Safety & Execution" description="Control how tweaks are deployed.">
                    <Toggle
                        checked={userSettings.showDeployConfirmation}
                        onChange={(v) => updateSettings({ showDeployConfirmation: v })}
                        label="Show confirmation before deploying"
                    />
                    <Toggle
                        checked={userSettings.expertModeEnabled}
                        onChange={(v) => updateSettings({ expertModeEnabled: v })}
                        label="Expert mode (show advanced/Red tweaks)"
                    />
                </SettingSection>
            </div>
        </div>
    );
}
