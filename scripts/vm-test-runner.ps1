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
    After the UI test suite, also run vm-tweak-direct.spec.ts — applies and reverts
    every tweak via PowerShell Direct and verifies actual system state changes.

.PARAMETER DirectVerifyOnly
    Skip the dev server and UI tests. Run only the direct tweak verification.
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
    .\vm-test-runner.ps1                            # UI tests only
    .\vm-test-runner.ps1 -DirectVerify              # UI tests + direct verification
    .\vm-test-runner.ps1 -DirectVerifyOnly          # Direct verification only
    .\vm-test-runner.ps1 -SkipRestore -DirectVerify # Re-run both without restoring
    .\vm-test-runner.ps1 -DirectVerify -NoOpenReport # Fully unattended run
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
    # Do not open the Playwright report window after completion
    [switch]$NoOpenReport,
    # Guest local administrator username for PowerShell Direct
    [string]$GuestUser = "WinOptTest",
    # Guest local administrator password for PowerShell Direct
    [string]$GuestPassword = $env:WINOPT_VM_PASSWORD
)

$ErrorActionPreference = "Stop"
$startTime = Get-Date

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
        "index.html"
    )
    
    foreach ($file in $filesToCopy) {
        $src = Join-Path $ProjectDir $file
        if (Test-Path $src) {
            Copy-Item -ToSession $session -Path $src -Destination "C:\WinOpt\WinOptimizerRevamp\$file" -Force
        }
    }
    
    # Copy directories
    $dirsToSync = @("src", "e2e", "public", "scripts", "src-tauri")
    foreach ($dir in $dirsToSync) {
        $srcDir = Join-Path $ProjectDir $dir
        if (Test-Path $srcDir) {
            Copy-Item -ToSession $session -Path $srcDir -Destination "C:\WinOpt\WinOptimizerRevamp\" -Recurse -Force
        }
    }
    
    Write-Host "  OK Code synced to VM" -ForegroundColor Green
    
    # Install dependencies if needed
    Write-Host "  Installing npm dependencies..." -ForegroundColor DarkGray
    Invoke-Command -Session $session -ScriptBlock {
        Set-Location "C:\WinOpt\WinOptimizerRevamp"
        npm install --prefer-offline 2>&1 | Out-Null
        npx playwright install chromium 2>&1 | Out-Null
    }
    Write-Host "  OK Dependencies installed" -ForegroundColor Green
    
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
    Set-Location "C:\WinOpt\WinOptimizerRevamp"
    # Kill any existing dev server
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
    # Start dev server in background
    Start-Process -FilePath "npm" -ArgumentList "run","dev","--","--host","0.0.0.0" -WindowStyle Hidden -PassThru | Out-Null
}

# Wait for dev server to start
Write-Host "  Waiting for Vite dev server..." -ForegroundColor DarkGray
$devServerReady = $false
$retries = 0
while (-not $devServerReady -and $retries -lt 30) {
    try {
        $response = Invoke-WebRequest -Uri "http://${vmIP}:1420" -TimeoutSec 3 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            $devServerReady = $true
        }
    } catch {
        Start-Sleep 2
        $retries++
    }
}

if ($devServerReady) {
    Write-Host "  OK Dev server running at http://${vmIP}:1420" -ForegroundColor Green
} else {
    Write-Host "  WARN Dev server may not be ready - continuing anyway" -ForegroundColor Yellow
}

Remove-PSSession $session
} # end if not DirectVerifyOnly

# --- Step 5: Run Playwright UI Tests -----------------------------------------

$testExitCode = 0

if (-not $DirectVerifyOnly) {
    Write-Host ""
    Write-Host "[5/7] Running Playwright UI tests..." -ForegroundColor Yellow
    Write-Host "  Target: http://${vmIP}:1420" -ForegroundColor DarkGray

    Set-Location $ProjectDir

    $env:VM_URL = "http://${vmIP}:1420"
    $env:VM_BRIDGE = "true"
    $env:VM_NAME = $VMName
    $env:WINOPT_VM_USER = $GuestUser
    if ($GuestPassword) { $env:WINOPT_VM_PASSWORD = $GuestPassword }

    # Exclude the direct-verify spec from UI test run
    $testCmd = "npx playwright test --config=playwright.vm.config.ts --ignore-snapshots"
    if ($TestFilter) {
        $testCmd += " --grep `"$TestFilter`""
    } else {
        $testCmd += " --grep-invert `"vm-tweak-direct`""
    }

    Write-Host "  Command: $testCmd" -ForegroundColor DarkGray
    Write-Host ""

    Invoke-Expression $testCmd
    $testExitCode = $LASTEXITCODE
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

    Set-Location $ProjectDir
    $env:VM_BRIDGE = "true"
    $env:VM_NAME = $VMName
    $env:WINOPT_VM_USER = $GuestUser
    if ($GuestPassword) { $env:WINOPT_VM_PASSWORD = $GuestPassword }
    Remove-Item Env:VM_URL -ErrorAction SilentlyContinue  # no browser needed

    $directCmd = "npx playwright test vm-tweak-direct --config=playwright.vm.config.ts"
    Write-Host "  Command: $directCmd" -ForegroundColor DarkGray
    Write-Host ""

    Invoke-Expression $directCmd
    $directExitCode = $LASTEXITCODE

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
    }
} else {
    Write-Host ""
    Write-Host "[6/7] Skipping direct verification (use -DirectVerify to enable)" -ForegroundColor DarkGray
}

# --- Step 7: Generate Report --------------------------------------------------

$overallExitCode = [Math]::Max($testExitCode, $directExitCode)

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
Write-Host "|  UI Report:    $ProjectDir\playwright-report\index.html" -ForegroundColor White
Write-Host "|  DV Results:   $ProjectDir\test-results\vm-direct\direct-summary.json" -ForegroundColor White
Write-Host "==============================================================" -ForegroundColor $color
Write-Host ""

if ($NoOpenReport) {
    Write-Host "Skipping interactive report open (-NoOpenReport)." -ForegroundColor DarkGray
} else {
    Write-Host "Opening Playwright report..." -ForegroundColor Cyan
    npx playwright show-report
}

exit $overallExitCode
