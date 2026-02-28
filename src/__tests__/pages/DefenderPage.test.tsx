import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, setupUser, waitFor } from "@/test/utils";
import { DefenderPage } from "@/pages/DefenderPage";
import * as tauriCore from "@tauri-apps/api/core";

const mockStatus = {
    realtimeProtectionEnabled: true,
    signatureOutOfDate: false,
    antivirusSignatureAge: 1,
    quickScanAge: 3,
    fullScanAge: 7,
};

describe("DefenderPage", () => {
    beforeEach(() => {
        vi.mocked(tauriCore.invoke).mockReset();
        vi.mocked(tauriCore.invoke).mockImplementation(async (cmd) => {
            if (cmd === "defender_get_status") return mockStatus;
            return null;
        });
    });

    it("shows loading spinner while status is loading", () => {
        // Never resolve so we stay in loading state
        vi.mocked(tauriCore.invoke).mockImplementation(() => new Promise(() => {}));
        render(<DefenderPage />);
        expect(document.querySelector(".animate-spin")).toBeTruthy();
    });

    it("renders protection status sections after loading", async () => {
        render(<DefenderPage />);
        expect(await screen.findByText("Real-Time Protection")).toBeInTheDocument();
        expect(screen.getByText("Security Intelligence")).toBeInTheDocument();
    });

    it("shows System Protected badge when realtime on and signatures current", async () => {
        render(<DefenderPage />);
        expect(await screen.findByText("System Protected")).toBeInTheDocument();
    });

    it("shows Action Needed when realtime protection is disabled", async () => {
        vi.mocked(tauriCore.invoke).mockImplementation(async (cmd) => {
            if (cmd === "defender_get_status") return { ...mockStatus, realtimeProtectionEnabled: false };
            return null;
        });
        render(<DefenderPage />);
        expect(await screen.findByText("Action Needed")).toBeInTheDocument();
    });

    it("shows Action Needed when signatures are out of date", async () => {
        vi.mocked(tauriCore.invoke).mockImplementation(async (cmd) => {
            if (cmd === "defender_get_status") return { ...mockStatus, signatureOutOfDate: true };
            return null;
        });
        render(<DefenderPage />);
        expect(await screen.findByText("Action Needed")).toBeInTheDocument();
    });

    it("displays signature age", async () => {
        render(<DefenderPage />);
        expect(await screen.findByText(/signature age.*1 days/i)).toBeInTheDocument();
    });

    it("shows update warning when signatures out of date", async () => {
        vi.mocked(tauriCore.invoke).mockImplementation(async (cmd) => {
            if (cmd === "defender_get_status") return { ...mockStatus, signatureOutOfDate: true };
            return null;
        });
        render(<DefenderPage />);
        expect(await screen.findByText(/updates are out of date/i)).toBeInTheDocument();
    });

    it("displays Quick Scan last run info", async () => {
        render(<DefenderPage />);
        expect(await screen.findByText(/last run:.*3 days ago/i)).toBeInTheDocument();
    });

    it("shows 'Never' for quickScanAge of 4294967295", async () => {
        vi.mocked(tauriCore.invoke).mockImplementation(async (cmd) => {
            if (cmd === "defender_get_status") return { ...mockStatus, quickScanAge: 4294967295 };
            return null;
        });
        render(<DefenderPage />);
        expect(await screen.findByText(/last run: Never/i)).toBeInTheDocument();
    });

    it("calls defender_run_scan with Quick when Quick Scan clicked", async () => {
        const user = setupUser();
        render(<DefenderPage />);
        await screen.findByText("System Protected");
        await user.click(screen.getByRole("button", { name: /^quick scan$/i }));
        await waitFor(() => {
            expect(tauriCore.invoke).toHaveBeenCalledWith("defender_run_scan", { scanType: "Quick" });
        });
    });

    it("calls defender_run_scan with Full when Full Scan clicked", async () => {
        const user = setupUser();
        render(<DefenderPage />);
        await screen.findByText("System Protected");
        await user.click(screen.getByRole("button", { name: /^full scan$/i }));
        await waitFor(() => {
            expect(tauriCore.invoke).toHaveBeenCalledWith("defender_run_scan", { scanType: "Full" });
        });
    });

    it("calls defender_update_signatures when Check for Updates clicked", async () => {
        const user = setupUser();
        render(<DefenderPage />);
        await screen.findByText("System Protected");
        await user.click(screen.getByRole("button", { name: /check for updates/i }));
        await waitFor(() => {
            expect(tauriCore.invoke).toHaveBeenCalledWith("defender_update_signatures");
        });
    });

    it("calls defender_set_realtime when toggle changed", async () => {
        const user = setupUser();
        render(<DefenderPage />);
        await screen.findByText("System Protected");
        const toggle = screen.getByRole("checkbox");
        await user.click(toggle);
        await waitFor(() => {
            expect(tauriCore.invoke).toHaveBeenCalledWith("defender_set_realtime", { enabled: false });
        });
    });
});
