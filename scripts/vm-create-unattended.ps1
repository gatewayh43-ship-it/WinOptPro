#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Creates and provisions the WinOpt Windows test VM from local install media.

.DESCRIPTION
    Fully automated host-side setup for the WinOpt test rig:
      1. Copies Windows install media from USB/DVD path such as J:\
      2. Injects Autounattend.xml for unattended Windows installation
      3. Builds a bootable ISO with oscdimg
      4. Creates a Hyper-V Gen2 VM with TPM and guest services
      5. Waits for unattended Windows setup to complete
      6. Provisions Node.js, Git, firewall rules, and PowerShell Direct access
      7. Creates the 01-TestReady checkpoint
      8. Optionally runs the full automated Playwright + direct tweak suite

    Test artifacts are written under test-results/.
#>

param(
    [string]$VMName = "WinOpt-TestVM",
    [string]$USBDrive = "J:",
    [string]$VMPath = "G:\WinOpt-TestVM",
    [string]$VHDPath = "G:\WinOpt-TestVM\WinOpt-TestVM.vhdx",
    [string]$ISOPath = "G:\WinOpt-TestVM\winopt-test-unattended.iso",
    [int]$ImageIndex = 6,
    [long]$VHDSizeGB = 80,
    [long]$RAMStartupGB = 8,
    [long]$RAMMinGB = 4,
    [long]$RAMMaxGB = 12,
    [int]$CPUCount = 4,
    [string]$GuestUser = "WinOptTest",
    [string]$GuestPassword = $(if ($env:WINOPT_VM_PASSWORD) { $env:WINOPT_VM_PASSWORD } else { "WinOptTest!2026" }),
    [string]$ProductKey = "VK7JG-NPHTM-C97JM-9MPGT-3V66T",
    [switch]$Recreate,
    [switch]$SkipTests
)

$ErrorActionPreference = "Stop"

$projectDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$setupLogDir = Join-Path $projectDir "test-results\vm-setup"
$runStamp = Get-Date -Format "yyyyMMdd-HHmmss"
$transcriptPath = Join-Path $setupLogDir "vm-create-$runStamp.log"

New-Item -Path $setupLogDir -ItemType Directory -Force | Out-Null
Start-Transcript -Path $transcriptPath -Force | Out-Null

try {
    Write-Host ""
    Write-Host "==============================================================" -ForegroundColor Cyan
    Write-Host "|       WinOpt Pro - Unattended VM Test Rig Setup            |" -ForegroundColor Cyan
    Write-Host "==============================================================" -ForegroundColor Cyan
    Write-Host ""

    $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    if (-not $isAdmin) {
        throw "Run this script from an elevated Administrator PowerShell window."
    }

    if (-not (Test-Path "$USBDrive\setup.exe")) {
        throw "Windows installation media was not found at $USBDrive\setup.exe"
    }

    $hvService = Get-Service vmms -ErrorAction SilentlyContinue
    if (-not $hvService -or $hvService.Status -ne "Running") {
        throw "Hyper-V VMMS service is not running. Enable Hyper-V and reboot first."
    }

    $existingVM = Get-VM -Name $VMName -ErrorAction SilentlyContinue
    if ($existingVM) {
        if (-not $Recreate) {
            throw "VM '$VMName' already exists. Re-run with -Recreate to replace it."
        }

        Write-Host "Removing existing VM '$VMName'..." -ForegroundColor Yellow
        if ($existingVM.State -eq "Running") {
            Stop-VM -Name $VMName -TurnOff -Force
        }
        Remove-VM -Name $VMName -Force
    }

    if ($Recreate -and (Test-Path $VMPath)) {
        Write-Host "Removing existing VM path $VMPath..." -ForegroundColor Yellow
        Remove-Item -Path $VMPath -Recurse -Force
    }

    New-Item -Path $VMPath -ItemType Directory -Force | Out-Null

    $isoSource = Join-Path $VMPath "IsoSource"
    if (-not (Test-Path $isoSource)) {
        New-Item -Path $isoSource -ItemType Directory -Force | Out-Null
    }

    Write-Host "[1/8] Copying Windows media from $USBDrive to $isoSource..." -ForegroundColor Yellow
    robocopy "$USBDrive\" "$isoSource" /MIR /XD "System Volume Information" /R:2 /W:2 /NFL /NDL /NJH /NJS | Out-Null
    if ($LASTEXITCODE -gt 7) {
        throw "robocopy failed with exit code $LASTEXITCODE"
    }

    Write-Host "[2/8] Writing unattended install answer file..." -ForegroundColor Yellow
    $escapedUser = [Security.SecurityElement]::Escape($GuestUser)
    $escapedPassword = [Security.SecurityElement]::Escape($GuestPassword)
    $escapedProductKey = [Security.SecurityElement]::Escape($ProductKey)

    $autounattend = @"
<?xml version="1.0" encoding="utf-8"?>
<unattend xmlns="urn:schemas-microsoft-com:unattend">
  <settings pass="windowsPE">
    <component name="Microsoft-Windows-International-Core-WinPE" processorArchitecture="amd64" publicKeyToken="31bf3856ad364e35" language="neutral" versionScope="nonSxS">
      <SetupUILanguage>
        <UILanguage>en-GB</UILanguage>
      </SetupUILanguage>
      <InputLocale>en-GB</InputLocale>
      <SystemLocale>en-GB</SystemLocale>
      <UILanguage>en-GB</UILanguage>
      <UserLocale>en-GB</UserLocale>
    </component>
    <component name="Microsoft-Windows-Setup" processorArchitecture="amd64" publicKeyToken="31bf3856ad364e35" language="neutral" versionScope="nonSxS">
      <DiskConfiguration>
        <Disk wcm:action="add" xmlns:wcm="http://schemas.microsoft.com/WMIConfig/2002/State">
          <DiskID>0</DiskID>
          <WillWipeDisk>true</WillWipeDisk>
          <CreatePartitions>
            <CreatePartition wcm:action="add">
              <Order>1</Order>
              <Type>EFI</Type>
              <Size>100</Size>
            </CreatePartition>
            <CreatePartition wcm:action="add">
              <Order>2</Order>
              <Type>MSR</Type>
              <Size>16</Size>
            </CreatePartition>
            <CreatePartition wcm:action="add">
              <Order>3</Order>
              <Type>Primary</Type>
              <Extend>true</Extend>
            </CreatePartition>
          </CreatePartitions>
          <ModifyPartitions>
            <ModifyPartition wcm:action="add">
              <Order>1</Order>
              <PartitionID>1</PartitionID>
              <Format>FAT32</Format>
              <Label>System</Label>
            </ModifyPartition>
            <ModifyPartition wcm:action="add">
              <Order>2</Order>
              <PartitionID>3</PartitionID>
              <Format>NTFS</Format>
              <Label>Windows</Label>
              <Letter>C</Letter>
            </ModifyPartition>
          </ModifyPartitions>
        </Disk>
      </DiskConfiguration>
      <ImageInstall>
        <OSImage>
          <InstallFrom>
            <MetaData wcm:action="add" xmlns:wcm="http://schemas.microsoft.com/WMIConfig/2002/State">
              <Key>/IMAGE/INDEX</Key>
              <Value>$ImageIndex</Value>
            </MetaData>
          </InstallFrom>
          <InstallTo>
            <DiskID>0</DiskID>
            <PartitionID>3</PartitionID>
          </InstallTo>
          <WillShowUI>OnError</WillShowUI>
        </OSImage>
      </ImageInstall>
      <UserData>
        <AcceptEula>true</AcceptEula>
        <FullName>WinOpt Test</FullName>
        <Organization>WinOpt</Organization>
        <ProductKey>
          <Key>$escapedProductKey</Key>
          <WillShowUI>OnError</WillShowUI>
        </ProductKey>
      </UserData>
    </component>
  </settings>
  <settings pass="specialize">
    <component name="Microsoft-Windows-Shell-Setup" processorArchitecture="amd64" publicKeyToken="31bf3856ad364e35" language="neutral" versionScope="nonSxS">
      <ComputerName>WINOPT-TEST</ComputerName>
      <RegisteredOwner>WinOpt Test</RegisteredOwner>
      <TimeZone>GMT Standard Time</TimeZone>
    </component>
  </settings>
  <settings pass="oobeSystem">
    <component name="Microsoft-Windows-International-Core" processorArchitecture="amd64" publicKeyToken="31bf3856ad364e35" language="neutral" versionScope="nonSxS">
      <InputLocale>en-GB</InputLocale>
      <SystemLocale>en-GB</SystemLocale>
      <UILanguage>en-GB</UILanguage>
      <UserLocale>en-GB</UserLocale>
    </component>
    <component name="Microsoft-Windows-Shell-Setup" processorArchitecture="amd64" publicKeyToken="31bf3856ad364e35" language="neutral" versionScope="nonSxS">
      <OOBE>
        <HideEULAPage>true</HideEULAPage>
        <HideLocalAccountScreen>true</HideLocalAccountScreen>
        <HideOEMRegistrationScreen>true</HideOEMRegistrationScreen>
        <HideOnlineAccountScreens>true</HideOnlineAccountScreens>
        <HideWirelessSetupInOOBE>true</HideWirelessSetupInOOBE>
        <NetworkLocation>Work</NetworkLocation>
        <ProtectYourPC>3</ProtectYourPC>
      </OOBE>
      <UserAccounts>
        <LocalAccounts>
          <LocalAccount wcm:action="add" xmlns:wcm="http://schemas.microsoft.com/WMIConfig/2002/State">
            <Name>$escapedUser</Name>
            <Group>Administrators</Group>
            <DisplayName>WinOpt Test</DisplayName>
            <Description>Disposable WinOpt automated test administrator</Description>
            <Password>
              <Value>$escapedPassword</Value>
              <PlainText>true</PlainText>
            </Password>
          </LocalAccount>
        </LocalAccounts>
      </UserAccounts>
      <AutoLogon>
        <Enabled>true</Enabled>
        <Username>$escapedUser</Username>
        <LogonCount>5</LogonCount>
        <Password>
          <Value>$escapedPassword</Value>
          <PlainText>true</PlainText>
        </Password>
      </AutoLogon>
      <FirstLogonCommands>
        <SynchronousCommand wcm:action="add" xmlns:wcm="http://schemas.microsoft.com/WMIConfig/2002/State">
          <Order>1</Order>
          <Description>Enable PowerShell automation</Description>
          <CommandLine>powershell -NoProfile -ExecutionPolicy Bypass -Command "Enable-PSRemoting -Force -SkipNetworkProfileCheck; Set-ExecutionPolicy RemoteSigned -Scope LocalMachine -Force; New-NetFirewallRule -DisplayName 'WinOpt Vite Dev' -Direction Inbound -LocalPort 1420 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue"</CommandLine>
        </SynchronousCommand>
      </FirstLogonCommands>
    </component>
  </settings>
</unattend>
"@

    $answerPath = Join-Path $isoSource "Autounattend.xml"
    Set-Content -Path $answerPath -Value $autounattend -Encoding UTF8

    Write-Host "[3/8] Locating oscdimg..." -ForegroundColor Yellow
    $oscdimg = @(
        "${env:ProgramFiles(x86)}\Windows Kits\10\Assessment and Deployment Kit\Deployment Tools\amd64\Oscdimg\oscdimg.exe",
        "${env:ProgramFiles}\Windows Kits\10\Assessment and Deployment Kit\Deployment Tools\amd64\Oscdimg\oscdimg.exe"
    ) | Where-Object { Test-Path $_ } | Select-Object -First 1

    if (-not $oscdimg) {
        Write-Host "Installing Windows ADK Deployment Tools for oscdimg..." -ForegroundColor Yellow
        winget install Microsoft.WindowsADK --accept-source-agreements --accept-package-agreements --silent --override "/quiet /features OptionId.DeploymentTools"
        $oscdimg = @(
            "${env:ProgramFiles(x86)}\Windows Kits\10\Assessment and Deployment Kit\Deployment Tools\amd64\Oscdimg\oscdimg.exe",
            "${env:ProgramFiles}\Windows Kits\10\Assessment and Deployment Kit\Deployment Tools\amd64\Oscdimg\oscdimg.exe"
        ) | Where-Object { Test-Path $_ } | Select-Object -First 1
    }

    if (-not $oscdimg) {
        throw "oscdimg.exe was not found. Install Windows ADK Deployment Tools and re-run."
    }

    Write-Host "[4/8] Creating unattended ISO at $ISOPath..." -ForegroundColor Yellow
    if (Test-Path $ISOPath) {
        Remove-Item -Path $ISOPath -Force
    }
    $bootData = "2#p0,e,b`"$isoSource\boot\etfsboot.com`"#pEF,e,b`"$isoSource\efi\microsoft\boot\efisys.bin`""
    & $oscdimg -m -o -u2 -udfver102 -bootdata:$bootData "$isoSource\" "$ISOPath"
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path $ISOPath)) {
        throw "oscdimg failed with exit code $LASTEXITCODE"
    }

    Write-Host "[5/8] Creating Hyper-V VM '$VMName'..." -ForegroundColor Yellow
    $ramStartup = $RAMStartupGB * 1GB
    $ramMin = $RAMMinGB * 1GB
    $ramMax = $RAMMaxGB * 1GB
    $vhdSize = $VHDSizeGB * 1GB

    New-VM -Name $VMName -MemoryStartupBytes $ramStartup -Generation 2 -Path $VMPath -NewVHDPath $VHDPath -NewVHDSizeBytes $vhdSize -SwitchName "Default Switch" | Out-Null
    Set-VM -Name $VMName -ProcessorCount $CPUCount -DynamicMemory -MemoryMinimumBytes $ramMin -MemoryMaximumBytes $ramMax -AutomaticCheckpointsEnabled $false -CheckpointType Production
    Set-VMKeyProtector -VMName $VMName -NewLocalKeyProtector
    Enable-VMTPM -VMName $VMName
    Set-VM -VMName $VMName -EnhancedSessionTransportType HvSocket
    Enable-VMIntegrationService -VMName $VMName -Name "Guest Service Interface"
    Add-VMDvdDrive -VMName $VMName -Path $ISOPath
    $dvd = Get-VMDvdDrive -VMName $VMName
    Set-VMFirmware -VMName $VMName -FirstBootDevice $dvd
    Set-VMFirmware -VMName $VMName -EnableSecureBoot On -SecureBootTemplate MicrosoftWindows

    Write-Host "[6/8] Starting unattended Windows installation..." -ForegroundColor Yellow
    Start-VM -Name $VMName
    Write-Host "Waiting for Windows heartbeat. This can take 20-60 minutes..." -ForegroundColor DarkGray
    Wait-VM -VMName $VMName -For Heartbeat -Timeout 5400
    Start-Sleep -Seconds 60

    $secure = ConvertTo-SecureString $GuestPassword -AsPlainText -Force
    $credential = [System.Management.Automation.PSCredential]::new($GuestUser, $secure)

    Write-Host "[7/8] Waiting for PowerShell Direct and provisioning guest..." -ForegroundColor Yellow
    $session = $null
    for ($i = 1; $i -le 90; $i++) {
        try {
            $session = New-PSSession -VMName $VMName -Credential $credential -ErrorAction Stop
            $ready = Invoke-Command -Session $session -ScriptBlock { hostname }
            if ($ready) { break }
        } catch {
            if ($session) { Remove-PSSession $session -ErrorAction SilentlyContinue }
            $session = $null
            Start-Sleep -Seconds 20
        }
    }

    if (-not $session) {
        throw "PowerShell Direct did not become available for $GuestUser."
    }

    Invoke-Command -Session $session -ScriptBlock {
        $ErrorActionPreference = "Continue"
        Enable-PSRemoting -Force -SkipNetworkProfileCheck
        Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope LocalMachine -Force
        New-NetFirewallRule -DisplayName "WinOpt Vite Dev" -Direction Inbound -LocalPort 1420 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue | Out-Null
        New-NetFirewallRule -DisplayName "WinOpt Playwright CDP" -Direction Inbound -LocalPort 9222 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue | Out-Null
        New-Item -Path "C:\WinOpt" -ItemType Directory -Force | Out-Null

        $wu = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU"
        if (-not (Test-Path $wu)) { New-Item -Path $wu -Force | Out-Null }
        Set-ItemProperty -Path $wu -Name "NoAutoUpdate" -Value 1 -Type DWord -Force
        Stop-Service wuauserv -Force -ErrorAction SilentlyContinue
        Set-Service wuauserv -StartupType Disabled -ErrorAction SilentlyContinue

        winget source update | Out-Null
        winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements --silent
        winget install Git.Git --accept-source-agreements --accept-package-agreements --silent
    }

    Remove-PSSession $session

    Write-Host "Creating checkpoint 01-TestReady..." -ForegroundColor Yellow
    Checkpoint-VM -Name $VMName -SnapshotName "01-TestReady"

    if (-not $SkipTests) {
        Write-Host "[8/8] Running full automated VM test suite..." -ForegroundColor Yellow
        $env:WINOPT_VM_PASSWORD = $GuestPassword
        & (Join-Path $PSScriptRoot "vm-run-automated-suite.ps1") -VMName $VMName -Checkpoint "01-TestReady" -ProjectDir $projectDir -GuestUser $GuestUser -GuestPassword $GuestPassword
        if ($LASTEXITCODE -ne 0) {
            throw "Automated VM suite failed with exit code $LASTEXITCODE"
        }
    } else {
        Write-Host "[8/8] Skipping automated test run because -SkipTests was supplied." -ForegroundColor Yellow
    }

    Write-Host ""
    Write-Host "VM setup complete. Transcript: $transcriptPath" -ForegroundColor Green
} finally {
    Stop-Transcript | Out-Null
}
