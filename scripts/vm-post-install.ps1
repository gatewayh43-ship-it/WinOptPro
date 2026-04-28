#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Post-install configuration for WinOpt Test VM.
    Run this INSIDE the VM after Windows installation.

.DESCRIPTION
    Configures the VM for automated Playwright E2E testing:
    1. Enables PowerShell Remoting
    2. Installs Node.js, Rust, Git
    3. Installs Playwright browsers
    4. Configures firewall rules
    5. Creates WinOpt project share
#>

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host "|   WinOpt Test VM - Post-Install Configuration              |" -ForegroundColor Cyan
Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host ""

# --- Step 1: Enable PowerShell Remoting --------------------------------------

Write-Host "[1/8] Enabling PowerShell Remoting..." -ForegroundColor Yellow
Enable-PSRemoting -Force -SkipNetworkProfileCheck 2>$null
Set-Item WSMan:\localhost\Client\TrustedHosts -Value "*" -Force
Set-Item WSMan:\localhost\Service\Auth\Basic -Value $true -Force
winrm quickconfig -force 2>$null
Write-Host "  OK PowerShell Remoting enabled" -ForegroundColor Green

# --- Step 2: Configure Firewall ----------------------------------------------

Write-Host ""
Write-Host "[2/8] Configuring Firewall rules..." -ForegroundColor Yellow
Enable-NetFirewallRule -DisplayGroup "Windows Remote Management" -ErrorAction SilentlyContinue
# Allow Vite dev server (port 1420) and Tauri dev
New-NetFirewallRule -DisplayName "WinOpt Vite Dev" -Direction Inbound -LocalPort 1420 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue | Out-Null
New-NetFirewallRule -DisplayName "WinOpt Playwright" -Direction Inbound -LocalPort 9222 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue | Out-Null
Write-Host "  OK Firewall rules configured (WinRM, Vite:1420, CDP:9222)" -ForegroundColor Green

# --- Step 3: Install winget packages -----------------------------------------

Write-Host ""
Write-Host "[3/8] Installing development tools via winget..." -ForegroundColor Yellow

$packages = @(
    @{ Id = "OpenJS.NodeJS.LTS"; Name = "Node.js LTS" },
    @{ Id = "Rustlang.Rustup"; Name = "Rust" },
    @{ Id = "Git.Git"; Name = "Git" },
    @{ Id = "Microsoft.VisualStudio.2022.BuildTools"; Name = "VS Build Tools" }
)

foreach ($pkg in $packages) {
    Write-Host "  Installing $($pkg.Name)..." -ForegroundColor DarkGray -NoNewline
    $result = winget install $pkg.Id --accept-source-agreements --accept-package-agreements --silent 2>&1
    if ($LASTEXITCODE -eq 0 -or $result -match "already installed") {
        Write-Host " OK" -ForegroundColor Green
    } else {
        Write-Host " WARN (may need manual install)" -ForegroundColor Yellow
    }
}

# --- Step 4: Refresh PATH ----------------------------------------------------

Write-Host ""
Write-Host "[4/8] Refreshing environment PATH..." -ForegroundColor Yellow
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
Write-Host "  OK PATH refreshed" -ForegroundColor Green

# --- Step 5: Install Rust toolchain ------------------------------------------

Write-Host ""
Write-Host "[5/8] Installing Rust stable toolchain..." -ForegroundColor Yellow
rustup default stable 2>$null
Write-Host "  OK Rust stable installed" -ForegroundColor Green

# --- Step 6: Create project directory ----------------------------------------

Write-Host ""
Write-Host "[6/8] Creating project directory..." -ForegroundColor Yellow
$projectDir = "C:\WinOpt"
if (-not (Test-Path $projectDir)) {
    New-Item -Path $projectDir -ItemType Directory -Force | Out-Null
}
Write-Host "  OK Project directory: $projectDir" -ForegroundColor Green

# --- Step 7: Disable Windows Update -----------------------------------------

Write-Host ""
Write-Host "[7/8] Pausing Windows Update for clean testing baseline..." -ForegroundColor Yellow
$wu = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU"
if (-not (Test-Path $wu)) { New-Item -Path $wu -Force | Out-Null }
Set-ItemProperty -Path $wu -Name "NoAutoUpdate" -Value 1 -Type DWord -Force
Stop-Service wuauserv -Force -ErrorAction SilentlyContinue
Set-Service wuauserv -StartupType Disabled -ErrorAction SilentlyContinue
Write-Host "  OK Windows Update paused" -ForegroundColor Green

# --- Step 8: Set execution policy --------------------------------------------

Write-Host ""
Write-Host "[8/8] Setting PowerShell execution policy..." -ForegroundColor Yellow
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope LocalMachine -Force
Write-Host "  OK Execution policy set to RemoteSigned" -ForegroundColor Green

# --- Summary -----------------------------------------------------------------

Write-Host ""
Write-Host "==============================================================" -ForegroundColor Green
Write-Host "|  Post-Install Configuration Complete!                      |" -ForegroundColor Green
Write-Host "==============================================================" -ForegroundColor Green
Write-Host "|                                                            |" -ForegroundColor Yellow
Write-Host "|  NEXT STEPS:                                               |" -ForegroundColor Yellow
Write-Host "|  1. Restart the VM                                         |" -ForegroundColor Yellow
Write-Host "|  2. On HOST: Create checkpoint '00-CleanWindows'           |" -ForegroundColor Yellow
Write-Host "|     Checkpoint-VM -Name WinOpt-TestVM -SnapshotName '00-CleanWindows' |" -ForegroundColor Yellow
Write-Host "|  3. Clone WinOpt repo into C:\WinOpt\WinOptimizerRevamp    |" -ForegroundColor Yellow
Write-Host "|  4. Run 'npm install' and 'npx playwright install'         |" -ForegroundColor Yellow
Write-Host "|  5. Create checkpoint '01-TestReady'                       |" -ForegroundColor Yellow
Write-Host "|                                                            |" -ForegroundColor Yellow
Write-Host "==============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Recommended: Restart now with 'Restart-Computer'" -ForegroundColor Cyan

