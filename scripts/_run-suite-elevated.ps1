#Requires -RunAsAdministrator
$log = "F:\WinOpt\WinOptimizerRevamp\test-results\vm-suite-run.log"
New-Item -ItemType Directory -Path (Split-Path $log) -Force | Out-Null
& "F:\WinOpt\WinOptimizerRevamp\scripts\vm-run-automated-suite.ps1" *>&1 | Tee-Object -FilePath $log
