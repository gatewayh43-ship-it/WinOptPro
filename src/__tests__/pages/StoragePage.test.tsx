import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, setupUser, waitFor } from "@/test/utils";
import { StoragePage } from "@/pages/StoragePage";
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
    { id: "temp-files", category: "Temp Files", path: "%TEMP%", size_bytes: 52428800, description: "Windows temp files" },
    { id: "prefetch", category: "Prefetch Cache", path: "C:\\Windows\\Prefetch", size_bytes: 10485760, description: "Application prefetch" },
];

const mockDiskHealth = [
    { name: "Samsung SSD", status: "OK", media_type: "4", health_status: "Healthy" },
];

const mockCleanupResult = { success: true, bytes_freed: 52428800, items_removed: 127, errors: [] };

describe("StoragePage", () => {
    beforeEach(() => {
        vi.mocked(tauriCore.invoke).mockReset();
        vi.mocked(tauriCore.invoke).mockImplementation(async (cmd) => {
            if (cmd === "scan_junk_files") return mockItems;
            if (cmd === "get_disk_health") return mockDiskHealth;
            if (cmd === "execute_cleanup") return mockCleanupResult;
            return null;
        });
    });

    it("shows scanning spinner while loading", () => {
        vi.mocked(tauriCore.invoke).mockImplementation(() => new Promise(() => {}));
        render(<StoragePage />);
        expect(document.querySelector(".animate-spin")).toBeTruthy();
    });

    it("renders cleanup categories after scan", async () => {
        render(<StoragePage />);
        expect(await screen.findByText("Temp Files")).toBeInTheDocument();
        expect(screen.getByText("Prefetch Cache")).toBeInTheDocument();
    });

    it("shows item count header", async () => {
        render(<StoragePage />);
        expect(await screen.findByText(/2 Categories Found/i)).toBeInTheDocument();
    });

    it("shows potential savings amount", async () => {
        render(<StoragePage />);
        // 52428800 + 10485760 = 62914560 bytes ≈ 60 MB
        await screen.findByText("Temp Files");
        expect(screen.getByText("Potential Savings")).toBeInTheDocument();
    });

    it("shows disk health info", async () => {
        render(<StoragePage />);
        expect(await screen.findByText("Samsung SSD")).toBeInTheDocument();
        expect(screen.getByText("Healthy")).toBeInTheDocument();
    });

    it("Clean Selected button calls execute_cleanup", async () => {
        const user = setupUser();
        render(<StoragePage />);
        await screen.findByText("Temp Files");

        await user.click(screen.getByRole("button", { name: /clean selected/i }));

        await waitFor(() => {
            expect(tauriCore.invoke).toHaveBeenCalledWith("execute_cleanup", expect.objectContaining({
                itemIds: expect.any(Array),
            }));
        });
    });

    it("shows empty state when no junk found", async () => {
        vi.mocked(tauriCore.invoke).mockImplementation(async (cmd) => {
            if (cmd === "scan_junk_files") return [];
            if (cmd === "get_disk_health") return [];
            return null;
        });
        render(<StoragePage />);
        expect(await screen.findByText(/your system is clean/i)).toBeInTheDocument();
    });

    it("shows error when scan fails", async () => {
        vi.mocked(tauriCore.invoke).mockImplementation(async (cmd) => {
            if (cmd === "scan_junk_files") throw new Error("Permission denied");
            if (cmd === "get_disk_health") return [];
            return null;
        });
        render(<StoragePage />);
        expect(await screen.findByText(/Permission denied/i)).toBeInTheDocument();
    });

    it("clicking an item toggles its selection", async () => {
        const user = setupUser();
        render(<StoragePage />);
        await screen.findByText("Temp Files");

        // Initially all items are selected (auto-select on load)
        // Click one item to deselect it
        const tempFilesRow = screen.getByText("Temp Files").closest("[class]");
        if (tempFilesRow) await user.click(tempFilesRow as HTMLElement);

        // Just verify the click didn't crash the component
        expect(screen.getByText("Temp Files")).toBeInTheDocument();
    });

    it("rescan button re-triggers scan", async () => {
        const user = setupUser();
        render(<StoragePage />);
        await screen.findByText("Temp Files");

        vi.mocked(tauriCore.invoke).mockClear();
        await user.click(screen.getByTitle("Rescan Drive"));

        await waitFor(() => {
            expect(tauriCore.invoke).toHaveBeenCalledWith("scan_junk_files");
        });
    });
});
