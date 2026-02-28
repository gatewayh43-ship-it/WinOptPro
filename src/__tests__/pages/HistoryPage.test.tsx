import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, setupUser, waitFor } from "@/test/utils";
import { HistoryPage } from "@/pages/HistoryPage";
import * as tauriCore from "@tauri-apps/api/core";
import type { ReactNode } from "react";

vi.mock("framer-motion", async () => {
    const actual = await vi.importActual<typeof import("framer-motion")>("framer-motion");
    return {
        ...actual,
        motion: {
            ...actual.motion,
            div: ({ children, className, onClick }: React.HTMLAttributes<HTMLDivElement> & { children?: ReactNode }) => (
                <div className={className} onClick={onClick}>{children}</div>
            ),
        },
        AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
    };
});

const mockEntries = [
    {
        id: "hist-1",
        tweakId: "disable-sysmain",
        tweakName: "Disable SysMain",
        action: "APPLIED" as const,
        timestamp: Date.now() - 3600000,
        durationMs: 120,
        commandExecuted: "Set-Service -Name SysMain -StartupType Disabled",
        stdout: "Service stopped.",
        stderr: "",
        exitCode: 0,
        status: "SUCCESS" as const,
    },
    {
        id: "hist-2",
        tweakId: "disable-indexer",
        tweakName: "Disable Search Indexer",
        action: "REVERTED" as const,
        timestamp: Date.now() - 7200000,
        durationMs: 85,
        commandExecuted: "Set-Service -Name WSearch -StartupType Automatic",
        stdout: "",
        stderr: "",
        exitCode: 0,
        status: "SUCCESS" as const,
    },
];

describe("HistoryPage", () => {
    beforeEach(() => {
        vi.mocked(tauriCore.invoke).mockReset();
        vi.mocked(tauriCore.invoke).mockImplementation(async (cmd) => {
            if (cmd === "get_tweak_history") return mockEntries;
            if (cmd === "clear_tweak_history") return null;
            return null;
        });
    });

    it("shows loading skeletons initially", () => {
        vi.mocked(tauriCore.invoke).mockImplementation(() => new Promise(() => {}));
        render(<HistoryPage />);
        expect(document.querySelector(".animate-pulse")).toBeTruthy();
    });

    it("renders tweak names after loading", async () => {
        render(<HistoryPage />);
        expect(await screen.findByText("Disable SysMain")).toBeInTheDocument();
        expect(screen.getByText("Disable Search Indexer")).toBeInTheDocument();
    });

    it("shows empty state when no history", async () => {
        vi.mocked(tauriCore.invoke).mockImplementation(async (cmd) => {
            if (cmd === "get_tweak_history") return [];
            return null;
        });
        render(<HistoryPage />);
        expect(await screen.findByText(/no history entries yet/i)).toBeInTheDocument();
    });

    it("renders filter buttons: All, Applied, Reverted, Failed", async () => {
        render(<HistoryPage />);
        await screen.findByText("Disable SysMain");
        expect(screen.getByRole("button", { name: /^all$/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /^applied$/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /^reverted$/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /^failed$/i })).toBeInTheDocument();
    });

    it("Applied filter shows only APPLIED entries", async () => {
        const user = setupUser();
        render(<HistoryPage />);
        await screen.findByText("Disable SysMain");
        await user.click(screen.getByRole("button", { name: /^applied$/i }));
        expect(screen.getByText("Disable SysMain")).toBeInTheDocument();
        expect(screen.queryByText("Disable Search Indexer")).not.toBeInTheDocument();
    });

    it("Reverted filter shows only REVERTED entries", async () => {
        const user = setupUser();
        render(<HistoryPage />);
        await screen.findByText("Disable SysMain");
        await user.click(screen.getByRole("button", { name: /^reverted$/i }));
        expect(screen.queryByText("Disable SysMain")).not.toBeInTheDocument();
        expect(screen.getByText("Disable Search Indexer")).toBeInTheDocument();
    });

    it("Clear button is disabled when entries list is empty", async () => {
        vi.mocked(tauriCore.invoke).mockImplementation(async (cmd) => {
            if (cmd === "get_tweak_history") return [];
            return null;
        });
        render(<HistoryPage />);
        await screen.findByText(/no history entries yet/i);
        const clearBtn = screen.getByRole("button", { name: /clear/i });
        expect(clearBtn).toBeDisabled();
    });

    it("Clear button is enabled when entries exist", async () => {
        render(<HistoryPage />);
        await screen.findByText("Disable SysMain");
        const clearBtn = screen.getByRole("button", { name: /clear/i });
        expect(clearBtn).not.toBeDisabled();
    });

    it("Clear button triggers confirmation and calls clear_tweak_history", async () => {
        vi.stubGlobal("confirm", vi.fn(() => true));
        const user = setupUser();
        render(<HistoryPage />);
        await screen.findByText("Disable SysMain");
        await user.click(screen.getByRole("button", { name: /clear/i }));
        await waitFor(() => {
            expect(tauriCore.invoke).toHaveBeenCalledWith("clear_tweak_history");
        });
        vi.unstubAllGlobals();
    });

    it("Clear button does nothing when confirm is cancelled", async () => {
        vi.stubGlobal("confirm", vi.fn(() => false));
        const user = setupUser();
        render(<HistoryPage />);
        await screen.findByText("Disable SysMain");
        await user.click(screen.getByRole("button", { name: /clear/i }));
        expect(tauriCore.invoke).not.toHaveBeenCalledWith("clear_tweak_history");
        vi.unstubAllGlobals();
    });

    it("clicking an entry expands command details", async () => {
        const user = setupUser();
        render(<HistoryPage />);
        await screen.findByText("Disable SysMain");
        await user.click(screen.getByText("Disable SysMain"));
        expect(screen.getByText("Set-Service -Name SysMain -StartupType Disabled")).toBeInTheDocument();
    });

    it("clicking same entry again collapses it", async () => {
        const user = setupUser();
        render(<HistoryPage />);
        await screen.findByText("Disable SysMain");
        await user.click(screen.getByText("Disable SysMain"));
        expect(screen.getByText("Set-Service -Name SysMain -StartupType Disabled")).toBeInTheDocument();
        await user.click(screen.getByText("Disable SysMain"));
        expect(screen.queryByText("Set-Service -Name SysMain -StartupType Disabled")).not.toBeInTheDocument();
    });
});
