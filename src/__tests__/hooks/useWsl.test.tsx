import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@/test/utils";
import { useWsl } from "@/hooks/useWsl";
import { useGlobalCache } from "@/hooks/useGlobalCache";
import * as tauriCore from "@tauri-apps/api/core";

vi.mock("@/components/ToastSystem", () => {
    const addToast = vi.fn();
    return { useToast: () => ({ addToast }) };
});

describe("useWsl", () => {
    beforeEach(() => {
        vi.mocked(tauriCore.isTauri).mockReturnValue(false);
        vi.mocked(tauriCore.invoke).mockReset();
        useGlobalCache.getState().clearCache();
    });

    it("leaves status empty and sets an error when desktop runtime is unavailable", async () => {
        const { result } = renderHook(() => useWsl());

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.status).toBeNull();
        expect(result.current.error).toContain("desktop runtime");
        expect(tauriCore.invoke).not.toHaveBeenCalled();
    });

    it("leaves config empty when desktop runtime is unavailable", async () => {
        const { result } = renderHook(() => useWsl());

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.config).toBeNull();
        expect(result.current.setupState).toBeNull();
    });

    it("installDistro invokes install_wsl_distro when in Tauri", async () => {
        vi.mocked(tauriCore.isTauri).mockReturnValue(true);
        vi.mocked(tauriCore.invoke).mockResolvedValue(null);

        const { result } = renderHook(() => useWsl());

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        vi.mocked(tauriCore.invoke).mockResolvedValue(true);

        await act(async () => {
            await result.current.installDistro("Debian");
        });

        expect(tauriCore.invoke).toHaveBeenCalledWith("install_wsl_distro", { distroId: "Debian" });
    });

    it("cleanUninstall invokes clean_uninstall_wsl when in Tauri", async () => {
        vi.mocked(tauriCore.isTauri).mockReturnValue(true);
        vi.mocked(tauriCore.invoke).mockResolvedValue(null);

        const { result } = renderHook(() => useWsl());

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        vi.mocked(tauriCore.invoke).mockResolvedValue(true);

        await act(async () => {
            await result.current.cleanUninstall();
        });

        expect(tauriCore.invoke).toHaveBeenCalledWith("clean_uninstall_wsl");
    });

    it("saveConfig invokes set_wsl_config when in Tauri", async () => {
        vi.mocked(tauriCore.isTauri).mockReturnValue(true);
        vi.mocked(tauriCore.invoke).mockResolvedValue(null);

        const { result } = renderHook(() => useWsl());

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        vi.mocked(tauriCore.invoke).mockResolvedValue(true);

        const cfg = {
            memoryGb: 16,
            processors: 8,
            swapGb: 4,
            localhostForwarding: true,
            networkingMode: "nat",
            dnsTunneling: true,
            firewall: true,
            autoProxy: false,
            guiApplications: true,
        };

        await act(async () => {
            await result.current.saveConfig(cfg);
        });

        expect(tauriCore.invoke).toHaveBeenCalledWith("set_wsl_config", { config: cfg });
    });

    it("enableWsl invokes enable_wsl when in Tauri", async () => {
        vi.mocked(tauriCore.isTauri).mockReturnValue(true);
        vi.mocked(tauriCore.invoke).mockResolvedValue(null);

        const { result } = renderHook(() => useWsl());

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        vi.mocked(tauriCore.invoke).mockResolvedValue(true);

        await act(async () => {
            await result.current.enableWsl();
        });

        expect(tauriCore.invoke).toHaveBeenCalledWith("enable_wsl");
    });

    it("setDefaultDistro does not mutate status without desktop runtime", async () => {
        const { result } = renderHook(() => useWsl());

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => {
            await result.current.setDefaultDistro("Debian");
        });

        expect(result.current.status).toBeNull();
        expect(result.current.error).toContain("desktop runtime");
        expect(tauriCore.invoke).not.toHaveBeenCalledWith("set_default_distro", expect.anything());
    });

    it("installDistro sets isActionLoading=true during install (Tauri mode)", async () => {
        vi.mocked(tauriCore.isTauri).mockReturnValue(true);

        let resolveInstall!: (v: boolean) => void;
        const pendingInstall = new Promise<boolean>(res => { resolveInstall = res; });

        vi.mocked(tauriCore.invoke).mockImplementation(async (cmd) => {
            if (cmd === "get_wsl_status") return null;
            if (cmd === "get_wsl_config") return null;
            if (cmd === "get_wsl_setup_state") return null;
            if (cmd === "install_wsl_distro") return pendingInstall;
            return null;
        });

        const { result } = renderHook(() => useWsl());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        let installPromise!: Promise<void>;
        act(() => {
            installPromise = result.current.installDistro("Debian");
        });

        expect(result.current.isActionLoading).toBe(true);

        resolveInstall(true);
        await act(async () => {
            await installPromise;
        });

        expect(result.current.isActionLoading).toBe(false);
    });
});
