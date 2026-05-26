/**
 * VM coverage contract.
 *
 * This file is intentionally a little meta: it keeps the VM suite honest by
 * checking the product surface declared in Sidebar.tsx and features.json.
 * When a module or declared feature is added, this spec fails until the VM
 * coverage matrix is updated with at least smoke and action-surface coverage.
 */

import { test, expect, Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

type ModuleCoverage = {
  primaryText: RegExp;
  actionSurface: string[];
  notes: string;
};

type FeatureCoverage = {
  owners: string[];
  actionStrategy: "execute" | "mixed" | "guarded";
};

const MODULE_COVERAGE: Record<string, ModuleCoverage> = {
  "Home": {
    primaryText: /Commander|What would you like to optimize/i,
    actionSurface: ["Open Dashboard", "Optimize Network", "Search"],
    notes: "Home quick navigation cards and global search entry.",
  },
  "System Dashboard": {
    primaryText: /System Health Score|Health Index/i,
    actionSurface: ["Quick Scan", "All Safe Tweaks Applied", "Guide"],
    notes: "Dashboard vitals, guide trigger, and quick scan action.",
  },
  "Performance": {
    primaryText: /Performance\s*Tuning/i,
    actionSurface: ["All", "Green", "Yellow", "Deploy"],
    notes: "Tweak category card, filters, inspector, and deploy flow.",
  },
  "Privacy": {
    primaryText: /Privacy\s*Tuning/i,
    actionSurface: ["All", "Green", "Yellow", "Deploy"],
    notes: "Tweak category card, filters, inspector, and deploy flow.",
  },
  "Security": {
    primaryText: /Security\s*Tuning/i,
    actionSurface: ["All", "Green", "Yellow", "Deploy"],
    notes: "Previously hidden tweak category; now covered by UI lifecycle.",
  },
  "Gaming": {
    primaryText: /Gaming\s*Tuning/i,
    actionSurface: ["All", "Green", "Yellow", "Deploy"],
    notes: "Tweak category card, filters, inspector, and deploy flow.",
  },
  "Network": {
    primaryText: /Network\s*Tuning/i,
    actionSurface: ["All", "Green", "Yellow", "Deploy"],
    notes: "Network tweak category, distinct from Network Analyzer and Optimizer.",
  },
  "Power": {
    primaryText: /Power\s*Tuning/i,
    actionSurface: ["All", "Green", "Yellow", "Deploy"],
    notes: "Tweak category card, filters, inspector, and deploy flow.",
  },
  "Debloat": {
    primaryText: /Debloat\s*Tuning/i,
    actionSurface: ["All", "Green", "Yellow", "Deploy"],
    notes: "Previously hidden tweak category; now covered by UI lifecycle.",
  },
  "Debloater Wizard": {
    primaryText: /Debloater\s*Wizard/i,
    actionSurface: ["Windows Minimal", "Windows Standard", "Windows Aggressive"],
    notes: "Profile selection and staged debloat execution guard.",
  },
  "Windows UI": {
    primaryText: /Windows UI\s*Tuning/i,
    actionSurface: ["All", "Green", "Yellow", "Deploy"],
    notes: "Tweak category card, filters, inspector, and deploy flow.",
  },
  "Updates": {
    primaryText: /Windows Update\s*Tuning/i,
    actionSurface: ["All", "Green", "Yellow", "Deploy"],
    notes: "Windows Update tweak category and deploy flow.",
  },
  "Tools": {
    primaryText: /Tools\s*Tuning/i,
    actionSurface: ["All", "Green", "Yellow", "Deploy"],
    notes: "Previously hidden tweak category; now covered by UI lifecycle.",
  },
  "App Store": {
    primaryText: /App Store/i,
    actionSurface: ["Carousel", "List", "App Bundles", "Search"],
    notes: "Catalog search, view switching, details, and install action surface.",
  },
  "Software Updates": {
    primaryText: /Software Updates/i,
    actionSurface: ["Scan", "Update selected", "Save schedule", "Select shown"],
    notes: "WinGet scan, package selection, update queue, and scheduled updates.",
  },
  "Bundles": {
    primaryText: /App Bundles|Bundles/i,
    actionSurface: ["Create Bundle", "View & Install Bundle", "Search"],
    notes: "Bundle CRUD controls and install action surface.",
  },
  "WSL Manager": {
    primaryText: /WSL Manager|Windows Subsystem/i,
    actionSurface: ["Overview", "Distros", "Settings", "Save Configuration"],
    notes: "Lifecycle controls, distro actions, setup wizard, and config save.",
  },
  "Driver Manager": {
    primaryText: /Driver\s*Manager|Total Drivers/i,
    actionSurface: ["Export JSON", "Refresh", "All"],
    notes: "Driver inventory filters, refresh, and export.",
  },
  "GPU Driver Cleaner": {
    primaryText: /GPU Driver Cleaner/i,
    actionSurface: ["Refresh", "Clean Uninstall", "Schedule Safe Boot Removal", "Remove Now"],
    notes: "Destructive removal is guarded; VM coverage verifies controls and guards.",
  },
  "Startup Apps": {
    primaryText: /Startup/i,
    actionSurface: ["Startup Items Detected", "No startup items found", "Disable", "Enable"],
    notes: "Startup inventory, empty state, and enable-disable action surface.",
  },
  "Gaming Optimizer": {
    primaryText: /Gaming Optimizer|Auto-Optimize/i,
    actionSurface: ["Auto-Optimize", "Capture Baseline", "Gaming Overlay"],
    notes: "Game detection controls, baseline capture, and overlay action surface.",
  },
  "Latency Optimizer": {
    primaryText: /Latency Optimizer|Timer Resolution/i,
    actionSurface: ["Flush Standby List", "Boot / BCDEdit Settings", "desktop runtime"],
    notes: "Timer read, memory flush, boot-setting viewer, and desktop-runtime guard.",
  },
  "Power Manager": {
    primaryText: /Power Manager|Current Active Profile/i,
    actionSurface: ["Available Profiles", "Current Active Profile", "Settings"],
    notes: "Plan selection and per-plan setting controls.",
  },
  "Benchmark": {
    primaryText: /Benchmark/i,
    actionSurface: ["Read Last Score", "Run Full Assessment", "Speed Test", "Deep Benchmark"],
    notes: "PC score, network speed, CPU, disk, and guarded GPU benchmark controls.",
  },
  "Privacy Audit": {
    primaryText: /Privacy Audit|Total Issues/i,
    actionSurface: ["Scan", "Fix All"],
    notes: "Audit scan and mass-fix action.",
  },
  "Defender Support": {
    primaryText: /Windows Defender|Real-Time Protection/i,
    actionSurface: ["Update Signatures", "Quick Scan", "Full Scan"],
    notes: "Status load, signature update, scan, and realtime toggle.",
  },
  "Process Manager": {
    primaryText: /Process\s*Manager|Total Processes/i,
    actionSurface: ["Filter by name", "Name", "PID"],
    notes: "Search, sort, kill, and priority action surface.",
  },
  "Network Optimizer": {
    primaryText: /Network Optimizer/i,
    actionSurface: ["Scan Again", "Adapters", "Wi-Fi", "DNS", "Apply Custom DNS"],
    notes: "Adapter selection, diagnostics tabs, profile recommendations, and DNS action.",
  },
  "Network Analyzer": {
    primaryText: /Network Analyzer|Latency Test/i,
    actionSurface: ["PING", "Active Adapters"],
    notes: "Interface list and ping action.",
  },
  "Storage Optimizer": {
    primaryText: /Storage Optimizer|Potential Savings/i,
    actionSurface: ["Rescan Drive", "Clean Selected", "Run TRIM"],
    notes: "Drive health, junk scan, cleanup, TRIM, and scheduled tasks.",
  },
  "System Report": {
    primaryText: /System Report/i,
    actionSurface: ["Generate Report", "Save HTML"],
    notes: "Report generation and save action.",
  },
  "Profiles": {
    primaryText: /Profiles/i,
    actionSurface: ["Gaming Mode", "Privacy Fortress", "Apply"],
    notes: "Built-in profile expansion and apply action.",
  },
  "Automations": {
    primaryText: /Automation Center/i,
    actionSurface: ["Refresh", "Save", "Run", "Filter automations"],
    notes: "Task Scheduler preset save, run-now, remove, and filtering controls.",
  },
  "History": {
    primaryText: /Tweak History|History/i,
    actionSurface: ["All", "Applied", "Reverted", "Failed", "Clear"],
    notes: "Audit filtering, clear, and history revert surface.",
  },
  "Settings": {
    primaryText: /Settings/i,
    actionSurface: ["Dark", "Light", "Reset Defaults", "Expert mode"],
    notes: "Theme, monitoring, safety, AI model, backup, and expert-mode controls.",
  },
  "Help & Docs": {
    primaryText: /WinOpt Pro Help|Setup Guide/i,
    actionSurface: ["Setup Guide", "User Guides", "All Features", "Tweaks Browser"],
    notes: "Guide navigation, feature docs, FAQ, and tweak browser.",
  },
};

const FEATURE_COVERAGE: Record<string, FeatureCoverage> = {
  "features-system-tweaks": {
    owners: ["vm-tweak-direct.spec.ts", "tweaks-lifecycle.spec.ts", "vm-coverage-matrix.spec.ts"],
    actionStrategy: "execute",
  },
  "features-dashboard": {
    owners: ["app.spec.ts", "modules-comprehensive.spec.ts", "vm-coverage-matrix.spec.ts"],
    actionStrategy: "mixed",
  },
  "features-gaming-optimizer": {
    owners: ["modules-comprehensive.spec.ts", "vm-coverage-matrix.spec.ts"],
    actionStrategy: "guarded",
  },
  "features-gpu-driver-cleaner": {
    owners: ["modules-comprehensive.spec.ts", "vm-coverage-matrix.spec.ts"],
    actionStrategy: "guarded",
  },
  "features-wsl-manager": {
    owners: ["features-direct.spec.ts", "modules-comprehensive.spec.ts", "vm-coverage-matrix.spec.ts"],
    actionStrategy: "mixed",
  },
  "features-latency-optimizer": {
    owners: ["features-direct.spec.ts", "modules-comprehensive.spec.ts", "vm-coverage-matrix.spec.ts"],
    actionStrategy: "execute",
  },
  "features-privacy-audit": {
    owners: ["features-direct.spec.ts", "modules-comprehensive.spec.ts", "vm-coverage-matrix.spec.ts"],
    actionStrategy: "execute",
  },
  "features-driver-manager": {
    owners: ["features-direct.spec.ts", "modules-comprehensive.spec.ts", "vm-coverage-matrix.spec.ts"],
    actionStrategy: "execute",
  },
  "features-process-manager": {
    owners: ["features-direct.spec.ts", "modules-comprehensive.spec.ts", "vm-coverage-matrix.spec.ts"],
    actionStrategy: "execute",
  },
  "features-network-analyzer": {
    owners: ["features-direct.spec.ts", "modules-comprehensive.spec.ts", "vm-coverage-matrix.spec.ts"],
    actionStrategy: "execute",
  },
  "features-storage-optimizer": {
    owners: ["features-direct.spec.ts", "modules-comprehensive.spec.ts", "vm-coverage-matrix.spec.ts"],
    actionStrategy: "execute",
  },
  "features-power-manager": {
    owners: ["modules-comprehensive.spec.ts", "vm-coverage-matrix.spec.ts"],
    actionStrategy: "mixed",
  },
  "features-startup-apps": {
    owners: ["features-direct.spec.ts", "modules-comprehensive.spec.ts", "vm-coverage-matrix.spec.ts"],
    actionStrategy: "execute",
  },
  "features-app-store": {
    owners: ["modules-comprehensive.spec.ts", "vm-coverage-matrix.spec.ts"],
    actionStrategy: "guarded",
  },
  "features-software-updates": {
    owners: ["vm-coverage-matrix.spec.ts"],
    actionStrategy: "guarded",
  },
  "features-system-report": {
    owners: ["features-direct.spec.ts", "modules-comprehensive.spec.ts", "vm-coverage-matrix.spec.ts"],
    actionStrategy: "execute",
  },
  "features-profiles-and-backup": {
    owners: ["app.spec.ts", "modules-comprehensive.spec.ts", "vm-coverage-matrix.spec.ts"],
    actionStrategy: "mixed",
  },
  "features-automation-center": {
    owners: ["vm-coverage-matrix.spec.ts"],
    actionStrategy: "guarded",
  },
  "features-history-audit-log": {
    owners: ["app.spec.ts", "modules-comprehensive.spec.ts", "vm-coverage-matrix.spec.ts"],
    actionStrategy: "mixed",
  },
  "features-windows-defender": {
    owners: ["features-direct.spec.ts", "modules-comprehensive.spec.ts", "vm-coverage-matrix.spec.ts"],
    actionStrategy: "mixed",
  },
  "features-ai-assistant": {
    owners: ["src/__tests__/components/AIAssistantChat.test.tsx", "vm-coverage-matrix.spec.ts"],
    actionStrategy: "guarded",
  },
  "features-command-palette": {
    owners: ["app.spec.ts", "modules-comprehensive.spec.ts", "vm-coverage-matrix.spec.ts"],
    actionStrategy: "mixed",
  },
};

async function skipOnboarding(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("consent-accepted", "true");
    window.localStorage.setItem("onboardingComplete", "true");
    const store = JSON.parse(localStorage.getItem("winopt-storage") || "{}");
    store.state = {
      ...(store.state || {}),
      userSettings: { ...(store.state?.userSettings || {}), expertModeEnabled: true },
    };
    localStorage.setItem("winopt-storage", JSON.stringify(store));
  });
  await page.goto("/");
}

function labelsFromSidebarSource() {
  const source = fs.readFileSync(path.join(repoRoot, "src/components/layout/Sidebar.tsx"), "utf-8");
  const groupLabels = new Set(["System Tuning", "Apps & Packages", "Utilities", "System"]);
  return [...source.matchAll(/\{\s*id:\s*"[^"]+",\s*label:\s*"([^"]+)"/g)]
    .map((match) => match[1])
    .filter((label) => !groupLabels.has(label));
}

function declaredFeatureIds() {
  const source = fs.readFileSync(path.join(repoRoot, "src/data/features.json"), "utf-8");
  return JSON.parse(source).map((feature: { id: string }) => feature.id);
}

function escapeRegex(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test.describe("VM coverage contract", () => {
  test("every sidebar module has VM coverage metadata", () => {
    const navLabels = labelsFromSidebarSource();
    const missing = navLabels.filter((label) => !MODULE_COVERAGE[label]);
    const stale = Object.keys(MODULE_COVERAGE).filter((label) => !navLabels.includes(label));

    expect(missing, `Missing VM coverage metadata for: ${missing.join(", ")}`).toEqual([]);
    expect(stale, `Coverage metadata references removed modules: ${stale.join(", ")}`).toEqual([]);
  });

  test("every declared feature has VM coverage ownership", () => {
    const ids = declaredFeatureIds();
    const missing = ids.filter((id: string) => !FEATURE_COVERAGE[id]);
    const stale = Object.keys(FEATURE_COVERAGE).filter((id) => !ids.includes(id));
    const ownerless = Object.entries(FEATURE_COVERAGE)
      .filter(([, value]) => value.owners.length === 0)
      .map(([id]) => id);

    expect(missing, `Missing feature coverage entries for: ${missing.join(", ")}`).toEqual([]);
    expect(stale, `Feature coverage references removed features: ${stale.join(", ")}`).toEqual([]);
    expect(ownerless, `Feature coverage entries without owners: ${ownerless.join(", ")}`).toEqual([]);
  });

  test("every tweak category is reachable by VM UI lifecycle or direct verification", () => {
    const tweaks = JSON.parse(fs.readFileSync(path.join(repoRoot, "src/data/tweaks.json"), "utf-8"));
    const categories = [...new Set(tweaks.map((tweak: { category: string }) => tweak.category))].sort();
    const reachableCategoryLabels = ["Performance", "Privacy", "Security", "Gaming", "Network", "Power", "Debloat", "Windows UI", "Updates", "Tools"];
    const categoryToLabel: Record<string, string> = { "Windows Update": "Updates" };
    const missing = categories.filter((category) => !reachableCategoryLabels.includes(categoryToLabel[category] ?? category));

    expect(tweaks.length).toBeGreaterThan(0);
    expect(missing, `Tweak categories without UI reachability: ${missing.join(", ")}`).toEqual([]);
  });

  for (const [label, coverage] of Object.entries(MODULE_COVERAGE)) {
    test(`${label} exposes expected VM action surface`, async ({ page }) => {
      await skipOnboarding(page);
      await page.getByTitle(label, { exact: true }).click();
      await expect(page.locator("main")).toContainText(coverage.primaryText, { timeout: 15000 });

      const visibleInteractive = await page.locator("main button:visible, main input:visible, main select:visible, main textarea:visible, main [role='button']:visible").count();
      expect(visibleInteractive, `${label} should expose interactive controls. ${coverage.notes}`).toBeGreaterThan(0);

      const actionPattern = new RegExp(coverage.actionSurface.map(escapeRegex).join("|"), "i");
      await expect(
        page.locator("main"),
        `${label} did not expose any expected action labels: ${coverage.actionSurface.join(", ")}. ${coverage.notes}`
      ).toContainText(actionPattern, { timeout: 15000 });
    });
  }
});
