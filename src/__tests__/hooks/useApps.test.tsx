import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@/test/utils";
import { useApps } from "@/hooks/useApps";
import * as tauriCore from "@tauri-apps/api/core";

const mockCheckResult = { installed: true, method: "winget" };
const mockInstallResult = { success: true, method: "winget", output: "Successfully installed.", error: "" };

describe("useApps", () => {
    beforeEach(() => {
        vi.mocked(tauriCore.invoke).mockReset();
    });

    it("starts with null chocoAvailable, empty results and no installingId", () => {
        const { result } = renderHook(() => useApps());
        expect(result.current.installingId).toBeNull();
        expect(result.current.installResults).toEqual({});
        expect(result.current.installedApps).toEqual({});
        expect(result.current.chocoAvailable).toBeNull();
    });

    // ── checkChocoAvailable ────────────────────────────────────────────────────

    it("checkChocoAvailable calls check_choco_available", async () => {
        vi.mocked(tauriCore.invoke).mockResolvedValue(true);
        const { result } = renderHook(() => useApps());

        await act(async () => {
            await result.current.checkChocoAvailable();
        });

        expect(tauriCore.invoke).toHaveBeenCalledWith("check_choco_available");
    });

    it("checkChocoAvailable sets chocoAvailable true when invoke returns true", async () => {
        vi.mocked(tauriCore.invoke).mockResolvedValue(true);
        const { result } = renderHook(() => useApps());

        await act(async () => {
            await result.current.checkChocoAvailable();
        });

        expect(result.current.chocoAvailable).toBe(true);
    });

    it("checkChocoAvailable sets chocoAvailable false when invoke returns false", async () => {
        vi.mocked(tauriCore.invoke).mockResolvedValue(false);
        const { result } = renderHook(() => useApps());

        await act(async () => {
            await result.current.checkChocoAvailable();
        });

        expect(result.current.chocoAvailable).toBe(false);
    });

    it("checkChocoAvailable sets false and returns false on error", async () => {
        vi.mocked(tauriCore.invoke).mockRejectedValue(new Error("Not found"));
        const { result } = renderHook(() => useApps());

        let ret: boolean | null = null;
        await act(async () => {
            ret = await result.current.checkChocoAvailable();
        });

        expect(ret).toBe(false);
        expect(result.current.chocoAvailable).toBe(false);
    });

    // ── checkInstalled ─────────────────────────────────────────────────────────

    it("checkInstalled calls check_app_installed with the wingetId", async () => {
        vi.mocked(tauriCore.invoke).mockResolvedValue(mockCheckResult);
        const { result } = renderHook(() => useApps());

        await act(async () => {
            await result.current.checkInstalled("Microsoft.VSCode", "vscode");
        });

        expect(tauriCore.invoke).toHaveBeenCalledWith("check_app_installed", {
            wingetId: "Microsoft.VSCode",
        });
    });

    it("checkInstalled updates installedApps with the result", async () => {
        vi.mocked(tauriCore.invoke).mockResolvedValue(mockCheckResult);
        const { result } = renderHook(() => useApps());

        await act(async () => {
            await result.current.checkInstalled("Microsoft.VSCode", "vscode");
        });

        expect(result.current.installedApps["vscode"]).toBe(true);
    });

    it("checkInstalled returns false on invoke error", async () => {
        vi.mocked(tauriCore.invoke).mockRejectedValue(new Error("WMI error"));
        const { result } = renderHook(() => useApps());

        let ret: boolean | null = null;
        await act(async () => {
            ret = await result.current.checkInstalled("Microsoft.VSCode", "vscode");
        });

        expect(ret).toBe(false);
    });

    // ── installApp ─────────────────────────────────────────────────────────────

    it("installApp sets installingId during install and clears it after", async () => {
        let resolveInstall!: (v: unknown) => void;
        const slowInstall = new Promise((res) => { resolveInstall = res; });
        vi.mocked(tauriCore.invoke).mockImplementation(async (cmd) => {
            if (cmd === "install_app") return slowInstall;
            return null;
        });

        const { result } = renderHook(() => useApps());

        act(() => { result.current.installApp("Microsoft.VSCode", "vscode-choco", "vscode"); });
        await waitFor(() => expect(result.current.installingId).toBe("vscode"));

        resolveInstall(mockInstallResult);
        await waitFor(() => expect(result.current.installingId).toBeNull());
    });

    it("installApp stores result and marks installed on success", async () => {
        vi.mocked(tauriCore.invoke).mockResolvedValue(mockInstallResult);
        const { result } = renderHook(() => useApps());

        await act(async () => {
            await result.current.installApp("Microsoft.VSCode", "vscode-choco", "vscode");
        });

        expect(result.current.installResults["vscode"]).toEqual(mockInstallResult);
        expect(result.current.installedApps["vscode"]).toBe(true);
    });

    it("installApp stores failure result but does not mark installed on failure", async () => {
        const failResult = { success: false, method: "none", output: "", error: "Package not found" };
        vi.mocked(tauriCore.invoke).mockResolvedValue(failResult);
        const { result } = renderHook(() => useApps());

        await act(async () => {
            await result.current.installApp("Bad.Package", "bad-choco", "badapp");
        });

        expect(result.current.installResults["badapp"].success).toBe(false);
        expect(result.current.installedApps["badapp"]).toBeUndefined();
    });

    it("installApp returns error result and clears installingId when invoke throws", async () => {
        vi.mocked(tauriCore.invoke).mockRejectedValue(new Error("Winget crashed"));
        const { result } = renderHook(() => useApps());

        await act(async () => {
            await result.current.installApp("Microsoft.VSCode", "vscode-choco", "vscode");
        });

        expect(result.current.installResults["vscode"].success).toBe(false);
        expect(result.current.installResults["vscode"].error).toContain("Winget crashed");
        expect(result.current.installingId).toBeNull();
    });

    it("installApp calls install_app with wingetId and chocoId", async () => {
        vi.mocked(tauriCore.invoke).mockResolvedValue(mockInstallResult);
        const { result } = renderHook(() => useApps());

        await act(async () => {
            await result.current.installApp("Microsoft.VSCode", "vscode-choco", "vscode");
        });

        expect(tauriCore.invoke).toHaveBeenCalledWith("install_app", {
            wingetId: "Microsoft.VSCode",
            chocoId: "vscode-choco",
        });
    });
});
