import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, setupUser, waitFor } from "@/test/utils";
import { NetworkAnalyzerPage } from "@/pages/NetworkAnalyzerPage";
import * as tauriCore from "@tauri-apps/api/core";
import type { ReactNode } from "react";
import { createNetworkOptimizerApplyResult, createNetworkOptimizerReport } from "@/__tests__/fixtures/networkOptimizer";

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

const mockSpeedResult = {
    downloadMbps: 132.4,
    pingMs: 9,
    jitterMs: 1.2,
    packetLossPct: 0,
    serverName: "Cloudflare",
    bytesDownloaded: 10000000,
};

describe("NetworkAnalyzerPage", () => {
    beforeEach(() => {
        vi.mocked(tauriCore.invoke).mockReset();
        vi.mocked(tauriCore.invoke).mockImplementation(async (cmd) => {
            if (cmd === "get_network_interfaces") return mockInterfaces;
            if (cmd === "ping_host") return mockPingResult;
            if (cmd === "run_speed_test") return mockSpeedResult;
            if (cmd === "scan_network_optimizer") return createNetworkOptimizerReport();
            if (cmd === "apply_network_optimizer_action") return createNetworkOptimizerApplyResult();
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

    it("renders the Internet Speed Test section", async () => {
        render(<NetworkAnalyzerPage />);
        expect(await screen.findByText("Internet Speed Test")).toBeInTheDocument();
    });

    it("shows active adapters count after loading", async () => {
        render(<NetworkAnalyzerPage />);
        expect(await screen.findByText(/2 Found/i)).toBeInTheDocument();
    });

    it("renders adapter names after loading", async () => {
        render(<NetworkAnalyzerPage />);
        expect((await screen.findAllByText("Ethernet")).length).toBeGreaterThan(0);
        expect(screen.getAllByText("Wi-Fi").length).toBeGreaterThan(0);
    });

    it("shows IPv4 addresses for adapters", async () => {
        render(<NetworkAnalyzerPage />);
        expect(await screen.findByText("192.168.1.100")).toBeInTheDocument();
    });

    it("shows MAC addresses for adapters", async () => {
        render(<NetworkAnalyzerPage />);
        await screen.findAllByText("Ethernet");
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

    it("runs an internet speed test and shows download speed", async () => {
        const user = setupUser();
        render(<NetworkAnalyzerPage />);
        await screen.findByText("Internet Speed Test");

        await user.click(screen.getByTestId("run-speed-test"));

        await waitFor(() => {
            expect(tauriCore.invoke).toHaveBeenCalledWith("run_speed_test");
        });
        expect(await screen.findByTestId("speed-download-mbps")).toHaveTextContent("132.4");
    });

    it("applies a network optimization from the analyzer page", async () => {
        const user = setupUser();
        render(<NetworkAnalyzerPage />);
        expect(await screen.findByText("Quick Optimizations")).toBeInTheDocument();

        await user.click(screen.getAllByRole("button", { name: /Cloudflare DNS/i })[0]);

        await waitFor(() => {
            expect(tauriCore.invoke).toHaveBeenCalledWith("apply_network_optimizer_action", {
                request: expect.objectContaining({
                    actionId: "set_dns_cloudflare",
                    adapterName: "Ethernet",
                }),
            });
        });
    });

    it("shows no active adapters when interfaces are empty or loopback only", async () => {
        vi.mocked(tauriCore.invoke).mockImplementation(async (cmd) => {
            if (cmd === "get_network_interfaces") return [];
            if (cmd === "scan_network_optimizer") return createNetworkOptimizerReport({ adapters: [] });
            return null;
        });
        render(<NetworkAnalyzerPage />);
        expect(await screen.findByText(/0 Found/i)).toBeInTheDocument();
    });

    it("shows error when interface fetch fails", async () => {
        vi.mocked(tauriCore.invoke).mockImplementation(async (cmd) => {
            if (cmd === "get_network_interfaces") throw new Error("Network unavailable");
            if (cmd === "scan_network_optimizer") return createNetworkOptimizerReport();
            return null;
        });
        render(<NetworkAnalyzerPage />);
        expect((await screen.findAllByText(/Network unavailable/i)).length).toBeGreaterThan(0);
    });
});
