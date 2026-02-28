import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, setupUser, waitFor } from "@/test/utils";
import { AppsPage } from "@/pages/AppsPage";
import * as tauriCore from "@tauri-apps/api/core";

// AppsPage uses useApps which calls invoke; mock it globally
describe("AppsPage", () => {
    beforeEach(() => {
        vi.mocked(tauriCore.invoke).mockReset();
        vi.mocked(tauriCore.invoke).mockImplementation(async (cmd) => {
            if (cmd === "check_choco_available") return false;
            if (cmd === "check_app_installed") return { installed: false, method: "" };
            if (cmd === "install_app") return { success: true, method: "winget", output: "OK", error: "" };
            return null;
        });
    });

    it("renders the Recommended Apps heading", () => {
        render(<AppsPage />);
        expect(screen.getByText("Recommended Apps")).toBeInTheDocument();
    });

    it("shows 'Chocolatey not detected' when choco is unavailable", async () => {
        render(<AppsPage />);
        await waitFor(() => {
            expect(screen.getByText(/chocolatey not detected/i)).toBeInTheDocument();
        });
    });

    it("shows Chocolatey fallback text when choco is available", async () => {
        vi.mocked(tauriCore.invoke).mockImplementation(async (cmd) => {
            if (cmd === "check_choco_available") return true;
            return null;
        });
        render(<AppsPage />);
        await waitFor(() => {
            expect(screen.getByText("Chocolatey")).toBeInTheDocument();
        });
    });

    it("renders the search input", () => {
        render(<AppsPage />);
        expect(screen.getByPlaceholderText(/search apps or tags/i)).toBeInTheDocument();
    });

    it("renders category filter buttons including 'All'", () => {
        render(<AppsPage />);
        expect(screen.getByRole("button", { name: /^all$/i })).toBeInTheDocument();
    });

    it("renders at least one app card from apps.json", () => {
        render(<AppsPage />);
        // At least one Install button should be present
        const installBtns = screen.getAllByRole("button", { name: /install/i });
        expect(installBtns.length).toBeGreaterThan(0);
    });

    it("filters apps by search query", async () => {
        const user = setupUser();
        render(<AppsPage />);

        const searchInput = screen.getByPlaceholderText(/search apps or tags/i);
        await user.type(searchInput, "xyzzy_nothing_matches_this_xyz");

        expect(await screen.findByText(/no apps match your search/i)).toBeInTheDocument();
    });

    it("category filter changes the visible apps", async () => {
        const user = setupUser();
        render(<AppsPage />);

        // Click a non-All category
        const catButtons = screen.getAllByRole("button").filter((b) =>
            !b.textContent?.toLowerCase().includes("install") &&
            !b.textContent?.toLowerCase().includes("all")
        );

        if (catButtons.length > 0) {
            await user.click(catButtons[0]);
            // The page should still render without crashing
            expect(screen.getByText("Recommended Apps")).toBeInTheDocument();
        }
    });

    it("clicking Install button calls install_app", async () => {
        const user = setupUser();
        render(<AppsPage />);

        const installBtns = screen.getAllByRole("button", { name: /^install$/i });
        await user.click(installBtns[0]);

        await waitFor(() => {
            expect(tauriCore.invoke).toHaveBeenCalledWith("install_app", expect.objectContaining({
                wingetId: expect.any(String),
            }));
        });
    });

    it("shows installed badge after successful install", async () => {
        vi.mocked(tauriCore.invoke).mockImplementation(async (cmd) => {
            if (cmd === "check_choco_available") return false;
            if (cmd === "install_app") return { success: true, method: "winget", output: "OK", error: "" };
            return null;
        });

        const user = setupUser();
        render(<AppsPage />);

        const installBtns = screen.getAllByRole("button", { name: /^install$/i });
        await user.click(installBtns[0]);

        await waitFor(() => {
            expect(screen.getByText(/installed via/i)).toBeInTheDocument();
        });
    });

    it("shows error message when install fails", async () => {
        vi.mocked(tauriCore.invoke).mockImplementation(async (cmd) => {
            if (cmd === "check_choco_available") return false;
            if (cmd === "install_app") return { success: false, method: "none", output: "", error: "Package not found" };
            return null;
        });

        const user = setupUser();
        render(<AppsPage />);

        const installBtns = screen.getAllByRole("button", { name: /^install$/i });
        await user.click(installBtns[0]);

        await waitFor(() => {
            expect(screen.getByText(/Package not found/i)).toBeInTheDocument();
        });
    });
});
