import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, setupUser, waitFor } from "@/test/utils";
import { StartupPage } from "@/pages/StartupPage";
import * as tauriCore from "@tauri-apps/api/core";
import type { ReactNode } from "react";

vi.mock("framer-motion", async () => {
    const actual = await vi.importActual<typeof import("framer-motion")>("framer-motion");
    return {
        ...actual,
        motion: {
            ...actual.motion,
            div: ({ children, className }: React.HTMLAttributes<HTMLDivElement> & { children?: ReactNode }) => (
                <div className={className}>{children}</div>
            ),
        },
        AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
    };
});

const mockItems = [
    { id: "item-1", name: "Discord", command: "C:\\Discord\\Discord.exe", location: "HKCU\\Software\\...", enabled: true },
    { id: "item-2", name: "Steam", command: "C:\\Steam\\steam.exe", location: "HKLM\\Software\\...", enabled: false },
    { id: "item-3", name: "Spotify", command: "C:\\Spotify\\Spotify.exe", location: "HKCU\\Software\\...", enabled: true },
];

describe("StartupPage", () => {
    beforeEach(() => {
        vi.mocked(tauriCore.invoke).mockReset();
        vi.mocked(tauriCore.invoke).mockImplementation(async (cmd) => {
            if (cmd === "get_startup_items") return mockItems;
            return null;
        });
    });

    it("shows loading spinner while fetching", () => {
        vi.mocked(tauriCore.invoke).mockImplementation(() => new Promise(() => {}));
        render(<StartupPage />);
        expect(document.querySelector(".animate-spin")).toBeTruthy();
    });

    it("renders startup items after loading", async () => {
        render(<StartupPage />);
        expect(await screen.findByText("Discord")).toBeInTheDocument();
        expect(screen.getByText("Steam")).toBeInTheDocument();
    });

    it("shows the item count", async () => {
        render(<StartupPage />);
        expect(await screen.findByText(/3 Startup Items Detected/i)).toBeInTheDocument();
    });

    it("shows command paths for items", async () => {
        render(<StartupPage />);
        await screen.findByText("Discord");
        expect(screen.getByText(/Discord\.exe/)).toBeInTheDocument();
    });

    it("filters items by search query", async () => {
        const user = setupUser();
        render(<StartupPage />);
        await screen.findByText("Discord");

        await user.type(
            screen.getByPlaceholderText(/search startup items/i),
            "Steam"
        );

        expect(screen.getByText("Steam")).toBeInTheDocument();
        expect(screen.queryByText("Discord")).not.toBeInTheDocument();
    });

    it("shows empty state when search has no matches", async () => {
        const user = setupUser();
        render(<StartupPage />);
        await screen.findByText("Discord");

        await user.type(
            screen.getByPlaceholderText(/search startup items/i),
            "xyzzy_no_match_xyz"
        );

        expect(screen.getByText(/no startup items found/i)).toBeInTheDocument();
    });

    it("calls set_startup_item_state when toggle clicked", async () => {
        const user = setupUser();
        render(<StartupPage />);
        await screen.findByText("Discord");

        const toggles = screen.getAllByRole("button");
        // The toggle buttons are the inline-flex h-6 w-11 buttons
        const toggleBtn = toggles.find((b) =>
            b.className.includes("inline-flex") && b.className.includes("rounded-full")
        );
        expect(toggleBtn).toBeTruthy();
        await user.click(toggleBtn!);

        await waitFor(() => {
            expect(tauriCore.invoke).toHaveBeenCalledWith("set_startup_item_state", expect.objectContaining({
                id: expect.any(String),
                enabled: expect.any(Boolean),
            }));
        });
    });

    it("shows error message when fetch fails", async () => {
        vi.mocked(tauriCore.invoke).mockRejectedValue(new Error("Registry access denied"));
        render(<StartupPage />);
        expect(await screen.findByText(/Registry access denied/i)).toBeInTheDocument();
    });

    it("refresh button re-fetches items", async () => {
        const user = setupUser();
        render(<StartupPage />);
        await screen.findByText("Discord");

        vi.mocked(tauriCore.invoke).mockClear();
        await user.click(screen.getByTitle("Refresh List"));

        await waitFor(() => {
            expect(tauriCore.invoke).toHaveBeenCalledWith("get_startup_items");
        });
    });
});
