import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@/test/utils";
import { usePower } from "@/hooks/usePower";

// Stable useToast mock — addToast is in useCallback deps and must not change reference
vi.mock("@/components/ToastSystem", () => {
    const addToast = vi.fn();
    return { useToast: () => ({ addToast }) };
});

describe("usePower", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("starts in loading state before plans arrive", () => {
        const { result } = renderHook(() => usePower());
        expect(result.current.isLoading).toBe(true);
    });

    it("isChanging is false initially", () => {
        const { result } = renderHook(() => usePower());
        expect(result.current.isChanging).toBe(false);
    });

    it("plans are empty before fetch completes", () => {
        const { result } = renderHook(() => usePower());
        expect(result.current.plans).toEqual([]);
    });

    it("loads mock plans and sets isLoading false (non-Tauri env)", async () => {
        const { result } = renderHook(() => usePower());

        await act(async () => {
            await vi.advanceTimersByTimeAsync(1000);
        });

        expect(result.current.isLoading).toBe(false);
        expect(result.current.plans.length).toBeGreaterThan(0);
    });

    it("exactly one plan is marked is_active after fetch", async () => {
        const { result } = renderHook(() => usePower());

        await act(async () => {
            await vi.advanceTimersByTimeAsync(1000);
        });

        const activePlans = result.current.plans.filter((p) => p.is_active);
        expect(activePlans).toHaveLength(1);
    });

    it("each plan has guid and name fields", async () => {
        const { result } = renderHook(() => usePower());

        await act(async () => {
            await vi.advanceTimersByTimeAsync(1000);
        });

        for (const plan of result.current.plans) {
            expect(plan.guid).toBeTruthy();
            expect(plan.name).toBeTruthy();
        }
    });

    it("setActivePlan changes the active plan", async () => {
        const { result } = renderHook(() => usePower());

        await act(async () => {
            await vi.advanceTimersByTimeAsync(1000);
        });

        const targetPlan = result.current.plans.find((p) => !p.is_active)!;
        expect(targetPlan).toBeDefined();

        await act(async () => {
            result.current.setActivePlan(targetPlan.guid);
            await vi.advanceTimersByTimeAsync(700);
        });

        const newActive = result.current.plans.find((p) => p.is_active);
        expect(newActive?.guid).toBe(targetPlan.guid);
    });

    it("isChanging is true during setActivePlan and false after", async () => {
        const { result } = renderHook(() => usePower());

        await act(async () => {
            await vi.advanceTimersByTimeAsync(1000);
        });

        const targetPlan = result.current.plans.find((p) => !p.is_active)!;

        act(() => { result.current.setActivePlan(targetPlan.guid); });
        expect(result.current.isChanging).toBe(true);

        await act(async () => {
            await vi.advanceTimersByTimeAsync(700);
        });

        expect(result.current.isChanging).toBe(false);
    });

    it("setActivePlan returns true on success", async () => {
        const { result } = renderHook(() => usePower());

        await act(async () => {
            await vi.advanceTimersByTimeAsync(1000);
        });

        const targetPlan = result.current.plans.find((p) => !p.is_active)!;
        let ret: boolean | null = null;

        await act(async () => {
            const promise = result.current.setActivePlan(targetPlan.guid);
            await vi.advanceTimersByTimeAsync(700);
            ret = await promise;
        });

        expect(ret).toBe(true);
    });

    it("fetchPlans can be called manually and resets isLoading", async () => {
        const { result } = renderHook(() => usePower());

        await act(async () => {
            await vi.advanceTimersByTimeAsync(1000);
        });

        expect(result.current.isLoading).toBe(false);

        act(() => { result.current.fetchPlans(); });
        expect(result.current.isLoading).toBe(true);

        await act(async () => {
            await vi.advanceTimersByTimeAsync(1000);
        });

        expect(result.current.isLoading).toBe(false);
    });
});
