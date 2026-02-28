import { readFileSync, writeFileSync } from 'fs';

const path = './src/data/tweaks.json';
const data = JSON.parse(readFileSync(path, 'utf8'));

const updates = {
    // NETWORK
    "DisableNetworkThrottling": {
        "expertDetails": "Modifies 'HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\NetworkThrottlingIndex' to FFFFFFFF. Normally, Windows throttles non-multimedia network traffic to 10 packets per millisecond to prioritize audio/video playback streams.",
        "interactions": "Resolves extreme ping spikes in games when another app (like Spotify or a browser tab) suddenly requests a buffer. No known downsides on modern multi-core CPUs."
    },
    "DisableNagle": {
        "expertDetails": "Sets 'TcpAckFrequency', 'TCPNoDelay', and 'TcpDelAckTicks' to 1 for all interfaces under 'HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces\\'. Nagle's algorithm buffers small packets to send them as a single larger payload, improving bandwidth efficiency but adding latency.",
        "interactions": "Critical for competitive gaming as it forces immediate transmission of movement/action packets. It slightly increases total packet overhead on your home router."
    },
    "OptimizeTCP": {
        "expertDetails": "Uses 'netsh int tcp set global' to apply comprehensive parameters: sets 'autotuninglevel' to normal, disables 'scalingheuristics', disables 'ecncapability', and sets 'timestamps' to disabled.",
        "interactions": "Disabling scalingheuristics ensures the TCP receive window isn't aggressively minimized by faulty router implementations. A bedrock baseline for network tuning."
    },
    "DisableDeliveryOptimization": {
        "expertDetails": "Translates to setting 'DODownloadMode' to 0 in 'HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DeliveryOptimization'. Stops your PC from uploading Windows Updates and Store apps to other PCs on your local network or the internet (P2P).",
        "interactions": "Saves massive amounts of upload bandwidth on home connections. You must reboot for this to apply cleanly to the DOsvc."
    },
    "ExpandEphemeralPorts": {
        "expertDetails": "Uses 'netsh int ipv4 set dynamicport tcp start=1025 num=64511'. Ephemeral ports are short-lived transport protocol ports. Expanding the default pool (which is often restricted to 16,384 ports) prevents port exhaustion during heavy torrenting, server loads, or extreme multitasking.",
        "interactions": "Only necessary if you regularly open thousands of concurrent connections. Safe baseline tweak."
    },
    "ReduceTCPTimedWaitDelay": {
        "expertDetails": "Sets 'TcpTimedWaitDelay' in 'HKLM\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters' to 30. Changes how long a closed TCP connection stays in the TIME_WAIT state before the socket is released back to the OS pool (from default 120s to 30s).",
        "interactions": "Prevents socket exhaustion if you rapidly connect/disconnect from dozens of IPs. Works perfectly alongside 'ExpandEphemeralPorts'."
    },
    "OptimizeDNSCache": {
        "expertDetails": "Increases 'MaxCacheTtl' (to 86400) and 'MaxNegativeCacheTtl' (to 0) in 'HKLM\\SYSTEM\\CurrentControlSet\\Services\\Dnscache\\Parameters'. Caches successful DNS queries for 24 hours and ignores negative (failed) queries entirely.",
        "interactions": "Speeds up initial connection to heavily visited websites by skipping the 15-30ms DNS resolution phase. Disabling negative cache prevents 'stuck' unresolvable domains."
    },
    "EnableRSS": {
        "expertDetails": "Uses 'netsh int tcp set global rss=enabled'. Receive-Side Scaling (RSS) allows the network adapter hardware to distribute inbound network processing across multiple CPU cores rather than slamming Core 0.",
        "interactions": "Relies entirely on your network adapter supporting RSS (most do). If disabled, high-bandwidth transfers will bottleneck on a single CPU thread."
    },
    "DisableTCPAutoTuning": {
        "expertDetails": "Modifies 'netsh int tcp set global autotuninglevel=disabled'. Restricts the TCP Receive Window to a flat 64KB instead of allowing it to scale dynamically up to 16MB.",
        "interactions": "Warning: Only use this if you are on an archaic connection (e.g. < 5 Mbps) or specific VPNs that misbehave. On modern fiber/cable connections, disabling auto-tuning crushes download speeds to 10-20% of their maximum."
    },
    "DisableNetBIOS": {
        "expertDetails": "Disables NetBIOS over TCP/IP in the WMI network adapter configuration. NetBIOS is a legacy broadcast protocol used for older networked file sharing.",
        "interactions": "Reduces network broadcast noise and closes an archaic local attack vector. Will break access to old NAS devices or Windows XP/7 shared folders."
    },
    "IncreaseIRPStackSize": {
        "expertDetails": "Modifies 'IRPStackSize' in 'HKLM\\System\\CurrentControlSet\\Services\\LanmanServer\\Parameters'. Allocates more memory stack for the local Server service to handle concurrent network file I/O commands.",
        "interactions": "Fixes 'Not enough server storage is available' errors when copying massive files over gigabit/10Gb LAN."
    },
    "EnableDNSOverHTTPS": {
        "expertDetails": "Configures Native Windows 11 DoH strictly via 'netsh dns add global auto'. Encrypts your DNS requests using HTTPS so your ISP cannot read or tamper with them.",
        "interactions": "Provides immense privacy. You MUST use a supported DNS provider (like Cloudflare, Quad9, Google) as your primary DNS for this to take effect."
    },
    "DisableIPv6": {
        "expertDetails": "Unbinds the IPv6 protocol component from all active network adapters using 'Disable-NetAdapterBinding'.",
        "interactions": "Breaks Xbox Live Teredo tunneling, HomeGroup (legacy), and some modern ISPs that use native IPv6 routing. Only applies if your router or VPN struggles with dual-stack leakage."
    },

    // DNS TWEAKS (All Network)
    "SetDNSCloudflare": { "expertDetails": "Sets primary DNS to 1.1.1.1 and secondary to 1.0.0.1. Directly interfaces with Cloudflare's massive global CDN network for the lowest latency possible.", "interactions": "Overrides your ISP's default DHCP-assigned DNS." },
    "SetDNSMullvad": { "expertDetails": "Sets DNS to 100.64.0.4. Uses Mullvad's privacy-focused, zero-logging DNS resolvers.", "interactions": "Overrides ISP DNS. Uncensored and strongly audited for privacy." },
    "SetDNSAdGuard": { "expertDetails": "Sets DNS to 94.140.14.14 and 94.140.15.15. Routes all requests through AdGuard's DNS-level sinkhole, dropping requests to known ad and tracking domains.", "interactions": "Provides system-wide ad blocking (even inside Metro apps) without needing a browser extension." },
    "SetDNSQuad9": { "expertDetails": "Sets DNS to 9.9.9.9 and 149.112.112.112. Quad9 cross-references queries against IBM X-Force threat intelligence to silently block malware/phishing domains at the DNS level.", "interactions": "Provides baseline system security against zero-day phishing links." },
    "SetDNSNextDNS": { "expertDetails": "Sets DNS to 45.90.28.0 and 45.90.30.0. NextDNS is a highly configurable cloud firewall.", "interactions": "Using the raw IPs provides basic filtering, but to get full customization (custom blocklists), you need their dedicated client or DoH profile." },
    "SetDNSOpenDNS": { "expertDetails": "Sets DNS to 208.67.222.222 and 208.67.220.220. A venerable, highly reliable DNS service operated by Cisco.", "interactions": "Faster than ISP DNS, includes basic anti-phishing." },
    "SetDNSControlD": { "expertDetails": "Sets DNS to 76.76.2.0 and 76.76.10.0.", "interactions": "A modern alternative to NextDNS/AdGuard with extremely fast anycast routing." },
    "SetDNSGoogle": { "expertDetails": "Sets DNS to 8.8.8.8 and 8.8.4.4. The most widespread public DNS.", "interactions": "Fastest sheer resolution time globally, but queries are logged by Google." },
    "ResetDNSDefault": { "expertDetails": "Removes manual DNS server assignments, reverting the adapter back to dynamic (DHCP) from your router.", "interactions": "Necessary to revert any connection issues caused by a custom DNS going offline." },

    // WINDOWS UI
    "ClassicContextMenu": {
        "expertDetails": "Creates an empty key at 'HKCU\\Software\\Classes\\CLSID\\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\\InprocServer32'. This overrides the COM object for the Windows 11 XAML context menu, forcing Explorer back to the legacy Win32 command bar system.",
        "interactions": "Eliminates the 'Show More Options' barrier in Windows 11. Requires an explorer.exe restart to take effect."
    },
    "ShowFileExtensions": {
        "expertDetails": "Changes 'HideFileExt' in 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' to 0. Forces Explorer to display the raw extension (e.g., .txt, .exe) instead of hiding it based on file association.",
        "interactions": "Crucial anti-malware step preventing 'document.pdf.exe' spoofing attacks."
    },
    "ShowHiddenFiles": {
        "expertDetails": "Changes 'Hidden' in 'Explorer\\Advanced' to 1. Forces the display of files and folders marked with the 'Hidden' file attribute.",
        "interactions": "Your user directory will now show 'AppData', and drives will show '$RECYCLE.BIN'."
    },
    "TaskbarAlignLeft": {
        "expertDetails": "Modifies 'Al' in 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced' to 0 (Left). Centers the Start button exactly like Windows 10.",
        "interactions": "Purely ergonomic. Does not affect the ability to use third party tools like StartAllBack, which heavily override this."
    },
    "VerboseStartup": {
        "expertDetails": "Adds 'VerboseStatus' (DWORD 1) to 'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System'. Replaces the spinning dots on boot/shutdown with highly detailed text explaining exactly what Windows is doing (e.g., 'Applying computer policy', 'Starting Group Policy Services').",
        "interactions": "Invaluable for troubleshooting slow boot times or stalled shutdown operations."
    },
    "ReduceMenuShowDelay": {
        "expertDetails": "Changes 'MenuShowDelay' in 'HKCU\\Control Panel\\Desktop' from the default 400ms down to 10ms. Modifies how long you have to hover over a cascaded menu (like 'Send To') before it springs open.",
        "interactions": "Makes navigating deeply nested folders or Start Menu folders feel blisteringly fast. Does not impact DWM animations."
    },
    "DisableAeroShake": {
        "expertDetails": "Disables 'DisallowShaking' in 'HKCU\\Software\\Policies\\Microsoft\\Windows\\Explorer'. Prevents Windows from automatically minimizing all other windows when you grab a title bar and 'shake' the mouse.",
        "interactions": "Prevents accidental mass-minimization during frantic mouse movements in windowed games or intense workflows."
    },
    "DisableLockScreen": {
        "expertDetails": "Sets 'NoLockScreen' (DWORD 1) in 'HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Personalization'. Entirely skips the graphical lock screen (the one showing the clock and wallpaper).",
        "interactions": "Takes you instantly from wake/boot to the password/PIN entry screen. Saves exactly one click/keypress every single time you wake the PC."
    },
    "EnableLastActiveClick": {
        "expertDetails": "Sets 'LastActiveClick' in 'Explorer\\Advanced' to 1. If you have multiple windows of the same app open (e.g., 3 Chrome windows), clicking the taskbar icon will immediately open the last active one instead of forcing you to choose from the thumbnail preview popup.",
        "interactions": "Massively improves taskbar multitasking ergonomics for power users."
    },
    "DisableNotificationCenter": {
        "expertDetails": "Enables 'DisableNotificationCenter' under Explorer policies. Completely nukes the Action Center sidebar and stops all toast notifications from rendering.",
        "interactions": "A draconian UI cleanup. You will miss USB plugin sounds, email toasts, and system warnings. Use with caution."
    },
    "RemoveExplorerHome": {
        "expertDetails": "Changes 'LaunchTo' to 1 (This PC) and removes the 'HomeFolder' Quick Access items. Booting File Explorer opens directly to your drives instead of a messy list of recent generic files.",
        "interactions": "Drastically cleans up the navigation pane. Restores legacy Windows 7/10 'My Computer' behavior."
    },
    "DisableActionCenter": {
        "expertDetails": "Duplicate or alias for 'DisableNotificationCenter'.", "interactions": "Same caveats apply."
    },

    // SECURITY
    "EnableFirewall": {
        "expertDetails": "Uses 'Set-NetFirewallProfile' to forcefully enable the Domain, Private, and Public firewall profiles.",
        "interactions": "May silently conflict with third-party antiviruses (like Kaspersky/Bitdefender) which prefer to manage the firewall themselves."
    },
    "DisableRemoteDesktop": {
        "expertDetails": "Sets 'fDenyTSConnections' to 1 in 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\Terminal Server'. Closes Port 3389 and disables the background listening service for RDP.",
        "interactions": "Closes a major remote-access attack vector. You will not be able to remote into this PC until reverted."
    },
    "DisableSMBv1": {
        "expertDetails": "Sets 'SMB1' to 0 in 'HKLM\\SYSTEM\\CurrentControlSet\\Services\\LanmanServer\\Parameters' and uninstalls the 'FS-SMB1' optional feature.",
        "interactions": "Closes the attack vector used by WannaCry ransomware. Do not revert this unless accessing a 20-year-old network drive."
    },
    "DisableWindowsScriptHost": {
        "expertDetails": "Sets 'Enabled' to 0 in 'HKLM\\SOFTWARE\\Microsoft\\Windows Script Host\\Settings'. Prevents execution of .vbs and .js files natively by wscript.exe or cscript.exe.",
        "interactions": "An excellent defense against email phishing payloads. May break very old legacy login scripts in enterprise active directories."
    },
    "DisableAutoplay": {
        "expertDetails": "Sets 'NoDriveTypeAutoRun' to 255 (FF). Completely disables Windows from automatically executing 'autorun.inf' or prompting what to do when inserting a USB drive or CD.",
        "interactions": "Prevents automated malware infections (BadUSB/Autorun worms) from executing merely by plugging in a flash drive."
    },
    "DisableSpectreMitigations": {
        "expertDetails": "Modifies 'FeatureSettingsOverride' to 3 and 'FeatureSettingsOverrideMask' to 3. Disables the Retpoline and kernel-page-table isolation (KPTI) patches for hardware-level CPU exploits (Meltdown/Spectre).",
        "interactions": "Increases I/O and syscall performance heavily on older Intel architectures (Haswell/Skylake). Extremely dangerous if you run untrusted virtual machines or execute random JavaScript."
    },
    "DisableDefenderSampleSubmission": {
        "expertDetails": "Sets 'SubmitSamplesConsent' to 2 (Never Send) in 'HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows Defender\\Spynet'.",
        "interactions": "Prevents Defender from uploading unknown executing files directly from your SSD to Microsoft servers for cloud analysis."
    },
    "DisableSmartScreen": {
        "expertDetails": "Sets 'EnableSmartScreen' to 0 and 'SmartScreenEnabled' to 'Off' across Explorer and Edge paradigms.",
        "interactions": "Stops Windows from sending hashes of every downloaded executable to Microsoft for reputation checking. Removes the \"Windows protected your PC\" blue popup."
    },
    "ClearPageFileShutdown": {
        "expertDetails": "Modifies 'ClearPageFileAtShutdown' to 1 in the Session Manager\\Memory Management. Forces Windows to securely overwrite the pagefile.sys with zeros on shutdown.",
        "interactions": "Increases shutdown times drastically (can take minutes on a slow HDD), but ensures extracted passwords or encryption keys aren't left behind in the swap on cold rest."
    },
    "DisableWPBT": {
        "expertDetails": "Sets 'DisableWpbtExecution' to 1 in 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager'. Windows Platform Binary Table allows OEM BIOS firmware (like Lenovo/Dell) to auto-inject bloatware into the OS on every boot, even on a clean install.",
        "interactions": "A brilliant defense against persistent OEM bloatware like 'Lenovo Vantage' silently resurrecting itself."
    },
    "DisableStickyKeys": {
        "expertDetails": "Overrides 'Flags' under 'HKCU\\Control Panel\\Accessibility\\StickyKeys'. Turns off the atrocious shortcut that interrupts games when mashing the SHIFT key 5 times.",
        "interactions": "Critical for gaming. Has zero negative impact unless you legitimately require single-finger modifier key sequences."
    },
    "EnableEndTaskTaskbar": {
        "expertDetails": "A Windows 11 23H2+ exclusive. Sets 'TaskbarEndTask' to 1 in DeveloperSettings. Adds a native 'End Task' button when right-clicking any app icon on the taskbar.",
        "interactions": "Allows instantly force-killing a hung application (SIGKILL) without needing to ever open Task Manager."
    },

    // WINDOWS UPDATE
    "DisableAutoRestart": {
        "expertDetails": "Sets 'NoAutoRebootWithLoggedOnUsers' to 1. Prevents Windows Update from forcibly restarting your PC overnight or while you are rendering a video.",
        "interactions": "You must remember to manually restart your PC after updates install, or they will stay pending."
    },
    "DisableDriverUpdates": {
        "expertDetails": "Sets 'ExcludeWUDriversInQualityUpdate' to 1. Strongly instructs Windows Update to never automatically download and overwrite your cleanly installed GPU, Audio, or Chipset drivers.",
        "interactions": "Essential for gamers to prevent Windows from randomly overwriting a stable proprietary NVIDIA/AMD driver with a broken DCH baseline driver."
    },
    "PauseUpdates35Days": {
        "expertDetails": "Writes a futuristic date into 'PauseUpdatesExpiryTime'. Instantly pauses all Windows Update activity for roughly 35 days, bypassing the restrictive 7-day GUI limit.",
        "interactions": "You will miss out on zero-day security patches. Must be clicked again every month, or updates will resume with a vengeance."
    },
    "SecurityOnlyUpdates": {
        "expertDetails": "Sets 'BranchReadinessLevel' and 'DeferFeatureUpdatesPeriodInDays' via advanced Windows Update group policies. Forces the system to only ingest critical security fixes (Quality Updates) while delaying UI/Feature bloated updates by 365 days.",
        "interactions": "The golden standard for operational stability. Keeps you safe without forcing new broken features down your throat."
    },

    // TOOLS
    "ClearTempFiles": {
        "expertDetails": "Executes 'Remove-Item -Path $env:TEMP\\* -Recurse -Force' and targets 'C:\\Windows\\Temp\\*'. Unlocks and purges stranded installation residue and orphaned application caches.",
        "interactions": "Painless and essential. Will fail silently on files currently locked by open processes, which is the intended safe behavior."
    },
    "FlushDNS": {
        "expertDetails": "Runs 'Clear-DnsClientCache'. Immediately voids the local DNS resolver cache, forcing the OS to perform a fresh lookup on the next web request.",
        "interactions": "Required instantly after swapping DNS providers or attempting to bypass a stale localization node."
    },
    "ResetNetworkStack": {
        "expertDetails": "Calls 'netsh winsock reset' and 'netsh int ip reset'. Wipes the layered service providers (LSPs) and TCP/IP routing tables back to factory fresh states.",
        "interactions": "Extremely powerful. Fixes 99% of inexplicable 'No Internet Connection' bugs. You MUST restart your PC immediately after running this."
    },
    "RepairSystemFiles": {
        "expertDetails": "Executes 'DISM /Online /Cleanup-Image /RestoreHealth' followed cleanly by 'sfc /scannow'. Connects to Windows Update to download uncorrupted versions of core system files and violently overwrites damaged local caches.",
        "interactions": "Takes 5-20 minutes depending on SSD speed. Best run whenever experiencing random application crashes or blue screens."
    },
    "SetUTCTime": {
        "expertDetails": "Sets 'RealTimeIsUniversal' (DWORD 1) in 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\TimeZoneInformation'. Forces Windows to treat the motherboard hardware clock (RTC) as pure UTC instead of local time.",
        "interactions": "The absolute cure-all for time synchronization bugs when dual-booting Windows and Linux (Ubuntu/Arch)."
    },
    "EnableStorageSense": {
        "expertDetails": "Enables the 'StoragePolicy' keys to automatically run Storage Sense. Instructs Windows to silently clean up recycle bin files older than 30 days and purge the downloads folder dynamically.",
        "interactions": "A set-and-forget maintenance routine. Can be disastrous if you treat your Downloads folder as a permanent archive."
    },
    "CleanComponentStore": {
        "expertDetails": "Runs 'DISM.exe /Online /Cleanup-Image /StartComponentCleanup /ResetBase'. Brutally compresses the WinSxS folder by deleting superseded versions of Windows Updates and permanently baking in the current updates.",
        "interactions": "Frees up to 5-10GB of SSD space space instantly. The huge downside is that you can NEVER uninstall current Windows Updates once this processes—they become permanent."
    },
    "FlushDNSCache": {
        "expertDetails": "Duplicate alias for FlushDNS.", "interactions": "Same as FlushDNS."
    },
    "ResetWinsock": {
        "expertDetails": "Duplicate alias handling network resets.", "interactions": "Requires a reboot."
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
console.log('Modified', modified, 'tweaks in batch 3.');
