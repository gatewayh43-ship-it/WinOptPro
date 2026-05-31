param(
    [string]$OutputDirectory = "release\windows"
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$tauriConfig = Join-Path $repoRoot "src-tauri\tauri.local-installer.conf.json"
$bundleRoot = Join-Path $repoRoot "src-tauri\target\release\bundle"
$outputPath = Join-Path $repoRoot $OutputDirectory

Set-Location $repoRoot

Write-Host "Building WinOpt Pro Windows installers..."
npx.cmd tauri build --config $tauriConfig
if ($LASTEXITCODE -ne 0) {
    throw "Tauri installer build failed with exit code $LASTEXITCODE"
}

New-Item -ItemType Directory -Force -Path $outputPath | Out-Null

$installers = @()
$installers += Get-ChildItem -Path (Join-Path $bundleRoot "nsis") -Filter "*.exe" -File -ErrorAction SilentlyContinue
$installers += Get-ChildItem -Path (Join-Path $bundleRoot "msi") -Filter "*.msi" -File -ErrorAction SilentlyContinue

if ($installers.Count -eq 0) {
    throw "No installer artifacts were produced under $bundleRoot"
}

foreach ($installer in $installers) {
    Copy-Item -LiteralPath $installer.FullName -Destination $outputPath -Force
}

Write-Host ""
Write-Host "Installer artifacts:"
Get-ChildItem -Path $outputPath -File | Select-Object FullName, Length, LastWriteTime | Format-Table -AutoSize
Write-Host ""
Write-Host "Note: these local installers are not Authenticode-signed. Configure release signing before public paid-user distribution."
