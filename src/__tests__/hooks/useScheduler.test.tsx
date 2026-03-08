import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@/test/utils";
import { useScheduler } from "@/hooks/useScheduler";
import type { MaintenanceTask } from "@/hooks/useScheduler";
import * as tauriCore from "@tauri-apps/api/core";

vi.mock("@/components/ToastSystem", () => {
    const addToast = vi.fn();
    return { useToast: () => ({ addToast }) };
});

// useScheduler uses a module-level `const isTauri = '__TAURI_INTERNALS__' in window`.
// JSDOM never has __TAURI_INTERNALS__ so this is always false at test time.
// For the isTauri=true path, we use vi.resetModules() + dynamic import with
// window.__TAURI_INTERNALS__ set so the module re-evaluates the constant.

const mockTasks: MaintenanceTask[] = [
    {
        id: "task-1",
        name: "WeeklyTempCleanup",
        schedule: "WEEKLY",
        last_run: "2026-03-01T06:00:00",
        next_run: "2026-03-08T06:00:00",
        enabled: true,
    },
    {
        id: "task-2",
        name: "MonthlyDiskScan",
        schedule: "MONTHLY",
        last_run: "2026-02-01T06:00:00",
        next_run: "2026-03-01T06:00:00",
        enabled: false,
    },
];

describe("useScheduler", () => {
    beforeEach(() => {
        vi.mocked(tauriCore.invoke).mockReset();
    });

    // ── isTauri=false (browser fallback) ─────────────────────────────────────

    describe("isTauri=false (browser fallback)", () => {
        it("fetchTasks sets empty tasks array without invoking Tauri", async () => {
            const { result } = renderHook(() => useScheduler());

            await waitFor(() => expect(result.current.isLoading).toBe(false));

            expect(result.current.tasks).toEqual([]);
            expect(tauriCore.invoke).not.toHaveBeenCalled();
        });

        it("createTask returns false in preview mode", async () => {
            const { result } = renderHook(() => useScheduler());

            await waitFor(() => expect(result.current.isLoading).toBe(false));

            let returnValue: boolean | undefined;
            await act(async () => {
                returnValue = await result.current.createTask("TestTask", "WEEKLY", "echo hello");
            });

            expect(returnValue).toBe(false);
        });

        it("deleteTask returns false in preview mode", async () => {
            const { result } = renderHook(() => useScheduler());

            await waitFor(() => expect(result.current.isLoading).toBe(false));

            let returnValue: boolean | undefined;
            await act(async () => {
                returnValue = await result.current.deleteTask("WeeklyTempCleanup");
            });

            expect(returnValue).toBe(false);
        });

        it("runNow returns false in preview mode", async () => {
            const { result } = renderHook(() => useScheduler());

            await waitFor(() => expect(result.current.isLoading).toBe(false));

            let returnValue: boolean | undefined;
            await act(async () => {
                returnValue = await result.current.runNow("WeeklyTempCleanup");
            });

            expect(returnValue).toBe(false);
        });
    });

    // ── isTauri=true — tested via dynamic import with window stub ─────────────

    describe("isTauri=true (dynamic import with window stub)", () => {
        beforeEach(() => {
            (window as any).__TAURI_INTERNALS__ = {};
            vi.resetModules();
            vi.mocked(tauriCore.invoke).mockImplementation(async (cmd) => {
                if (cmd === "list_maintenance_tasks") return mockTasks;
                if (cmd === "create_maintenance_task") return undefined;
                if (cmd === "delete_maintenance_task") return undefined;
                if (cmd === "run_maintenance_task_now") return undefined;
                return null;
            });
        });

        afterEach(() => {
            delete (window as any).__TAURI_INTERNALS__;
            vi.resetModules();
        });

        it("fetchTasks is called on mount via useEffect and populates tasks", async () => {
            const { useScheduler: useSchedulerFresh } = await import("@/hooks/useScheduler");
            const { result } = renderHook(() => useSchedulerFresh());

            await waitFor(() => expect(result.current.isLoading).toBe(false));

            expect(tauriCore.invoke).toHaveBeenCalledWith("list_maintenance_tasks");
            expect(result.current.tasks).toEqual(mockTasks);
        });

        it("isLoading=false after fetchTasks completes", async () => {
            const { useScheduler: useSchedulerFresh } = await import("@/hooks/useScheduler");
            const { result } = renderHook(() => useSchedulerFresh());

            await waitFor(() => expect(result.current.isLoading).toBe(false));
        });

        it("createTask calls invoke('create_maintenance_task') with correct args", async () => {
            const { useScheduler: useSchedulerFresh } = await import("@/hooks/useScheduler");
            const { result } = renderHook(() => useSchedulerFresh());

            await waitFor(() => expect(result.current.isLoading).toBe(false));

            let returnValue: boolean | undefined;
            await act(async () => {
                returnValue = await result.current.createTask(
                    "TestTask",
                    "WEEKLY",
                    "Remove-Item -Path $env:TEMP\\*"
                );
            });

            expect(tauriCore.invoke).toHaveBeenCalledWith("create_maintenance_task", {
                name: "TestTask",
                schedule: "WEEKLY",
                actionCmd: "Remove-Item -Path $env:TEMP\\*",
            });
            expect(returnValue).toBe(true);
        });

        it("createTask refreshes task list after creation", async () => {
            const { useScheduler: useSchedulerFresh } = await import("@/hooks/useScheduler");
            const { result } = renderHook(() => useSchedulerFresh());

            await waitFor(() => expect(result.current.isLoading).toBe(false));

            const callsBefore = vi.mocked(tauriCore.invoke).mock.calls.filter(
                (c) => c[0] === "list_maintenance_tasks"
            ).length;

            await act(async () => {
                await result.current.createTask("NewTask", "MONTHLY", "echo cleanup");
            });

            const callsAfter = vi.mocked(tauriCore.invoke).mock.calls.filter(
                (c) => c[0] === "list_maintenance_tasks"
            ).length;

            expect(callsAfter).toBeGreaterThan(callsBefore);
        });

        it("createTask returns false when invoke throws", async () => {
            vi.mocked(tauriCore.invoke).mockImplementation(async (cmd) => {
                if (cmd === "list_maintenance_tasks") return mockTasks;
                if (cmd === "create_maintenance_task") throw new Error("Access denied");
                return null;
            });

            const { useScheduler: useSchedulerFresh } = await import("@/hooks/useScheduler");
            const { result } = renderHook(() => useSchedulerFresh());

            await waitFor(() => expect(result.current.isLoading).toBe(false));

            let returnValue: boolean | undefined;
            await act(async () => {
                returnValue = await result.current.createTask("Bad", "WEEKLY", "cmd");
            });

            expect(returnValue).toBe(false);
        });

        it("deleteTask calls invoke('delete_maintenance_task') with name", async () => {
            const { useScheduler: useSchedulerFresh } = await import("@/hooks/useScheduler");
            const { result } = renderHook(() => useSchedulerFresh());

            await waitFor(() => expect(result.current.isLoading).toBe(false));

            let returnValue: boolean | undefined;
            await act(async () => {
                returnValue = await result.current.deleteTask("WeeklyTempCleanup");
            });

            expect(tauriCore.invoke).toHaveBeenCalledWith("delete_maintenance_task", {
                name: "WeeklyTempCleanup",
            });
            expect(returnValue).toBe(true);
        });

        it("deleteTask removes task from local state by name", async () => {
            const { useScheduler: useSchedulerFresh } = await import("@/hooks/useScheduler");
            const { result } = renderHook(() => useSchedulerFresh());

            await waitFor(() => expect(result.current.isLoading).toBe(false));

            await act(async () => {
                await result.current.deleteTask("WeeklyTempCleanup");
            });

            expect(result.current.tasks.find((t) => t.name === "WeeklyTempCleanup")).toBeUndefined();
        });

        it("deleteTask returns false when invoke throws", async () => {
            vi.mocked(tauriCore.invoke).mockImplementation(async (cmd) => {
                if (cmd === "list_maintenance_tasks") return mockTasks;
                if (cmd === "delete_maintenance_task") throw new Error("task not found");
                return null;
            });

            const { useScheduler: useSchedulerFresh } = await import("@/hooks/useScheduler");
            const { result } = renderHook(() => useSchedulerFresh());

            await waitFor(() => expect(result.current.isLoading).toBe(false));

            let returnValue: boolean | undefined;
            await act(async () => {
                returnValue = await result.current.deleteTask("ghost-task");
            });

            expect(returnValue).toBe(false);
        });

        it("runNow calls invoke('run_maintenance_task_now') with name", async () => {
            const { useScheduler: useSchedulerFresh } = await import("@/hooks/useScheduler");
            const { result } = renderHook(() => useSchedulerFresh());

            await waitFor(() => expect(result.current.isLoading).toBe(false));

            let returnValue: boolean | undefined;
            await act(async () => {
                returnValue = await result.current.runNow("WeeklyTempCleanup");
            });

            expect(tauriCore.invoke).toHaveBeenCalledWith("run_maintenance_task_now", {
                name: "WeeklyTempCleanup",
            });
            expect(returnValue).toBe(true);
        });

        it("runNow returns false when invoke throws", async () => {
            vi.mocked(tauriCore.invoke).mockImplementation(async (cmd) => {
                if (cmd === "list_maintenance_tasks") return mockTasks;
                if (cmd === "run_maintenance_task_now") throw new Error("scheduler error");
                return null;
            });

            const { useScheduler: useSchedulerFresh } = await import("@/hooks/useScheduler");
            const { result } = renderHook(() => useSchedulerFresh());

            await waitFor(() => expect(result.current.isLoading).toBe(false));

            let returnValue: boolean | undefined;
            await act(async () => {
                returnValue = await result.current.runNow("WeeklyTempCleanup");
            });

            expect(returnValue).toBe(false);
        });

        it("isWorking=false after createTask completes", async () => {
            const { useScheduler: useSchedulerFresh } = await import("@/hooks/useScheduler");
            const { result } = renderHook(() => useSchedulerFresh());

            await waitFor(() => expect(result.current.isLoading).toBe(false));

            await act(async () => {
                await result.current.createTask("T", "WEEKLY", "cmd");
            });

            expect(result.current.isWorking).toBe(false);
        });
    });
});
