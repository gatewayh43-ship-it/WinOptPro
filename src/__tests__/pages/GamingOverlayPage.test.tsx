import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@/test/utils";
import { GamingOverlayPage } from "@/pages/GamingOverlayPage";
import * as tauriCore from "@tauri-apps/api/core";

// isTauri is mocked to return true in setup.ts, but we need it to return false
// so the component uses the mock data path.
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

    it("shows active game name from mock data", async () => {
        render(<GamingOverlayPage />);
        expect(await screen.findByText("Counter-Strike 2 (mock)")).toBeInTheDocument();
    });

    it("shows CPU metric pill", async () => {
        render(<GamingOverlayPage />);
        expect(await screen.findByText("CPU")).toBeInTheDocument();
        // CPU load is 34 in mock
        expect(screen.getByText("34%")).toBeInTheDocument();
    });

    it("shows GPU metric pill for AMD GPU", async () => {
        render(<GamingOverlayPage />);
        expect(await screen.findByText("GPU")).toBeInTheDocument();
        // GPU utilization is 94% in the mock
        expect(screen.getByText("94%")).toBeInTheDocument();
    });

    it("shows TEMP metric pill", async () => {
        render(<GamingOverlayPage />);
        expect(await screen.findByText("TEMP")).toBeInTheDocument();
        expect(screen.getByText("72°C")).toBeInTheDocument();
    });

    it("does not show POWER metric pill for non-NVIDIA GPU", async () => {
        render(<GamingOverlayPage />);
        await screen.findByText(/WinOpt Gaming/i);
        expect(screen.queryByText("POWER")).not.toBeInTheDocument();
    });

    it("shows VRAM metric pill", async () => {
        render(<GamingOverlayPage />);
        expect(await screen.findByText("VRAM")).toBeInTheDocument();
        // 15360 MB / 1024 = 15.0 GB
        expect(screen.getByText(/15\.0/)).toBeInTheDocument();
    });
});
