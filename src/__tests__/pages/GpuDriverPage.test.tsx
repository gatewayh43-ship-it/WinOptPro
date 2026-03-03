import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, setupUser, waitFor } from "@/test/utils";
import { GpuDriverPage } from "@/pages/GpuDriverPage";
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

vi.mock("@/hooks/useGpuDriver", () => {
    const uninstallDrivers = vi.fn().mockResolvedValue(undefined);
    const scheduleBootRemoval = vi.fn().mockResolvedValue(undefined);
    const rebootSystem = vi.fn().mockResolvedValue(undefined);
    const fetchDrivers = vi.fn();

    return {
        useGpuDriver: () => ({
            drivers: [
                { vendor: "NVIDIA", name: "NVIDIA GeForce RTX 4090", version: "31.0.15.4633", date: "2024-01-15", pnpId: "PCI\\VEN_10DE&DEV_2684", infName: "oem42.inf" },
                { vendor: "Intel", name: "Intel(R) UHD Graphics 770", version: "31.0.101.5186", date: "2023-11-20", pnpId: "PCI\\VEN_8086&DEV_4680", infName: "oem18.inf" },
            ],
            isLoading: false,
            isRemoving: false,
            removalResult: null,
            error: null,
            fetchDrivers,
            uninstallDrivers,
            scheduleBootRemoval,
            rebootSystem,
        }),
    };
});

describe("GpuDriverPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders GPU Driver Cleaner heading", () => {
        render(<GpuDriverPage />);
        expect(screen.getByText("GPU Driver Cleaner")).toBeInTheDocument();
    });

    it("shows warning banner", () => {
        render(<GpuDriverPage />);
        expect(screen.getByText(/Save Your Work First/i)).toBeInTheDocument();
        expect(screen.getByText(/display may go blank/i)).toBeInTheDocument();
    });

    it("displays detected driver cards for NVIDIA and Intel", () => {
        render(<GpuDriverPage />);
        expect(screen.getByText("NVIDIA GeForce RTX 4090")).toBeInTheDocument();
        expect(screen.getByText("Intel(R) UHD Graphics 770")).toBeInTheDocument();
        // "NVIDIA" appears as both vendor badge and within driver name text → use getAllByText
        expect(screen.getAllByText("NVIDIA").length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText("Intel").length).toBeGreaterThanOrEqual(1);
    });

    it("shows vendor tabs", () => {
        render(<GpuDriverPage />);
        expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "NVIDIA" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "AMD" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Intel" })).toBeInTheDocument();
    });

    it("shows Uninstall Now and Schedule Safe Mode Boot buttons", () => {
        render(<GpuDriverPage />);
        expect(screen.getByRole("button", { name: /Uninstall Now/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Schedule Safe Mode Boot/i })).toBeInTheDocument();
    });

    it("Uninstall Now button calls uninstallDrivers", async () => {
        const user = setupUser();
        const { useGpuDriver } = await import("@/hooks/useGpuDriver");
        const { uninstallDrivers } = useGpuDriver();

        render(<GpuDriverPage />);
        await user.click(screen.getByRole("button", { name: /Uninstall Now/i }));

        await waitFor(() => {
            expect(uninstallDrivers).toHaveBeenCalled();
        });
    });

    it("Schedule Safe Mode Boot button calls scheduleBootRemoval", async () => {
        const user = setupUser();
        const { useGpuDriver } = await import("@/hooks/useGpuDriver");
        const { scheduleBootRemoval } = useGpuDriver();

        render(<GpuDriverPage />);
        await user.click(screen.getByRole("button", { name: /Schedule Safe Mode Boot/i }));

        await waitFor(() => {
            expect(scheduleBootRemoval).toHaveBeenCalled();
        });
    });

    it("shows Delete from Driver Store checkbox", () => {
        render(<GpuDriverPage />);
        expect(screen.getByText("Delete from Driver Store")).toBeInTheDocument();
    });

    it("shows Detected GPU Drivers section header", () => {
        render(<GpuDriverPage />);
        expect(screen.getByText("Detected GPU Drivers")).toBeInTheDocument();
    });
});
