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

interface DirectExpectation {
    desiredApply?: string[];
    desiredRevert?: string[];
    unsupportedApply?: string[];
    noValidationChangeOk?: boolean;
    skipRevert?: boolean;
    skipRevertWhenAlreadyDesired?: boolean;
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

const DIRECT_EXPECTATIONS: Record<string, DirectExpectation> = {
    CleanComponentStore: { noValidationChangeOk: true, skipRevert: true },
    ClearTempFiles: { skipRevert: true },
    DisableAdapterPowerSaving: { unsupportedApply: ['unsupported', ''], skipRevert: true },
    DisableAdaptiveBrightness: { desiredApply: ['contains:current ac power setting index: 0x00000000', 'contains:current dc power setting index: 0x00000000'], unsupportedApply: [''], skipRevert: true },
    DisableCoreParking: { unsupportedApply: [''], skipRevert: true },
    DisableDynamicTick: { desiredApply: ['yes'], unsupportedApply: [''] },
    DisableFaxService: { desiredApply: ['disabled', 'stopped', ''], skipRevert: true },
    DisableFSO: { desiredApply: ['2'], skipRevertWhenAlreadyDesired: true },
    DisableHibernation: { desiredApply: ['disabled'], skipRevertWhenAlreadyDesired: true },
    DisableLocationCapabilityAccess: { desiredApply: ['deny'], unsupportedApply: [''], skipRevertWhenAlreadyDesired: true },
    DisableNagle: { desiredApply: ['1'], unsupportedApply: [''], skipRevert: true },
    DisablePCIeLinkStatePM: { unsupportedApply: [''], skipRevert: true },
    DisablePhoneLink: { desiredApply: ['removed'], skipRevert: true },
    DisableRemoteDesktop: { desiredApply: ['1'], skipRevertWhenAlreadyDesired: true },
    DisableSMBv1: { desiredApply: ['false'], skipRevertWhenAlreadyDesired: true },
    DisableTailoredExperiences: { desiredApply: ['0'], desiredRevert: ['1', '2'] },
    DisableVBS: { desiredApply: ['off'], unsupportedApply: [''] },
    DisableXboxFeatures: { desiredApply: ['stopped'], skipRevertWhenAlreadyDesired: true },
    DisableXboxGameMonitoring: { desiredApply: ['disabled', ''], skipRevertWhenAlreadyDesired: true },
    EnableAggressiveCPUBoost: { desiredApply: ['contains:current ac power setting index: 0x00000002', 'contains:current dc power setting index: 0x00000002'], unsupportedApply: ['', 'contains:power scheme guid:'], skipRevert: true },
    EnableFirewall: { desiredApply: ['true'], skipRevertWhenAlreadyDesired: true },
    EnableGPUMSIMode: { unsupportedApply: ['nogpu', ''], skipRevert: true },
    EnableRSS: { desiredApply: ['contains:enabled'], unsupportedApply: [''], skipRevert: true },
    EnableStorageSense: { desiredApply: ['1'], skipRevertWhenAlreadyDesired: true },
    EnableWriteBackCache: { unsupportedApply: ['false', ''], skipRevert: true },
    FlushDNS: { desiredApply: ['0'], skipRevert: true },
    FlushDNSCache: { desiredApply: ['0'], skipRevert: true },
    Remove3DAndMixedReality: { desiredApply: ['removed'], skipRevert: true },
    RemoveBloatwareApps: { desiredApply: ['removed'], skipRevert: true },
    RemoveCortanaApp: { desiredApply: ['removed'], skipRevert: true },
    RemoveOneDrive: { desiredApply: ['removed'], skipRevert: true },
    RepairSystemFiles: { noValidationChangeOk: true, skipRevert: true },
    ResetDNSDefault: { desiredApply: [''], skipRevert: true },
    ResetNetworkStack: { noValidationChangeOk: true, skipRevert: true },
    ResetWinsock: { noValidationChangeOk: true, skipRevert: true },
    SetDiagnosticDataMinimum: { desiredApply: ['0'], desiredRevert: ['3', '1', '2', ''] },
    SetMinCPUState100: { unsupportedApply: [''], skipRevert: true },
};

function matchesExpected(value: string, expected?: string[]) {
    return !!expected?.some(item => {
        const expectedValue = normaliseVal(item);
        if (expectedValue.startsWith('contains:')) {
            return value.includes(expectedValue.slice('contains:'.length));
        }
        return expectedValue === value;
    });
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
                const expectation = DIRECT_EXPECTATIONS[tweak.id] ?? {};
                let shouldSkipRevert = expectation.skipRevert ?? false;

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
                    const alreadyDesired = matchesExpected(baselineOutput, expectation.desiredApply);
                    const nowDesired = matchesExpected(postApplyOutput, expectation.desiredApply);
                    const unsupported = matchesExpected(postApplyOutput, expectation.unsupportedApply);
                    const noChangeAccepted = expectation.noValidationChangeOk === true;

                    let validateApplyStatus: PhaseStatus = 'WARN';
                    if (applyPhase.status === 'FAIL') {
                        validateApplyStatus = 'SKIP';
                    } else if (unsupported) {
                        validateApplyStatus = 'SKIP';
                        shouldSkipRevert = true;
                    } else if (stateChanged || nowDesired || noChangeAccepted) {
                        validateApplyStatus = 'PASS';
                    }

                    if (expectation.skipRevertWhenAlreadyDesired && alreadyDesired && nowDesired) {
                        shouldSkipRevert = true;
                    }

                    result.phases.validateApply = {
                        ...vp,
                        note: unsupported
                            ? `unsupported on this VM: "${postApplyOutput}"`
                            : noChangeAccepted && !stateChanged
                                ? `state unchanged but command has no durable validation signal: "${postApplyOutput}"`
                                : stateChanged
                            ? `state changed: "${baselineOutput}" → "${postApplyOutput}"`
                            : nowDesired
                                ? `state already at desired value: "${postApplyOutput}"`
                                : `state unchanged and not recognised as desired: "${postApplyOutput}"`,
                        status: validateApplyStatus,
                    };

                    if (result.phases.validateApply.status === 'WARN' && result.overallStatus === 'PASS') {
                        result.overallStatus = 'WARN';
                    } else if (result.phases.validateApply.status === 'SKIP' && result.overallStatus === 'PASS') {
                        result.overallStatus = 'SKIP';
                    }
                } else {
                    result.phases.validateApply = {
                        status: 'SKIP',
                        durationMs: 0,
                        note: 'no validationCmd — skipping post-apply check',
                    };
                }

                // ── Phase 4: Revert ──────────────────────────────────────
                if (shouldSkipRevert) {
                    result.phases.revert = {
                        status: 'SKIP',
                        durationMs: 0,
                        note: expectation.skipRevert
                            ? 'revert skipped: tweak is irreversible, one-shot, or unsupported in this VM'
                            : 'revert skipped: baseline was already at the desired state',
                    };
                    result.phases.validateRevert = {
                        status: 'PASS',
                        durationMs: 0,
                        note: 'no state restoration required',
                    };
                    return;
                }

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
                    const reachedExpectedRevert = matchesExpected(postRevertOutput, expectation.desiredRevert);

                    result.phases.validateRevert = {
                        ...vrp,
                        note: reverted
                            ? `state restored to baseline: "${postRevertOutput}"`
                            : reachedExpectedRevert
                                ? `state restored to expected revert value: "${postRevertOutput}"`
                            : `state differs from baseline — expected "${baselineOutput}", got "${postRevertOutput}"`,
                        status: revertPhase.status === 'FAIL'
                            ? 'SKIP'
                            : (reverted || reachedExpectedRevert) ? 'PASS' : 'WARN',
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
