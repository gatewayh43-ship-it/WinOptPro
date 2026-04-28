#Requires -RunAsAdministrator
<#
.SYNOPSIS
    WinOpt Test VM Setup Script
    Creates a Hyper-V VM with Windows 11 from USB installation media,
    configures it for automated Playwright E2E testing.

.DESCRIPTION
    This script:
    1. Creates a bootable ISO from the Windows USB (J:\)
    2. Creates a Gen2 Hyper-V VM on G:\WinOpt-TestVM\
    3. Configures VM for testing (Enhanced Session, networking)
    4. Boots the VM for Windows installation
    
    After Windows is installed manually, run vm-post-install.ps1 inside the VM.

.NOTES
    Must be run as Administrator.
#>

param(
    [string]$VMName = "WinOpt-TestVM",
    [string]$VMPath = "G:\WinOpt-TestVM",
    [string]$VHDPath = "G:\WinOpt-TestVM\WinOpt-TestVM.vhdx",
    [string]$ISOPath = "G:\WinOpt-TestVM\windows_install.iso",
    [string]$USBDrive = "J:",
    [long]$VHDSizeGB = 80,
    [long]$RAMStartupGB = 8,
    [long]$RAMMinGB = 4,
    [long]$RAMMaxGB = 12,
    [int]$CPUCount = 4
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host "|         WinOpt Pro - Test VM Setup Script                  |" -ForegroundColor Cyan
Write-Host "==============================================================" -ForegroundColor Cyan
Write-Host ""

# --- Step 0: Verify Prerequisites --------------------------------------------

Write-Host "[0/5] Verifying prerequisites..." -ForegroundColor Yellow

# Check Hyper-V
$hvService = Get-Service vmms -ErrorAction SilentlyContinue
if (-not $hvService -or $hvService.Status -ne 'Running') {
    Write-Error "Hyper-V is not running. Enable it via 'Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V-All'"
    exit 1
}
Write-Host "  OK Hyper-V is running" -ForegroundColor Green

# Check USB drive
if (-not (Test-Path "$USBDrive\setup.exe")) {
    Write-Error "Windows installation media not found at $USBDrive\setup.exe"
    exit 1
}
Write-Host "  OK Windows USB found at $USBDrive" -ForegroundColor Green

# Check target drive
$targetDrive = Split-Path $VMPath -Qualifier
$vol = Get-Volume -DriveLetter ($targetDrive -replace ':', '') -ErrorAction SilentlyContinue
if ($vol) {
    $freeGB = [math]::Round($vol.SizeRemaining / 1GB, 1)
    Write-Host "  OK Target drive $targetDrive has ${freeGB}GB free" -ForegroundColor Green
    if ($freeGB -lt ($VHDSizeGB + 10)) {
        Write-Error "Insufficient space on $targetDrive. Need at least $($VHDSizeGB + 10)GB."
        exit 1
    }
}

# Check if VM already exists
$existingVM = Get-VM -Name $VMName -ErrorAction SilentlyContinue
if ($existingVM) {
    Write-Host "  WARN VM '$VMName' already exists. Skipping creation." -ForegroundColor Yellow
    Write-Host "  Use 'Remove-VM -Name $VMName -Force' to remove it first." -ForegroundColor Yellow
    exit 0
}

# --- Step 1: Create VM Directory ---------------------------------------------

Write-Host ""
Write-Host "[1/5] Creating VM directory..." -ForegroundColor Yellow

if (-not (Test-Path $VMPath)) {
    New-Item -Path $VMPath -ItemType Directory -Force | Out-Null
    Write-Host "  OK Created $VMPath" -ForegroundColor Green
} else {
    Write-Host "  OK Directory already exists" -ForegroundColor Green
}

# --- Step 2: Create ISO from USB ---------------------------------------------

Write-Host ""
Write-Host "[2/5] Creating bootable ISO from USB ($USBDrive)..." -ForegroundColor Yellow
Write-Host "  This may take several minutes depending on USB speed..." -ForegroundColor DarkGray

if (Test-Path $ISOPath) {
    Write-Host "  OK ISO already exists at $ISOPath, skipping." -ForegroundColor Green
} else {
    # Try oscdimg first (from Windows ADK)
    $oscdimg = @(
        "$env:ProgramFiles(x86)\Windows Kits\10\Assessment and Deployment Kit\Deployment Tools\amd64\Oscdimg\oscdimg.exe",
        "$env:ProgramFiles\Windows Kits\10\Assessment and Deployment Kit\Deployment Tools\amd64\Oscdimg\oscdimg.exe"
    ) | Where-Object { Test-Path $_ } | Select-Object -First 1

    if ($oscdimg) {
        Write-Host "  Using oscdimg.exe..." -ForegroundColor DarkGray
        $bootData = "2#p0,e,b`"$USBDrive\boot\etfsboot.com`"#pEF,e,b`"$USBDrive\efi\microsoft\boot\efisys.bin`""
        & $oscdimg -m -o -u2 -udfver102 -bootdata:$bootData "$USBDrive\" "$ISOPath"
        if ($LASTEXITCODE -ne 0) { Write-Error "oscdimg failed"; exit 1 }
    } else {
        Write-Host "  oscdimg not found. Using PowerShell CDFS method..." -ForegroundColor DarkGray
        
        # Alternative: Use PowerShell to create ISO via COM
        # Copy to temp directory first as AddTree doesn't like root drives like J:\
        $tempIsoDir = Join-Path $VMPath "IsoSource"
        if (-not (Test-Path $tempIsoDir)) {
            New-Item -Path $tempIsoDir -ItemType Directory -Force | Out-Null
        }
        Write-Host "  Copying USB contents to temporary directory (this avoids System Volume Information errors)..." -ForegroundColor DarkGray
        robocopy "$USBDrive\" "$tempIsoDir" /E /XD "System Volume Information" /R:1 /W:1 /NDL /NFL /NJH /NJS | Out-Null
        
        $isoCreator = @"
`$fs = New-Object -ComObject IMAPI2FS.MsftFileSystemImage
`$fs.FileSystemsToCreate = 4  # UDF
`$fs.VolumeName = "WIN_INSTALL"
`$src = "$tempIsoDir"
`$fs.Root.AddTree(`$src, `$true)
`$result = `$fs.CreateResultImage()
`$stream = `$result.ImageStream
`$writer = New-Object System.IO.FileStream("$ISOPath", [System.IO.FileMode]::Create)
`$buffer = New-Object byte[] 65536
do {
    `$read = `$stream.Read(`$buffer, 0, `$buffer.Length)
    `$writer.Write(`$buffer, 0, `$read)
} while (`$read -gt 0)
`$writer.Close()
`$stream.Close()
"@
        Invoke-Expression $isoCreator

        # Cleanup Temp Directory
        Remove-Item -Path $tempIsoDir -Recurse -Force -ErrorAction SilentlyContinue

        if (-not (Test-Path $ISOPath)) {
            Write-Host "  ===========================================================" -ForegroundColor Red
            Write-Host "  |  ISO creation failed. Please download Windows ADK or    |" -ForegroundColor Red
            Write-Host "  |  create the ISO manually using Rufus or Media Creation  |" -ForegroundColor Red
            Write-Host "  |  Tool, then place it at:                                |" -ForegroundColor Red
            Write-Host "  |  $ISOPath" -ForegroundColor Red
            Write-Host "  ===========================================================" -ForegroundColor Red
            Write-Host ""
            Write-Host "  Alternatively, install Windows ADK:" -ForegroundColor Yellow
            Write-Host "  winget install Microsoft.WindowsADK" -ForegroundColor White
            Write-Host ""
            exit 1
        }
    }
    
    $isoSize = [math]::Round((Get-Item $ISOPath).Length / 1GB, 2)
    Write-Host "  OK ISO created: $ISOPath (${isoSize}GB)" -ForegroundColor Green
}

# --- Step 3: Create Hyper-V VM -----------------------------------------------

Write-Host ""
Write-Host "[3/5] Creating Hyper-V VM '$VMName'..." -ForegroundColor Yellow

$ramStartup = $RAMStartupGB * 1GB
$ramMin = $RAMMinGB * 1GB
$ramMax = $RAMMaxGB * 1GB
$vhdSize = $VHDSizeGB * 1GB

# Create the VM
New-VM -Name $VMName `
    -MemoryStartupBytes $ramStartup `
    -Generation 2 `
    -Path $VMPath `
    -NewVHDPath $VHDPath `
    -NewVHDSizeBytes $vhdSize `
    -SwitchName "Default Switch" | Out-Null

Write-Host "  OK VM created" -ForegroundColor Green

# Configure VM settings
Set-VM -Name $VMName `
    -ProcessorCount $CPUCount `
    -DynamicMemory `
    -MemoryMinimumBytes $ramMin `
    -MemoryMaximumBytes $ramMax `
    -AutomaticCheckpointsEnabled $false `
    -CheckpointType Production

Write-Host "  OK CPU: $CPUCount vCPUs, RAM: ${RAMMinGB}-${RAMMaxGB}GB (dynamic)" -ForegroundColor Green

# Enable TPM for Windows 11
Set-VMKeyProtector -VMName $VMName -NewLocalKeyProtector
Enable-VMTPM -VMName $VMName
Write-Host "  OK TPM enabled (required for Win11)" -ForegroundColor Green

# Enable Enhanced Session Mode
Set-VM -VMName $VMName -EnhancedSessionTransportType HvSocket
Write-Host "  OK Enhanced Session Mode enabled" -ForegroundColor Green

# Enable guest services for file copy
Enable-VMIntegrationService -VMName $VMName -Name "Guest Service Interface"
Write-Host "  OK Guest Service Interface enabled" -ForegroundColor Green

# --- Step 4: Mount ISO and Set Boot Order ------------------------------------

Write-Host ""
Write-Host "[4/5] Mounting installation ISO and configuring boot..." -ForegroundColor Yellow

Add-VMDvdDrive -VMName $VMName -Path $ISOPath
$dvd = Get-VMDvdDrive -VMName $VMName
Set-VMFirmware -VMName $VMName -FirstBootDevice $dvd
Set-VMFirmware -VMName $VMName -EnableSecureBoot On -SecureBootTemplate MicrosoftWindows
Write-Host "  OK ISO mounted, boot order set to DVD first" -ForegroundColor Green

# --- Step 5: Start VM --------------------------------------------------------

Write-Host ""
Write-Host "[5/5] Starting VM for Windows installation..." -ForegroundColor Yellow

Start-VM -Name $VMName
Write-Host "  OK VM started!" -ForegroundColor Green

# --- Summary -----------------------------------------------------------------

Write-Host ""
Write-Host "==============================================================" -ForegroundColor Green
Write-Host "|  VM Created Successfully!                                  |" -ForegroundColor Green
Write-Host "==============================================================" -ForegroundColor Green
Write-Host "|  Name:       $VMName" -ForegroundColor Green
Write-Host "|  Disk:       $VHDPath ($($VHDSizeGB)GB)" -ForegroundColor Green
Write-Host "|  RAM:        ${RAMMinGB}-${RAMMaxGB}GB (dynamic)" -ForegroundColor Green
Write-Host "|  CPUs:       $CPUCount vCPUs" -ForegroundColor Green
Write-Host "|  Network:    Default Switch (NAT)" -ForegroundColor Green
Write-Host "==============================================================" -ForegroundColor Green
Write-Host "|                                                            |" -ForegroundColor Yellow
Write-Host "|  NEXT STEPS:                                               |" -ForegroundColor Yellow
Write-Host "|  1. Open Hyper-V Manager -> Connect to WinOpt-TestVM       |" -ForegroundColor Yellow
Write-Host "|  2. Install Windows 11 (use local account)                 |" -ForegroundColor Yellow
Write-Host "|  3. Run: scripts/vm-post-install.ps1 inside the VM         |" -ForegroundColor Yellow
Write-Host "|  4. Create checkpoint: 00-CleanWindows                     |" -ForegroundColor Yellow
Write-Host "|                                                            |" -ForegroundColor Yellow
Write-Host "==============================================================" -ForegroundColor Green
Write-Host ""

# Open Hyper-V Manager
Write-Host "Opening Hyper-V Manager..." -ForegroundColor Cyan
Start-Process "vmconnect.exe" -ArgumentList "localhost", $VMName

