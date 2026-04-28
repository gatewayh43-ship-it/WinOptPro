import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@/test/utils";
import { useElevation } from "@/hooks/useElevation";
import * as tauriCore from "@tauri-apps/api/core";

describe("useElevation", () => {
    beforeEach(() => {
        vi.mocked(tauriCore.invoke).mockReset();
    });

    it("isAdmin is null on initial mount", () => {
        const { result } = renderHook(() => useElevation());
        expect(result.current.isAdmin).toBeNull();
    });

    it("checkAdmin sets isAdmin true when invoke returns true", async () => {
        vi.mocked(tauriCore.invoke).mockResolvedValue(true);
        const { result } = renderHook(() => useElevation());

        await act(async () => {
            await result.current.checkAdmin();
        });

        expect(result.current.isAdmin).toBe(true);
        expect(tauriCore.invoke).toHaveBeenCalledWith("is_admin");
    });

    it("checkAdmin sets isAdmin false when invoke returns false", async () => {
        vi.mocked(tauriCore.invoke).mockResolvedValue(false);
        const { result } = renderHook(() => useElevation());

        await act(async () => {
            await result.current.checkAdmin();
        });

        expect(result.current.isAdmin).toBe(false);
    });

    it("checkAdmin returns the boolean value", async () => {
        vi.mocked(tauriCore.invoke).mockResolvedValue(true);
        const { result } = renderHook(() => useElevation());

        let ret: boolean | null = null;
        await act(async () => {
            ret = await result.current.checkAdmin();
        });

        expect(ret).toBe(true);
    });

    it("checkAdmin sets false and returns false when invoke throws", async () => {
        vi.mocked(tauriCore.invoke).mockRejectedValue(new Error("Access denied"));
        const { result } = renderHook(() => useElevation());

        let ret: boolean | null = null;
        await act(async () => {
            ret = await result.current.checkAdmin();
        });

        expect(ret).toBe(false);
        expect(result.current.isAdmin).toBe(false);
    });

    it("does not expose arbitrary elevated command execution", () => {
        const { result } = renderHook(() => useElevation());
        expect(result.current).not.toHaveProperty("elevateAndExecute");
    });
});
