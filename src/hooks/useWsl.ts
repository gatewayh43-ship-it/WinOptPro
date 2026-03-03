import { useState, useCallback, useEffect } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { useToast } from "@/components/ToastSystem";
import { useGlobalCache } from "./useGlobalCache";

// ── Types ────────────────────────────────────────────────────────────────────

export interface WslDistro {
    name: string;
    state: string;
    version: number;
    isDefault: boolean;
}

export interface WslStatus {
    isEnabled: boolean;
    defaultVersion: number | null;
    wslVersion: string;
    kernelVersion: string;
    distros: WslDistro[];
}

export interface WslConfig {
    memoryGb: number | null;
    processors: number | null;
    swapGb: number | null;
    localhostForwarding: boolean;
    networkingMode: string;
    dnsTunneling: boolean;
    firewall: boolean;
    autoProxy: boolean;
    guiApplications: boolean;
}

export interface WslSetupState {
    wslEnabled: boolean;
    wsl2Available: boolean;
    hasDistro: boolean;
    defaultDistro: string | null;
    hasDesktopEnv: boolean;
    installedDes: string[];
    wslgSupported: boolean;
}

// ── Constants ────────────────────────────────────────────────────────────────

export const AVAILABLE_DISTROS = [
    { id: "Ubuntu", name: "Ubuntu (Latest LTS)", emoji: "🟠" },
    { id: "Ubuntu-24.04", name: "Ubuntu 24.04 LTS", emoji: "🟠" },
    { id: "Ubuntu-22.04", name: "Ubuntu 22.04 LTS", emoji: "🟠" },
    { id: "Debian", name: "Debian GNU/Linux", emoji: "🌀" },
    { id: "kali-linux", name: "Kali Linux", emoji: "🐉" },
    { id: "Alpine", name: "Alpine Linux", emoji: "⛰️" },
    { id: "openSUSE-Leap-15.6", name: "openSUSE Leap 15.6", emoji: "🦎" },
    { id: "OracleLinux_9_1", name: "Oracle Linux 9.1", emoji: "🔴" },
] as const;

// ── Mock data ────────────────────────────────────────────────────────────────

const MOCK_STATUS: WslStatus = {
    isEnabled: true,
    defaultVersion: 2,
    wslVersion: "2.0.14.0",
    kernelVersion: "5.15.146.1",
    distros: [
        { name: "Ubuntu", state: "Running", version: 2, isDefault: true },
        { name: "Debian", state: "Stopped", version: 2, isDefault: false },
    ],
};

const MOCK_CONFIG: WslConfig = {
    memoryGb: 8,
    processors: 4,
    swapGb: 2,
    localhostForwarding: true,
    networkingMode: "nat",
    dnsTunneling: true,
    firewall: true,
    autoProxy: false,
    guiApplications: true,
};

const MOCK_SETUP_STATE: WslSetupState = {
    wslEnabled: true,
    wsl2Available: true,
    hasDistro: true,
    defaultDistro: "Ubuntu",
    hasDesktopEnv: false,
    installedDes: [],
    wslgSupported: true,
};

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useWsl() {
    const cachedStatus = useGlobalCache.getState().getCacheObject("wsl_status");
    const cachedConfig = useGlobalCache.getState().getCacheObject("wsl_config");
    const cachedSetup = useGlobalCache.getState().getCacheObject("wsl_setup");

    const [status, setStatus] = useState<WslStatus | null>(() => cachedStatus || null);
    const [config, setConfig] = useState<WslConfig | null>(() => cachedConfig || null);
    const [setupState, setSetupState] = useState<WslSetupState | null>(() => cachedSetup || null);
    const [isLoading, setIsLoading] = useState(() => !cachedStatus);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [installingDistro, setInstallingDistro] = useState<string | null>(null);
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { addToast } = useToast();

    const fetchStatus = useCallback(async (force = false) => {
        if (!force) {
            const cached = useGlobalCache.getState().getCacheObject("wsl_status");
            if (cached) {
                setStatus(cached);
                setIsLoading(false);
                return;
            }
        }
        setIsLoading(true);
        setError(null);
        if (!isTauri()) {
            setTimeout(() => {
                setStatus(MOCK_STATUS);
                useGlobalCache.getState().setCacheObject("wsl_status", MOCK_STATUS);
                setIsLoading(false);
            }, 500);
            return;
        }
        try {
            const data = await invoke<WslStatus>("get_wsl_status");
            setStatus(data);
            useGlobalCache.getState().setCacheObject("wsl_status", data);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchConfig = useCallback(async (force = false) => {
        if (!force) {
            const cached = useGlobalCache.getState().getCacheObject("wsl_config");
            if (cached) {
                setConfig(cached);
                return;
            }
        }
        if (!isTauri()) {
            setConfig(MOCK_CONFIG);
            useGlobalCache.getState().setCacheObject("wsl_config", MOCK_CONFIG);
            return;
        }
        try {
            const data = await invoke<WslConfig>("get_wsl_config");
            setConfig(data);
            useGlobalCache.getState().setCacheObject("wsl_config", data);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            addToast({ type: "error", title: "WSL Error", message: `Failed to load WSL config: ${msg}` });
        }
    }, [addToast]);

    const fetchSetupState = useCallback(async (force = false) => {
        if (!force) {
            const cached = useGlobalCache.getState().getCacheObject("wsl_setup");
            if (cached) {
                setSetupState(cached);
                return;
            }
        }
        if (!isTauri()) {
            setSetupState(MOCK_SETUP_STATE);
            useGlobalCache.getState().setCacheObject("wsl_setup", MOCK_SETUP_STATE);
            return;
        }
        try {
            const data = await invoke<WslSetupState>("get_wsl_setup_state");
            setSetupState(data);
            useGlobalCache.getState().setCacheObject("wsl_setup", data);
        } catch {
            setSetupState(MOCK_SETUP_STATE);
            useGlobalCache.getState().setCacheObject("wsl_setup", MOCK_SETUP_STATE);
        }
    }, []);

    const enableWsl = useCallback(async () => {
        setIsActionLoading(true);
        if (!isTauri()) {
            setTimeout(() => {
                setStatus(s => s ? { ...s, isEnabled: true } : MOCK_STATUS);
                setIsActionLoading(false);
                addToast({ type: "success", title: "WSL Enabled", message: "WSL enabled. Reboot may be required." });
            }, 1000);
            return;
        }
        try {
            await invoke<boolean>("enable_wsl");
            addToast({ type: "success", title: "WSL Enabled", message: "WSL enabled. Reboot may be required." });
            await fetchStatus();
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            addToast({ type: "error", title: "WSL Enable Failed", message: `Enable WSL failed: ${msg}` });
        } finally {
            setIsActionLoading(false);
        }
    }, [addToast, fetchStatus]);

    const disableWsl = useCallback(async () => {
        setIsActionLoading(true);
        if (!isTauri()) {
            setTimeout(() => {
                setStatus(s => s ? { ...s, isEnabled: false, distros: [] } : null);
                setIsActionLoading(false);
                addToast({ type: "success", title: "WSL Disabled", message: "WSL disabled." });
            }, 1000);
            return;
        }
        try {
            await invoke<boolean>("disable_wsl");
            addToast({ type: "success", title: "WSL Disabled", message: "WSL disabled. Reboot to complete." });
            await fetchStatus();
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            addToast({ type: "error", title: "WSL Disable Failed", message: `Disable WSL failed: ${msg}` });
        } finally {
            setIsActionLoading(false);
        }
    }, [addToast, fetchStatus]);

    const installDistro = useCallback(async (distroId: string) => {
        setInstallingDistro(distroId);
        if (!isTauri()) {
            setTimeout(() => {
                const distroInfo = AVAILABLE_DISTROS.find(d => d.id === distroId);
                const name = distroInfo?.name.split(" ")[0] ?? distroId;
                setStatus(s => s ? {
                    ...s,
                    distros: [...s.distros, { name, state: "Stopped", version: 2, isDefault: s.distros.length === 0 }],
                } : MOCK_STATUS);
                setInstallingDistro(null);
                addToast({ type: "success", title: "Install Success", message: `${distroId} installed successfully.` });
            }, 2000);
            return;
        }
        try {
            await invoke<boolean>("install_wsl_distro", { distroId });
            addToast({ type: "success", title: "Install Success", message: `${distroId} installed successfully.` });
            await fetchStatus();
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            addToast({ type: "error", title: "Install Failed", message: `Install failed: ${msg}` });
        } finally {
            setInstallingDistro(null);
        }
    }, [addToast, fetchStatus]);

    const uninstallDistro = useCallback(async (name: string) => {
        setIsActionLoading(true);
        if (!isTauri()) {
            setTimeout(() => {
                setStatus(s => s ? { ...s, distros: s.distros.filter(d => d.name !== name) } : null);
                setIsActionLoading(false);
                addToast({ type: "success", title: "Remove Success", message: `${name} removed.` });
            }, 800);
            return;
        }
        try {
            await invoke<boolean>("uninstall_wsl_distro", { name });
            addToast({ type: "success", title: "Remove Success", message: `${name} removed.` });
            await fetchStatus();
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            addToast({ type: "error", title: "Remove Failed", message: `Remove failed: ${msg}` });
        } finally {
            setIsActionLoading(false);
        }
    }, [addToast, fetchStatus]);

    const setDefaultDistro = useCallback(async (name: string) => {
        if (!isTauri()) {
            setStatus(s => s ? {
                ...s,
                distros: s.distros.map(d => ({ ...d, isDefault: d.name === name })),
            } : null);
            addToast({ type: "success", title: "Default Set", message: `${name} set as default.` });
            return;
        }
        try {
            await invoke<boolean>("set_default_distro", { name });
            addToast({ type: "success", title: "Default Set", message: `${name} set as default.` });
            await fetchStatus();
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            addToast({ type: "error", title: "Set Default Failed", message: `Set default failed: ${msg}` });
        }
    }, [addToast, fetchStatus]);

    const setDefaultVersion = useCallback(async (version: number) => {
        if (!isTauri()) {
            setStatus(s => s ? { ...s, defaultVersion: version } : null);
            addToast({ type: "success", title: "Version Set", message: `Default WSL version set to ${version}.` });
            return;
        }
        try {
            await invoke<boolean>("set_wsl_default_version", { version });
            addToast({ type: "success", title: "Version Set", message: `Default WSL version set to ${version}.` });
            await fetchStatus();
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            addToast({ type: "error", title: "Version Set Failed", message: `Set version failed: ${msg}` });
        }
    }, [addToast, fetchStatus]);

    const cleanUninstall = useCallback(async () => {
        setIsActionLoading(true);
        if (!isTauri()) {
            setTimeout(() => {
                setStatus(null);
                setIsActionLoading(false);
                addToast({ type: "success", title: "Uninstall Success", message: "WSL completely removed. Reboot required." });
            }, 1500);
            return;
        }
        try {
            await invoke<boolean>("clean_uninstall_wsl");
            addToast({ type: "success", title: "Uninstall Success", message: "WSL completely removed. Reboot required." });
            setStatus(null);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            addToast({ type: "error", title: "Uninstall Failed", message: `Clean uninstall failed: ${msg}` });
        } finally {
            setIsActionLoading(false);
        }
    }, [addToast]);

    const saveConfig = useCallback(async (cfg: WslConfig) => {
        if (!isTauri()) {
            setConfig(cfg);
            addToast({ type: "success", title: "Config Saved", message: "WSL config saved. Run 'wsl --shutdown' to apply." });
            return;
        }
        try {
            await invoke<boolean>("set_wsl_config", { config: cfg });
            setConfig(cfg);
            addToast({ type: "success", title: "Config Saved", message: "WSL config saved. Run 'wsl --shutdown' to apply." });
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            addToast({ type: "error", title: "Config Save Failed", message: `Save config failed: ${msg}` });
        }
    }, [addToast]);

    const shutdownWsl = useCallback(async () => {
        if (!isTauri()) {
            addToast({ type: "success", title: "Shutdown", message: "WSL shutdown (simulation)." });
            return;
        }
        try {
            await invoke<boolean>("shutdown_wsl");
            addToast({ type: "success", title: "Shutdown Success", message: "WSL shutdown successfully." });
            await fetchStatus();
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            addToast({ type: "error", title: "Shutdown Failed", message: `Shutdown failed: ${msg}` });
        }
    }, [addToast, fetchStatus]);

    const checkDesktopEnvs = useCallback(async (distro: string): Promise<string[]> => {
        if (!isTauri()) return [];
        try {
            return await invoke<string[]>("check_desktop_envs", { distro });
        } catch {
            return [];
        }
    }, []);

    const installDesktopEnv = useCallback(async (distro: string, de: string): Promise<string> => {
        if (!isTauri()) {
            return "Installation simulation complete. XFCE4 ready.";
        }
        try {
            return await invoke<string>("install_desktop_env", { distro, de });
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            throw new Error(msg);
        }
    }, []);

    const launchLinuxMode = useCallback(async (distro: string, de: string) => {
        if (!isTauri()) {
            addToast({ type: "info", title: "Dev Mode", message: `Launching Linux desktop (${de}) in WSLg... (simulation)` });
            return;
        }
        try {
            await invoke<boolean>("launch_linux_mode", { distro, de });
            addToast({ type: "success", title: "Launch Success", message: "Linux desktop launched via WSLg!" });
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            addToast({ type: "error", title: "Launch Failed", message: `Launch failed: ${msg}` });
        }
    }, [addToast]);

    useEffect(() => {
        fetchStatus();
        fetchConfig();
        fetchSetupState();
    }, [fetchStatus, fetchConfig, fetchSetupState]);

    return {
        status,
        config,
        setupState,
        isLoading,
        isActionLoading,
        installingDistro,
        isWizardOpen,
        setIsWizardOpen,
        error,
        fetchStatus,
        fetchConfig,
        fetchSetupState,
        enableWsl,
        disableWsl,
        installDistro,
        uninstallDistro,
        setDefaultDistro,
        setDefaultVersion,
        cleanUninstall,
        saveConfig,
        shutdownWsl,
        checkDesktopEnvs,
        installDesktopEnv,
        launchLinuxMode,
    };
}
