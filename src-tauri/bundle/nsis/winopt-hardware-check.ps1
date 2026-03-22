# WinOpt Pro Hardware Detection Script
# Outputs: RAM_GB|DISCRETE_VRAM_GB|GPU_NAME|CPU_CORES
# Called by NSIS installer to determine compatible AI models

try {
    # Get total RAM in GB
    $cs = Get-WmiObject Win32_ComputerSystem -ErrorAction Stop
    $ramGb = [math]::Round($cs.TotalPhysicalMemory / 1GB, 1)

    # Get GPU info (prefer discrete over integrated)
    $gpus = Get-WmiObject Win32_VideoController -ErrorAction Stop
    $discreteVramGb = 0
    $gpuName = "Unknown"

    $integratedKeywords = @("Intel UHD", "Intel HD", "Intel Iris", "AMD Radeon Graphics", "Radeon Vega")

    foreach ($gpu in $gpus) {
        $isIntegrated = $false
        foreach ($kw in $integratedKeywords) {
            if ($gpu.Name -like "*$kw*") { $isIntegrated = $true; break }
        }
        if (-not $isIntegrated -and $gpu.AdapterRAM -gt 0) {
            $vram = [math]::Round($gpu.AdapterRAM / 1GB, 1)
            if ($vram -gt $discreteVramGb) {
                $discreteVramGb = $vram
                $gpuName = $gpu.Name
            }
        }
    }

    # If no discrete GPU found, note integrated
    if ($discreteVramGb -eq 0 -and $gpus.Count -gt 0) {
        $gpuName = "$($gpus[0].Name) (integrated)"
    }

    # CPU cores
    $cpuCores = (Get-WmiObject Win32_Processor -ErrorAction Stop | Measure-Object -Property NumberOfLogicalProcessors -Sum).Sum

    Write-Output "$ramGb|$discreteVramGb|$gpuName|$cpuCores"
} catch {
    # Fallback on any WMI error
    Write-Output "4|0|Unknown|4"
}
