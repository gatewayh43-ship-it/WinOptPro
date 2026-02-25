/**
 * Shared test fixtures for WinOpt Pro components and hooks.
 * Import these in test files instead of duplicating inline data.
 */

// ── System Vitals ─────────────────────────────────────────────────────────────
export const mockSystemVitals = {
    cpu: {
        usage: 42,
        temperature: 68,
        cores: 8,
        frequency: 3.6,
    },
    ram: {
        usedGb: 8.2,
        totalGb: 16,
        percentUsed: 51.25,
    },
    network: {
        downloadMbps: 94.2,
        uploadMbps: 11.8,
        latencyMs: 12,
    },
    disk: {
        readMbps: 520,
        writeMbps: 480,
        usedGb: 256,
        totalGb: 512,
    },
    healthScore: 92,
};

// ── Tweak Fixtures ────────────────────────────────────────────────────────────
export const mockTweak = {
    id: "disable-sysmain",
    name: "Disable SysMain",
    description: "Stops the Superfetch/SysMain service to reduce disk I/O.",
    category: "Performance",
    riskLevel: "Green",
    isActive: false,
    educationalContext: {
        howItWorks:
            "SysMain (formerly Superfetch) pre-loads frequently used apps into RAM. Disabling it reduces background disk usage, particularly beneficial on SSDs.",
        pros: ["Reduced background disk I/O", "Lower RAM overhead on systems with < 8GB RAM"],
        cons: ["Apps may launch slightly slower on first run after reboot"],
        performanceGain: "Moderate",
        executionCode:
            "Stop-Service -Name SysMain -Force\nSet-Service -Name SysMain -StartupType Disabled",
    },
};

export const mockTweakYellow = {
    ...mockTweak,
    id: "disable-search-indexer",
    name: "Disable Search Indexer",
    riskLevel: "Yellow",
    isActive: false,
};

export const mockTweakRed = {
    ...mockTweak,
    id: "disable-defender",
    name: "Disable Windows Defender",
    riskLevel: "Red",
    isActive: false,
};

export const mockTweaksList = [mockTweak, mockTweakYellow, mockTweakRed];

// ── Tweak History Entry ───────────────────────────────────────────────────────
export const mockHistoryEntry = {
    id: "history-001",
    tweakId: "disable-sysmain",
    tweakName: "Disable SysMain",
    appliedAt: "2024-01-15T14:32:00Z",
    result: "success" as const,
    output: "Service stopped successfully.",
};

// ── Alert Fixtures ────────────────────────────────────────────────────────────
export const mockPrivacyAlert = {
    id: "telemetry-enabled",
    severity: "high" as const,
    title: "Telemetry Enabled",
    description: "Windows diagnostic data collection is currently active.",
    category: "Privacy",
    actionLabel: "Fix Now",
    targetView: "privacy",
};
