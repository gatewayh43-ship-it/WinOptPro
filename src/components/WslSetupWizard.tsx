import { useState } from "react";
import { X, ChevronRight, ChevronLeft, CheckCircle, Loader2, AlertTriangle, Monitor, Cpu, HardDrive } from "lucide-react";
import { useWsl, AVAILABLE_DISTROS } from "@/hooks/useWsl";
import type { WslConfig } from "@/hooks/useWsl";

interface Props {
    onClose: () => void;
}

const DESKTOP_ENVS = [
    {
        id: "xfce4",
        name: "XFCE4",
        tagline: "Recommended – Lightweight",
        description: "Fast, minimal, and responsive. Best performance on most hardware.",
        badge: "Recommended",
        badgeClass: "bg-green-500/20 text-green-400 border-green-500/30",
    },
    {
        id: "kde",
        name: "KDE Plasma",
        tagline: "Full-featured",
        description: "Rich, customizable desktop with a Windows-like feel.",
        badge: null,
        badgeClass: "",
    },
    {
        id: "gnome",
        name: "GNOME",
        tagline: "Classic Ubuntu",
        description: "Clean, modern desktop environment used by default in Ubuntu.",
        badge: null,
        badgeClass: "",
    },
];

const TOTAL_STEPS = 7;

export function WslSetupWizard({ onClose }: Props) {
    const {
        status,
        setupState,
        installingDistro,
        enableWsl,
        installDistro,
        setDefaultDistro,
        setDefaultVersion,
        saveConfig,
        installDesktopEnv,
        launchLinuxMode,
    } = useWsl();

    const [step, setStep] = useState(0);
    const [selectedDistro, setSelectedDistro] = useState<string>("Ubuntu");
    const [selectedDe, setSelectedDe] = useState<string>("xfce4");
    const [localConfig, setLocalConfig] = useState<Partial<WslConfig>>({
        memoryGb: 8,
        processors: 4,
        swapGb: 2,
        localhostForwarding: true,
        networkingMode: "nat",
        dnsTunneling: true,
        firewall: true,
        autoProxy: false,
        guiApplications: true,
    });
    const [deInstallLog, setDeInstallLog] = useState<string[]>([]);
    const [isInstallingDe, setIsInstallingDe] = useState(false);
    const [deInstalled, setDeInstalled] = useState(false);
    const [isEnablingWsl, setIsEnablingWsl] = useState(false);
    const [wslEnabled, setWslEnabled] = useState(setupState?.wslEnabled ?? false);
    const [isSavingConfig, setIsSavingConfig] = useState(false);
    const [configSaved, setConfigSaved] = useState(false);
    const [defaultSet, setDefaultSet] = useState(false);

    const progressPct = (step / (TOTAL_STEPS - 1)) * 100;

    const canNext = (): boolean => {
        if (step === 1 && !wslEnabled && !setupState?.wslEnabled) return false;
        if (step === 2 && !installedDistros.has(selectedDistro)) return false;
        return true;
    };

    const installedNames = new Set(status?.distros.map(d => d.name) ?? []);
    const installedDistros = new Set([
        ...Array.from(installedNames),
        ...AVAILABLE_DISTROS.map(d => d.id).filter(id => installedNames.has(id.split("-")[0])),
    ]);

    const handleEnableWsl = async () => {
        setIsEnablingWsl(true);
        await enableWsl();
        setWslEnabled(true);
        setIsEnablingWsl(false);
    };

    const handleInstallDistro = async (id: string) => {
        setSelectedDistro(id);
        await installDistro(id);
    };

    const handleSaveConfig = async () => {
        setIsSavingConfig(true);
        await saveConfig({
            memoryGb: localConfig.memoryGb ?? 8,
            processors: localConfig.processors ?? 4,
            swapGb: localConfig.swapGb ?? 2,
            localhostForwarding: localConfig.localhostForwarding ?? true,
            networkingMode: localConfig.networkingMode ?? "nat",
            dnsTunneling: localConfig.dnsTunneling ?? true,
            firewall: localConfig.firewall ?? true,
            autoProxy: localConfig.autoProxy ?? false,
            guiApplications: localConfig.guiApplications ?? true,
        });
        setConfigSaved(true);
        setIsSavingConfig(false);
    };

    const handleInstallDe = async () => {
        setIsInstallingDe(true);
        setDeInstallLog(["Starting installation..."]);
        try {
            const output = await installDesktopEnv(selectedDistro, selectedDe);
            const lines = output.split("\n").filter(Boolean).slice(-30);
            setDeInstallLog(lines);
            setDeInstalled(true);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            setDeInstallLog([`Error: ${msg}`]);
        } finally {
            setIsInstallingDe(false);
        }
    };

    const handleSetDefault = async () => {
        await setDefaultDistro(selectedDistro);
        await setDefaultVersion(2);
        setDefaultSet(true);
    };

    const handleLaunch = async () => {
        localStorage.setItem("wslSetupComplete", selectedDistro);
        await launchLinuxMode(selectedDistro, selectedDe);
        onClose();
    };

    const goNext = () => setStep(s => Math.min(s + 1, TOTAL_STEPS - 1));
    const goPrev = () => setStep(s => Math.max(s - 1, 0));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-xl bg-black/80">
            <div className="relative w-full max-w-2xl mx-4 bg-background border border-border rounded-2xl shadow-2xl overflow-hidden">
                {/* Close */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 dark:text-slate-200 hover:text-foreground transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>

                {/* Progress bar */}
                <div className="h-1 bg-border w-full">
                    <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${progressPct}%` }}
                    />
                </div>

                {/* Step indicator */}
                <div className="px-8 pt-5 pb-2 text-[11px] text-slate-500 dark:text-slate-300 font-mono">
                    Step {step + 1} of {TOTAL_STEPS}
                </div>

                {/* Content */}
                <div className="px-8 pb-8 min-h-[380px] flex flex-col">

                    {/* Step 0 — Welcome */}
                    {step === 0 && (
                        <StepShell title="Welcome to Linux Mode 🐧" subtitle="Run a full Linux desktop on Windows via WSLg">
                            <p className="text-[13px] text-slate-300 leading-relaxed">
                                <strong>Linux Mode</strong> uses <em>WSL2</em> + <em>WSLg</em> (Windows Subsystem for Linux GUI)
                                to launch a real Linux desktop environment directly on Windows — no VM, no dual boot.
                            </p>
                            <ul className="text-[12px] text-slate-400 dark:text-slate-200 mt-3 space-y-1.5 list-none">
                                <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" /> Full Linux desktop (XFCE4, KDE, or GNOME)</li>
                                <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" /> Shared clipboard and file access</li>
                                <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" /> Hardware-accelerated graphics via WSLg</li>
                            </ul>
                            <div className={`flex items-center gap-2 mt-4 px-3 py-2 rounded-lg text-[12px] border ${setupState?.wslgSupported
                                    ? "bg-green-500/10 border-green-500/20 text-green-300"
                                    : "bg-amber-500/10 border-amber-500/20 text-amber-300"
                                }`}>
                                {setupState?.wslgSupported
                                    ? <><CheckCircle className="w-3.5 h-3.5 shrink-0" /> Your system supports WSLg (Windows 11 detected)</>
                                    : <><AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Linux Mode requires Windows 11 (WSLg not available)</>
                                }
                            </div>
                        </StepShell>
                    )}

                    {/* Step 1 — Enable WSL */}
                    {step === 1 && (
                        <StepShell title="Enable WSL" subtitle="Install Windows Subsystem for Linux and Virtual Machine Platform">
                            {(setupState?.wslEnabled || wslEnabled) ? (
                                <div className="flex items-center gap-2 text-green-400 text-[13px]">
                                    <CheckCircle className="w-5 h-5" />
                                    WSL is already enabled on your system.
                                </div>
                            ) : (
                                <div className="flex flex-col gap-4">
                                    <p className="text-[13px] text-slate-300">
                                        WSL needs to be enabled before you can install Linux. This requires administrator privileges
                                        and may require a reboot.
                                    </p>
                                    <button
                                        onClick={handleEnableWsl}
                                        disabled={isEnablingWsl}
                                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary text-[13px] font-semibold transition-colors w-fit disabled:opacity-50"
                                    >
                                        {isEnablingWsl ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <CheckCircle className="w-4 h-4" />
                                        )}
                                        {isEnablingWsl ? "Enabling WSL..." : "Enable WSL"}
                                    </button>
                                    <p className="text-[11px] text-amber-400 flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" />
                                        A system reboot may be required after enabling
                                    </p>
                                </div>
                            )}
                        </StepShell>
                    )}

                    {/* Step 2 — Choose Distro */}
                    {step === 2 && (
                        <StepShell title="Choose Your Linux Distro" subtitle="Select the distribution to install">
                            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                                {AVAILABLE_DISTROS.map(distro => {
                                    const installed = installedDistros.has(distro.id);
                                    const installing = installingDistro === distro.id;
                                    const selected = selectedDistro === distro.id;
                                    return (
                                        <button
                                            key={distro.id}
                                            onClick={() => !installed ? handleInstallDistro(distro.id) : setSelectedDistro(distro.id)}
                                            disabled={!!installingDistro && !installing}
                                            className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-colors ${selected
                                                    ? "bg-primary/20 border-primary/50"
                                                    : "bg-white/3 border-border hover:bg-white/5"
                                                }`}
                                        >
                                            <span className="text-lg">{distro.emoji}</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[12px] font-semibold text-foreground truncate">{distro.name}</p>
                                                {installed ? (
                                                    <p className="text-[10px] text-green-400 flex items-center gap-0.5">
                                                        <CheckCircle className="w-2.5 h-2.5" /> Installed
                                                    </p>
                                                ) : installing ? (
                                                    <p className="text-[10px] text-blue-400 flex items-center gap-0.5">
                                                        <Loader2 className="w-2.5 h-2.5 animate-spin" /> Installing...
                                                    </p>
                                                ) : (
                                                    <p className="text-[10px] text-slate-500 dark:text-slate-300">Click to install</p>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </StepShell>
                    )}

                    {/* Step 3 — Configure Resources */}
                    {step === 3 && (
                        <StepShell title="Configure Resources" subtitle="Allocate hardware resources for your Linux VM">
                            <div className="flex flex-col gap-4">
                                <ResourceSlider
                                    icon={<HardDrive className="w-4 h-4 text-blue-400" />}
                                    label="Memory"
                                    value={localConfig.memoryGb ?? 8}
                                    min={1}
                                    max={32}
                                    step={1}
                                    suffix="GB"
                                    onChange={v => setLocalConfig(c => ({ ...c, memoryGb: v }))}
                                />
                                <ResourceSlider
                                    icon={<Cpu className="w-4 h-4 text-green-400" />}
                                    label="CPU Cores"
                                    value={localConfig.processors ?? 4}
                                    min={1}
                                    max={16}
                                    step={1}
                                    suffix=" cores"
                                    onChange={v => setLocalConfig(c => ({ ...c, processors: v }))}
                                />
                                <ResourceSlider
                                    icon={<Monitor className="w-4 h-4 text-purple-400" />}
                                    label="Swap Size"
                                    value={localConfig.swapGb ?? 2}
                                    min={0}
                                    max={16}
                                    step={1}
                                    suffix="GB"
                                    onChange={v => setLocalConfig(c => ({ ...c, swapGb: v }))}
                                />
                                {!configSaved && (
                                    <button
                                        onClick={handleSaveConfig}
                                        disabled={isSavingConfig}
                                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-border text-slate-300 text-[12px] font-medium transition-colors w-fit"
                                    >
                                        {isSavingConfig ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                                        Apply Settings
                                    </button>
                                )}
                                {configSaved && (
                                    <p className="text-[12px] text-green-400 flex items-center gap-1.5">
                                        <CheckCircle className="w-3.5 h-3.5" /> Settings saved
                                    </p>
                                )}
                            </div>
                        </StepShell>
                    )}

                    {/* Step 4 — Install Desktop */}
                    {step === 4 && (
                        <StepShell title="Install Desktop Environment" subtitle="Choose the Linux desktop look and feel">
                            <div className="flex flex-col gap-3">
                                {DESKTOP_ENVS.map(de => (
                                    <button
                                        key={de.id}
                                        onClick={() => setSelectedDe(de.id)}
                                        className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-colors ${selectedDe === de.id
                                                ? "bg-primary/20 border-primary/50"
                                                : "bg-white/3 border-border hover:bg-white/5"
                                            }`}
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="text-[13px] font-semibold text-foreground">{de.name}</p>
                                                <span className="text-[10px] text-slate-400 dark:text-slate-200">{de.tagline}</span>
                                                {de.badge && (
                                                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${de.badgeClass}`}>
                                                        {de.badge}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-slate-400 dark:text-slate-200 mt-0.5">{de.description}</p>
                                        </div>
                                    </button>
                                ))}

                                {!deInstalled && (
                                    <button
                                        onClick={handleInstallDe}
                                        disabled={isInstallingDe}
                                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary text-[13px] font-semibold transition-colors w-fit mt-1 disabled:opacity-50"
                                    >
                                        {isInstallingDe ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                        {isInstallingDe ? "Installing..." : "Install Desktop"}
                                    </button>
                                )}

                                {deInstallLog.length > 0 && (
                                    <div className="mt-2 max-h-40 overflow-y-auto bg-black/30 rounded-xl p-3 font-mono text-[11px] text-slate-300 space-y-0.5">
                                        {deInstallLog.map((line, i) => <div key={i}>{line}</div>)}
                                    </div>
                                )}

                                {deInstalled && (
                                    <p className="text-[12px] text-green-400 flex items-center gap-1.5">
                                        <CheckCircle className="w-3.5 h-3.5" /> Desktop environment installed
                                    </p>
                                )}
                            </div>
                        </StepShell>
                    )}

                    {/* Step 5 — Set as Default */}
                    {step === 5 && (
                        <StepShell title="Finalize Setup" subtitle="Set your distro as default and configure WSL version">
                            <div className="flex flex-col gap-4">
                                <div className="flex flex-col gap-2 p-4 rounded-xl bg-white/3 border border-border">
                                    <ChecklistItem done={true} text={`Distro installed: ${selectedDistro}`} />
                                    <ChecklistItem done={configSaved} text="Resources configured" />
                                    <ChecklistItem done={deInstalled} text={`Desktop environment: ${selectedDe.toUpperCase()}`} />
                                    <ChecklistItem done={defaultSet} text="Set as default distro" />
                                </div>
                                {!defaultSet && (
                                    <button
                                        onClick={handleSetDefault}
                                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary text-[13px] font-semibold transition-colors w-fit"
                                    >
                                        <CheckCircle className="w-4 h-4" />
                                        Set {selectedDistro} as Default
                                    </button>
                                )}
                            </div>
                        </StepShell>
                    )}

                    {/* Step 6 — Ready! */}
                    {step === 6 && (
                        <StepShell title="Ready to Launch! 🎉" subtitle="Your Linux desktop is configured and ready">
                            <div className="flex flex-col items-center gap-5 py-4">
                                <div className="text-5xl">🐧</div>
                                <div className="text-center">
                                    <p className="text-[15px] font-semibold text-foreground">
                                        {selectedDistro} with {DESKTOP_ENVS.find(d => d.id === selectedDe)?.name ?? selectedDe}
                                    </p>
                                    <p className="text-[12px] text-slate-400 dark:text-slate-200 mt-1">
                                        WSL2 + WSLg ready. Click below to open your Linux desktop.
                                    </p>
                                </div>
                                <button
                                    onClick={handleLaunch}
                                    className="flex items-center gap-3 px-8 py-3.5 rounded-2xl bg-primary hover:bg-primary/90 text-white text-[15px] font-bold transition-colors shadow-lg"
                                >
                                    🐧 Launch Linux Desktop
                                </button>
                            </div>
                        </StepShell>
                    )}

                    {/* Navigation */}
                    <div className="flex items-center justify-between mt-auto pt-6">
                        <button
                            onClick={goPrev}
                            disabled={step === 0}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-[13px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed border border-border"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Back
                        </button>
                        {step < TOTAL_STEPS - 1 ? (
                            <button
                                onClick={goNext}
                                disabled={!canNext()}
                                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary text-[13px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Next
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StepShell({ title, subtitle, children }: {
    title: string;
    subtitle: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col gap-4">
            <div>
                <h2 className="text-[18px] font-bold text-foreground">{title}</h2>
                <p className="text-[12px] text-slate-400 dark:text-slate-200 mt-0.5">{subtitle}</p>
            </div>
            {children}
        </div>
    );
}

function ChecklistItem({ done, text }: { done: boolean; text: string }) {
    return (
        <div className="flex items-center gap-2 text-[12px]">
            {done ? (
                <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
            ) : (
                <div className="w-4 h-4 rounded-full border border-slate-600 shrink-0" />
            )}
            <span className={done ? "text-foreground" : "text-slate-400 dark:text-slate-200"}>{text}</span>
        </div>
    );
}

function ResourceSlider({ icon, label, value, min, max, step, suffix, onChange }: {
    icon: React.ReactNode;
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    suffix: string;
    onChange: (v: number) => void;
}) {
    return (
        <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-white/5 border border-border flex items-center justify-center shrink-0">
                {icon}
            </div>
            <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] font-medium text-foreground">{label}</span>
                    <span className="text-[12px] font-mono text-primary">{value}{suffix}</span>
                </div>
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={e => onChange(Number(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none bg-white/10 accent-primary cursor-pointer"
                />
            </div>
        </div>
    );
}
