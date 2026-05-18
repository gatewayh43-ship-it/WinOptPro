import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Palette, Shield, RotateCcw, Gauge, AlertTriangle, X, Sparkles, Loader2, Archive, Upload, Download, Info, Settings, Lock, Trash2 } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "../store/appStore";
import { useTheme, ThemeName } from "../hooks/useTheme";
import { useToast } from "../components/ToastSystem";
import { useBackup } from "../hooks/useBackup";
import { useSystemVitals } from "@/hooks/useSystemVitals";
import { ConfirmDeployModal } from "@/components/ConfirmDeployModal";

const AI_MODELS = [
    { id: 'qwen2.5:0.5b', label: 'Qwen 2.5 0.5B — Any PC', size: '~400MB', minRamGb: 2, minVramGb: 0 },
    { id: 'qwen2.5:1.5b', label: 'Qwen 2.5 1.5B — Low End', size: '~1GB', minRamGb: 4, minVramGb: 0 },
    { id: 'llama3.2:1b', label: 'Llama 3.2 1B — Low End', size: '~1.3GB', minRamGb: 4, minVramGb: 0 },
    { id: 'qwen2.5:3b', label: 'Qwen 2.5 3B — Mid Range', size: '~2GB', minRamGb: 6, minVramGb: 4 },
    { id: 'qwen2.5:7b', label: 'Qwen 2.5 7B — Mid Range', size: '~4.5GB', minRamGb: 8, minVramGb: 6 },
    { id: 'qwen2.5:14b', label: 'Qwen 2.5 14B — High End', size: '~9GB', minRamGb: 16, minVramGb: 8 },
] as const;

const THEMES = [
    // Classic Dark
    { id: "dark",          label: "Default",  group: "classic-dark"  as const, color: "#3b82f6" },
    { id: "dark-teal",     label: "Teal",     group: "classic-dark"  as const, color: "#05cd99" },
    { id: "dark-rose",     label: "Rose",     group: "classic-dark"  as const, color: "#f43f5e" },
    { id: "dark-amber",    label: "Amber",    group: "classic-dark"  as const, color: "#f59e0b" },
    { id: "dark-emerald",  label: "Emerald",  group: "classic-dark"  as const, color: "#10b981" },
    { id: "dark-violet",   label: "Violet",   group: "classic-dark"  as const, color: "#8b5cf6" },
    // Classic Light
    { id: "light",         label: "Default",  group: "classic-light" as const, color: "#4318FF" },
    { id: "light-teal",    label: "Teal",     group: "classic-light" as const, color: "#05cd99" },
    { id: "light-rose",    label: "Rose",     group: "classic-light" as const, color: "#f43f5e" },
    { id: "light-amber",   label: "Amber",    group: "classic-light" as const, color: "#f59e0b" },
    { id: "light-emerald", label: "Emerald",  group: "classic-light" as const, color: "#10b981" },
    { id: "light-violet",  label: "Violet",   group: "classic-light" as const, color: "#8b5cf6" },
    // Design Themes
    { id: "claude",       label: "Claude",    group: "design" as const, color: "#C96A2A",
      description: "Warm minimal",   preview: { bg: "#F7F3EC", card: "#FDFAF5", accent: "#C96A2A" } },
    { id: "fluent",       label: "Fluent",    group: "design" as const, color: "#0078D4",
      description: "Windows 11",     preview: { bg: "#F0F0F0", card: "#FFFFFF",  accent: "#0078D4" } },
    { id: "cyberpunk",    label: "Cyberpunk", group: "design" as const, color: "#22D3EE",
      description: "Dark editorial", preview: { bg: "#050508", card: "#0C0C16",  accent: "#22D3EE" } },
] as const;

function ThemeSwatch({ entry, active, onClick }: {
    entry: { id: string; label: string; color: string };
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            title={entry.label}
            className="flex flex-col items-center gap-1.5 group"
            data-testid={`theme-swatch-${entry.id}`}
        >
            <div
                className={`w-9 h-9 rounded-full border-2 transition-all ${active ? "scale-110" : "hover:scale-105"}`}
                style={{
                    backgroundColor: entry.color,
                    borderColor: active ? entry.color : "transparent",
                    boxShadow: active ? `0 0 0 2px ${entry.color}40` : undefined,
                }}
            />
            <span className={`text-[10px] font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}>
                {entry.label}
            </span>
        </button>
    );
}

function ThemeCard({ entry, active, onClick }: {
    entry: { id: string; label: string; color: string; description?: string; preview?: { bg: string; card: string; accent: string } };
    active: boolean;
    onClick: () => void;
}) {
    const { preview } = entry;
    return (
        <button
            onClick={onClick}
            className={`rounded-xl border-2 p-3 transition-all text-left w-full ${active ? "scale-[1.02]" : "hover:scale-[1.01]"}`}
            style={{
                borderColor: active ? entry.color : "transparent",
                boxShadow: active ? `0 0 0 2px ${entry.color}40` : undefined,
                backgroundColor: preview?.bg ?? "#111",
            }}
            data-testid={`theme-card-${entry.id}`}
        >
            {preview && (
                <div className="flex gap-1.5 mb-2 pointer-events-none">
                    <div className="w-2 rounded-sm flex-shrink-0" style={{ backgroundColor: preview.accent, minHeight: "40px" }} />
                    <div className="flex-1 flex flex-col gap-1">
                        <div className="rounded h-3" style={{ backgroundColor: preview.card, opacity: 0.9 }} />
                        <div className="rounded h-3" style={{ backgroundColor: preview.card, opacity: 0.7 }} />
                    </div>
                </div>
            )}
            <div className="mt-1">
                <div className="text-[11px] font-semibold" style={{ color: entry.color }}>{entry.label}</div>
                {entry.description && (
                    <div className="text-[10px] opacity-60 mt-0.5" style={{ color: preview ? "#fff" : undefined }}>
                        {entry.description}
                    </div>
                )}
            </div>
        </button>
    );
}

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
                    <p className="text-[13px] text-slate-600 dark:text-slate-200 mt-0.5 leading-relaxed">{description}</p>
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
    const [showImportConfirm, setShowImportConfirm] = useState(false);
    const [pendingImportPath, setPendingImportPath] = useState<string>("");

    return (
        <SettingSection icon={Archive} title="Backup & Restore" description="Export your applied tweaks and settings to a .winopt file, or restore from a previous backup.">
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[13px] font-semibold text-slate-300">Export Backup</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-300 mt-0.5">
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
                            className="text-[11px] text-slate-500 dark:text-slate-300 hover:text-foreground transition-colors font-medium"
                        >
                            {showImport ? "Hide" : "Show"}
                        </button>
                    </div>
                    {showImport && (
                        <div className="flex gap-2 mt-2">
                            <input
                                value={importPath}
                                onChange={e => setImportPath(e.target.value)}
                                disabled={showImportConfirm}
                                placeholder="C:\path\to\backup.winopt"
                                className="flex-1 bg-surface border border-border rounded-lg px-3 py-1.5 text-[12px] font-mono text-foreground placeholder:text-slate-600 focus:outline-none focus:border-primary/50 disabled:opacity-50"
                            />
                            <button
                                onClick={() => {
                                    setPendingImportPath(importPath);
                                    setShowImportConfirm(true);
                                }}
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
            <ConfirmDeployModal
                isOpen={showImportConfirm}
                tweaks={[{
                    id: "import-backup",
                    name: "Import Backup — Overwrites Current Settings",
                    riskLevel: "Yellow",
                    execution: { code: `Import-WinOptBackup -Path "${pendingImportPath}"`, revertCode: "" },
                }]}
                onConfirm={() => {
                    setShowImportConfirm(false);
                    importBackup(pendingImportPath);
                }}
                onCancel={() => setShowImportConfirm(false)}
            />
        </SettingSection>
    );
}

function DataPrivacySection() {
    const { addToast } = useToast();
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const store = useAppStore();
    const consentAccepted = !!localStorage.getItem('consent-accepted');

    const handleExportAuditLog = async () => {
        try {
            const date = new Date().toISOString().slice(0, 10);
            const path = `C:\\Users\\Public\\Documents\\WinOpt-audit-log-${date}.json`;
            await invoke('export_user_data', {
                path,
                settingsJson: JSON.stringify(store.userSettings),
            });
            addToast({ type: 'success', title: 'Audit log exported', message: `Saved to: ${path}` });
        } catch (e) {
            addToast({ type: 'error', title: 'Export failed', message: String(e) });
        }
    };

    const handleClearAuditLog = async () => {
        try {
            await invoke('clear_tweak_history');
            addToast({ type: 'success', title: 'Audit log cleared', message: 'Your audit log has been cleared.' });
        } catch {
            addToast({ type: 'info', title: 'Audit log cleared', message: 'Local history cleared.' });
        }
        setShowClearConfirm(false);
    };

    return (
        <SettingSection icon={Lock} title="Data & Privacy" description="Manage your local audit log and consent preferences.">
            <div className="space-y-4">
                {/* Consent status */}
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[13px] font-semibold text-slate-300">Consent Status</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-300 mt-0.5">
                            Your data processing consent preference
                        </p>
                    </div>
                    <span className={`text-[12px] font-semibold px-2.5 py-1 rounded-full ${consentAccepted ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                        {consentAccepted ? 'Consent accepted' : 'Consent not given'}
                    </span>
                </div>

                <div className="border-t border-border/50 pt-4 space-y-3">
                    {/* Export audit log */}
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[13px] font-semibold text-slate-300">Export Audit Log</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-300 mt-0.5">
                                Download a copy of all recorded tweak actions
                            </p>
                        </div>
                        <button
                            onClick={handleExportAuditLog}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary text-[12px] font-bold transition-colors"
                        >
                            <Download className="w-3.5 h-3.5" />
                            Export
                        </button>
                    </div>

                    {/* Clear audit log */}
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[13px] font-semibold text-slate-300">Clear Audit Log</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-300 mt-0.5">
                                Permanently delete all locally stored tweak history
                            </p>
                        </div>
                        {showClearConfirm ? (
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] text-amber-400 font-medium">Are you sure?</span>
                                <button
                                    onClick={() => setShowClearConfirm(false)}
                                    className="px-3 py-1.5 text-[12px] rounded-lg border border-border text-slate-400 hover:text-foreground hover:bg-white/5 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleClearAuditLog}
                                    className="px-3 py-1.5 text-[12px] rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 font-bold transition-colors"
                                >
                                    Confirm
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowClearConfirm(true)}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-[12px] font-bold transition-colors"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                Clear
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </SettingSection>
    );
}

export function SettingsPage({ onTriggerGuide }: { onTriggerGuide?: () => void }) {
    const { userSettings, updateSettings } = useAppStore();
    const { theme, setTheme } = useTheme();
    const { addToast } = useToast();
    const { vitals: systemVitals } = useSystemVitals();
    const [showExpertConfirm, setShowExpertConfirm] = useState(false);
    const [isDownloadingAI, setIsDownloadingAI] = useState(false);
    const [aiDownloadStatus, setAiDownloadStatus] = useState("");
    const [selectedModel, setSelectedModel] = useState(
        () => localStorage.getItem('ai-model') ?? 'qwen2.5:1.5b'
    );
    const [currentModel, setCurrentModel] = useState(selectedModel);
    const [isApplyingModel, setIsApplyingModel] = useState(false);

    const handleApplyModel = async () => {
        if (!AI_MODELS.some(m => m.id === selectedModel)) return;
        setIsApplyingModel(true);
        try {
            await invoke('pull_model', { model: selectedModel });
            localStorage.setItem('ai-model', selectedModel);
            setCurrentModel(selectedModel);
            addToast({ type: 'success', title: 'Model updated', message: `AI model set to ${selectedModel}` });
        } catch (e) {
            addToast({ type: 'error', title: 'Model download failed', message: `Failed to download model: ${String(e)}` });
        } finally {
            setIsApplyingModel(false);
        }
    };

    const handleAIToggle = async (enable: boolean) => {
        if (!enable) {
            updateSettings({ aiAssistantEnabled: false });
            try { await invoke("stop_ollama"); } catch (e) { }
            return;
        }

        const modelToUse = selectedModel;
        let ollamaStarted = false;
        setIsDownloadingAI(true);
        setAiDownloadStatus("Downloading portable Ollama backend (~60MB)...");
        try {
            await invoke("download_ollama");
            setAiDownloadStatus("Starting AI Daemon...");
            await invoke("start_ollama");
            ollamaStarted = true;
            setAiDownloadStatus(`Pulling ${modelToUse} model (~1-2GB). This may take a few minutes...`);
            await invoke("pull_model", { model: modelToUse });

            updateSettings({ aiAssistantEnabled: true });
            addToast({ type: "success", title: "AI Assistant Ready", message: `Ollama and ${modelToUse} installed successfully.` });
        } catch (err: any) {
            addToast({ type: "error", title: "AI Setup Failed", message: err.toString() });
            updateSettings({ aiAssistantEnabled: false });
            if (ollamaStarted) {
                try { await invoke("stop_ollama"); } catch (e) { }
            }
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
        localStorage.removeItem("ai-model");
        setSelectedModel("qwen2.5:1.5b");
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
                        <p className="text-[13px] text-slate-600 dark:text-slate-300 mt-1">
                            Customize your WinOpt Pro experience
                        </p>
                    </div>
                    <button
                        onClick={handleResetDefaults}
                        className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium text-slate-500 dark:text-slate-300 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
                    >
                        <RotateCcw className="w-3.5 h-3.5" /> Reset Defaults
                    </button>
                </motion.div>

                <div className="space-y-4">
                    {/* Appearance */}
                    <SettingSection icon={Palette} title="Appearance" description="Theme, color scheme, and visual preferences.">
                        {/* Classic Dark row */}
                        <div className="mb-4">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Classic Dark</p>
                            <div className="flex flex-wrap gap-3">
                                {THEMES.filter(t => t.group === "classic-dark").map(t => (
                                    <ThemeSwatch
                                        key={t.id}
                                        entry={t}
                                        active={theme === t.id}
                                        onClick={() => setTheme(t.id as ThemeName)}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Classic Light row */}
                        <div className="mb-4">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Classic Light</p>
                            <div className="flex flex-wrap gap-3">
                                {THEMES.filter(t => t.group === "classic-light").map(t => (
                                    <ThemeSwatch
                                        key={t.id}
                                        entry={t}
                                        active={theme === t.id}
                                        onClick={() => setTheme(t.id as ThemeName)}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Design Themes grid */}
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Design Themes</p>
                            <div className="grid grid-cols-3 gap-3">
                                {THEMES.filter(t => t.group === "design").map(t => (
                                    <ThemeCard
                                        key={t.id}
                                        entry={t as any}
                                        active={theme === t.id}
                                        onClick={() => setTheme(t.id as ThemeName)}
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
                        {userSettings.aiAssistantEnabled && (
                            <div className="mt-4 space-y-3 pl-1 border-l-2 border-primary/20">
                                <div>
                                    <h4 className="text-sm font-semibold text-foreground mb-1">AI Model</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                                        Your PC: {systemVitals?.ram?.totalMb ? `${(systemVitals.ram.totalMb / 1024).toFixed(0)}GB` : '?'}GB RAM
                                        {systemVitals?.gpu?.vramMb
                                            ? ` · ${(systemVitals.gpu.vramMb / 1024).toFixed(1)}GB GPU VRAM`
                                            : ' · No discrete GPU'}
                                    </p>
                                    <div className="space-y-2">
                                        {AI_MODELS.map(m => {
                                            const ramGb = (systemVitals?.ram?.totalMb ?? 0) / 1024;
                                            const vramGb = (systemVitals?.gpu?.vramMb ?? 0) / 1024;
                                            const compatible = ramGb >= m.minRamGb || vramGb >= m.minVramGb;
                                            return (
                                                <label
                                                    key={m.id}
                                                    className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                                                        !compatible ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white/5'
                                                    } ${selectedModel === m.id ? 'bg-primary/10 border border-primary/20' : ''}`}
                                                    title={!compatible ? `Requires ${m.minRamGb}GB RAM or ${m.minVramGb}GB VRAM` : ''}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="ai-model"
                                                        value={m.id}
                                                        disabled={!compatible}
                                                        checked={selectedModel === m.id}
                                                        onChange={() => setSelectedModel(m.id)}
                                                        className="accent-primary"
                                                    />
                                                    <span className="text-sm text-foreground flex-1">{m.label}</span>
                                                    <span className="text-xs text-slate-500 dark:text-slate-400">{m.size}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                    <button
                                        onClick={handleApplyModel}
                                        disabled={isApplyingModel || selectedModel === currentModel}
                                        className="mt-3 flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary text-[12px] font-bold transition-colors disabled:opacity-50"
                                    >
                                        {isApplyingModel ? 'Downloading...' : 'Apply Model'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </SettingSection>

                    {/* Backup & Restore */}
                    <BackupSection />

                    {/* Data & Privacy */}
                    <DataPrivacySection />

                    {/* About */}
                    <SettingSection icon={Info} title="About WinOpt Pro" description="Version information and project details.">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">Version</span>
                                <span className="text-[12px] font-mono text-slate-500 dark:text-slate-200 bg-black/5 dark:bg-white/5 border border-border px-2 py-1 rounded-lg">1.0.0</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">Built with</span>
                                <span className="text-[12px] text-slate-600 dark:text-slate-300">Tauri 2 · React 19 · Rust</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">Total tweaks</span>
                                <span className="text-[12px] font-mono text-slate-500 dark:text-slate-200">162 registry &amp; system tweaks</span>
                            </div>
                            <div className="pt-1 border-t border-border/50">
                                <p className="text-[11px] text-slate-600 leading-relaxed">
                                    WinOpt Pro is a Windows system optimizer designed for power users and enthusiasts. Always create a restore point before applying system tweaks.
                                </p>
                            </div>
                            <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                                <div>
                                    <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">Setup Guide</p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-300 mt-0.5">Restarts the first-run setup guide</p>
                                </div>
                                <button
                                    onClick={() => {
                                        localStorage.removeItem("onboardingComplete");
                                        onTriggerGuide?.();
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
                                        className="p-2 rounded-lg hover:bg-white/5 text-slate-500 dark:text-slate-300 hover:text-white transition-colors"
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
                                    <p className="text-[13px] text-slate-500 dark:text-slate-300 mt-3 leading-relaxed">
                                        Only enable this if you understand the risks and have a system restore point ready.
                                    </p>
                                </div>
                                <div className="px-6 py-4 border-t border-white/10 flex items-center justify-end gap-3">
                                    <button
                                        onClick={() => setShowExpertConfirm(false)}
                                        className="px-4 py-2 text-sm font-medium rounded-lg text-slate-400 dark:text-slate-200 hover:text-white hover:bg-white/5 transition-colors"
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
