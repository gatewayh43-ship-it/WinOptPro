import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, setupUser, waitFor } from "@/test/utils";
import { AutomationPage } from "@/pages/AutomationPage";
import * as tauriCore from "@tauri-apps/api/core";

const automations = [
    {
        preset: {
            id: "defender-signatures",
            label: "Defender Signature Updates",
            category: "Security",
            description: "Refreshes Microsoft Defender malware definitions.",
            defaultFrequency: "DAILY",
            requiresAdmin: true,
            risk: "Low",
        },
        config: null,
        task: null,
    },
    {
        preset: {
            id: "storage-trim",
            label: "SSD TRIM Optimization",
            category: "Storage",
            description: "Runs TRIM on fixed SSD volumes.",
            defaultFrequency: "WEEKLY",
            requiresAdmin: true,
            risk: "Low",
        },
        config: { id: "storage-trim", enabled: true, frequency: "WEEKLY", time: "03:00" },
        task: { id: "Feature_storage-trim", name: "Feature_storage-trim", schedule: "Weekly", last_run: "Never", next_run: "2026-05-18 03:00", enabled: true },
    },
];

describe("AutomationPage", () => {
    beforeEach(() => {
        vi.mocked(tauriCore.invoke).mockReset();
        vi.mocked(tauriCore.invoke).mockImplementation(async (cmd) => {
            if (cmd === "list_feature_automations") return automations;
            if (cmd === "configure_feature_automation") return true;
            if (cmd === "delete_feature_automation") return true;
            if (cmd === "run_feature_automation_now") return true;
            return null;
        });
    });

    it("renders automation presets", async () => {
        render(<AutomationPage />);

        expect(screen.getByText("Automation Center")).toBeInTheDocument();
        expect(await screen.findByText("Defender Signature Updates")).toBeInTheDocument();
        expect(screen.getByText("SSD TRIM Optimization")).toBeInTheDocument();
    });

    it("saves a configured automation", async () => {
        const user = setupUser();
        render(<AutomationPage />);

        await screen.findByText("Defender Signature Updates");
        await user.click(screen.getByLabelText("Enable Defender Signature Updates"));
        const saveButtons = screen.getAllByRole("button", { name: /save/i });
        await user.click(saveButtons[0]);

        await waitFor(() => {
            expect(tauriCore.invoke).toHaveBeenCalledWith("configure_feature_automation", {
                config: expect.objectContaining({
                    id: "defender-signatures",
                    enabled: true,
                    frequency: "DAILY",
                }),
            });
        });
    });
});
