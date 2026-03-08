import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, setupUser, waitFor } from "@/test/utils";
import { DriverManagerPage } from "@/pages/DriverManagerPage";
import { useDrivers } from "@/hooks/useDrivers";
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
            tr: ({ children, className }: React.HTMLAttributes<HTMLTableRowElement> & { children?: ReactNode }) => (
                <tr className={className}>{children}</tr>
            ),
        },
        AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
        useReducedMotion: () => false,
    };
});

const mockSetFilter = vi.fn();
const mockFetchDrivers = vi.fn();
const mockExportList = vi.fn();

const mockDrivers = [
    {
        device_name: "NVIDIA GeForce RTX 3080",
        inf_name: "nvlddmkm.inf",
        provider: "NVIDIA",
        version: "31.0.15.3623",
        date: "2024-01-15",
        device_class: "Display",
        is_signed: true,
    },
    {
        device_name: "Intel(R) Wi-Fi 6 AX200",
        inf_name: "netwtw08.inf",
        provider: "Intel",
        version: "22.220.0.7",
        date: "2023-11-20",
        device_class: "Net",
        is_signed: true,
    },
    {
        device_name: "Test Unsigned Driver",
        inf_name: "test.inf",
        provider: "Unknown",
        version: "1.0.0.0",
        date: "2021-01-01",
        device_class: "Unknown",
        is_signed: false,
    },
];

vi.mock("@/hooks/useDrivers", () => ({
    useDrivers: vi.fn(() => ({
        drivers: mockDrivers,
        allDrivers: mockDrivers,
        isLoading: false,
        error: null,
        filter: "all",
        setFilter: mockSetFilter,
        fetchDrivers: mockFetchDrivers,
        exportList: mockExportList,
        unsignedCount: 1,
    })),
}));

vi.mock("@/components/ToastSystem", () => {
    const addToast = vi.fn();
    return { useToast: () => ({ addToast }) };
});

describe("DriverManagerPage", () => {
    beforeEach(() => {
        mockSetFilter.mockReset();
        mockFetchDrivers.mockReset();
        mockExportList.mockReset();
    });

    it("renders the Driver Manager heading", () => {
        render(<DriverManagerPage />);
        expect(screen.getByText("Manager")).toBeInTheDocument();
        expect(screen.getByText("Driver")).toBeInTheDocument();
    });

    it("shows total driver count in summary bar", () => {
        render(<DriverManagerPage />);
        expect(screen.getByText("Total Drivers")).toBeInTheDocument();
        expect(screen.getByText("3")).toBeInTheDocument();
    });

    it("shows unsigned count in summary bar", () => {
        render(<DriverManagerPage />);
        // "Unsigned" appears in the summary bar and also as a filter button
        const unsignedElements = screen.getAllByText(/^Unsigned$/i);
        expect(unsignedElements.length).toBeGreaterThanOrEqual(1);
        // The count "1" appears in the summary bar
        expect(screen.getByText("1")).toBeInTheDocument();
    });

    it("renders driver rows in the table", () => {
        render(<DriverManagerPage />);
        expect(screen.getByText("NVIDIA GeForce RTX 3080")).toBeInTheDocument();
        expect(screen.getByText("Intel(R) Wi-Fi 6 AX200")).toBeInTheDocument();
        expect(screen.getByText("Test Unsigned Driver")).toBeInTheDocument();
    });

    it("shows filter buttons All, Signed, Unsigned", () => {
        render(<DriverManagerPage />);
        expect(screen.getByRole("button", { name: /^All$/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /^Signed$/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /^Unsigned$/i })).toBeInTheDocument();
    });

    it("clicking a filter button calls setFilter", async () => {
        const user = setupUser();
        render(<DriverManagerPage />);
        await user.click(screen.getByRole("button", { name: /^Unsigned$/i }));
        expect(mockSetFilter).toHaveBeenCalledWith("unsigned");
    });

    it("shows search input", () => {
        render(<DriverManagerPage />);
        expect(screen.getByPlaceholderText(/Search drivers/i)).toBeInTheDocument();
    });

    it("typing in search filters the driver list", async () => {
        const user = setupUser();
        render(<DriverManagerPage />);
        await user.type(screen.getByPlaceholderText(/Search drivers/i), "NVIDIA");
        await waitFor(() => {
            expect(screen.getByText("NVIDIA GeForce RTX 3080")).toBeInTheDocument();
            expect(screen.queryByText("Intel(R) Wi-Fi 6 AX200")).not.toBeInTheDocument();
        });
    });

    it("Export JSON button calls exportList", async () => {
        const user = setupUser();
        render(<DriverManagerPage />);
        await user.click(screen.getByRole("button", { name: /Export JSON/i }));
        expect(mockExportList).toHaveBeenCalledTimes(1);
    });

    it("shows loading state when isLoading is true", () => {
        vi.mocked(useDrivers).mockReturnValueOnce({
            drivers: [],
            allDrivers: [],
            isLoading: true,
            error: null,
            filter: "all",
            setFilter: mockSetFilter,
            fetchDrivers: mockFetchDrivers,
            exportList: mockExportList,
            unsignedCount: 0,
        });
        render(<DriverManagerPage />);
        expect(screen.getByText(/Loading drivers/i)).toBeInTheDocument();
    });

    it("shows empty search state when no drivers match", async () => {
        const user = setupUser();
        render(<DriverManagerPage />);
        await user.type(screen.getByPlaceholderText(/Search drivers/i), "zzznomatch");
        await waitFor(() => {
            expect(screen.getByText(/No drivers match your search/i)).toBeInTheDocument();
        });
    });
});
