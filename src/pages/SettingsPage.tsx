import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Moon, Sun, Palette, Shield, RotateCcw, Gauge, AlertTriangle, X, Sparkles, Loader2, Archive, Upload, Download, Info, Settings } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "../store/appStore";
import { useTheme } from "../hooks/useTheme";
import { useToast } from "../components/ToastSystem";
import { useBackup } from "../hooks/useBackup";

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
                    <p className="text-[13px] text-slate-600 dark:text-slate-500 mt-0.5 leading-relaxed">{description}</p>
                </div>
            </div>
            <div className="space-y-4 pl-14">{children}</div>
        </div>
    );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
    return (
        <label className="flex items-center justify-between group cursor-pointer">
            <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300 group-hover:text-foreground transition-colors">{label}</span>
            <button
                onClick={() => onChange(!checked)}
                className={`relative w-[42px] h-[24px] rounded-full transition-colors ${checked ? "bg-primary" : "bg-black/10 dark:bg-white/10 border border-border"}`}
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
            <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">{label}</span>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="bg-white/5 border border-border rounded-lg px-3 py-1.5 text-[12px] font-medium text-foreground outline-none focus:border-primary/40 transition-colors appearance-none cursor-pointer"
            >
                {options.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                ))}
            </select>
        </div>
    );
}

function BackupSection() {
    const { isExporting, isImporting, lastBackupTime, importPath, setImportPath, exportBackup, importBackup } = useBackup();
    const [showImport, setShowImport] = useState(false);

    return (
        <SettingSection icon={Archive} title="Backup & Restore" description="Export your applied tweaks and settings to a .winopt file, or restore from a previous backup.">
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[13px] font-semibold text-slate-300">Export Backup</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                            {lastBackupTime ? `Last backup: ${lastBackupTime}` : "No backup taken yet"}
                        </p>
                    </div>
                    <button
                        onClick={() => exportBackup()}
                        disabled={isExporting}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary text-[12px] font-bold transition-colors disabled:opacity-50"
                    >
                        {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                        Export
                    </button>
                </div>

                <div className="border-t border-border/50 pt-4">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-[13px] font-semibold text-slate-300">Import Backup</p>
                        <button
                            onClick={() => setShowImport(v => !v)}
                            className="text-[11px] text-slate-500 hover:text-foreground transition-colors font-medium"
                        >
                            {showImport ? "Hide" : "Show"}
                        </button>
                    </div>
                    {showImport && (
                        <div className="flex gap-2 mt-2">
                            <input
                                value={importPath}
                                onChange={e => setImportPath(e.target.value)}
                                placeholder="C:\path\to\backup.winopt"
                                className="flex-1 bg-surface border border-border rounded-lg px-3 py-1.5 text-[12px] font-mono text-foreground placeholder:text-slate-600 focus:outline-none focus:border-primary/50"
                            />
                            <button
                                onClick={() => importBackup()}
                                disabled={isImporting || !importPath.trim()}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 text-[12px] font-bold transition-colors disabled:opacity-50"
                            >
                                {isImporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                                Restore
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </SettingSection>
    );
}

export function SettingsPage() {
    const { userSettings, updateSettings } = useAppStore();
    const { theme, setTheme, colorScheme, setColorScheme } = useTheme();
    const { addToast } = useToast();
    const [showExpertConfirm, setShowExpertConfirm] = useState(false);
    const [isDownloadingAI, setIsDownloadingAI] = useState(false);
    const [aiDownloadStatus, setAiDownloadStatus] = useState("");

    const handleAIToggle = async (enable: boolean) => {
        if (!enable) {
            updateSettings({ aiAssistantEnabled: false });
            try { await invoke("stop_ollama"); } catch (e) { }
            return;
        }

        setIsDownloadingAI(true);
        setAiDownloadStatus("Downloading portable Ollama backend (~60MB)...");
        try {
            await invoke("download_ollama");
            setAiDownloadStatus("Starting AI Daemon...");
            await invoke("start_ollama");
            setAiDownloadStatus("Pulling Qwen 2.5 1.5B Model (~1.5GB). This may take a few minutes...");
            await invoke("pull_model");

            updateSettings({ aiAssistantEnabled: true });
            addToast({ type: "success", title: "AI Assistant Ready", message: "Ollama and Qwen 2.5 installed successfully." });
        } catch (err: any) {
            addToast({ type: "error", title: "AI Setup Failed", message: err.toString() });
            updateSettings({ aiAssistantEnabled: false });
        } finally {
            setIsDownloadingAI(false);
            setAiDownloadStatus("");
        }
    };

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
        <>
            <div className="space-y-6 pt-2 pb-12 max-w-5xl">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-end justify-between"
                >
                    <div>
                        <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                                <Settings className="w-4 h-4 text-primary" strokeWidth={1.8} />
                            </div>
                            Settings
                        </h2>
                        <p className="text-[13px] text-slate-600 dark:text-slate-500 mt-1">
                            Customize your WinOpt Pro experience
                        </p>
                    </div>
                    <button
                        onClick={handleResetDefaults}
                        className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium text-slate-500 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
                    >
                        <RotateCcw className="w-3.5 h-3.5" /> Reset Defaults
                    </button>
                </motion.div>

                <div className="space-y-4">
                    {/* Appearance */}
                    <SettingSection icon={Palette} title="Appearance" description="Theme, color scheme, and visual preferences.">
                        <div className="flex items-center justify-between">
                            <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">Theme</span>
                            <div className="flex gap-2 bg-black/5 dark:bg-white/[0.02] border border-border rounded-xl p-1">
                                <button
                                    onClick={() => setTheme("dark")}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${theme === "dark" ? "bg-primary/20 dark:bg-primary/15 text-primary border border-primary/20" : "text-slate-500 hover:text-foreground"
                                        }`}
                                >
                                    <Moon className="w-3.5 h-3.5" /> Dark
                                </button>
                                <button
                                    onClick={() => setTheme("light")}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${theme === "light" ? "bg-primary/20 dark:bg-primary/15 text-primary border border-primary/20" : "text-slate-500 hover:text-foreground"
                                        }`}
                                >
                                    <Sun className="w-3.5 h-3.5" /> Light
                                </button>
                            </div>
                        </div>

                        <div>
                            <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300 block mb-3">Accent Color</span>
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
                            onChange={(v) => {
                                if (v) {
                                    setShowExpertConfirm(true);
                                } else {
                                    updateSettings({ expertModeEnabled: false });
                                }
                            }}
                            label="Expert mode (show advanced/Red tweaks)"
                        />
                    </SettingSection>

                    {/* AI Assistant */}
                    <SettingSection icon={Sparkles} title="Pro AI Assistant" description="Experiment with an agentic local AI to analyze your system and apply tweaks automatically.">
                        <Toggle
                            checked={userSettings.aiAssistantEnabled}
                            onChange={handleAIToggle}
                            label="Enable AI Assistant (Requires ~1.5GB Model Download)"
                        />
                        {isDownloadingAI && (
                            <div className="flex items-center gap-3 mt-4 px-4 py-3 bg-primary/10 border border-primary/20 rounded-xl">
                                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                <span className="text-[12px] font-medium text-primary">{aiDownloadStatus}</span>
                            </div>
                        )}
                    </SettingSection>

                    {/* Backup & Restore */}
                    <BackupSection />

                    {/* About */}
                    <SettingSection icon={Info} title="About WinOpt Pro" description="Version information and project details.">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">Version</span>
                                <span className="text-[12px] font-mono text-slate-500 dark:text-slate-400 bg-black/5 dark:bg-white/5 border border-border px-2 py-1 rounded-lg">1.0.0</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">Built with</span>
                                <span className="text-[12px] text-slate-600 dark:text-slate-500">Tauri 2 · React 19 · Rust</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">Total tweaks</span>
                                <span className="text-[12px] font-mono text-slate-500 dark:text-slate-400">162 registry &amp; system tweaks</span>
                            </div>
                            <div className="pt-1 border-t border-border/50">
                                <p className="text-[11px] text-slate-600 leading-relaxed">
                                    WinOpt Pro is a Windows system optimizer designed for power users and enthusiasts. Always create a restore point before applying system tweaks.
                                </p>
                            </div>
                            <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                                <div>
                                    <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">Setup Guide</p>
                                    <p className="text-[11px] text-slate-500 mt-0.5">Restarts the first-run setup guide</p>
                                </div>
                                <button
                                    onClick={() => {
                                        localStorage.removeItem("onboardingComplete");
                                        window.location.reload();
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-black/[0.03] dark:bg-white/[0.03] hover:bg-black/[0.07] dark:hover:bg-white/[0.07] text-slate-700 dark:text-slate-300 hover:text-foreground text-[12px] font-semibold transition-colors"
                                >
                                    View Setup Guide
                                </button>
                            </div>
                        </div>
                    </SettingSection>
                </div>
            </div>

            {/* Expert Mode Confirmation Modal */}
            <AnimatePresence>
                {showExpertConfirm && (
                    <>
                        <motion.div
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowExpertConfirm(false)}
                        />
                        <motion.div
                            className="fixed inset-0 z-50 flex items-center justify-center p-4"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                        >
                            <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl shadow-2xl max-w-md w-full">
                                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
                                            <AlertTriangle className="w-5 h-5 text-red-400" />
                                        </div>
                                        <h2 className="text-lg font-bold text-white">Expert Mode Warning</h2>
                                    </div>
                                    <button
                                        onClick={() => setShowExpertConfirm(false)}
                                        className="p-2 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="px-6 py-5">
                                    <p className="text-[14px] text-slate-300 leading-relaxed">
                                        Expert Mode enables high-risk tweaks that can affect system stability.
                                        These tweaks are labeled <span className="text-red-400 font-semibold">Red</span> and
                                        carry a higher risk of causing system issues or requiring a restore point.
                                    </p>
                                    <p className="text-[13px] text-slate-500 mt-3 leading-relaxed">
                                        Only enable this if you understand the risks and have a system restore point ready.
                                    </p>
                                </div>
                                <div className="px-6 py-4 border-t border-white/10 flex items-center justify-end gap-3">
                                    <button
                                        onClick={() => setShowExpertConfirm(false)}
                                        className="px-4 py-2 text-sm font-medium rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => {
                                            updateSettings({ expertModeEnabled: true });
                                            setShowExpertConfirm(false);
                                            addToast({ type: "warning", title: "Expert mode enabled", message: "Red-level tweaks are now visible." });
                                        }}
                                        className="px-5 py-2 text-sm font-bold rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30 transition-colors"
                                    >
                                        I Understand, Enable
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
