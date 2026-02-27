import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTweakExecution } from "@/hooks/useTweakExecution";
import { useAppStore } from "@/store/appStore";
import * as tauriCore from "@tauri-apps/api/core";

// ── Fixtures ─────────────────────────────────────────────────────────────────

const mockTweak = {
    id: "test-tweak-1",
    name: "Disable SysMain",
    execution: {
        code: "Stop-Service -Name SysMain",
        revertCode: "Start-Service -Name SysMain",
    },
    validationCmd: "Get-Service SysMain",
};

const mockTweak2 = {
    id: "test-tweak-2",
    name: "Disable Search Indexer",
    execution: {
        code: "Set-Service -Name WSearch -StartupType Disabled",
        revertCode: "Set-Service -Name WSearch -StartupType Automatic",
    },
    validationCmd: "",
};

const successResult = {
    success: true,
    tweakId: "test-tweak-1",
    stdout: "Service stopped.",
    stderr: "",
    exitCode: 0,
    durationMs: 120,
};

const failResult = {
    success: false,
    tweakId: "test-tweak-1",
    stdout: "",
    stderr: "Access is denied.",
    exitCode: 1,
    durationMs: 50,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function resetStore() {
    useAppStore.setState({
        appliedTweaks: [],
        isExecuting: false,
        executingTweakId: null,
        error: null,
        tweakValidationState: {},
    });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("useTweakExecution", () => {
    beforeEach(() => {
        resetStore();
        vi.mocked(tauriCore.invoke).mockReset();
    });

    // ── applyTweak ────────────────────────────────────────────────────────────

    describe("applyTweak", () => {
        it("calls execute_tweak with the correct arguments", async () => {
            vi.mocked(tauriCore.invoke).mockResolvedValue(successResult);
            const { result } = renderHook(() => useTweakExecution());

            await act(async () => {
                await result.current.applyTweak(mockTweak);
            });

            expect(tauriCore.invoke).toHaveBeenCalledWith("execute_tweak", {
                tweakId: mockTweak.id,
                tweakName: mockTweak.name,
                code: mockTweak.execution.code,
            });
        });

        it("adds tweak id to appliedTweaks on success", async () => {
            vi.mocked(tauriCore.invoke).mockResolvedValue(successResult);
            const { result } = renderHook(() => useTweakExecution());

            await act(async () => {
                await result.current.applyTweak(mockTweak);
            });

            expect(useAppStore.getState().appliedTweaks).toContain(mockTweak.id);
        });

        it("sets validation state to Applied on success", async () => {
            vi.mocked(tauriCore.invoke).mockResolvedValue(successResult);
            const { result } = renderHook(() => useTweakExecution());

            await act(async () => {
                await result.current.applyTweak(mockTweak);
            });

            expect(useAppStore.getState().tweakValidationState[mockTweak.id]).toBe("Applied");
        });

        it("does NOT add to appliedTweaks on failure", async () => {
            vi.mocked(tauriCore.invoke).mockResolvedValue(failResult);
            const { result } = renderHook(() => useTweakExecution());

            await act(async () => {
                await result.current.applyTweak(mockTweak);
            });

            expect(useAppStore.getState().appliedTweaks).not.toContain(mockTweak.id);
        });

        it("sets EXECUTION_FAILED error on non-zero exit code", async () => {
            vi.mocked(tauriCore.invoke).mockResolvedValue(failResult);
            const { result } = renderHook(() => useTweakExecution());

            await act(async () => {
                await result.current.applyTweak(mockTweak);
            });

            const error = useAppStore.getState().error;
            expect(error?.code).toBe("EXECUTION_FAILED");
            expect(error?.message).toBe(failResult.stderr);
        });

        it("returns null and sets INVOKE_FAILED when invoke throws", async () => {
            vi.mocked(tauriCore.invoke).mockRejectedValue(new Error("IPC unavailable"));
            const { result } = renderHook(() => useTweakExecution());
            let returnValue: unknown;

            await act(async () => {
                returnValue = await result.current.applyTweak(mockTweak);
            });

            expect(returnValue).toBeNull();
            expect(useAppStore.getState().error?.code).toBe("INVOKE_FAILED");
        });

        it("sets isExecuting=true during call, false after", async () => {
            let wasExecutingDuring = false;
            vi.mocked(tauriCore.invoke).mockImplementation(async () => {
                wasExecutingDuring = useAppStore.getState().isExecuting;
                return successResult;
            });

            const { result } = renderHook(() => useTweakExecution());

            await act(async () => {
                await result.current.applyTweak(mockTweak);
            });

            expect(wasExecutingDuring).toBe(true);
            expect(useAppStore.getState().isExecuting).toBe(false);
        });
    });

    // ── revertTweak ───────────────────────────────────────────────────────────

    describe("revertTweak", () => {
        it("calls revert_tweak with the correct arguments", async () => {
            vi.mocked(tauriCore.invoke).mockResolvedValue(successResult);
            const { result } = renderHook(() => useTweakExecution());

            await act(async () => {
                await result.current.revertTweak(mockTweak);
            });

            expect(tauriCore.invoke).toHaveBeenCalledWith("revert_tweak", {
                tweakId: mockTweak.id,
                tweakName: mockTweak.name,
                revertCode: mockTweak.execution.revertCode,
            });
        });

        it("removes tweak from appliedTweaks on success", async () => {
            useAppStore.setState({ appliedTweaks: [mockTweak.id] });
            vi.mocked(tauriCore.invoke).mockResolvedValue(successResult);
            const { result } = renderHook(() => useTweakExecution());

            await act(async () => {
                await result.current.revertTweak(mockTweak);
            });

            expect(useAppStore.getState().appliedTweaks).not.toContain(mockTweak.id);
        });

        it("sets validation state to Reverted on success", async () => {
            vi.mocked(tauriCore.invoke).mockResolvedValue(successResult);
            const { result } = renderHook(() => useTweakExecution());

            await act(async () => {
                await result.current.revertTweak(mockTweak);
            });

            expect(useAppStore.getState().tweakValidationState[mockTweak.id]).toBe("Reverted");
        });

        it("sets REVERT_FAILED error when revert fails", async () => {
            const revertFail = { ...failResult, stderr: "Cannot revert" };
            vi.mocked(tauriCore.invoke).mockResolvedValue(revertFail);
            const { result } = renderHook(() => useTweakExecution());

            await act(async () => {
                await result.current.revertTweak(mockTweak);
            });

            expect(useAppStore.getState().error?.code).toBe("REVERT_FAILED");
        });
    });

    // ── validateTweak ─────────────────────────────────────────────────────────

    describe("validateTweak", () => {
        it("calls validate_tweak with the correct validationCmd", async () => {
            vi.mocked(tauriCore.invoke).mockResolvedValue({ state: "Applied", rawOutput: "Stopped" });
            const { result } = renderHook(() => useTweakExecution());

            await act(async () => {
                await result.current.validateTweak(mockTweak);
            });

            expect(tauriCore.invoke).toHaveBeenCalledWith("validate_tweak", {
                validationCmd: mockTweak.validationCmd,
            });
        });

        it("stores the returned state in tweakValidationState", async () => {
            vi.mocked(tauriCore.invoke).mockResolvedValue({ state: "Applied", rawOutput: "Stopped" });
            const { result } = renderHook(() => useTweakExecution());

            await act(async () => {
                await result.current.validateTweak(mockTweak);
            });

            expect(useAppStore.getState().tweakValidationState[mockTweak.id]).toBe("Applied");
        });

        it("sets Unknown state when invoke throws", async () => {
            vi.mocked(tauriCore.invoke).mockRejectedValue(new Error("WMI error"));
            const { result } = renderHook(() => useTweakExecution());

            await act(async () => {
                await result.current.validateTweak(mockTweak);
            });

            expect(useAppStore.getState().tweakValidationState[mockTweak.id]).toBe("Unknown");
        });
    });

    // ── applyBatch ────────────────────────────────────────────────────────────

    describe("applyBatch", () => {
        it("applies all tweaks sequentially when all succeed", async () => {
            const result2 = { ...successResult, tweakId: "test-tweak-2" };
            vi.mocked(tauriCore.invoke)
                .mockResolvedValueOnce(successResult)
                .mockResolvedValueOnce(result2);

            const { result } = renderHook(() => useTweakExecution());
            let batchResult: { results: unknown[]; failedIndex: number } = { results: [], failedIndex: -1 };

            await act(async () => {
                batchResult = await result.current.applyBatch([mockTweak, mockTweak2]);
            });

            expect(batchResult.failedIndex).toBe(-1);
            expect(batchResult.results).toHaveLength(2);
            expect(useAppStore.getState().appliedTweaks).toContain(mockTweak.id);
            expect(useAppStore.getState().appliedTweaks).toContain(mockTweak2.id);
        });

        it("stops on first failure and returns its index", async () => {
            vi.mocked(tauriCore.invoke)
                .mockResolvedValueOnce(successResult)
                .mockResolvedValueOnce(failResult);

            const { result } = renderHook(() => useTweakExecution());
            let batchResult: { results: unknown[]; failedIndex: number } = { results: [], failedIndex: -1 };

            await act(async () => {
                batchResult = await result.current.applyBatch([mockTweak, mockTweak2]);
            });

            expect(batchResult.failedIndex).toBe(1);
            expect(batchResult.results).toHaveLength(2);
            // First tweak applied, second not
            expect(useAppStore.getState().appliedTweaks).toContain(mockTweak.id);
            expect(useAppStore.getState().appliedTweaks).not.toContain(mockTweak2.id);
        });
    });

    // ── rollbackTweaks ────────────────────────────────────────────────────────

    describe("rollbackTweaks", () => {
        it("reverts tweaks in reverse order", async () => {
            const callOrder: string[] = [];
            vi.mocked(tauriCore.invoke).mockImplementation(async (_, args) => {
                const id = (args as Record<string, unknown>)?.tweakId as string;
                callOrder.push(id);
                return { ...successResult, tweakId: id };
            });

            useAppStore.setState({ appliedTweaks: [mockTweak.id, mockTweak2.id] });
            const { result } = renderHook(() => useTweakExecution());

            await act(async () => {
                await result.current.rollbackTweaks([mockTweak, mockTweak2]);
            });

            expect(callOrder).toEqual([mockTweak2.id, mockTweak.id]);
        });

        it("removes each reverted tweak from appliedTweaks", async () => {
            vi.mocked(tauriCore.invoke).mockResolvedValue(successResult);
            useAppStore.setState({ appliedTweaks: [mockTweak.id, mockTweak2.id] });
            const { result } = renderHook(() => useTweakExecution());

            await act(async () => {
                await result.current.rollbackTweaks([mockTweak, mockTweak2]);
            });

            expect(useAppStore.getState().appliedTweaks).not.toContain(mockTweak.id);
            expect(useAppStore.getState().appliedTweaks).not.toContain(mockTweak2.id);
        });
    });
});
