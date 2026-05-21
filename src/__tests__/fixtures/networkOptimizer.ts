import type { NetworkOptimizerApplyResult, NetworkOptimizerReport } from "@/hooks/useNetworkOptimizer";

export function createNetworkOptimizerReport(
    overrides: Partial<NetworkOptimizerReport> = {}
): NetworkOptimizerReport {
    const report: NetworkOptimizerReport = {
        generatedAt: "2026-05-21T10:00:00.000Z",
        adapters: [
            {
                name: "Ethernet",
                description: "Intel Ethernet Controller I225-V",
                status: "Up",
                linkSpeed: "1 Gbps",
                macAddress: "AA-BB-CC-DD-EE-FF",
                ifIndex: 12,
                mediaType: "802.3",
                physicalMediaType: "802.3",
                ipv4: "192.168.1.42",
                mtu: 1500,
                metric: 5,
                dhcp: "Enabled",
                dnsServers: ["1.1.1.1", "1.0.0.1"],
                rssEnabled: true,
                receivedBytes: 92_400_000_000,
                transmittedBytes: 12_800_000_000,
                advancedProperties: [
                    { displayName: "Receive Side Scaling", displayValue: "Enabled" },
                    { displayName: "Interrupt Moderation", displayValue: "Enabled" },
                ],
            },
            {
                name: "Wi-Fi",
                description: "Intel Wi-Fi 6E AX211",
                status: "Up",
                linkSpeed: "866 Mbps",
                macAddress: "11-22-33-44-55-66",
                ifIndex: 16,
                mediaType: "Native 802.11",
                physicalMediaType: "Native 802.11",
                ipv4: "192.168.1.57",
                mtu: 1500,
                metric: 25,
                dhcp: "Enabled",
                dnsServers: [],
                rssEnabled: null,
                receivedBytes: 18_600_000_000,
                transmittedBytes: 3_200_000_000,
                advancedProperties: [
                    { displayName: "Preferred Band", displayValue: "Prefer 5GHz band" },
                ],
            },
        ],
        wifi: {
            ssid: "WinOpt-Lab-6E",
            bssid: "90:9A:4A:11:22:33",
            radioType: "802.11ax",
            authentication: "WPA3-Personal",
            cipher: "CCMP",
            channel: 149,
            signalPct: 82,
            receiveRateMbps: 866,
            transmitRateMbps: 720,
            profile: "WinOpt-Lab-6E",
        },
        tcp: {
            activeSetting: "Internet",
            autoTuningLevel: "Normal",
            congestionProvider: "CUBIC",
            ecnCapability: "Disabled",
            scalingHeuristics: "Disabled",
        },
        offload: {
            receiveSegmentCoalescing: "Enabled",
            receiveSideScaling: "Enabled",
            chimney: "Disabled",
            taskOffload: "Enabled",
        },
        routes: [
            { interfaceAlias: "Ethernet", interfaceIndex: 12, nextHop: "192.168.1.1", routeMetric: 0, interfaceMetric: 5 },
        ],
        probes: [
            { host: "192.168.1.1", latencyMs: 1.2, minMs: 1, maxMs: 2, jitterMs: 0.4, packetLossPct: 0, success: true },
            { host: "1.1.1.1", latencyMs: 9.4, minMs: 8, maxMs: 14, jitterMs: 1.8, packetLossPct: 0, success: true },
            { host: "8.8.8.8", latencyMs: 13.6, minMs: 11, maxMs: 22, jitterMs: 3.2, packetLossPct: 0, success: true },
        ],
        dnsBenchmarks: [
            { provider: "Cloudflare", primary: "1.1.1.1", secondary: "1.0.0.1", latencyMs: 9.4, success: true },
            { provider: "Google", primary: "8.8.8.8", secondary: "8.8.4.4", latencyMs: 13.6, success: true },
            { provider: "Quad9", primary: "9.9.9.9", secondary: "149.112.112.112", latencyMs: 18.1, success: true },
        ],
        activeTalkers: [
            { processId: 6124, processName: "steam", connectionCount: 18 },
            { processId: 1008, processName: "OneDrive", connectionCount: 6 },
        ],
        recommendations: [
            {
                id: "dns_explicit_resolver",
                title: "Use an explicit fast DNS resolver where appropriate",
                summary: "DNS changes improve lookup time and reliability, not in-session game ping.",
                evidence: "Fastest sampled resolver: Cloudflare at 9.4 ms.",
                risk: "SAFE",
                category: "DNS",
                impact: "Improves browsing and application startup resolution.",
                action: { actionId: "set_dns_cloudflare", label: "Set Cloudflare DNS", requiresAdmin: true, reversible: true },
                appliesToProfiles: ["privacy_dns", "streaming_stability"],
            },
            {
                id: "background_network_contention",
                title: "Background traffic may be competing with latency-sensitive apps",
                summary: "Launchers, cloud sync, and update services can create upload queueing.",
                evidence: "Active network processes include likely updater, launcher, or sync traffic.",
                risk: "SAFE",
                category: "Contention",
                impact: "Reduces ping spikes during gaming, calls, and streaming.",
                action: { actionId: "disable_delivery_optimization_peer", label: "Limit Delivery Optimization peer sharing", requiresAdmin: true, reversible: true },
                appliesToProfiles: ["gaming_latency", "streaming_stability"],
            },
            {
                id: "bufferbloat_loaded_test",
                title: "Run a loaded latency test before deep tuning",
                summary: "Idle ping does not reveal upload/download queueing.",
                evidence: "Loaded latency test is recommended for every network profile.",
                risk: "SAFE",
                category: "Latency",
                impact: "Separates real queueing problems from cosmetic TCP tweaks.",
                action: null,
                appliesToProfiles: ["gaming_latency", "streaming_stability", "download_throughput"],
            },
        ],
        profiles: [
            {
                id: "gaming_latency",
                name: "Gaming Low Latency",
                description: "Reduce jitter, packet loss, route mistakes, and background contention before launching games.",
                recommendationIds: ["background_network_contention", "bufferbloat_loaded_test"],
            },
            {
                id: "streaming_stability",
                name: "Streaming Stability",
                description: "Prioritize steady DNS, Wi-Fi health, and upload contention checks for calls and streaming.",
                recommendationIds: ["dns_explicit_resolver", "background_network_contention", "bufferbloat_loaded_test"],
            },
            {
                id: "download_throughput",
                name: "Download Throughput",
                description: "Favor wired routes, RSS, sane TCP auto-tuning, and adapter health for large transfers.",
                recommendationIds: ["bufferbloat_loaded_test"],
            },
            {
                id: "privacy_dns",
                name: "Privacy DNS Baseline",
                description: "Review resolver configuration and make DNS choices explicit per adapter.",
                recommendationIds: ["dns_explicit_resolver"],
            },
        ],
    };

    return { ...report, ...overrides };
}

export function createNetworkOptimizerApplyResult(
    overrides: Partial<NetworkOptimizerApplyResult> = {}
): NetworkOptimizerApplyResult {
    return {
        success: true,
        title: "Network action applied",
        message: "Updated adapter settings.",
        stdout: "",
        revertActionId: "reset_dns_dhcp",
        ...overrides,
    };
}
