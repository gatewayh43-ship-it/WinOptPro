import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, setupUser, waitFor } from "@/test/utils";
import { NetworkAnalyzerPage } from "@/pages/NetworkAnalyzerPage";
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

const mockInterfaces = [
    {
        name: "Ethernet",
        macAddress: "AA:BB:CC:DD:EE:FF",
        receivedBytes: 104857600,
        transmittedBytes: 52428800,
        ipV4: "192.168.1.100",
    },
    {
        name: "Wi-Fi",
        macAddress: "11:22:33:44:55:66",
        receivedBytes: 209715200,
        transmittedBytes: 10485760,
        ipV4: "192.168.1.101",
    },
];

const mockPingResult = {
    host: "8.8.8.8",
    latencyMs: 12.5,
    minMs: 10.0,
    maxMs: 15.0,
    jitterMs: 1.5,
    packetLossPct: 0,
    success: true,
};

describe("NetworkAnalyzerPage", () => {
    beforeEach(() => {
        vi.mocked(tauriCore.invoke).mockReset();
        vi.mocked(tauriCore.invoke).mockImplementation(async (cmd) => {
            if (cmd === "get_network_interfaces") return mockInterfaces;
            if (cmd === "ping_host") return mockPingResult;
            return null;
        });
    });

    it("renders the page heading", async () => {
        render(<NetworkAnalyzerPage />);
        expect(await screen.findByText("Analyzer")).toBeInTheDocument();
    });

    it("renders the Latency Test section", async () => {
        render(<NetworkAnalyzerPage />);
        expect(await screen.findByText("Latency Test")).toBeInTheDocument();
    });

    it("shows active adapters count after loading", async () => {
        render(<NetworkAnalyzerPage />);
        expect(await screen.findByText(/2 Found/i)).toBeInTheDocument();
    });

    it("renders adapter names after loading", async () => {
        render(<NetworkAnalyzerPage />);
        expect(await screen.findByText("Ethernet")).toBeInTheDocument();
        expect(screen.getByText("Wi-Fi")).toBeInTheDocument();
    });

    it("shows IPv4 addresses for adapters", async () => {
        render(<NetworkAnalyzerPage />);
        expect(await screen.findByText("192.168.1.100")).toBeInTheDocument();
    });

    it("shows MAC addresses for adapters", async () => {
        render(<NetworkAnalyzerPage />);
        await screen.findByText("Ethernet");
        expect(screen.getByText(/AA:BB:CC:DD:EE:FF/i)).toBeInTheDocument();
    });

    it("ping input has default value of 8.8.8.8", async () => {
        render(<NetworkAnalyzerPage />);
        await screen.findByText("Latency Test");
        const input = screen.getByPlaceholderText(/8\.8\.8\.8/i) as HTMLInputElement;
        expect(input.value).toBe("8.8.8.8");
    });

    it("clicking PING button calls ping_host", async () => {
        const user = setupUser();
        render(<NetworkAnalyzerPage />);
        await screen.findByText("Latency Test");

        await user.click(screen.getByRole("button", { name: /^ping$/i }));

        await waitFor(() => {
            expect(tauriCore.invoke).toHaveBeenCalledWith("ping_host", { host: "8.8.8.8" });
        });
    });

    it("shows ping result latency after ping", async () => {
        const user = setupUser();
        render(<NetworkAnalyzerPage />);
        await screen.findByText("Latency Test");

        await user.click(screen.getByRole("button", { name: /^ping$/i }));

        await waitFor(() => {
            expect(screen.getByText(/ms avg/i)).toBeInTheDocument();
        });
    });

    it("shows no active adapters when interfaces are empty or loopback only", async () => {
        vi.mocked(tauriCore.invoke).mockImplementation(async (cmd) => {
            if (cmd === "get_network_interfaces") return [];
            return null;
        });
        render(<NetworkAnalyzerPage />);
        expect(await screen.findByText(/0 Found/i)).toBeInTheDocument();
    });

    it("shows error when interface fetch fails", async () => {
        vi.mocked(tauriCore.invoke).mockImplementation(async (cmd) => {
            if (cmd === "get_network_interfaces") throw new Error("Network unavailable");
            return null;
        });
        render(<NetworkAnalyzerPage />);
        expect(await screen.findByText(/Network unavailable/i)).toBeInTheDocument();
    });
});
