import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, setupUser, waitFor } from "@/test/utils";
import { PrebuiltDebloatPage } from "@/pages/PrebuiltDebloatPage";
import type { ReactNode } from "react";

vi.mock("framer-motion", () => ({
    motion: {
        div: ({ children, ...p }: React.HTMLAttributes<HTMLDivElement> & { children?: ReactNode }) =>
            <div {...p}>{children}</div>,
    },
    AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
    useReducedMotion: () => false,
}));

// Mock all SVG logo imports used by the component
vi.mock("@/assets/logos/hp.svg", () => ({ default: "/mock-hp.svg" }));
vi.mock("@/assets/logos/dell.svg", () => ({ default: "/mock-dell.svg" }));
vi.mock("@/assets/logos/lenovo.svg", () => ({ default: "/mock-lenovo.svg" }));
vi.mock("@/assets/logos/asus.svg", () => ({ default: "/mock-asus.svg" }));
vi.mock("@/assets/logos/acer.svg", () => ({ default: "/mock-acer.svg" }));
vi.mock("@/assets/logos/msi.svg", () => ({ default: "/mock-msi.svg" }));
vi.mock("@/assets/logos/razer.svg", () => ({ default: "/mock-razer.svg" }));
vi.mock("@/assets/logos/alienware.svg", () => ({ default: "/mock-alienware.svg" }));
vi.mock("@/assets/logos/corsair.svg", () => ({ default: "/mock-corsair.svg" }));
vi.mock("@/assets/logos/nzxt.svg", () => ({ default: "/mock-nzxt.svg" }));
vi.mock("@/assets/logos/samsung.svg", () => ({ default: "/mock-samsung.svg" }));
vi.mock("@/assets/logos/lg.svg", () => ({ default: "/mock-lg.svg" }));
vi.mock("@/assets/logos/huawei.svg", () => ({ default: "/mock-huawei.svg" }));
vi.mock("@/assets/logos/xiaomi.svg", () => ({ default: "/mock-xiaomi.svg" }));

// Mock debloat_profiles.json with minimal valid data
vi.mock("@/data/debloat_profiles.json", () => ({
    default: {
        profiles: [
            {
                id: "hp",
                name: "HP",
                logo: "https://logo.clearbit.com/hp.com",
                apps: [
                    { id: "HPInc.HPWolfSecurity", name: "HP Wolf Security", description: "HP bloatware" },
                    { id: "HPInc.HPSupportAssistant", name: "HP Support Assistant", description: "HP telemetry" },
                ],
            },
            {
                id: "dell",
                name: "Dell",
                logo: "https://logo.clearbit.com/dell.com",
                apps: [
                    { id: "DellInc.DellUpdate", name: "Dell Update", description: "Dell update tool" },
                ],
            },
        ],
    },
}));

// Mock tweaks.json — needs the correct structure with execution.code/revertCode
// The page filters by category === "Debloat" and uses riskLevel for profile tiering
vi.mock("@/data/tweaks.json", () => ({
    default: [
        {
            id: "RemoveBloatwareApps",
            name: "Remove Pre-installed Bloatware",
            category: "Debloat",
            riskLevel: "Green",
            requiresExpertMode: false,
            description: "Removes common pre-installed Windows apps like Solitaire, etc.",
            educationalContext: { howItWorks: "", pros: "", cons: "", expertDetails: "", interactions: "" },
            execution: {
                code: "Get-AppxPackage | Remove-AppxPackage",
                revertCode: "Write-Output 'Done'",
            },
            validationCmd: "Get-AppxPackage",
        },
        {
            id: "RemoveOneDrive",
            name: "Remove OneDrive",
            category: "Debloat",
            riskLevel: "Yellow",
            requiresExpertMode: false,
            description: "Completely removes Microsoft OneDrive from the system.",
            educationalContext: { howItWorks: "", pros: "", cons: "", expertDetails: "", interactions: "" },
            execution: {
                code: "Stop-Process -Name OneDrive -Force",
                revertCode: "Write-Output 'Reinstall OneDrive'",
            },
            validationCmd: "if (Get-Process -Name OneDrive) { 'Running' } else { 'Removed' }",
        },
        {
            id: "DisableXboxLive",
            name: "Disable Xbox Live Services",
            category: "Debloat",
            riskLevel: "Red",
            requiresExpertMode: false,
            description: "Disables Xbox live services.",
            educationalContext: { howItWorks: "", pros: "", cons: "", expertDetails: "", interactions: "" },
            execution: {
                code: "Set-Service XboxLive -StartupType Disabled",
                revertCode: "Set-Service XboxLive -StartupType Automatic",
            },
            validationCmd: "Get-Service XboxLive | Select-Object Status",
        },
        // A non-Debloat tweak to verify filtering
        {
            id: "DisableSysMain",
            name: "Disable SysMain",
            category: "Performance",
            riskLevel: "Green",
            requiresExpertMode: false,
            description: "Stops Windows from pre-loading apps into RAM.",
            educationalContext: { howItWorks: "", pros: "", cons: "", expertDetails: "", interactions: "" },
            execution: {
                code: "Stop-Service SysMain",
                revertCode: "Start-Service SysMain",
            },
            validationCmd: "Get-Service SysMain",
        },
    ],
}));

const mockApplyTweak = vi.fn();
const mockUninstallApp = vi.fn();
const addToast = vi.fn();

vi.mock("@/hooks/useTweakExecution", () => ({
    useTweakExecution: () => ({
        applyTweak: mockApplyTweak,
        revertTweak: vi.fn(),
        validateTweak: vi.fn(),
        isExecuting: false,
        executingTweakId: null,
    }),
}));

vi.mock("@/hooks/useApps", () => ({
    useApps: () => ({
        uninstallApp: mockUninstallApp,
        installingId: null,
        installResults: {},
        installedApps: {},
        chocoAvailable: false,
        checkChocoAvailable: vi.fn(),
        checkInstalled: vi.fn(),
        installApp: vi.fn(),
    }),
}));

vi.mock("@/components/ToastSystem", () => ({ useToast: () => ({ addToast }) }));

describe("PrebuiltDebloatPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("Step 1 — Profile selection", () => {
        it("renders without crash", () => {
            expect(() => render(<PrebuiltDebloatPage />)).not.toThrow();
        });

        it("shows the 'Debloater Wizard' heading", () => {
            render(<PrebuiltDebloatPage />);
            expect(screen.getByText(/debloater/i)).toBeInTheDocument();
            // "Wizard" appears both in the badge and in the h1; at least one should be present
            expect(screen.getAllByText(/wizard/i).length).toBeGreaterThanOrEqual(1);
        });

        it("renders the wizard step indicator", () => {
            render(<PrebuiltDebloatPage />);
            expect(screen.getByText(/1\. profile/i)).toBeInTheDocument();
            expect(screen.getByText(/2\. select targets/i)).toBeInTheDocument();
            expect(screen.getByText(/3\. execute/i)).toBeInTheDocument();
        });

        it("renders HP vendor profile card", () => {
            render(<PrebuiltDebloatPage />);
            expect(screen.getByText("HP")).toBeInTheDocument();
        });

        it("renders Dell vendor profile card", () => {
            render(<PrebuiltDebloatPage />);
            expect(screen.getByText("Dell")).toBeInTheDocument();
        });

        it("renders Windows Minimal profile card (isWindows safe profile)", () => {
            render(<PrebuiltDebloatPage />);
            expect(screen.getByText("Windows Minimal")).toBeInTheDocument();
        });

        it("renders Windows Standard profile card", () => {
            render(<PrebuiltDebloatPage />);
            expect(screen.getByText("Windows Standard")).toBeInTheDocument();
        });

        it("renders Windows Aggressive profile card", () => {
            render(<PrebuiltDebloatPage />);
            expect(screen.getByText("Windows Aggressive")).toBeInTheDocument();
        });

        it("shows risk badges for Windows profiles", () => {
            render(<PrebuiltDebloatPage />);
            expect(screen.getByText("Safe")).toBeInTheDocument();
            expect(screen.getByText("Moderate")).toBeInTheDocument();
            expect(screen.getByText("Aggressive")).toBeInTheDocument();
        });

        it("shows target counts for each profile", () => {
            render(<PrebuiltDebloatPage />);
            // Multiple profiles have target counts displayed
            const targetBadges = screen.getAllByText(/\d+ targets/);
            expect(targetBadges.length).toBeGreaterThan(0);
        });
    });

    describe("Step 1 → Step 2 transition", () => {
        it("clicking HP profile advances to step 2 showing HP apps", async () => {
            const user = setupUser();
            render(<PrebuiltDebloatPage />);

            await user.click(screen.getByText("HP"));

            await waitFor(() => {
                expect(screen.getByText("HP Wolf Security")).toBeInTheDocument();
            });
        });

        it("clicking HP profile shows HP Support Assistant in app list", async () => {
            const user = setupUser();
            render(<PrebuiltDebloatPage />);

            await user.click(screen.getByText("HP"));

            await waitFor(() => {
                expect(screen.getByText("HP Support Assistant")).toBeInTheDocument();
            });
        });

        it("step 2 shows 'HP Targets' heading after selecting HP", async () => {
            const user = setupUser();
            render(<PrebuiltDebloatPage />);

            await user.click(screen.getByText("HP"));

            await waitFor(() => {
                expect(screen.getByText(/HP Targets/)).toBeInTheDocument();
            });
        });

        it("step 2 shows 'Wipe Selected Targets' button", async () => {
            const user = setupUser();
            render(<PrebuiltDebloatPage />);

            await user.click(screen.getByText("HP"));

            await waitFor(() => {
                expect(screen.getByRole("button", { name: /wipe selected targets/i })).toBeInTheDocument();
            });
        });

        it("step 2 shows selection count badge", async () => {
            const user = setupUser();
            render(<PrebuiltDebloatPage />);

            await user.click(screen.getByText("HP"));

            await waitFor(() => {
                // HP has 2 apps, all selected by default → "2 / 2 Selected"
                expect(screen.getByText(/2 \/ 2 Selected/)).toBeInTheDocument();
            });
        });

        it("step 2 back button returns to step 1", async () => {
            const user = setupUser();
            render(<PrebuiltDebloatPage />);

            await user.click(screen.getByText("HP"));
            await waitFor(() => screen.getByText("HP Wolf Security"));

            // Click the back arrow button (ChevronRight rotated 180°)
            const backButton = screen.getByRole("button", { name: "" });
            await user.click(backButton);

            await waitFor(() => {
                expect(screen.getByText("Dell")).toBeInTheDocument();
            });
        });
    });

    describe("App toggling in step 2", () => {
        it("clicking an app card deselects it", async () => {
            const user = setupUser();
            render(<PrebuiltDebloatPage />);

            await user.click(screen.getByText("HP"));
            await waitFor(() => screen.getByText("HP Wolf Security"));

            // Click the HP Wolf Security card to deselect
            await user.click(screen.getByText("HP Wolf Security"));

            await waitFor(() => {
                // 1 of 2 now selected
                expect(screen.getByText(/1 \/ 2 Selected/)).toBeInTheDocument();
            });
        });

        it("deselecting all apps disables the Wipe button", async () => {
            const user = setupUser();
            render(<PrebuiltDebloatPage />);

            await user.click(screen.getByText("HP"));
            await waitFor(() => screen.getByText("HP Wolf Security"));

            // Deselect both apps
            await user.click(screen.getByText("HP Wolf Security"));
            await user.click(screen.getByText("HP Support Assistant"));

            await waitFor(() => {
                const wipeBtn = screen.getByRole("button", { name: /wipe selected targets/i });
                expect(wipeBtn).toBeDisabled();
            });
        });
    });

    describe("Apply Profile — vendor apps (HP)", () => {
        it("clicking 'Wipe Selected Targets' advances to step 3", async () => {
            mockUninstallApp.mockResolvedValue({ success: true, method: "winget", output: "", error: "" });
            const user = setupUser();
            render(<PrebuiltDebloatPage />);

            await user.click(screen.getByText("HP"));
            await waitFor(() => screen.getByRole("button", { name: /wipe selected targets/i }));

            await user.click(screen.getByRole("button", { name: /wipe selected targets/i }));

            await waitFor(() => {
                expect(screen.getByText(/operation complete|executing removal protocol/i)).toBeInTheDocument();
            });
        });

        it("clicking 'Wipe Selected Targets' calls uninstallApp for vendor profiles", async () => {
            mockUninstallApp.mockResolvedValue({ success: true, method: "winget", output: "", error: "" });
            const user = setupUser();
            render(<PrebuiltDebloatPage />);

            await user.click(screen.getByText("HP"));
            await waitFor(() => screen.getByRole("button", { name: /wipe selected targets/i }));
            await user.click(screen.getByRole("button", { name: /wipe selected targets/i }));

            await waitFor(() => {
                expect(mockUninstallApp).toHaveBeenCalled();
            });
        });

        it("calls uninstallApp for each selected HP app", async () => {
            mockUninstallApp.mockResolvedValue({ success: true, method: "winget", output: "", error: "" });
            const user = setupUser();
            render(<PrebuiltDebloatPage />);

            await user.click(screen.getByText("HP"));
            await waitFor(() => screen.getByRole("button", { name: /wipe selected targets/i }));
            await user.click(screen.getByRole("button", { name: /wipe selected targets/i }));

            await waitFor(() => {
                // HP has 2 apps selected by default
                expect(mockUninstallApp).toHaveBeenCalledTimes(2);
            });
        });

        it("shows app names in step 3 progress log", async () => {
            mockUninstallApp.mockResolvedValue({ success: true, method: "winget", output: "", error: "" });
            const user = setupUser();
            render(<PrebuiltDebloatPage />);

            await user.click(screen.getByText("HP"));
            await waitFor(() => screen.getByRole("button", { name: /wipe selected targets/i }));
            await user.click(screen.getByRole("button", { name: /wipe selected targets/i }));

            await waitFor(() => {
                expect(screen.getByText("HP Wolf Security")).toBeInTheDocument();
                expect(screen.getByText("HP Support Assistant")).toBeInTheDocument();
            });
        });

        it("shows 'Operation Complete' after all apps processed", async () => {
            mockUninstallApp.mockResolvedValue({ success: true, method: "winget", output: "", error: "" });
            const user = setupUser();
            render(<PrebuiltDebloatPage />);

            await user.click(screen.getByText("HP"));
            await waitFor(() => screen.getByRole("button", { name: /wipe selected targets/i }));
            await user.click(screen.getByRole("button", { name: /wipe selected targets/i }));

            await waitFor(() => {
                expect(screen.getByText("Operation Complete")).toBeInTheDocument();
            });
        });

        it("calls addToast after execution completes", async () => {
            mockUninstallApp.mockResolvedValue({ success: true, method: "winget", output: "", error: "" });
            const user = setupUser();
            render(<PrebuiltDebloatPage />);

            await user.click(screen.getByText("HP"));
            await waitFor(() => screen.getByRole("button", { name: /wipe selected targets/i }));
            await user.click(screen.getByRole("button", { name: /wipe selected targets/i }));

            await waitFor(() => {
                expect(addToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Debloat Complete" }));
            });
        });
    });

    describe("Apply Profile — Windows Minimal (tweak-based)", () => {
        it("clicking Windows Minimal shows its debloat tweaks in step 2", async () => {
            const user = setupUser();
            render(<PrebuiltDebloatPage />);

            await user.click(screen.getByText("Windows Minimal"));

            await waitFor(() => {
                // Windows Minimal uses Green riskLevel tweaks — "Remove Pre-installed Bloatware"
                expect(screen.getByText("Remove Pre-installed Bloatware")).toBeInTheDocument();
            });
        });

        it("clicking 'Wipe Selected Targets' for Windows Minimal calls applyTweak", async () => {
            mockApplyTweak.mockResolvedValue({ success: true, tweakId: "RemoveBloatwareApps", stdout: "", stderr: "", exitCode: 0, durationMs: 100 });
            const user = setupUser();
            render(<PrebuiltDebloatPage />);

            await user.click(screen.getByText("Windows Minimal"));
            await waitFor(() => screen.getByRole("button", { name: /wipe selected targets/i }));
            await user.click(screen.getByRole("button", { name: /wipe selected targets/i }));

            await waitFor(() => {
                expect(mockApplyTweak).toHaveBeenCalled();
            });
        });

        it("Windows Minimal does NOT call uninstallApp (uses applyTweak instead)", async () => {
            mockApplyTweak.mockResolvedValue({ success: true, tweakId: "RemoveBloatwareApps", stdout: "", stderr: "", exitCode: 0, durationMs: 100 });
            const user = setupUser();
            render(<PrebuiltDebloatPage />);

            await user.click(screen.getByText("Windows Minimal"));
            await waitFor(() => screen.getByRole("button", { name: /wipe selected targets/i }));
            await user.click(screen.getByRole("button", { name: /wipe selected targets/i }));

            await waitFor(() => {
                expect(mockApplyTweak).toHaveBeenCalled();
                expect(mockUninstallApp).not.toHaveBeenCalled();
            });
        });
    });

    describe("Step 3 — Return to Selection", () => {
        it("shows 'Return to Selection' button after execution completes", async () => {
            mockUninstallApp.mockResolvedValue({ success: true, method: "winget", output: "", error: "" });
            const user = setupUser();
            render(<PrebuiltDebloatPage />);

            await user.click(screen.getByText("HP"));
            await waitFor(() => screen.getByRole("button", { name: /wipe selected targets/i }));
            await user.click(screen.getByRole("button", { name: /wipe selected targets/i }));

            await waitFor(() => {
                expect(screen.getByRole("button", { name: /return to selection/i })).toBeInTheDocument();
            });
        });

        it("clicking 'Return to Selection' goes back to step 1", async () => {
            mockUninstallApp.mockResolvedValue({ success: true, method: "winget", output: "", error: "" });
            const user = setupUser();
            render(<PrebuiltDebloatPage />);

            await user.click(screen.getByText("HP"));
            await waitFor(() => screen.getByRole("button", { name: /wipe selected targets/i }));
            await user.click(screen.getByRole("button", { name: /wipe selected targets/i }));
            await waitFor(() => screen.getByRole("button", { name: /return to selection/i }));

            await user.click(screen.getByRole("button", { name: /return to selection/i }));

            await waitFor(() => {
                expect(screen.getByText("Dell")).toBeInTheDocument();
            });
        });
    });

    describe("Failure handling", () => {
        it("shows warning toast when some uninstalls fail", async () => {
            // First call fails, second succeeds
            mockUninstallApp
                .mockResolvedValueOnce({ success: false, method: "winget", output: "", error: "Not found" })
                .mockResolvedValueOnce({ success: true, method: "winget", output: "", error: "" });
            const user = setupUser();
            render(<PrebuiltDebloatPage />);

            await user.click(screen.getByText("HP"));
            await waitFor(() => screen.getByRole("button", { name: /wipe selected targets/i }));
            await user.click(screen.getByRole("button", { name: /wipe selected targets/i }));

            await waitFor(() => {
                expect(addToast).toHaveBeenCalledWith(
                    expect.objectContaining({ type: "warning", title: "Debloat Complete" })
                );
            });
        });

        it("shows success toast when all uninstalls succeed", async () => {
            mockUninstallApp.mockResolvedValue({ success: true, method: "winget", output: "", error: "" });
            const user = setupUser();
            render(<PrebuiltDebloatPage />);

            await user.click(screen.getByText("HP"));
            await waitFor(() => screen.getByRole("button", { name: /wipe selected targets/i }));
            await user.click(screen.getByRole("button", { name: /wipe selected targets/i }));

            await waitFor(() => {
                expect(addToast).toHaveBeenCalledWith(
                    expect.objectContaining({ type: "success", title: "Debloat Complete" })
                );
            });
        });
    });
});
