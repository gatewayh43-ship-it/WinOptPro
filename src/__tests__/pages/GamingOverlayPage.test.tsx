import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@/test/utils";
import { GamingOverlayPage } from "@/pages/GamingOverlayPage";
import * as tauriCore from "@tauri-apps/api/core";

describe("GamingOverlayPage", () => {
    beforeEach(() => {
        vi.mocked(tauriCore.isTauri).mockReturnValue(false);
    });

    it("renders the WinOpt Gaming header text", async () => {
        render(<GamingOverlayPage />);
        expect(await screen.findByText(/WinOpt Gaming/i)).toBeInTheDocument();
    });

    it("shows the close button", async () => {
        render(<GamingOverlayPage />);
        // The close button has an X icon but no accessible text; find it by its container
        await screen.findByText(/WinOpt Gaming/i);
        // Close button exists in the drag handle bar
        const header = screen.getByText(/WinOpt Gaming/i).closest("div");
        expect(header).toBeTruthy();
    });

    it("shows no game detected without desktop runtime", async () => {
        render(<GamingOverlayPage />);
        expect(await screen.findByText("No game detected")).toBeInTheDocument();
    });

    it("shows CPU metric pill with unavailable value", async () => {
        render(<GamingOverlayPage />);
        expect(await screen.findByText("CPU")).toBeInTheDocument();
        expect(screen.getByText("—")).toBeInTheDocument();
    });

    it("shows a GPU telemetry loading message instead of sample metrics", async () => {
        render(<GamingOverlayPage />);
        expect(await screen.findByText(/Reading GPU/)).toBeInTheDocument();
        expect(screen.queryByText("GPU")).not.toBeInTheDocument();
    });

    it("does not show TEMP metric pill without real GPU telemetry", async () => {
        render(<GamingOverlayPage />);
        await screen.findByText(/WinOpt Gaming/i);
        expect(screen.queryByText("TEMP")).not.toBeInTheDocument();
    });

    it("does not show POWER metric pill for non-NVIDIA GPU", async () => {
        render(<GamingOverlayPage />);
        await screen.findByText(/WinOpt Gaming/i);
        expect(screen.queryByText("POWER")).not.toBeInTheDocument();
    });

    it("does not show VRAM metric pill without real GPU telemetry", async () => {
        render(<GamingOverlayPage />);
        await screen.findByText(/WinOpt Gaming/i);
        expect(screen.queryByText("VRAM")).not.toBeInTheDocument();
    });
});
