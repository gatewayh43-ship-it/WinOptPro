import { useState } from "react";
import { Terminal, Monitor, Package, Settings, Plus, Trash2, Star, CheckCircle, AlertTriangle, Save, PowerOff, HelpCircle } from "lucide-react";
import { useWsl, AVAILABLE_DISTROS } from "@/hooks/useWsl";
import type { WslConfig } from "@/hooks/useWsl";
import { WslSetupWizard } from "@/components/WslSetupWizard";

type Tab = "overview" | "distros" | "settings";

const STATE_COLORS: Record<string, string> = {
    Running: "bg-green-500/20 text-green-400 border-green-500/30",
    Stopped: "bg-slate-500/20 text-slate-400 border-slate-500/30",
    Installing: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

export function WslPage() {
    const {
        status,
        config,
        setupState,
        isLoading,
        isActionLoading,
        installingDistro,
        isWizardOpen,
        setIsWizardOpen,
        enableWsl,
        disableWsl,
        installDistro,
        uninstallDistro,
        setDefaultDistro,
        setDefaultVersion,
        cleanUninstall,
        saveConfig,
        shutdownWsl,
        launchLinuxMode,
    } = useWsl();

    const [activeTab, setActiveTab] = useState<Tab>("overview");
    const [localConfig, setLocalConfig] = useState<WslConfig | null>(null);
    const [confirmCleanUninstall, setConfirmCleanUninstall] = useState(false);

    const cfg = localConfig ?? config;
    const wslSetupComplete = typeof window !== "undefined"
        ? localStorage.getItem("wslSetupComplete")
        : null;

    const handleSaveConfig = () => {
        if (cfg) saveConfig(cfg);
    };

    const updateCfg = (patch: Partial<WslConfig>) => {
        setLocalConfig(prev => ({
            ...(prev ?? config ?? {
                memoryGb: null, processors: null, swapGb: null,
                localhostForwarding: true, networkingMode: "nat",
                dnsTunneling: false, firewall: true, autoProxy: false, guiApplications: true,
            }),
            ...patch,
        }));
    };

    const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
        { id: "overview", label: "Overview", icon: Monitor },
        { id: "distros", label: "Distros", icon: Package },
        { id: "settings", label: "Settings", icon: Settings },
    ];

    return (
        <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Terminal className="w-5 h-5 text-primary" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-foreground">WSL Manager</h1>
                    <p className="text-[13px] text-slate-400">Windows Subsystem for Linux — full lifecycle management</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-border w-fit">
                {tabs.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium transition-colors ${activeTab === t.id
                            ? "bg-primary text-white"
                            : "text-slate-400 hover:text-foreground hover:bg-white/5"
                            }`}
                    >
                        <t.icon className="w-3.5 h-3.5" />
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ── Overview tab ── */}
            {activeTab === "overview" && (
                <div className="flex flex-col gap-5">
                    {/* Status row */}
                    <div className="glass-panel rounded-2xl border border-border p-5 flex flex-wrap items-center gap-3">
                        <span className={`text-[12px] font-semibold px-3 py-1 rounded-full border ${status?.isEnabled
                            ? "bg-green-500/20 text-green-400 border-green-500/30"
                            : "bg-slate-500/20 text-slate-400 border-slate-500/30"
                            }`}>
                            WSL {status?.isEnabled ? "Enabled" : "Disabled"}
                        </span>
                        {status?.wslVersion && (
                            <span className="text-[12px] px-3 py-1 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 font-mono">
                                v{status.wslVersion}
                            </span>
                        )}
                        {status?.kernelVersion && (
                            <span className="text-[12px] px-3 py-1 rounded-full bg-slate-500/10 text-slate-300 border border-slate-500/20 font-mono">
                                kernel {status.kernelVersion}
                            </span>
                        )}
                    </div>

                    {/* Enable / Disable toggle */}
                    <div className="glass-panel rounded-2xl border border-border p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[14px] font-semibold text-foreground">WSL Feature</p>
                                <p className="text-[12px] text-slate-400 mt-0.5">
                                    {status?.isEnabled ? "WSL is currently enabled" : "WSL is currently disabled"}
                                </p>
                            </div>
                            <button
                                onClick={status?.isEnabled ? disableWsl : enableWsl}
                                disabled={isActionLoading || isLoading}
                                className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-colors disabled:opacity-50 ${status?.isEnabled
                                    ? "bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300"
                                    : "bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 text-green-300"
                                    }`}
                            >
                                {isActionLoading ? "..." : status?.isEnabled ? "Disable WSL" : "Enable WSL"}
                            </button>
                        </div>
                    </div>

                    {/* Default WSL version */}
                    <div className="glass-panel rounded-2xl border border-border p-5">
                        <p className="text-[13px] font-semibold text-foreground mb-3">Default WSL Version</p>
                        <div className="flex gap-2">
                            {[1, 2].map(v => (
                                <button
                                    key={v}
                                    onClick={() => setDefaultVersion(v)}
                                    className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-colors ${status?.defaultVersion === v
                                        ? "bg-primary text-white"
                                        : "bg-white/5 text-slate-400 hover:text-foreground hover:bg-white/10 border border-border"
                                        }`}
                                >
                                    WSL {v}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Linux Mode card */}
                    <div className="glass-panel rounded-2xl border border-primary/20 bg-primary/5 p-5">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">🐧</span>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-[14px] font-semibold text-foreground">Linux Mode</p>
                                        <div title="Launch your Linux desktop via WSLg (Windows 11 only)">
                                            <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                                        </div>
                                    </div>
                                    <p className="text-[12px] text-slate-400 mt-0.5">Open your Linux desktop via WSLg</p>
                                    {!setupState?.wslgSupported && (
                                        <p className="text-[11px] text-amber-400 mt-1 flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3" />
                                            Linux Mode requires Windows 11
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                            <button
                                onClick={() => {
                                    if (wslSetupComplete && status?.distros.find(d => d.name === wslSetupComplete)) {
                                        launchLinuxMode(wslSetupComplete, "xfce4");
                                    } else {
                                        setIsWizardOpen(true);
                                    }
                                }}
                                disabled={!setupState?.wslgSupported}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary text-[13px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                🚀 Launch Linux Desktop
                            </button>
                            <button
                                onClick={() => setIsWizardOpen(true)}
                                className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-border text-slate-300 text-[13px] font-medium transition-colors"
                            >
                                <Settings className="w-3.5 h-3.5" />
                                {wslSetupComplete ? "Re-setup" : "Setup"}
                            </button>
                        </div>
                    </div>

                    {/* Danger zone */}
                    <div className="glass-panel rounded-2xl border border-red-500/50 dark:border-red-500/20 bg-red-50 dark:bg-transparent p-5">
                        <p className="text-[13px] font-semibold text-red-600 dark:text-red-400 mb-4">Danger Zone</p>
                        {confirmCleanUninstall ? (
                            <div className="flex flex-col gap-3">
                                <p className="text-[12px] text-slate-700 dark:text-slate-300">
                                    This will <strong className="text-foreground">remove all distros, data, and WSL features</strong>. This cannot be undone. Are you sure?
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={async () => { await cleanUninstall(); setConfirmCleanUninstall(false); }}
                                        className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-sm font-bold text-[12px] transition-colors"
                                    >
                                        Yes, Clean Uninstall WSL
                                    </button>
                                    <button
                                        onClick={() => setConfirmCleanUninstall(false)}
                                        className="px-4 py-2 rounded-xl bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 border border-border text-slate-600 dark:text-slate-300 text-[12px] transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setConfirmCleanUninstall(true)}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-100 dark:bg-red-500/10 hover:bg-red-200 dark:hover:bg-red-500/20 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400 text-[12px] font-semibold transition-colors"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                Clean Uninstall WSL
                            </button>
                        )}
                    </div>
                </div>
            )}

            {activeTab === "distros" && (
                <div className="flex flex-col gap-5">
                    {/* Installed distros */}
                    <div className="glass-panel rounded-2xl border border-border overflow-hidden">
                        <div className="px-5 py-4 border-b border-border">
                            <h2 className="text-[14px] font-semibold text-foreground">Installed Distros</h2>
                        </div>
                        <div className="p-4 flex flex-col gap-3">
                            {!status || status.distros.length === 0 ? (
                                <p className="text-[13px] text-slate-400 py-4">No distros installed.</p>
                            ) : (
                                status.distros.map(distro => (
                                    <div
                                        key={distro.name}
                                        className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-border"
                                    >
                                        <span className="text-xl">🐧</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-[13px] font-semibold text-foreground">{distro.name}</span>
                                                {distro.isDefault && (
                                                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                                )}
                                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-500/20 text-slate-300 border border-slate-500/30">
                                                    WSL{distro.version}
                                                </span>
                                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${STATE_COLORS[distro.state] ?? STATE_COLORS.Stopped}`}>
                                                    {distro.state}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 shrink-0">
                                            {!distro.isDefault && (
                                                <button
                                                    onClick={() => setDefaultDistro(distro.name)}
                                                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-white/5 hover:bg-white/10 text-slate-300 border border-border transition-colors"
                                                >
                                                    Set Default
                                                </button>
                                            )}
                                            <button
                                                onClick={() => uninstallDistro(distro.name)}
                                                className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors"
                                                title="Remove distro"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Available distros */}
                    <div className="glass-panel rounded-2xl border border-border overflow-hidden">
                        <div className="px-5 py-4 border-b border-border">
                            <h2 className="text-[14px] font-semibold text-foreground">Available to Install</h2>
                        </div>
                        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {AVAILABLE_DISTROS.map(distro => {
                                const installedNamesSet = new Set(status?.distros.map(d => d.name) ?? []);
                                const installed = installedNamesSet.has(distro.name.split(" ")[0]) ||
                                    installedNamesSet.has(distro.id);
                                const installing = installingDistro === distro.id;
                                return (
                                    <div
                                        key={distro.id}
                                        className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-border"
                                    >
                                        <span className="text-xl">{distro.emoji}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[12px] font-semibold text-foreground truncate">{distro.name}</p>
                                            <p className="text-[11px] text-slate-500 font-mono">{distro.id}</p>
                                        </div>
                                        {installed ? (
                                            <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3" /> Installed
                                            </span>
                                        ) : (
                                            <button
                                                onClick={() => installDistro(distro.id)}
                                                disabled={!!installingDistro}
                                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 transition-colors disabled:opacity-50"
                                            >
                                                {installing ? (
                                                    <div className="w-3 h-3 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
                                                ) : (
                                                    <Plus className="w-3 h-3" />
                                                )}
                                                Install
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )
            }

            {/* ── Settings tab ── */}
            {
                activeTab === "settings" && (
                    <div className="flex flex-col gap-5">
                        <div className="glass-panel rounded-2xl border border-border overflow-hidden">
                            <div className="px-5 py-4 border-b border-border">
                                <h2 className="text-[14px] font-semibold text-foreground">Global WSL Configuration</h2>
                                <p className="text-[11px] text-slate-400 mt-0.5">Writes to <code className="font-mono">~/.wslconfig</code></p>
                            </div>
                            <div className="p-5 flex flex-col gap-4">
                                {/* Memory */}
                                <SettingRow label="Memory Limit" description="Maximum RAM allocated to WSL2 VM">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            min={1}
                                            max={64}
                                            value={cfg?.memoryGb ?? ""}
                                            onChange={e => updateCfg({ memoryGb: e.target.value ? Number(e.target.value) : null })}
                                            className="w-20 px-2 py-1.5 rounded-lg bg-white/5 border border-border text-[13px] text-foreground text-right focus:outline-none focus:border-primary"
                                            placeholder="8"
                                        />
                                        <span className="text-[12px] text-slate-400">GB</span>
                                    </div>
                                </SettingRow>

                                {/* Processors */}
                                <SettingRow label="Processors" description="Number of virtual CPU cores">
                                    <input
                                        type="number"
                                        min={1}
                                        max={64}
                                        value={cfg?.processors ?? ""}
                                        onChange={e => updateCfg({ processors: e.target.value ? Number(e.target.value) : null })}
                                        className="w-20 px-2 py-1.5 rounded-lg bg-white/5 border border-border text-[13px] text-foreground text-right focus:outline-none focus:border-primary"
                                        placeholder="4"
                                    />
                                </SettingRow>

                                {/* Swap */}
                                <SettingRow label="Swap Size" description="Virtual swap file size">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            min={0}
                                            max={32}
                                            value={cfg?.swapGb ?? ""}
                                            onChange={e => updateCfg({ swapGb: e.target.value ? Number(e.target.value) : null })}
                                            className="w-20 px-2 py-1.5 rounded-lg bg-white/5 border border-border text-[13px] text-foreground text-right focus:outline-none focus:border-primary"
                                            placeholder="2"
                                        />
                                        <span className="text-[12px] text-slate-400">GB</span>
                                    </div>
                                </SettingRow>

                                {/* Network mode */}
                                <SettingRow label="Network Mode" description="Networking architecture for the WSL2 VM">
                                    <select
                                        value={cfg?.networkingMode ?? "nat"}
                                        onChange={e => updateCfg({ networkingMode: e.target.value })}
                                        className="px-2 py-1.5 rounded-lg bg-white/5 border border-border text-[13px] text-foreground focus:outline-none focus:border-primary"
                                    >
                                        <option value="nat">NAT</option>
                                        <option value="mirrored">Mirrored</option>
                                        <option value="bridged">Bridged</option>
                                        <option value="none">None</option>
                                    </select>
                                </SettingRow>

                                {/* Toggles */}
                                <ToggleRow label="Localhost Forwarding" description="Forward localhost ports between Windows and WSL2"
                                    value={cfg?.localhostForwarding ?? true}
                                    onChange={v => updateCfg({ localhostForwarding: v })} />

                                <ToggleRow label="DNS Tunneling" description="Use Windows DNS resolver from within WSL2"
                                    value={cfg?.dnsTunneling ?? false}
                                    onChange={v => updateCfg({ dnsTunneling: v })} />

                                <ToggleRow label="Windows Firewall" description="Apply Windows Defender Firewall rules to WSL2"
                                    value={cfg?.firewall ?? true}
                                    onChange={v => updateCfg({ firewall: v })} />

                                <ToggleRow label="Auto Proxy" description="Automatically use Windows proxy settings in WSL2"
                                    value={cfg?.autoProxy ?? false}
                                    onChange={v => updateCfg({ autoProxy: v })} />

                                <ToggleRow label="GUI Applications (WSLg)" description="Enable Linux GUI apps via Windows Subsystem for Linux GUI"
                                    value={cfg?.guiApplications ?? true}
                                    onChange={v => updateCfg({ guiApplications: v })} />

                                <div className="pt-2 border-t border-border flex items-center gap-3 flex-wrap">
                                    <button
                                        onClick={handleSaveConfig}
                                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary text-[13px] font-semibold transition-colors"
                                    >
                                        <Save className="w-4 h-4" />
                                        Save Configuration
                                    </button>
                                    <button
                                        onClick={shutdownWsl}
                                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-border text-slate-300 text-[13px] font-medium transition-colors"
                                    >
                                        <PowerOff className="w-4 h-4" />
                                        Shutdown WSL
                                    </button>
                                </div>

                                <p className="text-[11px] text-slate-500 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                                    Run <code className="font-mono mx-1 text-slate-300">wsl --shutdown</code> after saving to apply changes
                                </p>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* WSL Setup Wizard */}
            {
                isWizardOpen && (
                    <WslSetupWizard onClose={() => setIsWizardOpen(false)} />
                )
            }
        </div >
    );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SettingRow({ label, description, children }: {
    label: string;
    description: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-foreground">{label}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{description}</p>
            </div>
            {children}
        </div>
    );
}

function ToggleRow({ label, description, value, onChange }: {
    label: string;
    description: string;
    value: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-foreground">{label}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{description}</p>
            </div>
            <button
                onClick={() => onChange(!value)}
                className={`relative w-10 h-5 rounded-full transition-colors ${value ? "bg-primary" : "bg-slate-600"
                    }`}
            >
                <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${value ? "translate-x-5" : "translate-x-0.5"
                        }`}
                />
            </button>
        </div>
    );
}
