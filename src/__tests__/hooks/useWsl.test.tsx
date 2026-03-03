import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@/test/utils";
import { useWsl } from "@/hooks/useWsl";
import * as tauriCore from "@tauri-apps/api/core";

vi.mock("@/components/ToastSystem", () => {
    const addToast = vi.fn();
    return { useToast: () => ({ addToast }) };
});

describe("useWsl", () => {
    beforeEach(() => {
        vi.mocked(tauriCore.isTauri).mockReturnValue(false);
        vi.mocked(tauriCore.invoke).mockReset();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("loads mock status on mount when not in Tauri", async () => {
        const { result } = renderHook(() => useWsl());

        expect(result.current.isLoading).toBe(true);

        await act(async () => {
            vi.advanceTimersByTime(700);
        });

        expect(result.current.isLoading).toBe(false);
        expect(result.current.status).not.toBeNull();
        expect(result.current.status?.isEnabled).toBe(true);
        expect(result.current.status?.distros).toHaveLength(2);
        expect(result.current.status?.distros[0].name).toBe("Ubuntu");
    });

    it("loads mock config on mount", async () => {
        const { result } = renderHook(() => useWsl());

        await act(async () => {
            vi.advanceTimersByTime(700);
        });

        expect(result.current.config).not.toBeNull();
        expect(result.current.config?.memoryGb).toBe(8);
        expect(result.current.config?.processors).toBe(4);
    });

    it("installDistro invokes install_wsl_distro when in Tauri", async () => {
        vi.mocked(tauriCore.isTauri).mockReturnValue(true);
        vi.mocked(tauriCore.invoke).mockResolvedValue(null);

        const { result } = renderHook(() => useWsl());

        await act(async () => {
            await vi.runAllTimersAsync();
        });

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

        await act(async () => {
            await vi.runAllTimersAsync();
        });

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

        await act(async () => {
            await vi.runAllTimersAsync();
        });

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

        await act(async () => {
            await vi.runAllTimersAsync();
        });

        vi.mocked(tauriCore.invoke).mockResolvedValue(true);

        await act(async () => {
            await result.current.enableWsl();
        });

        expect(tauriCore.invoke).toHaveBeenCalledWith("enable_wsl");
    });

    it("setDefaultDistro updates state optimistically in mock mode", async () => {
        const { result } = renderHook(() => useWsl());

        await act(async () => {
            vi.advanceTimersByTime(700);
        });

        await act(async () => {
            await result.current.setDefaultDistro("Debian");
        });

        const debian = result.current.status?.distros.find(d => d.name === "Debian");
        expect(debian?.isDefault).toBe(true);
    });
});
