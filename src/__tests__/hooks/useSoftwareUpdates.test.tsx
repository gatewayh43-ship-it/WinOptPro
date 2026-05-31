import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@/test/utils";
import { useSoftwareUpdates } from "@/hooks/useSoftwareUpdates";
import * as tauriCore from "@tauri-apps/api/core";

const mockUpdate = {
    name: "Visual Studio Code",
    packageId: "Microsoft.VisualStudioCode",
    currentVersion: "1.0.0",
    availableVersion: "1.1.0",
    source: "winget",
    betaPackageId: "Microsoft.VisualStudioCode.Insiders",
};

const mockResult = {
    success: true,
    method: "winget-upgrade",
    packageId: "Microsoft.VisualStudioCode",
    targetPackageId: "Microsoft.VisualStudioCode",
    channel: "stable",
    output: "Updated",
    error: "",
};

describe("useSoftwareUpdates", () => {
    beforeEach(() => {
        vi.mocked(tauriCore.invoke).mockReset();
    });

    it("starts with empty update state", () => {
        const { result } = renderHook(() => useSoftwareUpdates());
        expect(result.current.updates).toEqual([]);
        expect(result.current.scanError).toBeNull();
        expect(result.current.updatingIds).toEqual({});
        expect(result.current.updateResults).toEqual({});
    });

    it("scanUpdates calls scan_software_updates and stores results", async () => {
        vi.mocked(tauriCore.invoke).mockResolvedValue([mockUpdate]);
        const { result } = renderHook(() => useSoftwareUpdates());

        await act(async () => {
            await result.current.scanUpdates();
        });

        expect(tauriCore.invoke).toHaveBeenCalledWith("scan_software_updates");
        expect(result.current.updates).toEqual([mockUpdate]);
    });

    it("scanUpdates stores errors and clears stale results", async () => {
        vi.mocked(tauriCore.invoke).mockRejectedValue(new Error("winget missing"));
        const { result } = renderHook(() => useSoftwareUpdates());

        await act(async () => {
            await result.current.scanUpdates();
        });

        expect(result.current.scanError).toContain("winget missing");
        expect(result.current.updates).toEqual([]);
    });

    it("updatePackage calls update_software_package with stable by default", async () => {
        vi.mocked(tauriCore.invoke).mockResolvedValue(mockResult);
        const { result } = renderHook(() => useSoftwareUpdates());

        await act(async () => {
            await result.current.updatePackage(mockUpdate);
        });

        expect(tauriCore.invoke).toHaveBeenCalledWith("update_software_package", {
            packageId: "Microsoft.VisualStudioCode",
            channel: "stable",
            betaPackageId: "Microsoft.VisualStudioCode.Insiders",
            source: "winget",
        });
        expect(result.current.updateResults["Microsoft.VisualStudioCode"]).toEqual(mockResult);
    });

    it("sets updatingIds while an update is running", async () => {
        let resolveUpdate!: (value: unknown) => void;
        const slowUpdate = new Promise((resolve) => {
            resolveUpdate = resolve;
        });
        vi.mocked(tauriCore.invoke).mockImplementation(async (cmd) => {
            if (cmd === "update_software_package") return slowUpdate;
            return null;
        });

        const { result } = renderHook(() => useSoftwareUpdates());
        act(() => {
            result.current.updatePackage(mockUpdate);
        });

        await waitFor(() => expect(result.current.updatingIds["Microsoft.VisualStudioCode"]).toBe(true));
        resolveUpdate(mockResult);
        await waitFor(() => expect(result.current.updatingIds["Microsoft.VisualStudioCode"]).toBe(false));
    });
});
