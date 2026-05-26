import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@/test/utils";
import { usePower, type PowerPlan } from "@/hooks/usePower";
import { useGlobalCache } from "@/hooks/useGlobalCache";
import * as tauriCore from "@tauri-apps/api/core";

vi.mock("@/components/ToastSystem", () => {
    const addToast = vi.fn();
    return { useToast: () => ({ addToast }) };
});

const POWER_PLANS: PowerPlan[] = [
    { guid: "balanced", name: "Balanced", is_active: true },
    { guid: "ultimate", name: "Ultimate Performance", is_active: false },
];

describe("usePower", () => {
    beforeEach(() => {
        vi.mocked(tauriCore.invoke).mockReset();
        vi.mocked(tauriCore.isTauri).mockReturnValue(false);
        useGlobalCache.getState().clearCache();
    });

    describe("isTauri=false (desktop runtime unavailable)", () => {
        it("leaves plans empty and finishes loading without invoking Tauri", async () => {
            const { result } = renderHook(() => usePower());

            await waitFor(() => expect(result.current.isLoading).toBe(false));

            expect(result.current.plans).toEqual([]);
            expect(tauriCore.invoke).not.toHaveBeenCalled();
        });

        it("setActivePlan returns false and does not invoke Tauri", async () => {
            const { result } = renderHook(() => usePower());
            await waitFor(() => expect(result.current.isLoading).toBe(false));

            let ret: boolean | undefined;
            await act(async () => {
                ret = await result.current.setActivePlan("ultimate");
            });

            expect(ret).toBe(false);
            expect(result.current.isChanging).toBe(false);
            expect(tauriCore.invoke).not.toHaveBeenCalled();
        });

        it("manual fetchPlans keeps plans empty when the desktop runtime is missing", async () => {
            const { result } = renderHook(() => usePower());
            await waitFor(() => expect(result.current.isLoading).toBe(false));

            await act(async () => {
                await result.current.fetchPlans();
            });

            expect(result.current.plans).toEqual([]);
            expect(result.current.isLoading).toBe(false);
            expect(tauriCore.invoke).not.toHaveBeenCalled();
        });
    });

    describe("isTauri=true", () => {
        beforeEach(() => {
            vi.mocked(tauriCore.isTauri).mockReturnValue(true);
            vi.mocked(tauriCore.invoke).mockImplementation(async (cmd) => {
                if (cmd === "get_power_plans") return POWER_PLANS;
                if (cmd === "get_battery_health") {
                    return { has_battery: false, charge_percent: 0, is_charging: false, status: "No battery detected" };
                }
                if (cmd === "set_active_power_plan") return undefined;
                return null;
            });
        });

        it("fetches real power plans through Tauri", async () => {
            const { result } = renderHook(() => usePower());

            await waitFor(() => expect(result.current.isLoading).toBe(false));

            expect(tauriCore.invoke).toHaveBeenCalledWith("get_power_plans");
            expect(result.current.plans).toEqual(POWER_PLANS);
        });

        it("setActivePlan invokes Tauri and refreshes plans", async () => {
            const { result } = renderHook(() => usePower());
            await waitFor(() => expect(result.current.isLoading).toBe(false));
            vi.mocked(tauriCore.invoke).mockClear();

            let ret: boolean | undefined;
            await act(async () => {
                ret = await result.current.setActivePlan("ultimate");
            });

            expect(ret).toBe(true);
            expect(tauriCore.invoke).toHaveBeenCalledWith("set_active_power_plan", { guid: "ultimate" });
            expect(tauriCore.invoke).toHaveBeenCalledWith("get_power_plans");
            expect(result.current.isChanging).toBe(false);
        });
    });
});
