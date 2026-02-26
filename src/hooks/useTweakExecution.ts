import { useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
    useAppStore,
    type TweakResult,
    type TweakValidationResult,
} from "../store/appStore";

interface TweakData {
    id: string;
    name: string;
    execution: { code: string; revertCode: string };
    validationCmd: string;
}

/**
 * Hook for executing, reverting, and validating tweaks via the Rust backend.
 */
export function useTweakExecution() {
    const {
        addAppliedTweak,
        removeAppliedTweak,
        setTweakValidation,
        setExecuting,
        setError,
        isExecuting,
        executingTweakId,
    } = useAppStore();

    /** Execute (apply) a single tweak. */
    const applyTweak = useCallback(
        async (tweak: TweakData): Promise<TweakResult | null> => {
            setExecuting(true, tweak.id);
            setError(null);
            try {
                const result = await invoke<TweakResult>("execute_tweak", {
                    tweakId: tweak.id,
                    tweakName: tweak.name,
                    code: tweak.execution.code,
                });
                if (result.success) {
                    addAppliedTweak(tweak.id);
                    setTweakValidation(tweak.id, "Applied");
                } else {
                    setError({
                        code: "EXECUTION_FAILED",
                        message: result.stderr || `Exit code: ${result.exitCode}`,
                    });
                }
                return result;
            } catch (err) {
                setError({
                    code: "INVOKE_FAILED",
                    message: String(err),
                });
                return null;
            } finally {
                setExecuting(false);
            }
        },
        [addAppliedTweak, setTweakValidation, setExecuting, setError]
    );

    /** Revert a single tweak. */
    const revertTweak = useCallback(
        async (tweak: TweakData): Promise<TweakResult | null> => {
            setExecuting(true, tweak.id);
            setError(null);
            try {
                const result = await invoke<TweakResult>("revert_tweak", {
                    tweakId: tweak.id,
                    tweakName: tweak.name,
                    revertCode: tweak.execution.revertCode,
                });
                if (result.success) {
                    removeAppliedTweak(tweak.id);
                    setTweakValidation(tweak.id, "Reverted");
                } else {
                    setError({
                        code: "REVERT_FAILED",
                        message: result.stderr || `Exit code: ${result.exitCode}`,
                    });
                }
                return result;
            } catch (err) {
                setError({
                    code: "INVOKE_FAILED",
                    message: String(err),
                });
                return null;
            } finally {
                setExecuting(false);
            }
        },
        [removeAppliedTweak, setTweakValidation, setExecuting, setError]
    );

    /** Validate a tweak's current state. */
    const validateTweak = useCallback(
        async (tweak: TweakData): Promise<TweakValidationResult | null> => {
            try {
                const result = await invoke<TweakValidationResult>("validate_tweak", {
                    validationCmd: tweak.validationCmd,
                });
                setTweakValidation(tweak.id, result.state);
                return result;
            } catch (err) {
                setTweakValidation(tweak.id, "Unknown");
                return null;
            }
        },
        [setTweakValidation]
    );

    /** Batch apply multiple tweaks sequentially. Returns per-item results. */
    const applyBatch = useCallback(
        async (
            tweaks: TweakData[]
        ): Promise<{ results: TweakResult[]; failedIndex: number }> => {
            setExecuting(true);
            setError(null);
            const results: TweakResult[] = [];
            let failedIndex = -1;

            for (let i = 0; i < tweaks.length; i++) {
                const tweak = tweaks[i];
                setExecuting(true, tweak.id);
                try {
                    const result = await invoke<TweakResult>("execute_tweak", {
                        tweakId: tweak.id,
                        tweakName: tweak.name,
                        code: tweak.execution.code,
                    });
                    results.push(result);
                    if (result.success) {
                        addAppliedTweak(tweak.id);
                        setTweakValidation(tweak.id, "Applied");
                    } else {
                        failedIndex = i;
                        break; // Stop on first failure — let caller decide rollback/skip
                    }
                } catch (err) {
                    results.push({
                        success: false,
                        tweakId: tweak.id,
                        stdout: "",
                        stderr: String(err),
                        exitCode: -1,
                        durationMs: 0,
                    });
                    failedIndex = i;
                    break;
                }
            }

            setExecuting(false);
            return { results, failedIndex };
        },
        [addAppliedTweak, setTweakValidation, setExecuting, setError]
    );

    /** Rollback previously applied tweaks (in reverse order). */
    const rollbackTweaks = useCallback(
        async (tweaks: TweakData[]): Promise<TweakResult[]> => {
            setExecuting(true);
            const results: TweakResult[] = [];

            for (const tweak of [...tweaks].reverse()) {
                setExecuting(true, tweak.id);
                try {
                    const result = await invoke<TweakResult>("revert_tweak", {
                        tweakId: tweak.id,
                        tweakName: tweak.name,
                        revertCode: tweak.execution.revertCode,
                    });
                    results.push(result);
                    if (result.success) {
                        removeAppliedTweak(tweak.id);
                        setTweakValidation(tweak.id, "Reverted");
                    }
                } catch (err) {
                    results.push({
                        success: false,
                        tweakId: tweak.id,
                        stdout: "",
                        stderr: String(err),
                        exitCode: -1,
                        durationMs: 0,
                    });
                }
            }

            setExecuting(false);
            return results;
        },
        [removeAppliedTweak, setTweakValidation, setExecuting]
    );

    return {
        applyTweak,
        revertTweak,
        validateTweak,
        applyBatch,
        rollbackTweaks,
        isExecuting,
        executingTweakId,
    };
}
