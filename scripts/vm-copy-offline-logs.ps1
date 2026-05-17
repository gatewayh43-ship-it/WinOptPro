#Requires -RunAsAdministrator
param(
    [string]$VhdPath = "G:\WinOpt-TestVM\WinOpt-TestVM.vhdx",
    [string]$OutputDir = "F:\WinOpt\WinOptimizerRevamp\test-results\vm-setup\offline-panther"
)

$ErrorActionPreference = "Stop"

New-Item -Path $OutputDir -ItemType Directory -Force | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$transcript = Join-Path $OutputDir "copy-offline-logs-$stamp.log"
Start-Transcript -Path $transcript -Force | Out-Null
$mounted = $false

try {
    $disk = Mount-VHD -Path $VhdPath -ReadOnly -Passthru | Get-Disk
    $mounted = $true

    $volumes = $disk | Get-Partition | Get-Volume -ErrorAction SilentlyContinue
    $volumes |
        Select-Object DriveLetter, FileSystemLabel, FileSystem, @{Name='SizeGB';Expression={[math]::Round($_.Size / 1GB, 2)}} |
        ConvertTo-Json -Depth 4 |
        Set-Content -Path (Join-Path $OutputDir "volumes.json") -Encoding UTF8

    foreach ($volume in $volumes) {
        if (-not $volume.DriveLetter) {
            continue
        }

        $root = "$($volume.DriveLetter):\"
        if (-not (Test-Path (Join-Path $root "Windows"))) {
            continue
        }

        Get-ChildItem -Path $root -Force |
            Select-Object Name, Length, LastWriteTime |
            ConvertTo-Json -Depth 3 |
            Set-Content -Path (Join-Path $OutputDir "windows-root-listing.json") -Encoding UTF8

        Copy-Item -Path (Join-Path $root "Windows\Panther\*") -Destination $OutputDir -Recurse -Force -ErrorAction SilentlyContinue

        $sysprepOut = Join-Path $OutputDir "sysprep-panther"
        New-Item -Path $sysprepOut -ItemType Directory -Force | Out-Null
        Copy-Item -Path (Join-Path $root "Windows\System32\Sysprep\Panther\*") -Destination $sysprepOut -Recurse -Force -ErrorAction SilentlyContinue

        $setupScripts = Join-Path $OutputDir "setup-scripts"
        New-Item -Path $setupScripts -ItemType Directory -Force | Out-Null
        Copy-Item -Path (Join-Path $root "Windows\Setup\Scripts\*") -Destination $setupScripts -Recurse -Force -ErrorAction SilentlyContinue

        $setupCompleteLog = Join-Path $root "WinOpt-SetupComplete.log"
        if (Test-Path $setupCompleteLog) {
            Copy-Item -LiteralPath $setupCompleteLog -Destination (Join-Path $OutputDir "WinOpt-SetupComplete.log") -Force
        }

        $setupGcOut = Join-Path $OutputDir "UnattendGC"
        New-Item -Path $setupGcOut -ItemType Directory -Force | Out-Null
        Copy-Item -Path (Join-Path $root "Windows\Panther\UnattendGC\*") -Destination $setupGcOut -Recurse -Force -ErrorAction SilentlyContinue
    }
} catch {
    Write-Host "Offline log extraction failed:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    $_ | Format-List * -Force
    throw
} finally {
    if ($mounted) {
        Dismount-VHD -Path $VhdPath
    }
    Stop-Transcript | Out-Null
}

Get-ChildItem -Path $OutputDir -Recurse -File |
    Select-Object FullName, Length, LastWriteTime |
    ConvertTo-Json -Depth 4 |
    Set-Content -Path (Join-Path $OutputDir "manifest.json") -Encoding UTF8
