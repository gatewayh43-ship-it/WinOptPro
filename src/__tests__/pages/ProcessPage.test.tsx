import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, setupUser, waitFor } from "@/test/utils";
import { ProcessPage } from "@/pages/ProcessPage";
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

const mockProcesses = [
    { pid: 1234, name: "chrome.exe", cpu_usage: 5.2, memory_bytes: 314572800, disk_read_bytes: 0, disk_written_bytes: 0, user: "User" },
    { pid: 5678, name: "explorer.exe", cpu_usage: 0.5, memory_bytes: 52428800, disk_read_bytes: 0, disk_written_bytes: 0, user: "User" },
    { pid: 9012, name: "discord.exe", cpu_usage: 1.1, memory_bytes: 157286400, disk_read_bytes: 0, disk_written_bytes: 0, user: "User" },
];

describe("ProcessPage", () => {
    beforeEach(() => {
        vi.mocked(tauriCore.invoke).mockReset();
        vi.mocked(tauriCore.invoke).mockImplementation(async (cmd) => {
            if (cmd === "get_processes") return mockProcesses;
            if (cmd === "is_admin") return false;
            return null;
        });
    });

    it("shows loading state initially", () => {
        vi.mocked(tauriCore.invoke).mockImplementation(() => new Promise(() => {}));
        render(<ProcessPage />);
        expect(screen.getByText(/Loading active processes/i)).toBeInTheDocument();
    });

    it("renders process names after loading", async () => {
        render(<ProcessPage />);
        expect(await screen.findByText("chrome.exe")).toBeInTheDocument();
        expect(screen.getByText("explorer.exe")).toBeInTheDocument();
        expect(screen.getByText("discord.exe")).toBeInTheDocument();
    });

    it("shows total process count stat", async () => {
        render(<ProcessPage />);
        await screen.findByText("chrome.exe");
        expect(screen.getByText("3")).toBeInTheDocument();
    });

    it("shows system process badge for explorer.exe", async () => {
        render(<ProcessPage />);
        await screen.findByText("explorer.exe");
        expect(screen.getByText("Sys")).toBeInTheDocument();
    });

    it("filters processes by search input", async () => {
        const user = setupUser();
        render(<ProcessPage />);
        await screen.findByText("chrome.exe");

        await user.type(
            screen.getByPlaceholderText(/filter by name or pid/i),
            "chrome"
        );

        expect(screen.getByText("chrome.exe")).toBeInTheDocument();
        expect(screen.queryByText("discord.exe")).not.toBeInTheDocument();
    });

    it("shows no results message when search finds nothing", async () => {
        const user = setupUser();
        render(<ProcessPage />);
        await screen.findByText("chrome.exe");

        await user.type(
            screen.getByPlaceholderText(/filter by name or pid/i),
            "xyzzy_not_found"
        );

        expect(screen.getByText(/no associated processes found/i)).toBeInTheDocument();
    });

    it("shows limited privileges card when isAdmin is null (not fetched)", async () => {
        render(<ProcessPage />);
        await screen.findByText("chrome.exe");
        // isAdmin starts as null, !null = true, so Limited Privileges shows
        expect(screen.getByText("Limited Privileges")).toBeInTheDocument();
    });

    it("opens kill confirmation modal when kill button clicked", async () => {
        const user = setupUser();
        render(<ProcessPage />);
        await screen.findByText("chrome.exe");

        // Find and click the X button for chrome.exe row
        const killButtons = screen.getAllByTitle(/end task/i);
        await user.click(killButtons[0]);

        expect(screen.getByText("End Process?")).toBeInTheDocument();
    });

    it("cancel closes the kill confirmation modal", async () => {
        const user = setupUser();
        render(<ProcessPage />);
        await screen.findByText("chrome.exe");

        const killButtons = screen.getAllByTitle(/end task/i);
        await user.click(killButtons[0]);
        expect(screen.getByText("End Process?")).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: /^cancel$/i }));
        expect(screen.queryByText("End Process?")).not.toBeInTheDocument();
    });

    it("Force Kill calls kill_process", async () => {
        const user = setupUser();
        render(<ProcessPage />);
        await screen.findByText("chrome.exe");

        const killButtons = screen.getAllByTitle(/end task/i);
        await user.click(killButtons[0]);

        await user.click(screen.getByRole("button", { name: /force kill/i }));

        await waitFor(() => {
            expect(tauriCore.invoke).toHaveBeenCalledWith("kill_process", expect.objectContaining({
                pid: expect.any(Number),
            }));
        });
    });

    it("shows critical process warning in kill modal for system processes", async () => {
        const user = setupUser();
        render(<ProcessPage />);
        await screen.findByText("explorer.exe");

        // Find the kill button for explorer.exe (a critical process)
        const explorerKillBtn = screen.getByTitle("End Task: explorer.exe");
        await user.click(explorerKillBtn);

        expect(screen.getByText(/critical system process/i)).toBeInTheDocument();
    });
});
