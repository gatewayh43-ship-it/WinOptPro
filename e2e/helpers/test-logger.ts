/**
 * Test Logger — Structured JSON logging for VM E2E tests.
 * 
 * Captures before/after states, screenshots, timing, and pass/fail
 * for every single tweak and module test.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface TweakTestResult {
    tweakId: string;
    tweakName: string;
    category: string;
    riskLevel: string;
    requiresExpertMode: boolean;
    tests: {
        apply?: TestOutcome;
        validate?: TestOutcome;
        revert?: TestOutcome;
        validateAfterRevert?: TestOutcome;
    };
    screenshots: string[];
    timestamp: string;
}

export interface TestOutcome {
    status: 'PASS' | 'FAIL' | 'SKIP' | 'ERROR';
    durationMs: number;
    beforeState?: string;
    afterState?: string;
    expectedState?: string;
    actualState?: string;
    error?: string;
    stdout?: string;
    stderr?: string;
}

export interface ModuleTestResult {
    moduleName: string;
    testName: string;
    status: 'PASS' | 'FAIL' | 'SKIP' | 'ERROR';
    durationMs: number;
    error?: string;
    screenshots: string[];
    timestamp: string;
}

export interface TestRunReport {
    runId: string;
    startTime: string;
    endTime?: string;
    vmCheckpoint: string;
    environment: {
        hostOS: string;
        vmName: string;
        appVersion: string;
    };
    tweakResults: TweakTestResult[];
    moduleResults: ModuleTestResult[];
    summary: {
        totalTweaks: number;
        tweaksPassed: number;
        tweaksFailed: number;
        tweaksSkipped: number;
        totalModules: number;
        modulesPassed: number;
        modulesFailed: number;
        modulesSkipped: number;
        totalDurationMs: number;
    };
}

export class TestLogger {
    private report: TestRunReport;
    private outputDir: string;

    constructor(outputDir: string, vmCheckpoint = '01-TestReady') {
        this.outputDir = outputDir;
        
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        this.report = {
            runId: `run-${Date.now()}`,
            startTime: new Date().toISOString(),
            vmCheckpoint,
            environment: {
                hostOS: process.platform,
                vmName: 'WinOpt-TestVM',
                appVersion: '1.0.0'
            },
            tweakResults: [],
            moduleResults: [],
            summary: {
                totalTweaks: 0,
                tweaksPassed: 0,
                tweaksFailed: 0,
                tweaksSkipped: 0,
                totalModules: 0,
                modulesPassed: 0,
                modulesFailed: 0,
                modulesSkipped: 0,
                totalDurationMs: 0
            }
        };
    }

    logTweakResult(result: TweakTestResult): void {
        this.report.tweakResults.push(result);
        this.report.summary.totalTweaks++;

        const allTests = Object.values(result.tests);
        const allPassed = allTests.length > 0 && allTests.every(t => t?.status === 'PASS');
        const anyFailed = allTests.some(t => t?.status === 'FAIL' || t?.status === 'ERROR');
        const allSkipped = allTests.length > 0 && allTests.every(t => t?.status === 'SKIP');

        if (allSkipped) {
            this.report.summary.tweaksSkipped++;
        } else if (allPassed) {
            this.report.summary.tweaksPassed++;
        } else if (anyFailed) {
            this.report.summary.tweaksFailed++;
        }

        // Write incremental progress
        this.saveProgress();

        // Console output
        const icon = allPassed ? '✓' : anyFailed ? '✗' : '⊘';
        const color = allPassed ? '\x1b[32m' : anyFailed ? '\x1b[31m' : '\x1b[33m';
        console.log(`${color}${icon}\x1b[0m [${result.category}] ${result.tweakName} (${result.tweakId})`);
        
        for (const [phase, outcome] of Object.entries(result.tests)) {
            if (outcome) {
                const phaseIcon = outcome.status === 'PASS' ? '  ✓' : outcome.status === 'FAIL' ? '  ✗' : '  ⊘';
                console.log(`  ${phaseIcon} ${phase}: ${outcome.status} (${outcome.durationMs}ms)`);
                if (outcome.error) console.log(`    Error: ${outcome.error}`);
                if (outcome.beforeState !== undefined) console.log(`    Before: ${outcome.beforeState}`);
                if (outcome.afterState !== undefined) console.log(`    After:  ${outcome.afterState}`);
            }
        }
    }

    logModuleResult(result: ModuleTestResult): void {
        this.report.moduleResults.push(result);
        this.report.summary.totalModules++;

        if (result.status === 'PASS') {
            this.report.summary.modulesPassed++;
        } else if (result.status === 'FAIL' || result.status === 'ERROR') {
            this.report.summary.modulesFailed++;
        } else {
            this.report.summary.modulesSkipped++;
        }

        this.saveProgress();

        const icon = result.status === 'PASS' ? '✓' : result.status === 'FAIL' ? '✗' : '⊘';
        const color = result.status === 'PASS' ? '\x1b[32m' : result.status === 'FAIL' ? '\x1b[31m' : '\x1b[33m';
        console.log(`${color}${icon}\x1b[0m [${result.moduleName}] ${result.testName} (${result.durationMs}ms)`);
        if (result.error) console.log(`  Error: ${result.error}`);
    }

    finalize(): TestRunReport {
        this.report.endTime = new Date().toISOString();
        
        const startMs = new Date(this.report.startTime).getTime();
        const endMs = new Date(this.report.endTime).getTime();
        this.report.summary.totalDurationMs = endMs - startMs;

        // Save final report
        const reportPath = path.join(this.outputDir, 'vm-test-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(this.report, null, 2));

        // Print summary
        console.log('\n' + '═'.repeat(60));
        console.log('  VM TEST RUN COMPLETE');
        console.log('═'.repeat(60));
        console.log(`  Duration: ${(this.report.summary.totalDurationMs / 1000 / 60).toFixed(1)} minutes`);
        console.log('');
        console.log('  TWEAKS:');
        console.log(`    ✓ Passed:  ${this.report.summary.tweaksPassed}`);
        console.log(`    ✗ Failed:  ${this.report.summary.tweaksFailed}`);
        console.log(`    ⊘ Skipped: ${this.report.summary.tweaksSkipped}`);
        console.log(`    Total:     ${this.report.summary.totalTweaks}`);
        console.log('');
        console.log('  MODULES:');
        console.log(`    ✓ Passed:  ${this.report.summary.modulesPassed}`);
        console.log(`    ✗ Failed:  ${this.report.summary.modulesFailed}`);
        console.log(`    ⊘ Skipped: ${this.report.summary.modulesSkipped}`);
        console.log(`    Total:     ${this.report.summary.totalModules}`);
        console.log('');
        console.log(`  Report: ${reportPath}`);
        console.log('═'.repeat(60) + '\n');

        return this.report;
    }

    private saveProgress(): void {
        const progressPath = path.join(this.outputDir, 'vm-test-progress.json');
        fs.writeFileSync(progressPath, JSON.stringify(this.report, null, 2));
    }
}
