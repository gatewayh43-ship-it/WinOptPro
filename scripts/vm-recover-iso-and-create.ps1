#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Recovery script -- creates the bootable ISO from the already-copied IsoSource,
    then creates and starts the Hyper-V VM.

.DESCRIPTION
    Picks up from where vm-setup.ps1 left off:
      G:\WinOpt-TestVM\IsoSource\  -- already populated (Windows USB copy)

    Steps:
      1. Installs Windows ADK Deployment Tools (for oscdimg.exe)
      2. Creates bootable ISO from IsoSource
      3. Creates the Hyper-V Gen2 VM
      4. Mounts ISO, configures TPM + Enhanced Session, sets boot order
      5. Starts the VM and opens vmconnect

.NOTES
    Must be run as Administrator.
    After Windows is installed inside the VM, run vm-post-install.ps1 inside the VM.
#>

param(
    [string]$VMName    = "WinOpt-TestVM",
    [string]$VMPath    = "G:\WinOpt-TestVM",
    [string]$VHDPath   = "G:\WinOpt-TestVM\WinOpt-TestVM.vhdx",
    [string]$ISOPath   = "G:\WinOpt-TestVM\windows_install.iso",
    [string]$IsoSrc    = "G:\WinOpt-TestVM\IsoSource",
    [long]  $VHDSizeGB = 80,
    [long]  $RAMMinGB  = 4,
    [long]  $RAMMaxGB  = 12,
    [int]   $CPUCount  = 4
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host "|     WinOpt Pro - VM Recovery: ISO + VM Creation            |" -ForegroundColor Cyan
Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host ""

# --- Step 1: Verify IsoSource ------------------------------------------------

Write-Host "[1/5] Verifying IsoSource..." -ForegroundColor Yellow

if (-not (Test-Path $IsoSrc)) {
    Write-Error "IsoSource not found at $IsoSrc -- run vm-setup.ps1 first."
    exit 1
}
foreach ($f in @("setup.exe","boot\etfsboot.com","efi\microsoft\boot\efisys.bin")) {
    if (-not (Test-Path (Join-Path $IsoSrc $f))) {
        Write-Error "Missing required file in IsoSource: $f"
        exit 1
    }
}
Write-Host "  OK IsoSource is complete at $IsoSrc" -ForegroundColor Green

# --- Step 2: Find or install oscdimg -----------------------------------------

Write-Host ""
Write-Host "[2/5] Locating oscdimg..." -ForegroundColor Yellow

$oscdimg = @(
    "${env:ProgramFiles(x86)}\Windows Kits\10\Assessment and Deployment Kit\Deployment Tools\amd64\Oscdimg\oscdimg.exe",
    "${env:ProgramFiles}\Windows Kits\10\Assessment and Deployment Kit\Deployment Tools\amd64\Oscdimg\oscdimg.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $oscdimg) {
    Write-Host "  oscdimg not found -- installing Windows ADK Deployment Tools via winget..." -ForegroundColor Yellow
    Write-Host "  (This downloads ~600 MB and may take several minutes)" -ForegroundColor DarkGray

    $adkArgs = @(
        "install", "Microsoft.WindowsADK",
        "--accept-source-agreements",
        "--accept-package-agreements",
        "--silent",
        "--override", "/quiet /features OptionId.DeploymentTools"
    )
    $result = & winget @adkArgs
    if ($LASTEXITCODE -ne 0 -and $result -notmatch "already installed") {
        Write-Host "  winget install failed (exit $LASTEXITCODE) -- trying full ADK..." -ForegroundColor Yellow
        & winget install Microsoft.WindowsADK --accept-source-agreements --accept-package-agreements --silent
    }

    # Re-check after install
    $oscdimg = @(
        "${env:ProgramFiles(x86)}\Windows Kits\10\Assessment and Deployment Kit\Deployment Tools\amd64\Oscdimg\oscdimg.exe",
        "${env:ProgramFiles}\Windows Kits\10\Assessment and Deployment Kit\Deployment Tools\amd64\Oscdimg\oscdimg.exe"
    ) | Where-Object { Test-Path $_ } | Select-Object -First 1
}

if (-not $oscdimg) {
    Write-Error @"
oscdimg still not found after ADK install.
Please install manually:
  winget install Microsoft.WindowsADK
or download from: https://learn.microsoft.com/en-us/windows-hardware/get-started/adk-install
Then re-run this script.
"@
    exit 1
}

Write-Host "  OK oscdimg: $oscdimg" -ForegroundColor Green

# --- Step 3: Create bootable ISO ---------------------------------------------

Write-Host ""
Write-Host "[3/5] Creating bootable ISO from IsoSource..." -ForegroundColor Yellow

if (Test-Path $ISOPath) {
    $isoSize = [math]::Round((Get-Item $ISOPath).Length / 1GB, 2)
    Write-Host "  OK ISO already exists ($($isoSize) GB) -- skipping creation." -ForegroundColor Green
} else {
    Write-Host "  Source : $IsoSrc" -ForegroundColor DarkGray
    Write-Host "  Output : $ISOPath" -ForegroundColor DarkGray
    Write-Host "  This may take 3-8 minutes..." -ForegroundColor DarkGray

    $bootData = "2#p0,e,b`"$IsoSrc\boot\etfsboot.com`"#pEF,e,b`"$IsoSrc\efi\microsoft\boot\efisys.bin`""
    & $oscdimg -m -o -u2 -udfver102 -bootdata:$bootData "$IsoSrc\" "$ISOPath"

    if ($LASTEXITCODE -ne 0 -or -not (Test-Path $ISOPath)) {
        Write-Error "oscdimg failed (exit $LASTEXITCODE). Check the output above for details."
        exit 1
    }

    $isoSize = [math]::Round((Get-Item $ISOPath).Length / 1GB, 2)
    Write-Host "  OK ISO created: $ISOPath ($($isoSize) GB)" -ForegroundColor Green

    Write-Host "  Cleaning up IsoSource directory..." -ForegroundColor DarkGray
    Remove-Item -Path $IsoSrc -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "  OK IsoSource removed" -ForegroundColor Green
}

# --- Step 4: Create Hyper-V VM -----------------------------------------------

Write-Host ""
Write-Host "[4/5] Creating Hyper-V VM '$VMName'..." -ForegroundColor Yellow

$existingVM = Get-VM -Name $VMName -ErrorAction SilentlyContinue
if ($existingVM) {
    Write-Host "  OK VM '$VMName' already exists (State: $($existingVM.State)) -- skipping creation." -ForegroundColor Green
} else {
    $ramStartup = $RAMMinGB * 1GB
    $ramMin     = $RAMMinGB * 1GB
    $ramMax     = $RAMMaxGB * 1GB
    $vhdSize    = $VHDSizeGB * 1GB

    New-VM -Name $VMName `
        -MemoryStartupBytes $ramStartup `
        -Generation 2 `
        -Path $VMPath `
        -NewVHDPath $VHDPath `
        -NewVHDSizeBytes $vhdSize `
        -SwitchName "Default Switch" | Out-Null
    Write-Host "  OK VM created" -ForegroundColor Green

    Set-VM -Name $VMName `
        -ProcessorCount $CPUCount `
        -DynamicMemory `
        -MemoryMinimumBytes $ramMin `
        -MemoryMaximumBytes $ramMax `
        -AutomaticCheckpointsEnabled $false `
        -CheckpointType Production
    Write-Host "  OK CPU: $CPUCount vCPUs, RAM: ${RAMMinGB}-${RAMMaxGB} GB (dynamic)" -ForegroundColor Green

    Set-VMKeyProtector -VMName $VMName -NewLocalKeyProtector
    Enable-VMTPM -VMName $VMName
    Write-Host "  OK TPM enabled (required for Windows 11)" -ForegroundColor Green

    Set-VM -VMName $VMName -EnhancedSessionTransportType HvSocket
    Write-Host "  OK Enhanced Session Mode enabled" -ForegroundColor Green

    Enable-VMIntegrationService -VMName $VMName -Name "Guest Service Interface"
    Write-Host "  OK Guest Service Interface enabled" -ForegroundColor Green

    Add-VMDvdDrive -VMName $VMName -Path $ISOPath
    $dvd = Get-VMDvdDrive -VMName $VMName
    Set-VMFirmware -VMName $VMName -FirstBootDevice $dvd
    Set-VMFirmware -VMName $VMName -EnableSecureBoot On -SecureBootTemplate MicrosoftWindows
    Write-Host "  OK ISO mounted, boot order: DVD first, Secure Boot on" -ForegroundColor Green
}

# --- Step 5: Start VM --------------------------------------------------------

Write-Host ""
Write-Host "[5/5] Starting VM..." -ForegroundColor Yellow

$vm = Get-VM -Name $VMName
if ($vm.State -eq 'Running') {
    Write-Host "  OK VM is already running." -ForegroundColor Green
} else {
    Start-VM -Name $VMName
    Write-Host "  OK VM started." -ForegroundColor Green
}

# --- Summary -----------------------------------------------------------------

Write-Host ""
Write-Host "==============================================================" -ForegroundColor Green
Write-Host "|  VM Ready!                                                 |" -ForegroundColor Green
Write-Host "==============================================================" -ForegroundColor Green
Write-Host "|                                                            |" -ForegroundColor Yellow
Write-Host "|  NEXT STEPS:                                               |" -ForegroundColor Yellow
Write-Host "|  1. Connect: Hyper-V Manager -> WinOpt-TestVM -> Connect   |" -ForegroundColor Yellow
Write-Host "|     or run:  vmconnect.exe localhost WinOpt-TestVM         |" -ForegroundColor Yellow
Write-Host "|  2. Install Windows 11 (choose Local Account, no MS login) |" -ForegroundColor Yellow
Write-Host "|  3. INSIDE VM: Run scripts\vm-post-install.ps1 as Admin    |" -ForegroundColor Yellow
Write-Host "|  4. INSIDE VM: Restart, then on HOST create checkpoint:    |" -ForegroundColor Yellow
Write-Host "|     Checkpoint-VM -Name WinOpt-TestVM -SnapshotName '00-CleanWindows' |" -ForegroundColor Yellow
Write-Host "|  5. INSIDE VM: git clone + npm install + playwright install |" -ForegroundColor Yellow
Write-Host "|  6. Create checkpoint '01-TestReady'                       |" -ForegroundColor Yellow
Write-Host "|  7. Run tests from HOST: .\scripts\vm-test-runner.ps1      |" -ForegroundColor Yellow
Write-Host "|                                                            |" -ForegroundColor Yellow
Write-Host "==============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Opening VM connection..." -ForegroundColor Cyan
Start-Process "vmconnect.exe" -ArgumentList "localhost", $VMName
