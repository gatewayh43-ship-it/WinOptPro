import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@/test/utils";
import { useFeatureAutomations } from "@/hooks/useFeatureAutomations";
import * as tauriCore from "@tauri-apps/api/core";

const mockAutomations = [
    {
        preset: {
            id: "defender-signatures",
            label: "Defender Signature Updates",
            category: "Security",
            description: "Refreshes signatures.",
            defaultFrequency: "DAILY",
            requiresAdmin: true,
            risk: "Low",
        },
        config: null,
        task: null,
    },
];

describe("useFeatureAutomations", () => {
    beforeEach(() => {
        vi.mocked(tauriCore.invoke).mockReset();
    });

    it("loads feature automations on mount", async () => {
        vi.mocked(tauriCore.invoke).mockResolvedValue(mockAutomations);
        const { result } = renderHook(() => useFeatureAutomations());

        await waitFor(() => expect(result.current.automations).toEqual(mockAutomations));
        expect(tauriCore.invoke).toHaveBeenCalledWith("list_feature_automations");
    });

    it("configureAutomation calls configure_feature_automation", async () => {
        vi.mocked(tauriCore.invoke).mockImplementation(async (cmd) => {
            if (cmd === "list_feature_automations") return mockAutomations;
            if (cmd === "configure_feature_automation") return true;
            return null;
        });
        const { result } = renderHook(() => useFeatureAutomations());
        await waitFor(() => expect(result.current.automations.length).toBe(1));

        await act(async () => {
            await result.current.configureAutomation({
                id: "defender-signatures",
                enabled: true,
                frequency: "DAILY",
                time: "02:00",
            });
        });

        expect(tauriCore.invoke).toHaveBeenCalledWith("configure_feature_automation", {
            config: {
                id: "defender-signatures",
                enabled: true,
                frequency: "DAILY",
                time: "02:00",
            },
        });
    });
});
