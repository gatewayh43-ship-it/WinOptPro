import { describe, it, expect, vi } from "vitest";
import { render, screen, setupUser, waitFor } from "@/test/utils";
import { HelpPage } from "@/pages/HelpPage";
import type { ReactNode } from "react";

vi.mock("framer-motion", async () => {
    const actual = await vi.importActual<typeof import("framer-motion")>("framer-motion");
    return {
        ...actual,
        motion: new Proxy(
            {
                div: ({ children, className, onClick }: any) => <div className={className} onClick={onClick}>{children}</div>,
                button: ({ children, className, onClick }: any) => <button className={className} onClick={onClick}>{children}</button>,
                p: ({ children, className }: any) => <p className={className}>{children}</p>,
                span: ({ children, className }: any) => <span className={className}>{children}</span>,
            },
            {
                get(target: any, key: string) {
                    if (key in target) return target[key];
                    // Fallback: render as the given HTML element
                    return ({ children, className, onClick }: any) => {
                        const Tag = key as any;
                        return <Tag className={className} onClick={onClick}>{children}</Tag>;
                    };
                }
            }
        ),
        AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
        useReducedMotion: () => false,
    };
});

vi.mock("@/hooks/useTweakExecution", () => ({
    useTweakExecution: vi.fn(() => ({
        applyTweak: vi.fn(),
        revertTweak: vi.fn(),
        validateTweak: vi.fn(),
        rollbackTweaks: vi.fn(),
        isExecuting: false,
    })),
}));

vi.mock("@/store/appStore", () => ({
    useAppStore: vi.fn((sel: (s: any) => any) =>
        sel({
            appliedTweaks: [],
            userSettings: { expertModeEnabled: false, aiAssistantEnabled: false },
            tweakFilterRisk: "All",
            tweakFilterCategory: "All",
            tweakSearchQuery: "",
            updateSettings: vi.fn(),
            setTweakFilter: vi.fn(),
            addAppliedTweak: vi.fn(),
            removeAppliedTweak: vi.fn(),
        })
    ),
}));

vi.mock("@/components/ToastSystem", () => {
    const addToast = vi.fn();
    return { useToast: () => ({ addToast }) };
});

vi.mock("@/components/ConfirmDeployModal", () => ({
    ConfirmDeployModal: () => null,
}));

vi.mock("@/components/ProgressModal", () => ({
    ProgressModal: () => null,
}));

describe("HelpPage", () => {
    it("renders the Overview section by default", () => {
        render(<HelpPage />);
        expect(screen.getByText("WinOpt Pro Help")).toBeInTheDocument();
    });

    it("shows the left nav with section links", () => {
        render(<HelpPage />);
        // Both desktop and mobile nav render buttons — use getAllByRole
        expect(screen.getAllByRole("button", { name: /Overview/i }).length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByRole("button", { name: /Setup Guide/i }).length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByRole("button", { name: /FAQ/i }).length).toBeGreaterThanOrEqual(1);
    });

    it("clicking Setup Guide nav button switches to setup section", async () => {
        const user = setupUser();
        render(<HelpPage />);
        // Click the first instance (desktop nav)
        await user.click(screen.getAllByRole("button", { name: /Setup Guide/i })[0]);
        await waitFor(() => {
            expect(screen.getByText(/Getting Started/i)).toBeInTheDocument();
        });
    });

    it("clicking Tweaks Browser nav button switches to tweaks section", async () => {
        const user = setupUser();
        render(<HelpPage />);
        await user.click(screen.getAllByRole("button", { name: /Tweaks Browser/i })[0]);
        await waitFor(() => {
            expect(screen.getByPlaceholderText(/Search tweaks/i)).toBeInTheDocument();
        });
    });

    it("clicking FAQ nav button shows FAQ section", async () => {
        const user = setupUser();
        render(<HelpPage />);
        await user.click(screen.getAllByRole("button", { name: /FAQ/i })[0]);
        await waitFor(() => {
            expect(screen.getByText(/Is WinOpt Pro safe/i)).toBeInTheDocument();
        });
    });

    it("clicking Shortcuts nav button shows shortcuts section", async () => {
        const user = setupUser();
        render(<HelpPage />);
        await user.click(screen.getAllByRole("button", { name: /Shortcuts/i })[0]);
        await waitFor(() => {
            expect(screen.getByText("Keyboard Shortcuts")).toBeInTheDocument();
        });
    });

    it("home section links to navigate to other sections", () => {
        render(<HelpPage />);
        // Home section shows the description of the app
        expect(screen.getByText(/all-in-one Windows optimization/i)).toBeInTheDocument();
    });
});
