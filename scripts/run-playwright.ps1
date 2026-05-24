param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$PlaywrightArgs
)

$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$viteScript = Join-Path $projectRoot "node_modules\vite\bin\vite.js"
$playwrightCli = Join-Path $projectRoot "node_modules\@playwright\test\cli.js"

function Test-DevServerReady {
    try {
        $response = Invoke-WebRequest -Uri "http://127.0.0.1:1420" -UseBasicParsing -TimeoutSec 1
        return $response.StatusCode -ge 200 -and $response.StatusCode -lt 500
    } catch {
        return $false
    }
}

Push-Location $projectRoot
$server = $null

try {
    if (-not (Test-DevServerReady)) {
        Write-Host "Starting Vite dev server on http://127.0.0.1:1420..."
        $server = Start-Process -FilePath "node" `
            -ArgumentList @($viteScript, "--host", "127.0.0.1") `
            -WindowStyle Hidden `
            -PassThru

        $deadline = (Get-Date).AddSeconds(30)
        while (-not (Test-DevServerReady)) {
            if ((Get-Date) -gt $deadline) {
                throw "Timed out waiting for Vite dev server on port 1420."
            }
            Start-Sleep -Milliseconds 250
        }
    } else {
        Write-Host "Using existing Vite dev server on http://127.0.0.1:1420..."
    }

    $env:PLAYWRIGHT_SKIP_WEB_SERVER = "1"
    Write-Host "Running Playwright: $($PlaywrightArgs -join ' ')"
    & node $playwrightCli test @PlaywrightArgs
    exit $LASTEXITCODE
} finally {
    Remove-Item Env:PLAYWRIGHT_SKIP_WEB_SERVER -ErrorAction SilentlyContinue
    if ($server -and -not $server.HasExited) {
        Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
    }
    Pop-Location
}
