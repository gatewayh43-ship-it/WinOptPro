import { readFileSync, writeFileSync } from 'fs';

const tweaks = JSON.parse(readFileSync('./src/data/tweaks.json', 'utf8'));

const validationCmds = {
  DisableUSBSelectiveSuspend: "powercfg /query SCHEME_CURRENT 2a737441-1930-4402-8d77-b2bebba308a3 48e6b7a6-50f5-4782-a5d4-53bb8f07e226",
  DisablePCIeLinkStatePM:     "powercfg /query SCHEME_CURRENT SUB_PCIEXPRESS ASPM",
  EnableAggressiveCPUBoost:   "powercfg /query SCHEME_CURRENT SUB_PROCESSOR PERFBOOSTMODE",
  DisableAdaptiveBrightness:  "powercfg /query SCHEME_CURRENT SUB_VIDEO ADAPTBRIGHT",
  SetMinCPUState100:          "powercfg /query SCHEME_CURRENT SUB_PROCESSOR PROCTHROTTLEMIN",
  FlushDNSCache:              "Get-DnsClientCache | Measure-Object | Select-Object -ExpandProperty Count",
  ResetWinsock:               "netsh winsock show catalog | Select-String 'Winsock Catalog'",
  DisableExplorerFolderDiscovery: "(Get-ItemProperty -Path 'HKCU:\\SOFTWARE\\Classes\\Local Settings\\Software\\Microsoft\\Windows\\Shell\\Bags\\AllFolders\\Shell').FolderType",
};

let fixed = 0;
for (const t of tweaks) {
  if (validationCmds[t.id]) {
    t.validationCmd = validationCmds[t.id];
    fixed++;
  }
}

writeFileSync('./src/data/tweaks.json', JSON.stringify(tweaks, null, 2));
console.log(`Fixed ${fixed} tweaks`);
