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

    const desktopRequired = useCallback((action: string) => {
        const msg = `${action} requires the WinOpt Pro desktop runtime.`;
        setError(msg);
        addToast({ type: "error", title: "Desktop runtime required", message: msg });
    }, [addToast]);

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
            setStatus(null);
            setIsLoading(false);
            desktopRequired("WSL status");
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
    }, [desktopRequired]);

    const fetchConfig = useCallback(async (force = false) => {
        if (!force) {
            const cached = useGlobalCache.getState().getCacheObject("wsl_config");
            if (cached) {
                setConfig(cached);
                return;
            }
        }
        if (!isTauri()) {
            setConfig(null);
            desktopRequired("WSL configuration");
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
    }, [addToast, desktopRequired]);

    const fetchSetupState = useCallback(async (force = false) => {
        if (!force) {
            const cached = useGlobalCache.getState().getCacheObject("wsl_setup");
            if (cached) {
                setSetupState(cached);
                return;
            }
        }
        if (!isTauri()) {
            setSetupState(null);
            desktopRequired("WSL setup state");
            return;
        }
        try {
            const data = await invoke<WslSetupState>("get_wsl_setup_state");
            setSetupState(data);
            useGlobalCache.getState().setCacheObject("wsl_setup", data);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            setError(msg);
        }
    }, [desktopRequired]);

    const enableWsl = useCallback(async () => {
        setIsActionLoading(true);
        if (!isTauri()) {
            desktopRequired("Enabling WSL");
            setIsActionLoading(false);
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
    }, [addToast, fetchStatus, desktopRequired]);

    const disableWsl = useCallback(async () => {
        setIsActionLoading(true);
        if (!isTauri()) {
            desktopRequired("Disabling WSL");
            setIsActionLoading(false);
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
    }, [addToast, fetchStatus, desktopRequired]);

    const installDistro = useCallback(async (distroId: string) => {
        setInstallingDistro(distroId);
        setIsActionLoading(true);
        if (!isTauri()) {
            desktopRequired(`Installing ${distroId}`);
            setInstallingDistro(null);
            setIsActionLoading(false);
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
            setIsActionLoading(false);
        }
    }, [addToast, fetchStatus, desktopRequired]);

    const uninstallDistro = useCallback(async (name: string) => {
        setIsActionLoading(true);
        if (!isTauri()) {
            desktopRequired(`Removing ${name}`);
            setIsActionLoading(false);
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
    }, [addToast, fetchStatus, desktopRequired]);

    const setDefaultDistro = useCallback(async (name: string) => {
        if (!isTauri()) {
            desktopRequired(`Setting ${name} as the default WSL distro`);
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
    }, [addToast, fetchStatus, desktopRequired]);

    const setDefaultVersion = useCallback(async (version: number) => {
        if (!isTauri()) {
            desktopRequired(`Setting WSL ${version} as the default version`);
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
    }, [addToast, fetchStatus, desktopRequired]);

    const cleanUninstall = useCallback(async () => {
        setIsActionLoading(true);
        if (!isTauri()) {
            desktopRequired("Clean uninstalling WSL");
            setIsActionLoading(false);
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
    }, [addToast, desktopRequired]);

    const saveConfig = useCallback(async (cfg: WslConfig) => {
        if (!isTauri()) {
            desktopRequired("Saving WSL configuration");
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
    }, [addToast, desktopRequired]);

    const shutdownWsl = useCallback(async () => {
        if (!isTauri()) {
            desktopRequired("Shutting down WSL");
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
    }, [addToast, fetchStatus, desktopRequired]);

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
            throw new Error(`Installing ${de} for ${distro} requires the WinOpt Pro desktop runtime.`);
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
            desktopRequired(`Launching ${de} in WSLg`);
            return;
        }
        try {
            await invoke<boolean>("launch_linux_mode", { distro, de });
            addToast({ type: "success", title: "Launch Success", message: "Linux desktop launched via WSLg!" });
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            addToast({ type: "error", title: "Launch Failed", message: `Launch failed: ${msg}` });
        }
    }, [addToast, desktopRequired]);

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
