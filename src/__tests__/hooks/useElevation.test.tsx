import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@/test/utils";
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

    it("isElevating is false initially", () => {
        const { result } = renderHook(() => useElevation());
        expect(result.current.isElevating).toBe(false);
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

    it("elevateAndExecute calls invoke with the code", async () => {
        vi.mocked(tauriCore.invoke).mockResolvedValue({ success: true, output: "Done", error: "" });
        const { result } = renderHook(() => useElevation());

        await act(async () => {
            await result.current.elevateAndExecute("Get-Service SysMain");
        });

        expect(tauriCore.invoke).toHaveBeenCalledWith("elevate_and_execute", {
            code: "Get-Service SysMain",
        });
    });

    it("elevateAndExecute returns the invoke result on success", async () => {
        const mockResult = { success: true, output: "Done", error: "" };
        vi.mocked(tauriCore.invoke).mockResolvedValue(mockResult);
        const { result } = renderHook(() => useElevation());

        let ret: unknown;
        await act(async () => {
            ret = await result.current.elevateAndExecute("Get-Service");
        });

        expect(ret).toEqual(mockResult);
    });

    it("elevateAndExecute returns error result when invoke throws", async () => {
        vi.mocked(tauriCore.invoke).mockRejectedValue(new Error("UAC cancelled"));
        const { result } = renderHook(() => useElevation());

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let ret: any = null;
        await act(async () => {
            ret = await result.current.elevateAndExecute("Set-Service");
        });

        expect(ret?.success).toBe(false);
        expect(ret?.error).toContain("UAC cancelled");
    });

    it("isElevating is true during elevateAndExecute and false after", async () => {
        let resolveElevate!: (v: unknown) => void;
        const slowElevate = new Promise((res) => { resolveElevate = res; });
        vi.mocked(tauriCore.invoke).mockReturnValue(slowElevate as any);

        const { result } = renderHook(() => useElevation());

        act(() => { result.current.elevateAndExecute("Get-Service"); });
        await waitFor(() => expect(result.current.isElevating).toBe(true));

        resolveElevate({ success: true, output: "", error: "" });
        await waitFor(() => expect(result.current.isElevating).toBe(false));
    });
});
