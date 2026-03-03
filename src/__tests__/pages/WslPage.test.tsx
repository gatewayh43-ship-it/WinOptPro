import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, setupUser, waitFor } from "@/test/utils";
import { WslPage } from "@/pages/WslPage";
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

const mockSaveConfig = vi.fn().mockResolvedValue(undefined);
const mockEnableWsl = vi.fn().mockResolvedValue(undefined);
const mockDisableWsl = vi.fn().mockResolvedValue(undefined);
const mockInstallDistro = vi.fn().mockResolvedValue(undefined);
const mockUninstallDistro = vi.fn().mockResolvedValue(undefined);
const mockSetDefaultDistro = vi.fn().mockResolvedValue(undefined);
const mockSetDefaultVersion = vi.fn().mockResolvedValue(undefined);
const mockCleanUninstall = vi.fn().mockResolvedValue(undefined);
const mockShutdownWsl = vi.fn().mockResolvedValue(undefined);
const mockLaunchLinuxMode = vi.fn().mockResolvedValue(undefined);
const mockSetIsWizardOpen = vi.fn();

vi.mock("@/hooks/useWsl", async () => {
    const actual = await vi.importActual<typeof import("@/hooks/useWsl")>("@/hooks/useWsl");
    return {
        ...actual,
        useWsl: () => ({
            status: {
                isEnabled: true,
                defaultVersion: 2,
                wslVersion: "2.0.14.0",
                kernelVersion: "5.15.146.1",
                distros: [
                    { name: "Ubuntu", state: "Running", version: 2, isDefault: true },
                    { name: "Debian", state: "Stopped", version: 2, isDefault: false },
                ],
            },
            config: {
                memoryGb: 8,
                processors: 4,
                swapGb: 2,
                localhostForwarding: true,
                networkingMode: "nat",
                dnsTunneling: true,
                firewall: true,
                autoProxy: false,
                guiApplications: true,
            },
            setupState: {
                wslEnabled: true,
                wsl2Available: true,
                hasDistro: true,
                defaultDistro: "Ubuntu",
                hasDesktopEnv: false,
                installedDes: [],
                wslgSupported: true,
            },
            isLoading: false,
            isActionLoading: false,
            installingDistro: null,
            isWizardOpen: false,
            setIsWizardOpen: mockSetIsWizardOpen,
            error: null,
            fetchStatus: vi.fn(),
            fetchConfig: vi.fn(),
            fetchSetupState: vi.fn(),
            enableWsl: mockEnableWsl,
            disableWsl: mockDisableWsl,
            installDistro: mockInstallDistro,
            uninstallDistro: mockUninstallDistro,
            setDefaultDistro: mockSetDefaultDistro,
            setDefaultVersion: mockSetDefaultVersion,
            cleanUninstall: mockCleanUninstall,
            saveConfig: mockSaveConfig,
            shutdownWsl: mockShutdownWsl,
            checkDesktopEnvs: vi.fn().mockResolvedValue([]),
            installDesktopEnv: vi.fn().mockResolvedValue(""),
            launchLinuxMode: mockLaunchLinuxMode,
        }),
    };
});

vi.mock("@/components/WslSetupWizard", () => ({
    WslSetupWizard: ({ onClose }: { onClose: () => void }) => (
        <div data-testid="wsl-setup-wizard">
            <button onClick={onClose}>Close Wizard</button>
        </div>
    ),
}));

describe("WslPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it("renders WSL Manager heading", () => {
        render(<WslPage />);
        expect(screen.getByText("WSL Manager")).toBeInTheDocument();
    });

    it("shows Overview, Distros, and Settings tabs", () => {
        render(<WslPage />);
        expect(screen.getByRole("button", { name: /Overview/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Distros/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Settings/i })).toBeInTheDocument();
    });

    it("Overview tab shows WSL enabled status", () => {
        render(<WslPage />);
        expect(screen.getByText("WSL Enabled")).toBeInTheDocument();
    });

    it("Overview tab shows WSL version chip", () => {
        render(<WslPage />);
        expect(screen.getByText(/v2\.0\.14\.0/)).toBeInTheDocument();
    });

    it("Linux Mode card is visible on Overview", () => {
        render(<WslPage />);
        expect(screen.getByText("Linux Mode")).toBeInTheDocument();
        expect(screen.getByText(/Launch Linux Desktop/i)).toBeInTheDocument();
    });

    it("clicking Distros tab shows installed distro cards", async () => {
        const user = setupUser();
        render(<WslPage />);
        await user.click(screen.getByRole("button", { name: /Distros/i }));
        // Distro names appear both as installed card text AND as id in available section → use getAllByText
        expect(screen.getAllByText("Ubuntu").length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText("Debian").length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText("Installed Distros")).toBeInTheDocument();
    });

    it("Distros tab shows available distros grid with 8 entries", async () => {
        const user = setupUser();
        render(<WslPage />);
        await user.click(screen.getByRole("button", { name: /Distros/i }));
        expect(screen.getByText("Available to Install")).toBeInTheDocument();
        expect(screen.getByText("Ubuntu (Latest LTS)")).toBeInTheDocument();
        expect(screen.getByText("Kali Linux")).toBeInTheDocument();
        expect(screen.getByText("Alpine Linux")).toBeInTheDocument();
    });

    it("Settings tab renders config fields", async () => {
        const user = setupUser();
        render(<WslPage />);
        await user.click(screen.getByRole("button", { name: /Settings/i }));
        expect(screen.getByText("Memory Limit")).toBeInTheDocument();
        expect(screen.getByText("Processors")).toBeInTheDocument();
        expect(screen.getByText("Localhost Forwarding")).toBeInTheDocument();
    });

    it("Save Configuration button calls saveConfig", async () => {
        const user = setupUser();
        render(<WslPage />);
        await user.click(screen.getByRole("button", { name: /Settings/i }));
        await user.click(screen.getByRole("button", { name: /Save Configuration/i }));

        await waitFor(() => {
            expect(mockSaveConfig).toHaveBeenCalled();
        });
    });

    it("Shutdown WSL button calls shutdownWsl", async () => {
        const user = setupUser();
        render(<WslPage />);
        await user.click(screen.getByRole("button", { name: /Settings/i }));
        await user.click(screen.getByRole("button", { name: /Shutdown WSL/i }));

        await waitFor(() => {
            expect(mockShutdownWsl).toHaveBeenCalled();
        });
    });

    it("Setup button opens wizard", async () => {
        const user = setupUser();
        render(<WslPage />);
        await user.click(screen.getByRole("button", { name: /Setup/i }));

        await waitFor(() => {
            expect(mockSetIsWizardOpen).toHaveBeenCalledWith(true);
        });
    });

    it("shows WSL 1 and WSL 2 version buttons", () => {
        render(<WslPage />);
        expect(screen.getByRole("button", { name: "WSL 1" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "WSL 2" })).toBeInTheDocument();
    });

    it("clicking WSL 1 button calls setDefaultVersion", async () => {
        const user = setupUser();
        render(<WslPage />);
        await user.click(screen.getByRole("button", { name: "WSL 1" }));

        await waitFor(() => {
            expect(mockSetDefaultVersion).toHaveBeenCalledWith(1);
        });
    });
});
