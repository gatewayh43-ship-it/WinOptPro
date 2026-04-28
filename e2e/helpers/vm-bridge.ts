/**
 * VM Bridge — Executes PowerShell commands inside the Hyper-V VM
 * via Invoke-Command / Direct Session.
 * 
 * Used by E2E tests to verify tweak state (registry, services, etc.)
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface VMCommandResult {
    stdout: string;
    stderr: string;
    exitCode: number;
    durationMs: number;
}

export interface RegistrySnapshot {
    [key: string]: string | number | null;
}

export interface ServiceState {
    name: string;
    status: string;
    startType: string;
}

export class VMBridge {
    private vmName: string;
    private useDirectPS: boolean;
    private guestUser: string;
    private guestPassword: string;

    constructor(vmName = 'WinOpt-TestVM', useDirectPS = false) {
        this.vmName = vmName;
        this.useDirectPS = useDirectPS;
        this.guestUser = process.env.WINOPT_VM_USER || 'WinOptTest';
        this.guestPassword = process.env.WINOPT_VM_PASSWORD || '';
    }

    /**
     * Run a PowerShell command inside the VM via Invoke-Command.
     * Falls back to direct local execution if useDirectPS is true (for testing on the same machine).
     */
    async runInVM(command: string): Promise<VMCommandResult> {
        const start = Date.now();
        try {
            let fullCmd: string;

            // Encode the command as UTF-16LE base64 so it survives all shell quoting layers.
            // Both paths use -EncodedCommand to avoid issues with $, ", ', backticks, etc.
            const encoded = Buffer.from(command, 'utf16le').toString('base64');

            if (this.useDirectPS) {
                // Run directly on the local machine (when test runs inside the VM).
                // -EncodedCommand avoids all quoting issues with $, ", ', etc.
                fullCmd = `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand ${encoded}`;
            } else {
                // Run via Hyper-V PowerShell Direct from the host.
                // [ScriptBlock]::Create() from base64 avoids escaping the payload through the PS
                // double-quoted string layer — $, ", `, and special chars survive intact.
                const credentialPrefix = this.guestPassword
                    ? `$u=[Text.Encoding]::Unicode.GetString([Convert]::FromBase64String('${Buffer.from(this.guestUser, 'utf16le').toString('base64')}'));$p=[Text.Encoding]::Unicode.GetString([Convert]::FromBase64String('${Buffer.from(this.guestPassword, 'utf16le').toString('base64')}'));$s=ConvertTo-SecureString $p -AsPlainText -Force;$c=[System.Management.Automation.PSCredential]::new($u,$s);`
                    : '';
                const credentialArg = this.guestPassword ? ' -Credential $c' : '';
                const createSB = `${credentialPrefix}Invoke-Command -VMName '${this.vmName}'${credentialArg} -ScriptBlock ([ScriptBlock]::Create([Text.Encoding]::Unicode.GetString([Convert]::FromBase64String('${encoded}')))) -ErrorAction Stop`;
                const outerEncoded = Buffer.from(createSB, 'utf16le').toString('base64');
                fullCmd = `powershell -NoProfile -NonInteractive -EncodedCommand ${outerEncoded}`;
            }

            const { stdout, stderr } = await execAsync(fullCmd, { 
                timeout: 60000,
                maxBuffer: 10 * 1024 * 1024 
            });

            return {
                stdout: stdout.trim(),
                stderr: stderr.trim(),
                exitCode: 0,
                durationMs: Date.now() - start
            };
        } catch (error: any) {
            return {
                stdout: error.stdout?.trim() || '',
                stderr: error.stderr?.trim() || error.message,
                exitCode: error.code || 1,
                durationMs: Date.now() - start
            };
        }
    }

    /**
     * Get a registry value from the VM
     */
    async getRegistryValue(path: string, name: string): Promise<string | null> {
        const cmd = `(Get-ItemProperty -Path '${path}' -Name '${name}' -EA SilentlyContinue).'${name}'`;
        const result = await this.runInVM(cmd);
        if (result.exitCode !== 0 || !result.stdout) return null;
        return result.stdout;
    }

    /**
     * Get a Windows service state from the VM
     */
    async getServiceState(serviceName: string): Promise<ServiceState | null> {
        const cmd = `Get-Service -Name '${serviceName}' -EA SilentlyContinue | Select-Object Name,Status,StartType | ConvertTo-Json`;
        const result = await this.runInVM(cmd);
        if (result.exitCode !== 0 || !result.stdout) return null;
        try {
            return JSON.parse(result.stdout);
        } catch {
            return null;
        }
    }

    /**
     * Run a tweak's validation command and return raw output
     */
    async runValidation(validationCmd: string): Promise<{ state: string; rawOutput: string }> {
        if (!validationCmd || validationCmd.trim() === '') {
            return { state: 'Unknown', rawOutput: '' };
        }
        const result = await this.runInVM(validationCmd);
        return {
            state: result.exitCode === 0 && result.stdout ? 'HasOutput' : 'NoOutput',
            rawOutput: result.stdout
        };
    }

    /**
     * Capture a full snapshot of multiple registry paths
     */
    async captureRegistrySnapshot(registryPaths: { path: string; name: string }[]): Promise<RegistrySnapshot> {
        const snapshot: RegistrySnapshot = {};
        for (const { path, name } of registryPaths) {
            snapshot[`${path}\\${name}`] = await this.getRegistryValue(path, name);
        }
        return snapshot;
    }

    /**
     * Capture state of multiple services
     */
    async captureServiceStates(serviceNames: string[]): Promise<Record<string, ServiceState | null>> {
        const states: Record<string, ServiceState | null> = {};
        for (const name of serviceNames) {
            states[name] = await this.getServiceState(name);
        }
        return states;
    }

    /**
     * Restore VM to a specific checkpoint
     */
    private encodePS(cmd: string): string {
        return Buffer.from(cmd, 'utf16le').toString('base64');
    }

    async restoreCheckpoint(checkpointName: string): Promise<void> {
        const restore = `Restore-VMCheckpoint -VMName '${this.vmName}' -Name '${checkpointName}' -Confirm:$false`;
        await execAsync(`powershell -NoProfile -EncodedCommand ${this.encodePS(restore)}`, { timeout: 120000 });

        const start = `Start-VM -Name '${this.vmName}' -ErrorAction SilentlyContinue`;
        await execAsync(`powershell -NoProfile -EncodedCommand ${this.encodePS(start)}`, { timeout: 30000 });

        const wait = `Wait-VM -VMName '${this.vmName}' -For Heartbeat -Timeout 120`;
        await execAsync(`powershell -NoProfile -EncodedCommand ${this.encodePS(wait)}`, { timeout: 150000 });
    }

    async createCheckpoint(name: string): Promise<void> {
        const cmd = `Checkpoint-VM -Name '${this.vmName}' -SnapshotName '${name}'`;
        await execAsync(`powershell -NoProfile -EncodedCommand ${this.encodePS(cmd)}`, { timeout: 120000 });
    }

    /**
     * Check if the VM is running and accessible
     */
    async isReady(): Promise<boolean> {
        try {
            const result = await this.runInVM('hostname');
            return result.exitCode === 0 && result.stdout.length > 0;
        } catch {
            return false;
        }
    }
}
