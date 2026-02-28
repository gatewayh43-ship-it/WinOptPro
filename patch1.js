import { readFileSync, writeFileSync } from 'fs';

const path = './src/data/tweaks.json';
const data = JSON.parse(readFileSync(path, 'utf8'));

const updates = {
    // PERFORMANCE
    "DisableSysMain": {
        "expertDetails": "Disables the 'SysMain' (formerly SuperFetch) service, which preloads frequently used applications into RAM. Exact modification: 'Set-Service -Name SysMain -StartupType Disabled'. While this frees up RAM and reduces disk I/O on older HDDs, on modern NVMe SSDs the performance gain is negligible, and disabling it can actually increase application launch times as they must be read directly from the disk every time.",
        "interactions": "Conflicts with 'Optimize Prefetcher for SSD' if Prefetch is completely disabled. Redundant if you already have extreme RAM constraints where Windows handles paging."
    },
    "DisableSearchIndexer": {
        "expertDetails": "Stops and disables the 'WSearch' service. This service continuously indexes files, emails, and other content for instant search queries within Windows Explorer and the Start Menu. Disabling it halts background CPU and disk usage significantly, but reduces Windows Search to a slow, real-time file crawl.",
        "interactions": "Interacts favorably with 'SetServicesManual'. If you rely on Start Menu search, disabling this will break instant results for local files."
    },
    "DisableDefragSchedule": {
        "expertDetails": "Disables the 'ScheduledDefrag' task in Task Scheduler ('\\Microsoft\\Windows\\Defrag'). Windows periodically runs this to optimize drives (TRIM for SSDs, defrag for HDDs). Disabling it prevents background disk activity, but requires you to manually run the 'Optimize Drives' utility to maintain SSD health and performance (TRIM).",
        "interactions": "Can negatively impact long-term SSD performance unless you manually run TRIM or use third-party optimization tools."
    },
    "VisualEffectsPerformance": {
        "expertDetails": "Modifies 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VisualEffects' (VisualFXSetting=2) and disables specific UI animations in 'HKCU\\Control Panel\\Desktop' (e.g., UserPreferencesMask). This reduces overhead on the DWM (Desktop Window Manager) and GPU by disabling window shadows, smooth scrolling, and transparency.",
        "interactions": "Overrides individual UI tweaks like 'Reduce Menu Animation Delay' as it applies a blanket performance profile."
    },
    "DisableStartupDelay": {
        "expertDetails": "Creates or modifies 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Serialize' -> 'StartupDelayInMSec' to 0. By default, Windows delays the launch of startup apps by ~10 seconds to prioritize loading the Desktop and core services. Setting this to 0 forces all startup apps to launch immediately.",
        "interactions": "May cause the desktop to feel unresponsive immediately after login if you have many startup apps enabled. Pairs well with 'Clean Temporary Files' and debloat tweaks."
    },
    "DisableLastAccessTimestamp": {
        "expertDetails": "Executes 'fsutil behavior set disablelastaccess 1'. This stops the NTFS file system from updating the 'Last Accessed' timestamp attribute of files and directories every time they are opened. This reduces micro-writes to the storage drive, slightly improving I/O performance and increasing SSD lifespan.",
        "interactions": "Generally safe, but may break specific forensic or backup tools that rely on the 'Last Accessed' metadata to determine file usage."
    },
    "Disable8dot3Naming": {
        "expertDetails": "Executes 'fsutil behavior set disable8dot3 1'. Disables the legacy NTFS feature that automatically generates 8.3 character (DOS-compatible) short names for all long file names. This significantly speeds up directory enumeration in folders with thousands of files.",
        "interactions": "Breaking risk: 16-bit applications or extremely old enterprise software hardcoded to use MS-DOS paths (like 'PROGRA~1') will fail."
    },
    "DisablePrintSpooler": {
        "expertDetails": "Disables the 'Spooler' service. It is responsible for managing print jobs, loading printer drivers, and handling the print queue. Disabling it frees up a small amount of RAM and closes common attack vectors (like PrintNightmare).",
        "interactions": "Prevents all printing, including PDF printers ('Print to PDF'). Must be reverted if you ever need to connect a physical or virtual printer."
    },
    "DisableFaxService": {
        "expertDetails": "Disables the 'Fax' service. This legacy component allows the computer to send and receive faxes. It runs silently in the background but offers zero value to modern users.",
        "interactions": "Completely isolated tweak. No negative interactions unless you are using a physical fax modem."
    },
    "Win32PrioritySeparation": {
        "expertDetails": "Modifies 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl\\Win32PrioritySeparation' to hex 26 (38 decimal). This adjusts the thread quantum (time slice) allocation, giving shorter, variable time slices prioritizing the foreground application (the active window).",
        "interactions": "Highly beneficial for gaming ('GamePriority') and desktop responsiveness, but can slightly reduce the efficiency of heavy background rendering or encoding tasks."
    },
    "SpeedUpShutdown": {
        "expertDetails": "Modifies 'WaitToKillServiceTimeout' in 'HKLM\\SYSTEM\\CurrentControlSet\\Control' to heavily reduce the time (from 5000ms to 2000ms) Windows waits for services to close gracefully before force-killing them during shutdown.",
        "interactions": "Can cause data loss if background applications (like database servers or disk write caches) are forcibly terminated before they finish saving state."
    },
    "SetServicesManual": {
        "expertDetails": "Changes the startup type from 'Automatic' to 'Manual' for several non-critical background services (e.g., edgeupdate, MapsBroker). This means they will only start when explicitly called by Windows or an application, rather than idling in the background constantly.",
        "interactions": "A safe middle-ground compared to forcefully 'Disabling' services. Ensures features work when needed but saves RAM on boot."
    },
    "DisableExplorerFolderDiscovery": {
        "expertDetails": "Modifies 'HKCU\\Software\\Classes\\Local Settings\\Software\\Microsoft\\Windows\\Shell\\Bags\\AllFolders\\Shell' to set 'FolderType' to 'NotSpecified'. This stops Windows Explorer from automatically scanning folder contents (like pictures or videos) to determine the view layout, speeding up folder navigation.",
        "interactions": "Removes automatic thumbnail or media layout views for media folders. You will need to manually set the view type if you want large icons."
    },

    // GAMING
    "SystemResponsiveness": {
        "expertDetails": "Modifies 'HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\SystemResponsiveness'. Default is 20 (meaning 20% of CPU is reserved for low-priority background tasks). Setting it to 0 or 10 gives multimedia and gaming tasks 100% access to CPU cycles.",
        "interactions": "Works synergistically with 'MMCSSPriority' and 'GamePriority'. Essential for high-refresh-rate gaming to eliminate micro-stutters."
    },
    "GamePriority": {
        "expertDetails": "Adds specific registry entries to 'HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games' to configure GPU Priority to 8, Priority to 6, and Scheduling Category to 'High'. This elevates the class priority of registered games under MMCSS.",
        "interactions": "Enhances 'DisableFSO' by ensuring the full-screen game thread is not preempted by background OS telemetry or browser threads."
    },
    "DisableFSO": {
        "expertDetails": "Modifies 'HKCU\\System\\GameConfigStore\\GameDVR_FSEBehaviorMode' to 2. Disables Full-Screen Optimizations, a hybrid mode introduced in Win10 where exclusive fullscreen games are rendered as borderless windowed to allow Xbox Game Bar overlays. Disabling it restores true Exclusive Fullscreen.",
        "interactions": "Drastically reduces input lag in older APIs (DX9/11). Interacts with 'DisableGameDVR' to fully remove the Microsoft overlay stack."
    },
    "DisableGameDVR": {
        "expertDetails": "Sets 'AppCaptureEnabled' (in GameConfigStore) to 0, completely disabling the Xbox Game Bar's background recording (shadowplay equivalent). This halts the constant frame-buffer copying that inherently costs 2-5% GPU performance.",
        "interactions": "Redundant if Xbox features are entirely uninstalled via the Debloat tweaks. Required for 'DisableFSO' to function immaculately."
    },
    "DisableHPET": {
        "expertDetails": "Uses 'bcdedit /deletevalue useplatformclock' and '/set disabledynamictick yes'. Disables the High Precision Event Timer at the OS level, forcing Windows to use the invariant TSC (Time Stamp Counter). HPET reads require expensive DPC hardware polling, causing stutters.",
        "interactions": "Can cause system timing drift on very old platforms (Core 2 Duo era). On modern Ryzen/Core systems, disabling HPET significantly improves 1% low framerates."
    },
    "MouseAccelOff": {
        "expertDetails": "Regedit 'HKCU\\Control Panel\\Mouse\\MouseSpeed' = 0 and sets the exact curve array 'SmoothMouseXCurve'/'SmoothMouseYCurve' to linear 1:1 maps. Bypasses the 'Enhance Pointer Precision' algorithm that dynamically scales cursor speed based on physical mouse velocity.",
        "interactions": "Critical for raw input in older games. Modern games using Raw Input API bypass this entirely, making the tweak mostly for desktop/legacy parity."
    },
    "EnableHWGPUScheduling": {
        "expertDetails": "Modifies 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers\\HwSchMode' = 2. Offloads high-frequency graphics scheduling from the CPU to a dedicated hardware processor on the GPU. Reduces CPU overhead in heavily draw-call bound scenarios.",
        "interactions": "Requires a reboot and WDDM 2.7+ capable drivers. Can cause stability issues or VR stuttering on specific NVIDIA/AMD driver revisions."
    },
    "DisablePowerThrottling": {
        "expertDetails": "Sets 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\Power\\PowerThrottling\\PowerThrottlingOff' = 1. Prevents Windows 10/11 from aggressively putting background processes into EcoQoS (Efficiency mode), which limits them to E-cores or lowers their clock speed.",
        "interactions": "Increases battery drain on laptops significantly. Counteracts the OS scheduler's attempt to isolate intensive games from background polling."
    },
    "CSRSSHighPriority": {
        "expertDetails": "Changes the CPUPriorityClass of the Client Server Runtime Process (csrss.exe) from normal to High via 'HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Image File Execution Options\\csrss.exe'. This prioritizes hardware interrupt and Win32 subsystem handling.",
        "interactions": "Can slightly decrease input latency. Incorrectly setting this to 'Realtime' (Hex 3) instead of 'High' (Hex 4) would cause catastrophic system freezes."
    },
    "DisableGameMode": {
        "expertDetails": "Disables Windows 'Game Mode' ('HKCU\\Software\\Microsoft\\GameBar\\AllowAutoGameMode'). Historically, Game Mode caused massive stuttering by overly aggressively locking out background processes (like OBS or Discord).",
        "interactions": "In newer Windows 11 builds, Game Mode is generally stable and beneficial. Disabling it is now mostly for troubleshooting encoder streams (e.g. OBS NVENC dropframes)."
    },
    "OptimizePrefetcherSSD": {
        "expertDetails": "Modifies 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management\\PrefetchParameters\\EnablePrefetcher' to 1 or 0 (disabling it). Wait, typically for SSDs, Prefetch is disabled or reduced (set to 1 for App launch, 3 is default). Reduces sequential disk caching.",
        "interactions": "If 'DisableSysMain' is used, this tweak is technically obsolete since SysMain controls the Prefetcher service engine."
    },
    "LargeSystemCache": {
        "expertDetails": "Modifies 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management\\LargeSystemCache' to 1. Forces Windows to allocate a massive chunk of RAM (up to 1 TB) for the file system cache, reducing disk reads.",
        "interactions": "Highly detrimental on systems with < 16GB RAM as it starves active applications of physical memory, forcing them into the pagefile. Excellent for dedicated storage servers."
    },
    "DisableAdapterPowerSaving": {
        "expertDetails": "Iterates through network adapters in WMI/CIM and disables 'PnPCapabilities' (Allow the computer to turn off this device). Prevents the network card from sleeping during brief periods of inactivity.",
        "interactions": "Fixes connection drops in competitive multiplayer games running on restrictive laptop power plans. Increases power draw."
    },
    "MMCSSPriority": {
        "expertDetails": "Refines the Multimedia Class Scheduler Service ('HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile'). Adjusts 'NetworkThrottlingIndex' to FFFFFFFF and 'SystemResponsiveness' to 0.",
        "interactions": "A superset of 'SystemResponsiveness'. Works alongside 'Optimize TCP/IP Stack' to prevent packet throttling during high-bandwidth media playback or gaming."
    },
    "DisableXboxGameMonitoring": {
        "expertDetails": "Disables the 'xbgm' service. This service monitors the execution of games and hooks into them to provide Xbox Live presence and Game Bar metrics.",
        "interactions": "Breaks Xbox achievements, Game Pass verification, and Xbox friend invites. Essential to completely detaching Xbox telemetry from Win32 games."
    },
    "DisableMemoryIntegrity": {
        "expertDetails": "Disables Hypervisor-protected Code Integrity (HVCI) via 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\DeviceGuard\\Scenarios\\HypervisorEnforcedCodeIntegrity'. This feature uses virtualization to protect the kernel, but introduces severe virtualization overhead during gaming cache misses.",
        "interactions": "Disabling it can improve CPU-bound 1% lows by 5-15%, but significantly reduces security against sophisticated kernel-level rootkits (and some anti-cheat systems)."
    },
    "EnableGPUMSIMode": {
        "expertDetails": "Modifies individual PCI registry keys under 'HKLM\\SYSTEM\\CurrentControlSet\\Enum\\PCI' to enable Message Signaled Interrupts (MSI) for the GPU. Replaces legacy Line-Based IRQ sharing, allowing the GPU to send interrupt signals without polling wait times.",
        "interactions": "Solves DPC Latency spikes (dxgkrnl.sys). If a GPU driver doesn't support MSI natively, forcing this will cause a BSOD loop on boot."
    },
    "DisableMultiplaneOverlay": {
        "expertDetails": "Adds 'OverlayTestMode' DWORD (Value 5) to 'HKLM\\SOFTWARE\\Microsoft\\Windows\\Dwm'. Disables MPO, a feature that allows the GPU composer to bypass the DWM for windowed video/gaming.",
        "interactions": "Fixes severe black screen flickering, alt-tab stuttering, and cursor trails on specific NVIDIA RTX / AMD RX GPU drivers."
    },

    // POWER
    "DisableCoreParking": {
        "expertDetails": "Modifies the ACPI power-management profile in 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\Power\\PowerSettings\\...\\ValueMax' for Core Parking algorithms. Forces Windows to never put logical CPU cores into a deep C-state sleep.",
        "interactions": "Massively increases idle temperatures and power consumption. Eliminates completely the microsecond delay caused by waking up a parked core."
    },
    "UltimatePowerPlan": {
        "expertDetails": "Executes 'powercfg -duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61'. Enables an obscured Microsoft Enterprise power plan that hides all power-saving heuristics, disables link state management, and sets CPU minimum state to 100%.",
        "interactions": "Overrides 'DisableCoreParking' entirely, as the Ultimate plan natively sets the parking index to 0%. Terribly destructive to laptop battery life."
    },
    "DisableHibernation": {
        "expertDetails": "Runs 'powercfg.exe /hibernate off'. Deletes the 'hiberfil.sys' file from the root of the C: drive. Disables the ability for the OS to dump RAM contents to disk to enter S4 sleep state.",
        "interactions": "Instantly recovers physical disk space equal to 40-75% of your total RAM capacity. Also disables Fast Startup ('DisableFastStartup')."
    },
    "DisableConnectedStandby": {
        "expertDetails": "Modifies 'HKLM\\System\\CurrentControlSet\\Control\\Power\\CsEnabled' to 0 (or 'PlatformAoAcOverride' to 0 in Win11). Disables Modern Standby (S0ix), forcing the computer back to legacy S3 sleep where power is physically cut to the CPU.",
        "interactions": "Fixes issues where laptops drain completely in a backpack and overheat because they were downloading Windows Updates while 'asleep'."
    },
    "DisableFastStartup": {
        "expertDetails": "Modifies 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power\\HiberbootEnabled' to 0. Fast Startup uses a hybrid logoff/hibernate sequence to boot faster. Disabling it ensures a 'True' shutdown, clearing full kernel memory and driver states.",
        "interactions": "Increases cold boot time by ~2-5 seconds on SSDs, but resolves 99% of 'uptime'-related memory leaks and driver desync issues."
    },
    "DisableUSBSelectiveSuspend": {
        "expertDetails": "Modifies 'powercfg' specific index keys for the USB profile. Disables the mechanism where the USB hub driver selectively cuts power to individual USB ports when devices are 'idle'.",
        "interactions": "Fixes USB audio DAC popping, mouse sensor polling rate drops, and VR headset disconnections caused by aggressive power gating."
    },
    "DisablePCIeLinkStatePM": {
        "expertDetails": "Modifies Active State Power Management (ASPM) for the PCI Express bus via 'powercfg'. Changes the link state from 'Maximum power savings' to 'Off'.",
        "interactions": "Crucial for preventing NVMe SSDs and discrete GPUs from dropping PCIe gen bandwidth during low loads, which strictly reduces latency spikes."
    },
    "EnableAggressiveCPUBoost": {
        "expertDetails": "Modifies powercfg PROCFREQ attributes (PerfBoostMode) to 'Aggressive'. Forces the CPU governor to respond instantly to any workload spike by raising P-state voltage/clocks.",
        "interactions": "Mainly applicable to Ryzen CPUs (CPPC2). Can cause fan RPM spikes ('yo-yo' acoustics) as temperature fluctuates violently with minimal loads."
    },
    "DisableAdaptiveBrightness": {
        "expertDetails": "Modifies display power configuration settings. Disables Intel DPST / AMD Vari-Bright via registry or powercfg commands, which dynamically lowers screen brightness based on the dark/light content of the currently rendered frames.",
        "interactions": "Restores accurate color rendering and prevents annoying brightness flickering, at the cost of slight battery drain."
    },
    "SetMinCPUState100": {
        "expertDetails": "Executes 'powercfg -setacvalueindex SCHEME_CURRENT SUB_PROCESSOR PROCTHROTTLEMIN 100'. Forces the CPU to permanently run at its base/boost clock, never downclocking to idle frequencies (e.g. 800MHz).",
        "interactions": "Causes extremely high idle temperatures. Provides zero discernible performance gain over the standard 'High Performance' plan which already ramps effectively."
    },
    "UltimatePerformancePlan": {
        "expertDetails": "Duplicate of UltimatePowerPlan (e9a42b02-d5df-448d-aa00-03f14749eb61). Enables Microsoft's Enterprise power profile.",
        "interactions": "Overwrites existing Active power plan. Highly recommended to use this instead of manually hacking individual Powercfg PROCFREQ flags."
    }
};

let modified = 0;
data.forEach(t => {
    if (updates[t.id]) {
        if (!t.educationalContext) t.educationalContext = {};
        t.educationalContext.expertDetails = updates[t.id].expertDetails;
        t.educationalContext.interactions = updates[t.id].interactions;
        modified++;
    }
});

writeFileSync(path, JSON.stringify(data, null, 4));
console.log('Modified', modified, 'tweaks in batch 1.');
