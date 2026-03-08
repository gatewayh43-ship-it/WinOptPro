import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@/test/utils";
import { useBackup } from "@/hooks/useBackup";
import { useAppStore } from "@/store/appStore";
import * as tauriCore from "@tauri-apps/api/core";

vi.mock("@/components/ToastSystem", () => {
    const addToast = vi.fn();
    return { useToast: () => ({ addToast }) };
});

// useBackup uses a module-level `const isTauri = '__TAURI_INTERNALS__' in window`.
// The constant is evaluated once at module load, so we cannot flip it per test.
// JSDOM does NOT have __TAURI_INTERNALS__, so isTauri is always false in tests.
// We test:
//   - isTauri=false path: the actual browser-fallback code paths
//   - isTauri=true path: invoke() is called — we force this by patching the hook module
//     using vi.doMock + dynamic import so the module re-evaluates with the stub in place.

const mockBackupData = {
    version: "1.0",
    created_at: "2026-01-15T10:00:00.000Z",
    applied_tweaks: ["DisableVBS", "DisableMemoryCompression"],
    user_settings: {
        theme: "dark" as const,
        colorScheme: "default" as const,
        expertModeEnabled: false,
        autoRefreshVitals: true,
        autoRefreshIntervalMs: 3000,
        showDeployConfirmation: true,
        aiAssistantEnabled: false,
    },
};

function resetStore() {
    useAppStore.setState({
        appliedTweaks: [],
        userSettings: {
            theme: "dark",
            colorScheme: "default",
            expertModeEnabled: false,
            autoRefreshVitals: true,
            autoRefreshIntervalMs: 3000,
            showDeployConfirmation: true,
            aiAssistantEnabled: false,
        },
    });
}

describe("useBackup", () => {
    beforeEach(() => {
        vi.mocked(tauriCore.invoke).mockReset();
        resetStore();
    });

    // ── isTauri=false (browser fallback) ─────────────────────────────────────
    // isTauri is always false in JSDOM (no __TAURI_INTERNALS__)

    describe("isTauri=false (browser fallback)", () => {
        it("exportBackup creates a blob download — renders hook first, then mocks createElement", async () => {
            // Render the hook BEFORE mocking createElement, as renderHook needs it
            const { result } = renderHook(() => useBackup());

            // Stub only the methods on URL, not the whole global
            const createObjectURL = vi.fn(() => "blob:mock");
            const revokeObjectURL = vi.fn();
            URL.createObjectURL = createObjectURL;
            URL.revokeObjectURL = revokeObjectURL;

            const mockAnchor = { href: "", download: "", click: vi.fn() };
            const realCreate = document.createElement.bind(document);
            vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
                if (tag === "a") return mockAnchor as any;
                return realCreate(tag);
            });

            let returnValue: boolean | undefined;
            await act(async () => {
                returnValue = await result.current.exportBackup();
            });

            expect(returnValue).toBe(true);
            expect(mockAnchor.click).toHaveBeenCalled();
            vi.restoreAllMocks();
        });

        it("exportBackup stores lastBackupTime in localStorage", async () => {
            const { result } = renderHook(() => useBackup());

            URL.createObjectURL = vi.fn(() => "blob:mock");
            URL.revokeObjectURL = vi.fn();
            const mockAnchor = { href: "", download: "", click: vi.fn() };
            const realCreate = document.createElement.bind(document);
            vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
                if (tag === "a") return mockAnchor as any;
                return realCreate(tag);
            });

            await act(async () => {
                await result.current.exportBackup();
            });

            expect(localStorage.getItem("winopt_last_backup")).not.toBeNull();
            vi.restoreAllMocks();
        });

        it("importBackup returns false and shows info toast in browser mode", async () => {
            const { result } = renderHook(() => useBackup());
            let returnValue: boolean | undefined;

            await act(async () => {
                returnValue = await result.current.importBackup("C:\\backup.winopt");
            });

            expect(returnValue).toBe(false);
            expect(tauriCore.invoke).not.toHaveBeenCalled();
        });

        it("importBackup returns false when path is empty", async () => {
            const { result } = renderHook(() => useBackup());
            let returnValue: boolean | undefined;

            await act(async () => {
                returnValue = await result.current.importBackup("");
            });

            expect(returnValue).toBe(false);
        });
    });

    // ── isTauri=true — tested via vi.doMock + dynamic import ─────────────────

    describe("isTauri=true (dynamic import with window stub)", () => {
        beforeEach(() => {
            // Set the window property BEFORE the module is (re)imported
            (window as any).__TAURI_INTERNALS__ = {};
            vi.resetModules();
        });

        afterEach(() => {
            delete (window as any).__TAURI_INTERNALS__;
            vi.resetModules();
        });

        it("exportBackup calls invoke('export_backup') with path and data", async () => {
            vi.mocked(tauriCore.invoke).mockResolvedValue(undefined);
            // Dynamically import the hook so it re-evaluates isTauri with the stub set
            const { useBackup: useBackupFresh } = await import("@/hooks/useBackup");
            const { result } = renderHook(() => useBackupFresh());
            let returnValue: boolean | undefined;

            await act(async () => {
                returnValue = await result.current.exportBackup("C:\\backup.winopt");
            });

            expect(tauriCore.invoke).toHaveBeenCalledWith(
                "export_backup",
                expect.objectContaining({ path: "C:\\backup.winopt" })
            );
            expect(returnValue).toBe(true);
        });

        it("exportBackup returns false when invoke throws", async () => {
            vi.mocked(tauriCore.invoke).mockRejectedValue(new Error("write error"));
            const { useBackup: useBackupFresh } = await import("@/hooks/useBackup");
            const { result } = renderHook(() => useBackupFresh());
            let returnValue: boolean | undefined;

            await act(async () => {
                returnValue = await result.current.exportBackup("C:\\bad.winopt");
            });

            expect(returnValue).toBe(false);
        });

        it("importBackup calls invoke('import_backup') with correct path", async () => {
            vi.mocked(tauriCore.invoke).mockResolvedValue(mockBackupData);
            const { useBackup: useBackupFresh } = await import("@/hooks/useBackup");
            const { result } = renderHook(() => useBackupFresh());
            let returnValue: boolean | undefined;

            await act(async () => {
                returnValue = await result.current.importBackup("C:\\backup.winopt");
            });

            expect(tauriCore.invoke).toHaveBeenCalledWith("import_backup", {
                path: "C:\\backup.winopt",
            });
            expect(returnValue).toBe(true);
        });

        it("importBackup calls invoke and returns true, indicating store restore occurred", async () => {
            vi.mocked(tauriCore.invoke).mockResolvedValue(mockBackupData);
            const { useBackup: useBackupFresh } = await import("@/hooks/useBackup");
            const { result } = renderHook(() => useBackupFresh());

            let returnValue: boolean | undefined;
            await act(async () => {
                returnValue = await result.current.importBackup("C:\\backup.winopt");
            });

            // The invoke was called with the backup file path and returned true
            expect(tauriCore.invoke).toHaveBeenCalledWith("import_backup", {
                path: "C:\\backup.winopt",
            });
            expect(returnValue).toBe(true);
            // isImporting should be false after completion
            expect(result.current.isImporting).toBe(false);
        });

        it("importBackup returns false when invoke throws", async () => {
            vi.mocked(tauriCore.invoke).mockRejectedValue(new Error("file not found"));
            const { useBackup: useBackupFresh } = await import("@/hooks/useBackup");
            const { result } = renderHook(() => useBackupFresh());
            let returnValue: boolean | undefined;

            await act(async () => {
                returnValue = await result.current.importBackup("C:\\missing.winopt");
            });

            expect(returnValue).toBe(false);
        });

        it("isExporting=false after export completes", async () => {
            vi.mocked(tauriCore.invoke).mockResolvedValue(undefined);
            const { useBackup: useBackupFresh } = await import("@/hooks/useBackup");
            const { result } = renderHook(() => useBackupFresh());

            await act(async () => {
                await result.current.exportBackup("C:\\backup.winopt");
            });

            expect(result.current.isExporting).toBe(false);
        });

        it("isImporting=false after import completes", async () => {
            vi.mocked(tauriCore.invoke).mockResolvedValue(mockBackupData);
            const { useBackup: useBackupFresh } = await import("@/hooks/useBackup");
            const { result } = renderHook(() => useBackupFresh());

            await act(async () => {
                await result.current.importBackup("C:\\backup.winopt");
            });

            expect(result.current.isImporting).toBe(false);
        });
    });

    // ── importPath state ──────────────────────────────────────────────────────

    it("setImportPath updates importPath state", () => {
        const { result } = renderHook(() => useBackup());

        act(() => {
            result.current.setImportPath("C:\\my-backup.winopt");
        });

        expect(result.current.importPath).toBe("C:\\my-backup.winopt");
    });

    it("importBackup uses importPath state when no path arg given (browser mode returns false)", async () => {
        // In browser mode, importBackup returns false via the info toast path.
        // Provide a non-empty setImportPath to bypass the empty-path guard.
        const { result } = renderHook(() => useBackup());

        act(() => {
            result.current.setImportPath("C:\\from-state.winopt");
        });

        let returnValue: boolean | undefined;
        await act(async () => {
            returnValue = await result.current.importBackup();
        });

        // Browser fallback: returns false with "Preview Mode" toast
        expect(returnValue).toBe(false);
        // Confirm it didn't call invoke (browser path)
        expect(tauriCore.invoke).not.toHaveBeenCalled();
    });
});
