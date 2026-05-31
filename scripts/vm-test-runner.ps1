#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Full VM Test Runner - Orchestrates the complete test pipeline.

.DESCRIPTION
    1. Restores VM to clean checkpoint
    2. Starts the VM and waits for it to be ready
    3. Copies the latest WinOpt build to the VM
    4. Starts the dev server inside the VM
    5. Runs the full Playwright UI test suite
    6. (Optional) Runs the direct tweak verification — applies/reverts every tweak
       via Hyper-V PS Direct and validates actual system-state changes
    7. Generates and opens the HTML report

.PARAMETER Checkpoint
    Name of the VM checkpoint to restore to (default: 01-TestReady)

.PARAMETER SkipRestore
    Skip the checkpoint restore step (useful for re-running tests)

.PARAMETER TestFilter
    Playwright test filter (e.g., "tweaks-lifecycle" to run only lifecycle tests)

.PARAMETER DirectVerify
    After the UI test suite, also run vm-tweak-direct.spec.ts and the
    production-readiness gate. Direct tweak tests apply and revert every tweak
    via PowerShell Direct and verify actual system state changes.

.PARAMETER DirectVerifyOnly
    Skip the dev server and UI tests. Run only the direct tweak verification and
    production-readiness gate.
    Useful after the VM is already in a known-good state.

.PARAMETER NoOpenReport
    Do not open the Playwright HTML report after the run. Use this for unattended
    automation and CI-style VM validation.

.PARAMETER GuestUser
    Local administrator username inside the VM for PowerShell Direct.

.PARAMETER GuestPassword
    Local administrator password inside the VM for PowerShell Direct. Defaults to
    the WINOPT_VM_PASSWORD environment variable when present.

.EXAMPLE
    .\vm-test-runner.ps1 -DirectVerify -FeaturesVerify              # Full VM run
    .\vm-test-runner.ps1                                            # UI tests only
    .\vm-test-runner.ps1 -DirectVerifyOnly                          # Direct tweak verification only
    .\vm-test-runner.ps1 -SkipRestore -DirectVerify -FeaturesVerify # Full re-run without restoring
    .\vm-test-runner.ps1 -DirectVerify -FeaturesVerify -NoOpenReport # Fully unattended full run
#>

param(
    [string]$VMName = "WinOpt-TestVM",
    [string]$Checkpoint = "01-TestReady",
    [switch]$SkipRestore,
    [string]$TestFilter = "",
    [string]$ProjectDir = "F:\WinOpt\WinOptimizerRevamp",
    # Run the direct PowerShell tweak verification (applies/reverts every tweak, checks actual system state)
    [switch]$DirectVerify,
    # Run ONLY the direct verification, skipping UI tests and dev server
    [switch]$DirectVerifyOnly,
    # After direct tweak verification, also run features-direct.spec.ts
    [switch]$FeaturesVerify,
    # Do not open the Playwright report window after completion
    [switch]$NoOpenReport,
    # Guest local administrator username for PowerShell Direct
    [string]$GuestUser = "WinOptTest",
    # Guest local administrator password for PowerShell Direct
    [string]$GuestPassword = $env:WINOPT_VM_PASSWORD
)

$ErrorActionPreference = "Stop"
$startTime = Get-Date
$runStamp = Get-Date -Format "yyyyMMdd-HHmmss"
$runLogDir = Join-Path $ProjectDir "test-results\vm-run-logs\$runStamp"
New-Item -Path $runLogDir -ItemType Directory -Force | Out-Null
Start-Transcript -Path (Join-Path $runLogDir "vm-test-runner.log") -Force | Out-Null

function New-WinOptGuestCredential {
    if ([string]::IsNullOrWhiteSpace($GuestPassword)) {
        return $null
    }

    $secure = ConvertTo-SecureString $GuestPassword -AsPlainText -Force
    return [System.Management.Automation.PSCredential]::new($GuestUser, $secure)
}

function New-WinOptVmSession {
    $credential = New-WinOptGuestCredential
    if ($credential) {
        return New-PSSession -VMName $VMName -Credential $credential -ErrorAction Stop
    }

    return New-PSSession -VMName $VMName -ErrorAction Stop
}

function Copy-WinOptDirectoryToVmArchive {
    param(
        [Parameter(Mandatory = $true)]$Session,
        [Parameter(Mandatory = $true)][string]$SourcePath,
        [Parameter(Mandatory = $true)][string]$DestinationParent,
        [Parameter(Mandatory = $true)][string]$ArchiveName
    )

    if (-not (Get-Command tar.exe -ErrorAction SilentlyContinue)) {
        throw "tar.exe is required for fast VM dependency transfer but was not found on the host."
    }

    $cacheDir = Join-Path $ProjectDir "test-results\vm-cache"
    New-Item -Path $cacheDir -ItemType Directory -Force | Out-Null

    $archivePath = Join-Path $cacheDir $ArchiveName
    $archive = Get-Item -LiteralPath $archivePath -ErrorAction SilentlyContinue

    if (-not $archive -or $archive.Length -le 0) {
        Remove-Item -Path $archivePath -Force -ErrorAction SilentlyContinue

        $sourceParent = Split-Path $SourcePath -Parent
        $sourceLeaf = Split-Path $SourcePath -Leaf
        Write-Host "  Packing $sourceLeaf for VM transfer..." -ForegroundColor DarkGray

        $tarArgs = @("-cf", $archivePath, "-C", $sourceParent, $sourceLeaf)
        $tarOutput = & tar.exe @tarArgs 2>&1
        $tarExitCode = $LASTEXITCODE
        if ($tarExitCode -ne 0) {
            $detail = ($tarOutput | Out-String).Trim()
            if ([string]::IsNullOrWhiteSpace($detail)) {
                $detail = "tar.exe exited with code $tarExitCode"
            }
            throw "Failed to create archive: $archivePath. $detail"
        }
    } else {
        Write-Host "  Reusing cached archive $ArchiveName ($([Math]::Round($archive.Length / 1MB, 1)) MB)..." -ForegroundColor DarkGray
    }

    Copy-Item -LiteralPath $archivePath -Destination (Join-Path $runLogDir $ArchiveName) -Force -ErrorAction SilentlyContinue

    $guestArchive = "C:\WinOpt\$ArchiveName"
    Copy-Item -ToSession $Session -Path $archivePath -Destination $guestArchive -Force

    Invoke-Command -Session $Session -ArgumentList $DestinationParent, $guestArchive -ScriptBlock {
        param($DestinationParent, $GuestArchive)
        if (-not (Get-Command tar.exe -ErrorAction SilentlyContinue)) {
            throw "tar.exe is required for fast VM dependency extraction but was not found in the guest."
        }
        New-Item -Path $DestinationParent -ItemType Directory -Force | Out-Null
        & tar.exe -xf $GuestArchive -C $DestinationParent
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to extract archive in VM: $GuestArchive"
        }
        Remove-Item -Path $GuestArchive -Force -ErrorAction SilentlyContinue
    }
}

Write-Host ""
Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host "|         WinOpt Pro - VM Test Runner                        |" -ForegroundColor Cyan
Write-Host "|         $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host ""

# --- Step 1: Restore VM Checkpoint --------------------------------------------

if (-not $SkipRestore) {
    Write-Host "[1/6] Restoring VM to checkpoint '$Checkpoint'..." -ForegroundColor Yellow
    
    # Stop VM if running
    $vm = Get-VM -Name $VMName -ErrorAction SilentlyContinue
    if ($vm -and $vm.State -eq 'Running') {
        Write-Host "  Stopping VM..." -ForegroundColor DarkGray
        Stop-VM -Name $VMName -TurnOff -Force
        Start-Sleep 3
    }
    
    # Restore checkpoint
    Restore-VMCheckpoint -VMName $VMName -Name $Checkpoint -Confirm:$false
    Write-Host "  OK Checkpoint restored" -ForegroundColor Green
    
    # Start VM
    Start-VM -VMName $VMName
    Write-Host "  Waiting for VM heartbeat..." -ForegroundColor DarkGray
    Wait-VM -VMName $VMName -For Heartbeat -Timeout 120
    Write-Host "  OK VM is ready" -ForegroundColor Green
    
    # Extra wait for Windows services to stabilize
    Write-Host "  Waiting 30s for Windows services to stabilize..." -ForegroundColor DarkGray
    Start-Sleep 30
} else {
    Write-Host "[1/6] Skipping checkpoint restore (--SkipRestore)" -ForegroundColor DarkGray
}

# --- Step 2: Get VM IP Address ------------------------------------------------

Write-Host ""
Write-Host "[2/6] Getting VM network info..." -ForegroundColor Yellow

$vmIP = ""
$retries = 0
while ([string]::IsNullOrEmpty($vmIP) -and $retries -lt 10) {
    $vmIP = (Get-VMNetworkAdapter -VMName $VMName | Select-Object -ExpandProperty IPAddresses | Where-Object { $_ -match '^\d+\.\d+\.\d+\.\d+$' }) | Select-Object -First 1
    if ([string]::IsNullOrEmpty($vmIP)) {
        Start-Sleep 5
        $retries++
    }
}

if ([string]::IsNullOrEmpty($vmIP)) {
    Write-Error "Could not get VM IP address after $retries retries"
    exit 1
}
Write-Host "  OK VM IP: $vmIP" -ForegroundColor Green

# --- Step 3: Copy Latest Code -------------------------------------------------

Write-Host ""
Write-Host "[3/6] Syncing latest code to VM..." -ForegroundColor Yellow

try {
    # Use Copy-VMFile for files that have changed
    $session = New-WinOptVmSession

    # Provision a portable Node.js runtime when the disposable VM has no
    # internet access for winget/npm bootstrap.
    $guestHasNpm = Invoke-Command -Session $session -ScriptBlock {
        [bool](Get-Command npm -ErrorAction SilentlyContinue)
    }

    if (-not $guestHasNpm) {
        $hostNode = Get-Command node -ErrorAction SilentlyContinue
        if (-not $hostNode) {
            throw "Host Node.js runtime was not found; install Node.js on the host or pre-provision it in the VM."
        }

        $hostNodeDir = Split-Path $hostNode.Source -Parent
        $guestToolsDir = "C:\WinOpt\tools"
        $guestNodeDir = Join-Path $guestToolsDir "nodejs"

        Write-Host "  Provisioning Node.js into VM from $hostNodeDir..." -ForegroundColor DarkGray
        Invoke-Command -Session $session -ScriptBlock {
            New-Item -Path "C:\WinOpt\tools" -ItemType Directory -Force | Out-Null
        }
        Copy-WinOptDirectoryToVmArchive -Session $session -SourcePath $hostNodeDir -DestinationParent $guestToolsDir -ArchiveName "nodejs-runtime.tar"
        Invoke-Command -Session $session -ArgumentList $guestNodeDir -ScriptBlock {
            param($NodeDir)
            $machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
            if ($machinePath -notlike "*$NodeDir*") {
                [Environment]::SetEnvironmentVariable("Path", "$NodeDir;$machinePath", "Machine")
            }
            $env:Path = "$NodeDir;$env:Path"
            if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
                throw "npm still was not available after offline Node.js provisioning."
            }
        }
    }
    
    # Ensure project directory exists
    Invoke-Command -Session $session -ScriptBlock {
        if (-not (Test-Path "C:\WinOpt\WinOptimizerRevamp")) {
            New-Item -Path "C:\WinOpt\WinOptimizerRevamp" -ItemType Directory -Force | Out-Null
        }
    }
    
    # Copy essential project files (exclude node_modules, .git, target, etc.)
    $filesToCopy = @(
        "package.json",
        "package-lock.json", 
        "tsconfig.json",
        "tsconfig.node.json",
        "vite.config.ts",
        "playwright.config.ts",
        "playwright.vm.config.ts",
        "playwright.direct.config.ts",
        "index.html"
    )
    
    foreach ($file in $filesToCopy) {
        $src = Join-Path $ProjectDir $file
        if (Test-Path $src) {
            Copy-Item -ToSession $session -Path $src -Destination "C:\WinOpt\WinOptimizerRevamp\$file" -Force
        }
    }
    
    # Copy directories. Keep this list tight: copying Rust target/ or old browser
    # caches through PowerShell Direct can turn a VM run into a multi-hour copy.
    $dirsToSync = @("src", "e2e", "public", "scripts", "src-tauri")
    foreach ($dir in $dirsToSync) {
        $srcDir = Join-Path $ProjectDir $dir
        if (Test-Path $srcDir) {
            if ($dir -eq "src-tauri") {
                $guestTauriDir = "C:\WinOpt\WinOptimizerRevamp\src-tauri"
                Invoke-Command -Session $session -ScriptBlock {
                    New-Item -Path "C:\WinOpt\WinOptimizerRevamp\src-tauri" -ItemType Directory -Force | Out-Null
                }

                Get-ChildItem -Path $srcDir -Force |
                    Where-Object { $_.Name -notin @("target", ".git") } |
                    ForEach-Object {
                        Copy-Item -ToSession $session -Path $_.FullName -Destination $guestTauriDir -Recurse -Force
                    }
            } else {
                Copy-Item -ToSession $session -Path $srcDir -Destination "C:\WinOpt\WinOptimizerRevamp\" -Recurse -Force
            }
        }
    }

    $hostNodeModules = Join-Path $ProjectDir "node_modules"
    $guestHasNodeModules = Invoke-Command -Session $session -ScriptBlock {
        Test-Path "C:\WinOpt\WinOptimizerRevamp\node_modules"
    }
    if ((Test-Path $hostNodeModules) -and (-not $guestHasNodeModules)) {
        Write-Host "  Mirroring host node_modules into VM for offline dependency availability..." -ForegroundColor DarkGray
        Copy-WinOptDirectoryToVmArchive -Session $session -SourcePath $hostNodeModules -DestinationParent "C:\WinOpt\WinOptimizerRevamp" -ArchiveName "node_modules.tar"
    }

    $hostPlaywrightBrowsers = Join-Path $env:LOCALAPPDATA "ms-playwright"
    $guestPlaywrightBrowsers = "C:\WinOpt\ms-playwright"
    $playwrightManifest = Join-Path $ProjectDir "node_modules\playwright-core\browsers.json"
    if ((Test-Path $hostPlaywrightBrowsers) -and (Test-Path $playwrightManifest)) {
        $browserManifest = Get-Content $playwrightManifest -Raw | ConvertFrom-Json
        $neededBrowserDirs = @()
        foreach ($browser in $browserManifest.browsers) {
            if ($browser.name -in @("chromium", "chromium-headless-shell", "ffmpeg")) {
                $dirPrefix = if ($browser.name -eq "chromium-headless-shell") { "chromium_headless_shell" } else { $browser.name }
                $neededBrowserDirs += "$dirPrefix-$($browser.revision)"
            }
        }

        Invoke-Command -Session $session -ScriptBlock {
            New-Item -Path "C:\WinOpt\ms-playwright" -ItemType Directory -Force | Out-Null
        }

        foreach ($browserDir in $neededBrowserDirs) {
            $hostBrowserDir = Join-Path $hostPlaywrightBrowsers $browserDir
            if (-not (Test-Path $hostBrowserDir)) {
                continue
            }

            $guestHasBrowserDir = Invoke-Command -Session $session -ArgumentList $browserDir -ScriptBlock {
                param($BrowserDir)
                Test-Path (Join-Path "C:\WinOpt\ms-playwright" $BrowserDir)
            }

            if (-not $guestHasBrowserDir) {
                Write-Host "  Mirroring Playwright browser cache $browserDir into VM..." -ForegroundColor DarkGray
                Copy-WinOptDirectoryToVmArchive -Session $session -SourcePath $hostBrowserDir -DestinationParent $guestPlaywrightBrowsers -ArchiveName "$browserDir.tar"
            }
        }
    }
    
    Write-Host "  OK Code synced to VM" -ForegroundColor Green
    
    # Validate dependencies. The Playwright browser install is intentionally
    # host-side only; the guest only serves Vite for host-run Playwright tests.
    Write-Host "  Validating npm dependencies..." -ForegroundColor DarkGray
    Invoke-Command -Session $session -ScriptBlock {
        $nodeDir = "C:\WinOpt\tools\nodejs"
        if (Test-Path $nodeDir) {
            $env:Path = "$nodeDir;$env:Path"
        }
        Set-Location "C:\WinOpt\WinOptimizerRevamp"
        if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
            throw "npm is not available in the VM."
        }
        if (-not (Test-Path "node_modules")) {
            if (Test-NetConnection registry.npmjs.org -Port 443 -InformationLevel Quiet) {
                npm install --prefer-offline 2>&1 | Out-Null
            } else {
                throw "node_modules is missing in the VM and the VM has no internet access."
            }
        }
        node --version | Out-Null
        npm.cmd --version | Out-Null
    }
    Write-Host "  OK Dependencies available" -ForegroundColor Green

    Invoke-Command -Session $session -ScriptBlock {
        Set-Location "C:\WinOpt\WinOptimizerRevamp"
        Remove-Item -Path ".\node_modules\.vite",".\node_modules\.vite-temp",".\.vite",".\dist" -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item -Path ".\test-results\features-direct",".\test-results\features-direct-*" -Recurse -Force -ErrorAction SilentlyContinue
    }
    Write-Host "  OK Cleared guest Vite/test caches" -ForegroundColor Green
    
    Remove-PSSession $session
} catch {
    Write-Host "  WARN Code sync via PSSession failed: $_" -ForegroundColor Yellow
    Write-Host "  Falling back to SMB share approach..." -ForegroundColor Yellow
}

# --- Step 4: Start Dev Server -------------------------------------------------

if ($DirectVerifyOnly) {
    Write-Host ""
    Write-Host "[4/7] Skipping dev server (DirectVerifyOnly mode)" -ForegroundColor DarkGray
} else {
Write-Host ""
Write-Host "[4/7] Starting Vite dev server in VM..." -ForegroundColor Yellow

$session = New-WinOptVmSession
Invoke-Command -Session $session -ScriptBlock {
    $nodeDir = "C:\WinOpt\tools\nodejs"
    if (Test-Path $nodeDir) {
        $env:Path = "$nodeDir;$env:Path"
    }
    Set-Location "C:\WinOpt\WinOptimizerRevamp"
    # Kill any existing dev server
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force

    Remove-Item "C:\WinOpt\vite.stdout.log","C:\WinOpt\vite.stderr.log" -Force -ErrorAction SilentlyContinue
    $npm = (Get-Command npm.cmd -ErrorAction Stop).Source

    # Start dev server in background
    Start-Process -FilePath $npm `
        -ArgumentList "run","dev","--","--host","0.0.0.0","--force" `
        -WorkingDirectory "C:\WinOpt\WinOptimizerRevamp" `
        -RedirectStandardOutput "C:\WinOpt\vite.stdout.log" `
        -RedirectStandardError "C:\WinOpt\vite.stderr.log" `
        -WindowStyle Hidden `
        -PassThru | Out-Null
}

# Wait for dev server to start. Prefer host reachability, but fall back to
# guest-local execution when Hyper-V DHCP leaves the VM on a link-local address.
Write-Host "  Waiting for Vite dev server..." -ForegroundColor DarkGray
$devServerReady = $false
$guestLocalDevServerReady = $false
$retries = 0
while (-not $devServerReady -and $retries -lt 30) {
    try {
        $response = Invoke-WebRequest -Uri "http://${vmIP}:1420" -TimeoutSec 3 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            $devServerReady = $true
        }
    } catch {
        try {
            $guestReady = Invoke-Command -Session $session -ScriptBlock {
                try {
                    $response = Invoke-WebRequest -Uri "http://localhost:1420" -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
                    return ($response.StatusCode -eq 200)
                } catch {
                    return $false
                }
            }
            if ($guestReady) {
                $guestLocalDevServerReady = $true
                break
            }
        } catch {}
        Start-Sleep 2
        $retries++
    }
}

if ($devServerReady) {
    Write-Host "  OK Dev server running at http://${vmIP}:1420" -ForegroundColor Green
} elseif ($guestLocalDevServerReady) {
    Write-Host "  OK Dev server is reachable inside the VM at http://localhost:1420" -ForegroundColor Green
    Write-Host "  Host cannot reach the VM address ($vmIP); UI tests will run inside the VM." -ForegroundColor Yellow
} else {
    try {
        $viteLogs = Invoke-Command -Session $session -ScriptBlock {
            [ordered]@{
                stdout = if (Test-Path "C:\WinOpt\vite.stdout.log") { Get-Content "C:\WinOpt\vite.stdout.log" -Raw } else { "" }
                stderr = if (Test-Path "C:\WinOpt\vite.stderr.log") { Get-Content "C:\WinOpt\vite.stderr.log" -Raw } else { "" }
                nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue | Select-Object Id, ProcessName, CPU, WorkingSet, StartTime
            }
        }
        $viteLogs | ConvertTo-Json -Depth 6 | Set-Content -Path (Join-Path $runLogDir "vite-guest-startup.json") -Encoding UTF8
    } catch {}
    Remove-PSSession $session
    throw "Vite dev server did not become reachable from the host or inside the VM."
}

Remove-PSSession $session
} # end if not DirectVerifyOnly

# --- Step 5: Run Playwright UI Tests -----------------------------------------

$testExitCode = 0

if (-not $DirectVerifyOnly) {
    Write-Host ""
    Write-Host "[5/7] Running Playwright UI tests..." -ForegroundColor Yellow
    Write-Host "  Target: http://${vmIP}:1420" -ForegroundColor DarkGray

    if ($guestLocalDevServerReady -and -not $devServerReady) {
        $session = New-WinOptVmSession
        $guestUiProcessId = Invoke-Command -Session $session -ArgumentList $TestFilter -ScriptBlock {
            param($Filter)
            $project = "C:\WinOpt\WinOptimizerRevamp"
            $nodeDir = "C:\WinOpt\tools\nodejs"
            $playwrightCli = Join-Path $project "node_modules\playwright\cli.js"
            if (-not (Test-Path $playwrightCli)) {
                throw "Playwright CLI not found in guest node_modules: $playwrightCli"
            }

            Remove-Item -Path "C:\WinOpt\ui-playwright.log" -Force -ErrorAction SilentlyContinue
            Remove-Item -Path "C:\WinOpt\ui-exitcode.txt" -Force -ErrorAction SilentlyContinue

            $filterEncoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($Filter))
            $script = @"
`$ErrorActionPreference = 'Continue'
if (Test-Path '$nodeDir') {
    `$env:Path = '$nodeDir;' + `$env:Path
}
`$nodeExe = if (Test-Path '$nodeDir\node.exe') { '$nodeDir\node.exe' } else { (Get-Command node.exe -ErrorAction Stop).Source }
`$filter = [Text.Encoding]::Unicode.GetString([Convert]::FromBase64String('$filterEncoded'))
`$env:PLAYWRIGHT_BROWSERS_PATH = 'C:\WinOpt\ms-playwright'
`$env:VM_URL = 'http://localhost:1420'
`$env:VM_BRIDGE = 'false'
`$env:VM_COMMAND_TIMEOUT_MS = '1200000'
Remove-Item Env:VM_NAME -ErrorAction SilentlyContinue
Remove-Item Env:WINOPT_VM_PASSWORD -ErrorAction SilentlyContinue
Set-Location '$project'
`$uiArgs = @('test', '--config=playwright.vm.config.ts', '--ignore-snapshots')
if (-not [string]::IsNullOrWhiteSpace(`$filter)) {
    `$uiArgs += @('--grep', `$filter)
} else {
    `$uiArgs += @('--grep-invert', 'vm-tweak-direct|features-direct|production-readiness|tweaks-lifecycle')
}
& `$nodeExe '$playwrightCli' @uiArgs *> 'C:\WinOpt\ui-playwright.log'
`$code = if (`$null -eq `$LASTEXITCODE) { 1 } else { `$LASTEXITCODE }
Set-Content -Path 'C:\WinOpt\ui-exitcode.txt' -Value `$code -Encoding ASCII
exit `$code
"@

            $encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($script))
            $proc = Start-Process -FilePath powershell.exe `
                -ArgumentList @("-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", $encoded) `
                -WindowStyle Hidden `
                -PassThru
            return $proc.Id
        }

        Write-Host "  Guest UI process: $guestUiProcessId" -ForegroundColor DarkGray
        $lastUiTail = ""
        $uiDeadline = (Get-Date).AddHours(4)

        while ($true) {
            $state = Invoke-Command -Session $session -ArgumentList $guestUiProcessId -ScriptBlock {
                param($PidToCheck)
                $proc = Get-Process -Id $PidToCheck -ErrorAction SilentlyContinue
                $logPath = "C:\WinOpt\ui-playwright.log"
                $exitPath = "C:\WinOpt\ui-exitcode.txt"
                [ordered]@{
                    running = $null -ne $proc
                    exitCode = if (Test-Path $exitPath) { (Get-Content $exitPath -Raw).Trim() } else { "" }
                    logTail = if (Test-Path $logPath) { (Get-Content $logPath -Tail 12) -join "`n" } else { "" }
                }
            }

            if ($state.logTail -and $state.logTail -ne $lastUiTail) {
                $lastUiTail = $state.logTail
                Write-Host "  UI progress:" -ForegroundColor DarkGray
                $state.logTail -split "`n" | Where-Object { $_.Trim() } | Select-Object -Last 6 | ForEach-Object {
                    Write-Host "    $_" -ForegroundColor DarkGray
                }
            }

            if (-not $state.running) {
                if ($state.exitCode -match '^\d+$') {
                    $testExitCode = [int]$state.exitCode
                } else {
                    $testExitCode = 1
                }
                break
            }

            if ((Get-Date) -gt $uiDeadline) {
                Invoke-Command -Session $session -ArgumentList $guestUiProcessId -ScriptBlock {
                    param($PidToStop)
                    Stop-Process -Id $PidToStop -Force -ErrorAction SilentlyContinue
                }
                throw "UI test suite did not finish within 4 hours."
            }

            Start-Sleep -Seconds 15
        }

        $guestResults = "C:\WinOpt\WinOptimizerRevamp\test-results"
        $guestReport = "C:\WinOpt\WinOptimizerRevamp\playwright-report"
        Copy-Item -FromSession $session -Path $guestResults -Destination $ProjectDir -Recurse -Force -ErrorAction SilentlyContinue
        Copy-Item -FromSession $session -Path $guestReport -Destination $ProjectDir -Recurse -Force -ErrorAction SilentlyContinue
        Copy-Item -FromSession $session -Path "C:\WinOpt\ui-playwright.log" -Destination $runLogDir -Force -ErrorAction SilentlyContinue
        Remove-PSSession $session
    } else {
        Set-Location $ProjectDir

        $env:VM_URL = "http://${vmIP}:1420"
        $env:VM_BRIDGE = "true"
        $env:VM_NAME = $VMName
        $env:WINOPT_VM_USER = $GuestUser
        if ($GuestPassword) { $env:WINOPT_VM_PASSWORD = $GuestPassword }

        # Exclude direct/static specs from the browser UI test run.
        $testCmd = "npx playwright test --config=playwright.vm.config.ts --ignore-snapshots"
        if ($TestFilter) {
            $testCmd += " --grep `"$TestFilter`""
        } else {
            $testCmd += " --grep-invert `"vm-tweak-direct|features-direct|production-readiness|tweaks-lifecycle`""
        }

        Write-Host "  Command: $testCmd" -ForegroundColor DarkGray
        Write-Host ""

        Invoke-Expression $testCmd
        $testExitCode = $LASTEXITCODE
    }
} else {
    Write-Host ""
    Write-Host "[5/7] Skipping UI tests (DirectVerifyOnly mode)" -ForegroundColor DarkGray
}

# --- Step 6: Direct Tweak Verification ----------------------------------------

$directExitCode = 0

if ($DirectVerify -or $DirectVerifyOnly) {
    Write-Host ""
    Write-Host "[6/7] Running direct tweak verification (165 tweaks via PS Direct)..." -ForegroundColor Yellow
    Write-Host "  This applies and reverts every tweak in the VM, verifying actual system state." -ForegroundColor DarkGray
    Write-Host "  Results: $ProjectDir\test-results\vm-direct\direct-summary.json" -ForegroundColor DarkGray
    Write-Host ""

    Write-Host "  Mode: guest-local elevated Playwright run" -ForegroundColor DarkGray
    Write-Host "  Command: node node_modules\playwright\cli.js test vm-tweak-direct production-readiness --config=playwright.direct.config.ts" -ForegroundColor DarkGray
    Write-Host ""

    $session = New-WinOptVmSession
    try {
        $directProcessId = Invoke-Command -Session $session -ScriptBlock {
            $project = "C:\WinOpt\WinOptimizerRevamp"
            $resultDir = Join-Path $project "test-results\vm-direct"
            $nodeDir = "C:\WinOpt\tools\nodejs"
            $playwrightCli = Join-Path $project "node_modules\playwright\cli.js"

            if (-not (Test-Path $playwrightCli)) {
                throw "Playwright CLI not found in guest node_modules: $playwrightCli"
            }

            New-Item -Path $resultDir -ItemType Directory -Force | Out-Null
            Remove-Item -Path (Join-Path $resultDir "direct-current.json") -Force -ErrorAction SilentlyContinue
            Remove-Item -Path (Join-Path $resultDir "direct-summary.json") -Force -ErrorAction SilentlyContinue
            Remove-Item -Path "C:\WinOpt\direct-playwright.log" -Force -ErrorAction SilentlyContinue
            Remove-Item -Path "C:\WinOpt\direct-exitcode.txt" -Force -ErrorAction SilentlyContinue

            $script = @"
`$ErrorActionPreference = 'Continue'
if (Test-Path '$nodeDir') {
    `$env:Path = '$nodeDir;' + `$env:Path
}
`$nodeExe = if (Test-Path '$nodeDir\node.exe') { '$nodeDir\node.exe' } else { (Get-Command node.exe -ErrorAction Stop).Source }
`$env:PLAYWRIGHT_BROWSERS_PATH = 'C:\WinOpt\ms-playwright'
`$env:VM_URL = 'http://localhost:1420'
`$env:VM_BRIDGE = 'false'
`$env:VM_COMMAND_TIMEOUT_MS = '1200000'
Remove-Item Env:VM_NAME -ErrorAction SilentlyContinue
Remove-Item Env:WINOPT_VM_PASSWORD -ErrorAction SilentlyContinue
Set-Location '$project'
& `$nodeExe '$playwrightCli' test vm-tweak-direct production-readiness --config=playwright.direct.config.ts *> 'C:\WinOpt\direct-playwright.log'
`$code = if (`$null -eq `$LASTEXITCODE) { 1 } else { `$LASTEXITCODE }
Set-Content -Path 'C:\WinOpt\direct-exitcode.txt' -Value `$code -Encoding ASCII
exit `$code
"@

            $encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($script))
            $proc = Start-Process -FilePath powershell.exe `
                -ArgumentList @("-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", $encoded) `
                -WindowStyle Hidden `
                -PassThru
            return $proc.Id
        }

        Write-Host "  Guest process: $directProcessId" -ForegroundColor DarkGray
        $lastProgress = ""
        $deadline = (Get-Date).AddHours(3)

        while ($true) {
            $state = Invoke-Command -Session $session -ArgumentList $directProcessId -ScriptBlock {
                param($PidToCheck)
                $project = "C:\WinOpt\WinOptimizerRevamp"
                $resultDir = Join-Path $project "test-results\vm-direct"
                $currentPath = Join-Path $resultDir "direct-current.json"
                $summaryPath = Join-Path $resultDir "direct-summary.json"
                $exitPath = "C:\WinOpt\direct-exitcode.txt"
                $logPath = "C:\WinOpt\direct-playwright.log"
                $proc = Get-Process -Id $PidToCheck -ErrorAction SilentlyContinue

                [ordered]@{
                    running = $null -ne $proc
                    current = if (Test-Path $currentPath) { Get-Content $currentPath -Raw } else { "" }
                    summaryExists = Test-Path $summaryPath
                    exitCode = if (Test-Path $exitPath) { (Get-Content $exitPath -Raw).Trim() } else { "" }
                    logTail = if (Test-Path $logPath) { (Get-Content $logPath -Tail 8) -join "`n" } else { "" }
                }
            }

            if ($state.current -and $state.current -ne $lastProgress) {
                $lastProgress = $state.current
                try {
                    $progress = $state.current | ConvertFrom-Json
                    Write-Host ("  Direct progress: {0} / {1} / {2}" -f $progress.tweakId, $progress.category, $progress.phase) -ForegroundColor DarkGray
                } catch {
                    Write-Host "  Direct progress updated" -ForegroundColor DarkGray
                }
            } elseif ($state.logTail) {
                Write-Host "  Direct verifier is running..." -ForegroundColor DarkGray
            }

            if (-not $state.running) {
                if ($state.exitCode -match '^\d+$') {
                    $directExitCode = [int]$state.exitCode
                } else {
                    $directExitCode = 1
                }
                break
            }

            if ((Get-Date) -gt $deadline) {
                Invoke-Command -Session $session -ArgumentList $directProcessId -ScriptBlock {
                    param($PidToStop)
                    Stop-Process -Id $PidToStop -Force -ErrorAction SilentlyContinue
                }
                throw "Direct verification did not finish within 3 hours."
            }

            Start-Sleep -Seconds 10
        }

        Copy-Item -FromSession $session -Path "C:\WinOpt\WinOptimizerRevamp\test-results\vm-direct" -Destination (Join-Path $ProjectDir "test-results") -Recurse -Force -ErrorAction SilentlyContinue
        Copy-Item -FromSession $session -Path "C:\WinOpt\direct-playwright.log" -Destination $runLogDir -Force -ErrorAction SilentlyContinue
    } finally {
        Remove-PSSession $session -ErrorAction SilentlyContinue
    }

    # Show summary from JSON log
    $summaryFile = "$ProjectDir\test-results\vm-direct\direct-summary.json"
    if (Test-Path $summaryFile) {
        $summary = Get-Content $summaryFile | ConvertFrom-Json
        Write-Host ""
        Write-Host "  Direct Verify Results:" -ForegroundColor $(if ($summary.failed -eq 0) { "Green" } else { "Yellow" })
        Write-Host "    PASS:  $($summary.passed)" -ForegroundColor Green
        Write-Host "    FAIL:  $($summary.failed)" -ForegroundColor $(if ($summary.failed -gt 0) { "Red" } else { "Green" })
        Write-Host "    WARN:  $($summary.warned)" -ForegroundColor Yellow
        Write-Host "    SKIP:  $($summary.skipped)" -ForegroundColor DarkGray
        Write-Host "    Rate:  $($summary.passRate)" -ForegroundColor White
        if ($summary.failed -gt 0 -and $directExitCode -eq 0) {
            $directExitCode = 1
        }
    }
} else {
    Write-Host ""
    Write-Host "[6/7] Skipping direct verification (use -DirectVerify to enable)" -ForegroundColor DarkGray
}

# --- Step 6.5: Features Direct Verification ----------------------------------

$featuresExitCode = 0

if ($FeaturesVerify) {
    Write-Host ""
    Write-Host "[6.5/7] Running features direct verification (UI + bridge for Group A features)..." -ForegroundColor Yellow
    Write-Host "  Results: $ProjectDir\test-results\features-direct\features-summary.json" -ForegroundColor DarkGray
    Write-Host ""

    $session = New-WinOptVmSession
    try {
        $featuresProcessId = Invoke-Command -Session $session -ScriptBlock {
            $project   = "C:\WinOpt\WinOptimizerRevamp"
            $nodeDir   = "C:\WinOpt\tools\nodejs"
            $playwrightCli = Join-Path $project "node_modules\playwright\cli.js"

            if (-not (Test-Path $playwrightCli)) {
                throw "Playwright CLI not found: $playwrightCli"
            }

            Remove-Item -Path "C:\WinOpt\features-playwright.log" -Force -ErrorAction SilentlyContinue
            Remove-Item -Path "C:\WinOpt\features-exitcode.txt"   -Force -ErrorAction SilentlyContinue

            $script = @"
`$ErrorActionPreference = 'Continue'
if (Test-Path '$nodeDir') { `$env:Path = '$nodeDir;' + `$env:Path }
`$nodeExe = if (Test-Path '$nodeDir\node.exe') { '$nodeDir\node.exe' } else { (Get-Command node.exe -ErrorAction Stop).Source }
`$env:PLAYWRIGHT_BROWSERS_PATH = 'C:\WinOpt\ms-playwright'
`$env:VM_URL    = 'http://localhost:1420'
`$env:VM_BRIDGE = 'false'
Remove-Item Env:VM_NAME -ErrorAction SilentlyContinue
Remove-Item Env:WINOPT_VM_PASSWORD -ErrorAction SilentlyContinue
Set-Location '$project'
& `$nodeExe '$playwrightCli' test features-direct --config=playwright.vm.config.ts *> 'C:\WinOpt\features-playwright.log'
`$code = if (`$null -eq `$LASTEXITCODE) { 1 } else { `$LASTEXITCODE }
Set-Content -Path 'C:\WinOpt\features-exitcode.txt' -Value `$code -Encoding ASCII
exit `$code
"@
            $encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($script))
            $proc = Start-Process -FilePath powershell.exe `
                -ArgumentList @("-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", $encoded) `
                -WindowStyle Hidden -PassThru
            return $proc.Id
        }

        Write-Host "  Guest features process: $featuresProcessId" -ForegroundColor DarkGray
        $featDeadline = (Get-Date).AddHours(1)

        while ($true) {
            $state = Invoke-Command -Session $session -ArgumentList $featuresProcessId -ScriptBlock {
                param($ProcessId)
                $proc     = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
                $exitPath = "C:\WinOpt\features-exitcode.txt"
                $logPath  = "C:\WinOpt\features-playwright.log"
                [ordered]@{
                    running  = $null -ne $proc
                    exitCode = if (Test-Path $exitPath) { (Get-Content $exitPath -Raw).Trim() } else { "" }
                    logTail  = if (Test-Path $logPath)  { (Get-Content $logPath  -Tail 6) -join "`n" } else { "" }
                }
            }

            if ($state.logTail) {
                Write-Host "  Features progress:" -ForegroundColor DarkGray
                $state.logTail -split "`n" | Where-Object { $_.Trim() } | ForEach-Object {
                    Write-Host "    $_" -ForegroundColor DarkGray
                }
            }

            if (-not $state.running) {
                $featuresExitCode = if ($state.exitCode -match '^\d+$') { [int]$state.exitCode } else { 1 }
                break
            }

            if ((Get-Date) -gt $featDeadline) {
                Invoke-Command -Session $session -ArgumentList $featuresProcessId -ScriptBlock {
                    param($ProcessId) Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
                }
                throw "Features verification did not finish within 1 hour."
            }

            Start-Sleep -Seconds 10
        }

        Copy-Item -FromSession $session `
            -Path "C:\WinOpt\WinOptimizerRevamp\test-results\features-direct" `
            -Destination (Join-Path $ProjectDir "test-results") `
            -Recurse -Force -ErrorAction SilentlyContinue
        Copy-Item -FromSession $session `
            -Path "C:\WinOpt\features-playwright.log" `
            -Destination $runLogDir -Force -ErrorAction SilentlyContinue
    } finally {
        Remove-PSSession $session -ErrorAction SilentlyContinue
    }

    # Show summary
    $featuresSummary = "$ProjectDir\test-results\features-direct\features-summary.json"
    if (Test-Path $featuresSummary) {
        $fs = Get-Content $featuresSummary | ConvertFrom-Json
        Write-Host ""
        Write-Host "  Features Verify Results:" -ForegroundColor $(if ($fs.failed -eq 0) { "Green" } else { "Yellow" })
        Write-Host "    PASS:  $($fs.passed)"  -ForegroundColor Green
        Write-Host "    FAIL:  $($fs.failed)"  -ForegroundColor $(if ($fs.failed -gt 0) { "Red" } else { "Green" })
        Write-Host "    WARN:  $($fs.warned)"  -ForegroundColor Yellow
        Write-Host "    SKIP:  $($fs.skipped)" -ForegroundColor DarkGray
    }
} else {
    Write-Host ""
    Write-Host "[6.5/7] Skipping features verification (use -FeaturesVerify to enable)" -ForegroundColor DarkGray
}

# --- Step 7: Generate Report --------------------------------------------------

$overallExitCode = [Math]::Max([Math]::Max($testExitCode, $directExitCode), $featuresExitCode)

Write-Host ""
Write-Host "[7/7] Generating test report..." -ForegroundColor Yellow

$endTime = Get-Date
$duration = $endTime - $startTime
$color = if ($overallExitCode -eq 0) { "Green" } else { "Red" }

# Summary
Write-Host ""
Write-Host "==============================================================" -ForegroundColor $color
Write-Host "|  TEST RUN COMPLETE                                         |" -ForegroundColor $color
Write-Host "==============================================================" -ForegroundColor $color
Write-Host "|  Duration:     $($duration.ToString('hh\:mm\:ss'))" -ForegroundColor White
Write-Host "|  UI exit code: $testExitCode" -ForegroundColor $(if ($testExitCode -eq 0) { "Green" } else { "Red" })
Write-Host "|  DV exit code: $directExitCode" -ForegroundColor $(if ($directExitCode -eq 0) { "Green" } else { "Red" })
Write-Host "|  FV exit code: $featuresExitCode" -ForegroundColor $(if ($featuresExitCode -eq 0) { "Green" } else { "Red" })
Write-Host "|  UI Report:    $ProjectDir\playwright-report\index.html" -ForegroundColor White
Write-Host "|  DV Results:   $ProjectDir\test-results\vm-direct\direct-summary.json" -ForegroundColor White
Write-Host "|  FV Results:   $ProjectDir\test-results\features-direct\features-summary.json" -ForegroundColor White
Write-Host "|  Run logs:     $runLogDir" -ForegroundColor White
Write-Host "==============================================================" -ForegroundColor $color
Write-Host ""

Write-Host "Collecting host and guest diagnostic logs..." -ForegroundColor Cyan

try {
    $hostState = [ordered]@{
        vm = Get-VM -Name $VMName | Select-Object Name, State, Uptime, CPUUsage, MemoryAssigned, ProcessorCount, Generation
        integrationServices = Get-VMIntegrationService -VMName $VMName | Select-Object Name, Enabled, PrimaryStatusDescription, SecondaryStatusDescription
        checkpoints = Get-VMCheckpoint -VMName $VMName -ErrorAction SilentlyContinue | Select-Object Name, CreationTime, CheckpointType
        network = Get-VMNetworkAdapter -VMName $VMName | Select-Object Name, SwitchName, Status, IPAddresses
    }
    $hostState | ConvertTo-Json -Depth 8 | Set-Content -Path (Join-Path $runLogDir "host-vm-state.json") -Encoding UTF8
} catch {
    $_ | Out-String | Set-Content -Path (Join-Path $runLogDir "host-vm-state-error.txt") -Encoding UTF8
}

try {
    $diagSession = New-WinOptVmSession
    Invoke-Command -Session $diagSession -ScriptBlock {
        [ordered]@{
            computer = Get-ComputerInfo | Select-Object WindowsProductName, WindowsVersion, OsHardwareAbstractionLayer, CsProcessors, CsTotalPhysicalMemory
            systemEvents = Get-WinEvent -LogName System -MaxEvents 200 | Select-Object TimeCreated, Id, LevelDisplayName, ProviderName, Message
            applicationEvents = Get-WinEvent -LogName Application -MaxEvents 200 | Select-Object TimeCreated, Id, LevelDisplayName, ProviderName, Message
        }
    } | ConvertTo-Json -Depth 8 | Set-Content -Path (Join-Path $runLogDir "guest-diagnostics.json") -Encoding UTF8
    Remove-PSSession $diagSession
} catch {
    $_ | Out-String | Set-Content -Path (Join-Path $runLogDir "guest-diagnostics-error.txt") -Encoding UTF8
}

if ($NoOpenReport) {
    Write-Host "Skipping interactive report open (-NoOpenReport)." -ForegroundColor DarkGray
} else {
    Write-Host "Opening Playwright report..." -ForegroundColor Cyan
    npx playwright show-report
}

Stop-Transcript | Out-Null
exit $overallExitCode
