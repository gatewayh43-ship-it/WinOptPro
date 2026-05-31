import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, setupUser, waitFor } from "@/test/utils";
import { SoftwareUpdatesPage } from "@/pages/SoftwareUpdatesPage";
import * as tauriCore from "@tauri-apps/api/core";

const updates = [
    {
        name: "Visual Studio Code",
        packageId: "Microsoft.VisualStudioCode",
        currentVersion: "1.0.0",
        availableVersion: "1.1.0",
        source: "winget",
        betaPackageId: "Microsoft.VisualStudioCode.Insiders",
    },
    {
        name: "VLC media player",
        packageId: "VideoLAN.VLC",
        currentVersion: "3.0.0",
        availableVersion: "3.1.0",
        source: "winget",
        betaPackageId: null,
    },
];

describe("SoftwareUpdatesPage", () => {
    beforeEach(() => {
        vi.mocked(tauriCore.invoke).mockReset();
        vi.mocked(tauriCore.invoke).mockImplementation(async (cmd) => {
            if (cmd === "scan_software_updates") return updates;
            if (cmd === "get_software_update_automation") return null;
            if (cmd === "configure_software_update_automation") return true;
            if (cmd === "update_software_package") {
                return {
                    success: true,
                    method: "winget-upgrade",
                    packageId: "Microsoft.VisualStudioCode",
                    targetPackageId: "Microsoft.VisualStudioCode",
                    channel: "stable",
                    output: "Updated",
                    error: "",
                };
            }
            return null;
        });
    });

    it("renders the page and scans on mount", async () => {
        render(<SoftwareUpdatesPage />);

        expect(screen.getByText("Software Updates")).toBeInTheDocument();
        await waitFor(() => expect(tauriCore.invoke).toHaveBeenCalledWith("scan_software_updates"));
        expect(await screen.findByText("Visual Studio Code")).toBeInTheDocument();
        expect(screen.getByText("VLC media player")).toBeInTheDocument();
    });

    it("selects shown updates with the bulk action", async () => {
        const user = setupUser();
        render(<SoftwareUpdatesPage />);

        await screen.findByText("Visual Studio Code");
        await user.click(screen.getByRole("button", { name: /select shown/i }));

        expect(screen.getByLabelText("Select Visual Studio Code")).toBeChecked();
        expect(screen.getByLabelText("Select VLC media player")).toBeChecked();
    });

    it("updates selected packages with stable by default", async () => {
        const user = setupUser();
        render(<SoftwareUpdatesPage />);

        await screen.findByText("Visual Studio Code");
        await user.click(screen.getByLabelText("Select Visual Studio Code"));
        await user.click(screen.getByRole("button", { name: /update selected/i }));

        await waitFor(() => {
            expect(tauriCore.invoke).toHaveBeenCalledWith("update_software_package", {
                packageId: "Microsoft.VisualStudioCode",
                channel: "stable",
                betaPackageId: "Microsoft.VisualStudioCode.Insiders",
                source: "winget",
            });
        });
    });

    it("can switch a supported package to beta before updating", async () => {
        const user = setupUser();
        render(<SoftwareUpdatesPage />);

        await screen.findByText("Visual Studio Code");
        await user.click(screen.getByTitle("Beta package: Microsoft.VisualStudioCode.Insiders"));
        await user.click(screen.getByLabelText("Select Visual Studio Code"));
        await user.click(screen.getByRole("button", { name: /update selected/i }));

        await waitFor(() => {
            expect(tauriCore.invoke).toHaveBeenCalledWith("update_software_package", {
                packageId: "Microsoft.VisualStudioCode",
                channel: "beta",
                betaPackageId: "Microsoft.VisualStudioCode.Insiders",
                source: "winget",
            });
        });
    });

    it("saves an enabled auto-update schedule", async () => {
        const user = setupUser();
        render(<SoftwareUpdatesPage />);

        await screen.findByText("Visual Studio Code");
        await user.click(screen.getByLabelText("Enabled"));
        await user.click(screen.getByRole("button", { name: /save schedule/i }));

        await waitFor(() => {
            expect(tauriCore.invoke).toHaveBeenCalledWith("configure_software_update_automation", {
                settings: expect.objectContaining({
                    enabled: true,
                    frequency: "WEEKLY",
                    time: "03:00",
                    channel: "stable",
                    scope: "all",
                }),
            });
        });
    });
});
