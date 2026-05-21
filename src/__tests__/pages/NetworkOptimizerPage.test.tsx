import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { render, screen, setupUser, waitFor, within } from "@/test/utils";
import * as tauriCore from "@tauri-apps/api/core";
import { NetworkOptimizerPage } from "@/pages/NetworkOptimizerPage";
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

describe("NetworkOptimizerPage", () => {
    beforeEach(() => {
        vi.mocked(tauriCore.invoke).mockReset();
        vi.mocked(tauriCore.invoke).mockImplementation(async (cmd) => {
            if (cmd === "scan_network_optimizer") return createNetworkOptimizerReport();
            if (cmd === "apply_network_optimizer_action") return createNetworkOptimizerApplyResult();
            return null;
        });
    });

    it("renders telemetry summary and recommendations after scan", async () => {
        render(<NetworkOptimizerPage />);

        expect(await screen.findByRole("heading", { name: /Network Optimizer/i })).toBeInTheDocument();
        expect(screen.getAllByText("Ethernet").length).toBeGreaterThan(0);
        expect(screen.getByText("1 Gbps")).toBeInTheDocument();
        expect(screen.getByText("Recommendation Engine")).toBeInTheDocument();
        expect(screen.getByText("Use an explicit fast DNS resolver where appropriate")).toBeInTheDocument();
        expect(screen.getByText("steam")).toBeInTheDocument();
    });

    it("applies an overview recommendation to the selected adapter", async () => {
        const user = setupUser();
        render(<NetworkOptimizerPage />);

        await screen.findByText("Recommendation Engine");
        await user.click(screen.getByRole("button", { name: /Set Cloudflare DNS/i }));

        await waitFor(() => {
            expect(tauriCore.invoke).toHaveBeenCalledWith("apply_network_optimizer_action", {
                request: {
                    actionId: "set_dns_cloudflare",
                    adapterName: "Ethernet",
                },
            });
        });
        expect(await screen.findByText(/Network action applied/i)).toBeInTheDocument();
    });

    it("shows adapter diagnostics and driver properties", async () => {
        const user = setupUser();
        render(<NetworkOptimizerPage />);

        await screen.findByRole("heading", { name: /Network Optimizer/i });
        await user.click(screen.getByRole("button", { name: "Adapters" }));

        expect(screen.getByText("Intel Ethernet Controller I225-V")).toBeInTheDocument();
        expect(screen.getByText("Receive Side Scaling")).toBeInTheDocument();
        expect(screen.getByText("192.168.1.42")).toBeInTheDocument();
        expect(screen.getByText("866 Mbps")).toBeInTheDocument();
    });

    it("shows Wi-Fi, DNS, latency, and profile tabs", async () => {
        const user = setupUser();
        render(<NetworkOptimizerPage />);

        await screen.findByRole("heading", { name: /Network Optimizer/i });

        await user.click(screen.getByRole("button", { name: "Wi-Fi" }));
        expect(screen.getByText("Wireless Diagnostics")).toBeInTheDocument();
        expect(screen.getAllByText("WinOpt-Lab-6E").length).toBeGreaterThan(0);

        await user.click(screen.getByRole("button", { name: "DNS" }));
        expect(screen.getByText("Resolver Actions")).toBeInTheDocument();
        expect(screen.getAllByText("Cloudflare").length).toBeGreaterThan(0);
        expect(screen.getByText("9.4 ms")).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Latency" }));
        expect(screen.getByText("Bufferbloat Read")).toBeInTheDocument();
        expect(screen.getByText("192.168.1.1")).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Profiles" }));
        expect(screen.getByText("Gaming Low Latency")).toBeInTheDocument();
        expect(screen.getByText("Privacy DNS Baseline")).toBeInTheDocument();
    });

    it("applies custom DNS with primary and secondary IPv4 values", async () => {
        const user = setupUser();
        render(<NetworkOptimizerPage />);

        await screen.findByRole("heading", { name: /Network Optimizer/i });
        await user.click(screen.getByRole("button", { name: "DNS" }));
        await user.type(screen.getByPlaceholderText("Primary IPv4 DNS"), "9.9.9.9");
        await user.type(screen.getByPlaceholderText("Secondary IPv4 DNS (optional)"), "149.112.112.112");
        await user.click(screen.getByRole("button", { name: /Apply Custom DNS/i }));

        await waitFor(() => {
            expect(tauriCore.invoke).toHaveBeenCalledWith("apply_network_optimizer_action", {
                request: {
                    actionId: "set_dns_custom",
                    adapterName: "Ethernet",
                    customPrimaryDns: "9.9.9.9",
                    customSecondaryDns: "149.112.112.112",
                },
            });
        });
    });

    it("lets users choose another adapter before applying DNS actions", async () => {
        const user = setupUser();
        render(<NetworkOptimizerPage />);

        await screen.findByRole("heading", { name: /Network Optimizer/i });
        await user.selectOptions(screen.getByLabelText("Select adapter for network actions"), "Wi-Fi");
        await user.click(screen.getByRole("button", { name: "DNS" }));
        const resolverActions = screen.getByText("Resolver Actions").closest(".bento-card");
        expect(resolverActions).not.toBeNull();
        await user.click(within(resolverActions as HTMLElement).getByText("Automatic DNS"));

        await waitFor(() => {
            expect(tauriCore.invoke).toHaveBeenCalledWith("apply_network_optimizer_action", {
                request: {
                    actionId: "reset_dns_dhcp",
                    adapterName: "Wi-Fi",
                    customPrimaryDns: "",
                    customSecondaryDns: "",
                },
            });
        });
    });

    it("shows backend scan errors", async () => {
        vi.mocked(tauriCore.invoke).mockRejectedValue(new Error("Network scan failed"));
        render(<NetworkOptimizerPage />);

        expect(await screen.findByText("Network scan failed")).toBeInTheDocument();
    });
});
