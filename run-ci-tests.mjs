#!/usr/bin/env node
/**
 * CI-grade test runner — simulates a clean production CI environment:
 *   - CI=true        (disables watch, TTY colours, interactive prompts)
 *   - NODE_ENV=test
 *   - No pre-existing coverage artefacts
 *   - Fresh process with isolated env (no inherited shell overrides)
 *   - Full coverage + verbose reporter
 *   - Non-zero exit on any failure (mirrors CI pipeline behaviour)
 */

import { spawnSync, execSync } from "child_process";
import { rmSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { resolve, join } from "path";

const ROOT = new URL(".", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const RESULTS_DIR = join(ROOT, "ci-test-results");

// ── 1. Clean previous artefacts ────────────────────────────────────────────
console.log("\n╔══════════════════════════════════════════════════════╗");
console.log("║         WinOpt Pro — CI Test Environment             ║");
console.log("╚══════════════════════════════════════════════════════╝\n");

console.log("▶ Cleaning previous results...");
if (existsSync(join(ROOT, "coverage"))) rmSync(join(ROOT, "coverage"), { recursive: true });
if (existsSync(RESULTS_DIR)) rmSync(RESULTS_DIR, { recursive: true });
mkdirSync(RESULTS_DIR, { recursive: true });

// ── 2. Print environment info ──────────────────────────────────────────────
console.log(`▶ Node  : ${process.version}`);
console.log(`▶ CWD   : ${ROOT}`);
console.log(`▶ ENV   : CI=true  NODE_ENV=test  NO_COLOR=1\n`);

// ── 3. Build the isolated environment ─────────────────────────────────────
const ciEnv = {
  // Inherit only essential PATH/system vars
  PATH: process.env.PATH,
  USERPROFILE: process.env.USERPROFILE,
  APPDATA: process.env.APPDATA,
  TEMP: process.env.TEMP,
  TMP: process.env.TMP,
  SystemRoot: process.env.SystemRoot,
  SystemDrive: process.env.SystemDrive,
  COMPUTERNAME: process.env.COMPUTERNAME,
  // CI-specific overrides
  CI: "true",
  NODE_ENV: "test",
  NO_COLOR: "1",
  FORCE_COLOR: "0",
  NODE_OPTIONS: "--max-old-space-size=4096",
};

// ── 4. Run vitest with coverage + verbose reporter ─────────────────────────
console.log("▶ Running test suite with coverage...\n");
console.log("─".repeat(54) + "\n");

const start = Date.now();

const result = spawnSync(
  "npx",
  [
    "vitest", "run",
    "--reporter=verbose",
    "--coverage",
    "--coverage.reporter=text",
    "--coverage.reporter=json-summary",
  ],
  {
    cwd: ROOT,
    env: ciEnv,
    stdio: "inherit",
    shell: true,
  }
);

const elapsed = ((Date.now() - start) / 1000).toFixed(1);

// ── 5. Summary ─────────────────────────────────────────────────────────────
console.log("\n" + "─".repeat(54));
console.log(`\n▶ Completed in ${elapsed}s`);
console.log(`▶ Exit code: ${result.status ?? "signal: " + result.signal}`);

if (result.status === 0) {
  console.log("\n✓ All tests passed — CI environment clean\n");
} else {
  console.log("\n✗ Test run FAILED\n");
  process.exit(result.status ?? 1);
}
