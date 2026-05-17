#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Runs the full unattended WinOpt VM validation suite.

.DESCRIPTION
    Restores the test VM checkpoint, syncs the current workspace into the VM,
    runs the full Playwright UI suite, runs direct PowerShell tweak verification,
    and leaves machine-readable results in test-results/.

    This script assumes the VM already exists and has a clean "01-TestReady"
    checkpoint. Use vm-setup.ps1 and vm-post-install.ps1 to create that baseline.
#>

param(
    [string]$VMName = "WinOpt-TestVM",
    [string]$Checkpoint = "01-TestReady",
    [string]$ProjectDir = "F:\WinOpt\WinOptimizerRevamp",
    [switch]$SkipRestore,
    [string]$TestFilter = "",
    [string]$GuestUser = "WinOptTest",
    [string]$GuestPassword = $env:WINOPT_VM_PASSWORD
)

$ErrorActionPreference = "Stop"

$runner = Join-Path $PSScriptRoot "vm-test-runner.ps1"
if (-not (Test-Path $runner)) {
    throw "VM test runner not found: $runner"
}

$runnerParams = @{
    VMName = $VMName
    Checkpoint = $Checkpoint
    ProjectDir = $ProjectDir
    DirectVerify = $true
    NoOpenReport = $true
    GuestUser = $GuestUser
}

if ($GuestPassword) {
    $runnerParams.GuestPassword = $GuestPassword
}

if ($SkipRestore) {
    $runnerParams.SkipRestore = $true
}

if ($TestFilter) {
    $runnerParams.TestFilter = $TestFilter
}

& $runner @runnerParams
$exitCode = $LASTEXITCODE

$uiResults = Join-Path $ProjectDir "test-results\vm-test-results.json"
$directResults = Join-Path $ProjectDir "test-results\vm-direct\direct-summary.json"

Write-Host ""
Write-Host "Automated VM suite artifacts:" -ForegroundColor Cyan
Write-Host "  UI results:     $uiResults" -ForegroundColor White
Write-Host "  Direct results: $directResults" -ForegroundColor White
Write-Host "  HTML report:    $(Join-Path $ProjectDir 'playwright-report\index.html')" -ForegroundColor White

if ($exitCode -ne 0) {
    exit $exitCode
}

foreach ($artifact in @($uiResults, $directResults)) {
    if (-not (Test-Path $artifact)) {
        Write-Error "Expected artifact was not created: $artifact"
        exit 1
    }
}

exit 0
