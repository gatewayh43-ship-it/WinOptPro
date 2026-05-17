/**
 * VM TWEAK DIRECT VERIFICATION — Real PowerShell execution
 *
 * Runs INSIDE the VM or via Hyper-V PowerShell Direct.
 * For each of the 165 tweaks in tweaks.json:
 *   Phase 1: Capture baseline state via validationCmd
 *   Phase 2: Apply tweak (execution.code)
 *   Phase 3: Wait 2 s for system to react
 *   Phase 4: Validate — record post-apply state, check if it changed
 *   Phase 5: Revert tweak (execution.revertCode)
 *   Phase 6: Wait 2 s
 *   Phase 7: Validate — record post-revert state, check if it matches baseline
 *   Phase 8: Write incremental JSON log
 *
 * Execution modes:
 *   VM_BRIDGE=true  → runs via Hyper-V PS Direct (from host)
 *   VM_BRIDGE=false → runs directly on the local machine (inside VM)
 *
 * Launch from inside the VM:
 *   npx playwright test vm-tweak-direct --config=playwright.vm.config.ts
 *   (Must run as Administrator)
 *
 * Launch from the host with PS Direct:
 *   VM_BRIDGE=true npx playwright test vm-tweak-direct --config=playwright.vm.config.ts
 */

import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { VMBridge, VMCommandResult } from './helpers/vm-bridge';

// ─── Configuration ────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tweaksDataPath = path.resolve(__dirname, '../src/data/tweaks.json');
const tweaksData: TweakDef[] = JSON.parse(fs.readFileSync(tweaksDataPath, 'utf-8'));

const USE_VM_BRIDGE = process.env.VM_BRIDGE === 'true';
const VM_NAME = process.env.VM_NAME || 'WinOpt-TestVM';
const LOG_DIR = path.resolve(__dirname, '../test-results/vm-direct');

if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

// useDirectPS=true → commands run on the local machine (inside the VM itself)
// useDirectPS=false → commands run via Hyper-V PS Direct from the host
const bridge = USE_VM_BRIDGE
    ? new VMBridge(VM_NAME, false)
    : new VMBridge('', true);

// ─── Types ────────────────────────────────────────────────────────────────────

interface TweakDef {
    id: string;
    name: string;
    category: string;
    riskLevel: string;
    requiresExpertMode: boolean;
    execution: { code: string; revertCode: string };
    validationCmd?: string;
}

type PhaseStatus = 'PASS' | 'FAIL' | 'SKIP' | 'WARN';

interface PhaseResult {
    status: PhaseStatus;
    durationMs: number;
    exitCode?: number;
    stdout?: string;
    stderr?: string;
    error?: string;
    note?: string;
}

interface TweakTestResult {
    tweakId: string;
    tweakName: string;
    category: string;
    riskLevel: string;
    requiresExpertMode: boolean;
    overallStatus: PhaseStatus;
    timestamp: string;
    totalDurationMs: number;
    error?: string;
    phases: {
        baseline?: PhaseResult;
        apply?: PhaseResult;
        validateApply?: PhaseResult;
        revert?: PhaseResult;
        validateRevert?: PhaseResult;
    };
}

// ─── Result accumulator ───────────────────────────────────────────────────────

const allResults: TweakTestResult[] = [];

function writeProgress(result: TweakTestResult) {
    allResults.push(result);
    fs.writeFileSync(
        path.join(LOG_DIR, 'direct-results.json'),
        JSON.stringify(allResults, null, 2)
    );
}

function writeCurrent(tweak: TweakDef, phase: string) {
    fs.writeFileSync(
        path.join(LOG_DIR, 'direct-current.json'),
        JSON.stringify({
            tweakId: tweak.id,
            tweakName: tweak.name,
            category: tweak.category,
            phase,
            timestamp: new Date().toISOString(),
        }, null, 2)
    );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function runPhase(
    label: string,
    cmd: string,
    expectedExitCode = 0
): Promise<{ result: PhaseResult; raw: VMCommandResult }> {
    const start = Date.now();
    const raw = await bridge.runInVM(cmd);
    const status: PhaseStatus = raw.exitCode === expectedExitCode ? 'PASS' : 'FAIL';
    return {
        raw,
        result: {
            status,
            durationMs: Date.now() - start,
            exitCode: raw.exitCode,
            stdout: raw.stdout.slice(0, 2000), // cap to 2 KB
            stderr: raw.stderr.slice(0, 1000),
            ...(status === 'FAIL' ? { error: `exit ${raw.exitCode}: ${raw.stderr || raw.stdout}` } : {}),
        },
    };
}

/** Normalise a validationCmd output for comparison (trim, lowercase) */
function normaliseVal(s: string) {
    return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

// ─── Test suite ───────────────────────────────────────────────────────────────

test.describe.configure({ mode: 'serial' });

test.describe('VM Tweak Direct Verification', () => {

    test.afterAll(() => {
        const passed  = allResults.filter(r => r.overallStatus === 'PASS').length;
        const failed  = allResults.filter(r => r.overallStatus === 'FAIL').length;
        const skipped = allResults.filter(r => r.overallStatus === 'SKIP').length;
        const warned  = allResults.filter(r => r.overallStatus === 'WARN').length;

        const summary = {
            mode: USE_VM_BRIDGE ? 'hyper-v-ps-direct' : 'local-ps',
            vm: USE_VM_BRIDGE ? VM_NAME : 'localhost',
            total: allResults.length,
            passed, failed, skipped, warned,
            passRate: allResults.length
                ? `${((passed / allResults.length) * 100).toFixed(1)}%`
                : 'N/A',
            timestamp: new Date().toISOString(),
            results: allResults,
        };

        fs.writeFileSync(
            path.join(LOG_DIR, 'direct-summary.json'),
            JSON.stringify(summary, null, 2)
        );

        console.log(`\n${'═'.repeat(60)}`);
        console.log(`  VM TWEAK DIRECT VERIFICATION COMPLETE`);
        console.log(`  ${passed} PASS  |  ${failed} FAIL  |  ${skipped} SKIP  |  ${warned} WARN`);
        console.log(`  Pass rate: ${summary.passRate}`);
        console.log(`  Report: ${LOG_DIR}/direct-summary.json`);
        console.log(`${'═'.repeat(60)}\n`);
    });

    for (const tweak of tweaksData) {
        test(`[${tweak.riskLevel}] ${tweak.category} — ${tweak.name} (${tweak.id})`, async () => {

            const testStart = Date.now();
            const result: TweakTestResult = {
                tweakId: tweak.id,
                tweakName: tweak.name,
                category: tweak.category,
                riskLevel: tweak.riskLevel,
                requiresExpertMode: tweak.requiresExpertMode,
                overallStatus: 'PASS',
                timestamp: new Date().toISOString(),
                totalDurationMs: 0,
                phases: {},
            };

            try {
                // ── Phase 1: Baseline ─────────────────────────────────────
                writeCurrent(tweak, 'baseline');
                let baselineOutput = '';
                if (tweak.validationCmd) {
                    const { result: pr, raw } = await runPhase('baseline', tweak.validationCmd);
                    // Baseline is informational — don't fail if validation cmd errors
                    result.phases.baseline = { ...pr, status: 'PASS', note: 'baseline captured' };
                    baselineOutput = normaliseVal(raw.stdout);
                } else {
                    result.phases.baseline = {
                        status: 'SKIP',
                        durationMs: 0,
                        note: 'no validationCmd defined',
                    };
                }

                // ── Phase 2: Apply ───────────────────────────────────────
                writeCurrent(tweak, 'apply');
                const { result: applyPhase } = await runPhase('apply', tweak.execution.code);
                result.phases.apply = applyPhase;

                if (applyPhase.status === 'FAIL') {
                    result.overallStatus = 'FAIL';
                    result.error = `Apply failed: ${applyPhase.error}`;
                    // Still attempt revert so the system is not left in a bad state
                }

                // Wait for system to reflect the change
                await new Promise(r => setTimeout(r, 2000));

                // ── Phase 3: Validate apply ──────────────────────────────
                if (tweak.validationCmd) {
                    writeCurrent(tweak, 'validateApply');
                    const { result: vp, raw } = await runPhase('validateApply', tweak.validationCmd);
                    const postApplyOutput = normaliseVal(raw.stdout);
                    const stateChanged = postApplyOutput !== baselineOutput;

                    result.phases.validateApply = {
                        ...vp,
                        note: stateChanged
                            ? `state changed: "${baselineOutput}" → "${postApplyOutput}"`
                            : `state unchanged (may already have been in desired state): "${postApplyOutput}"`,
                        // WARN if state didn't change (could mean tweak was already applied, or failed silently)
                        status: applyPhase.status === 'FAIL'
                            ? 'SKIP'
                            : stateChanged ? 'PASS' : 'WARN',
                    };

                    if (result.phases.validateApply.status === 'WARN' && result.overallStatus === 'PASS') {
                        result.overallStatus = 'WARN';
                    }
                } else {
                    result.phases.validateApply = {
                        status: 'SKIP',
                        durationMs: 0,
                        note: 'no validationCmd — skipping post-apply check',
                    };
                }

                // ── Phase 4: Revert ──────────────────────────────────────
                writeCurrent(tweak, 'revert');
                const { result: revertPhase } = await runPhase('revert', tweak.execution.revertCode);
                result.phases.revert = revertPhase;

                if (revertPhase.status === 'FAIL' && result.overallStatus === 'PASS') {
                    result.overallStatus = 'FAIL';
                    result.error = `Revert failed: ${revertPhase.error}`;
                }

                // Wait for system to settle
                await new Promise(r => setTimeout(r, 2000));

                // ── Phase 5: Validate revert ─────────────────────────────
                if (tweak.validationCmd && baselineOutput !== '') {
                    writeCurrent(tweak, 'validateRevert');
                    const { result: vrp, raw } = await runPhase('validateRevert', tweak.validationCmd);
                    const postRevertOutput = normaliseVal(raw.stdout);
                    const reverted = postRevertOutput === baselineOutput;

                    result.phases.validateRevert = {
                        ...vrp,
                        note: reverted
                            ? `state restored to baseline: "${postRevertOutput}"`
                            : `state differs from baseline — expected "${baselineOutput}", got "${postRevertOutput}"`,
                        status: revertPhase.status === 'FAIL'
                            ? 'SKIP'
                            : reverted ? 'PASS' : 'WARN',
                    };

                    if (result.phases.validateRevert.status === 'WARN' && result.overallStatus === 'PASS') {
                        result.overallStatus = 'WARN';
                    }
                } else {
                    result.phases.validateRevert = {
                        status: 'SKIP',
                        durationMs: 0,
                        note: baselineOutput === ''
                            ? 'no baseline captured — skipping revert check'
                            : 'no validationCmd — skipping revert check',
                    };
                }

            } catch (err: any) {
                result.overallStatus = 'FAIL';
                result.error = err.message || String(err);
            } finally {
                result.totalDurationMs = Date.now() - testStart;
                writeProgress(result);

                console.log(
                    `  [${result.overallStatus.padEnd(4)}] ${tweak.category.padEnd(14)} ${tweak.id}`
                );
            }
        });
    }
});
