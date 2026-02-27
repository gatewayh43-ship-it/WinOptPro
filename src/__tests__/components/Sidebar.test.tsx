import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, setupUser } from "@/test/utils";
import { Sidebar } from "@/components/layout/Sidebar";
import { ThemeProvider } from "@/hooks/useTheme";
import type { ReactNode } from "react";

// ── Framer Motion mock ────────────────────────────────────────────────────────

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
        useReducedMotion: () => true,
    };
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderSidebar(currentView: string, setView = vi.fn()) {
    return render(
        <ThemeProvider defaultTheme="dark" defaultColorScheme="default">
            <Sidebar currentView={currentView} setView={setView} />
        </ThemeProvider>
    );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Sidebar", () => {
    beforeEach(() => {
        localStorage.clear();
        document.documentElement.className = "";
    });

    // ── Nav item rendering ────────────────────────────────────────────────────

    it("renders the brand name", () => {
        renderSidebar("dashboard");
        expect(screen.getByText("WinOpt")).toBeInTheDocument();
    });

    it("renders all main System Tuning nav items", () => {
        renderSidebar("dashboard");
        expect(screen.getByTitle("Overview")).toBeInTheDocument();
        expect(screen.getByTitle("Performance")).toBeInTheDocument();
        expect(screen.getByTitle("Privacy")).toBeInTheDocument();
        expect(screen.getByTitle("Gaming")).toBeInTheDocument();
        expect(screen.getByTitle("Network")).toBeInTheDocument();
        expect(screen.getByTitle("Power")).toBeInTheDocument();
        expect(screen.getByTitle("Debloat")).toBeInTheDocument();
        expect(screen.getByTitle("Windows UI")).toBeInTheDocument();
        expect(screen.getByTitle("Updates")).toBeInTheDocument();
    });

    it("renders all Utilities nav items", () => {
        renderSidebar("dashboard");
        expect(screen.getByTitle("Process Manager")).toBeInTheDocument();
        expect(screen.getByTitle("Network Analyzer")).toBeInTheDocument();
        expect(screen.getByTitle("Startup Apps")).toBeInTheDocument();
        expect(screen.getByTitle("Storage Optimizer")).toBeInTheDocument();
        expect(screen.getByTitle("Profiles")).toBeInTheDocument();
        expect(screen.getByTitle("History")).toBeInTheDocument();
        expect(screen.getByTitle("Settings")).toBeInTheDocument();
    });

    // ── Navigation ────────────────────────────────────────────────────────────

    it("calls setView with the correct id when a nav item is clicked", async () => {
        const setView = vi.fn();
        const user = setupUser();
        renderSidebar("dashboard", setView);

        await user.click(screen.getByTitle("Performance"));
        expect(setView).toHaveBeenCalledWith("performance");
    });

    it("calls setView with 'gaming' when Gaming is clicked", async () => {
        const setView = vi.fn();
        const user = setupUser();
        renderSidebar("dashboard", setView);

        await user.click(screen.getByTitle("Gaming"));
        expect(setView).toHaveBeenCalledWith("gaming");
    });

    it("calls setView with 'settings' when Settings is clicked", async () => {
        const setView = vi.fn();
        const user = setupUser();
        renderSidebar("dashboard", setView);

        await user.click(screen.getByTitle("Settings"));
        expect(setView).toHaveBeenCalledWith("settings");
    });

    // ── Active state ──────────────────────────────────────────────────────────

    it("highlights the active nav item via class", () => {
        renderSidebar("performance");
        const activeBtn = screen.getByTitle("Performance");
        expect(activeBtn.className).toContain("text-primary");
    });

    it("does not highlight inactive items", () => {
        renderSidebar("performance");
        const inactiveBtn = screen.getByTitle("Gaming");
        expect(inactiveBtn.className).not.toContain("text-primary");
    });

    // ── Theme toggle ──────────────────────────────────────────────────────────

    it("renders the theme toggle button", () => {
        renderSidebar("dashboard");
        expect(screen.getByTitle("Toggle Theme")).toBeInTheDocument();
    });

    it("toggles theme between dark and light when button is clicked", async () => {
        const user = setupUser();
        renderSidebar("dashboard");

        const themeBtn = screen.getByTitle("Toggle Theme");
        // Initial: dark — shows Sun icon (click to switch to light)
        await user.click(themeBtn);
        expect(localStorage.getItem("vite-ui-theme")).toBe("light");
    });

    // ── Color picker ──────────────────────────────────────────────────────────

    it("renders the color theme button", () => {
        renderSidebar("dashboard");
        expect(screen.getByTitle("Change Color Theme")).toBeInTheDocument();
    });

    it("opens the color picker popover on click", async () => {
        const user = setupUser();
        renderSidebar("dashboard");

        await user.click(screen.getByTitle("Change Color Theme"));
        // Color scheme options appear
        expect(screen.getByTitle("Teal")).toBeInTheDocument();
        expect(screen.getByTitle("Rose")).toBeInTheDocument();
        expect(screen.getByTitle("Amber")).toBeInTheDocument();
        expect(screen.getByTitle("Emerald")).toBeInTheDocument();
    });

    it("closes the color picker when a color is selected", async () => {
        const user = setupUser();
        renderSidebar("dashboard");

        await user.click(screen.getByTitle("Change Color Theme"));
        await user.click(screen.getByTitle("Rose"));

        expect(screen.queryByTitle("Teal")).not.toBeInTheDocument();
        expect(localStorage.getItem("vite-ui-color")).toBe("rose");
    });

    it("closes the color picker when clicking outside (backdrop)", async () => {
        const user = setupUser();
        renderSidebar("dashboard");

        await user.click(screen.getByTitle("Change Color Theme"));
        expect(screen.getByTitle("Teal")).toBeInTheDocument();

        // Click the backdrop (fixed overlay div)
        const backdrop = document.querySelector(".fixed.inset-0.z-40") as HTMLElement;
        expect(backdrop).toBeInTheDocument();
        await user.click(backdrop!);

        expect(screen.queryByTitle("Teal")).not.toBeInTheDocument();
    });

    // ── Command Palette trigger ───────────────────────────────────────────────

    it("renders the Jump to... / command palette trigger button", () => {
        renderSidebar("dashboard");
        expect(screen.getByText("Jump to...")).toBeInTheDocument();
    });
});
