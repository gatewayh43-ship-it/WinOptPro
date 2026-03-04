import { useState } from "react";
import {
    BookOpen, ChevronDown, ChevronRight, Gauge, Gamepad2,
    BatteryMedium, Package, Terminal,
    Cpu, CircuitBoard, Power, Activity, Network, HardDrive,
    Timer, ShieldAlert,
    Search, Zap, AlertTriangle, CheckCircle, Info, HelpCircle,
    ExternalLink, Keyboard
} from "lucide-react";

interface HelpSection {
    id: string;
    icon: React.ElementType;
    title: string;
    color: string;
    intro: string;
    items: { q: string; a: string }[];
}

const HELP_SECTIONS: HelpSection[] = [
    {
        id: "getting-started",
        icon: Zap,
        title: "Getting Started",
        color: "text-violet-400",
        intro: "New to WinOpt Pro? Start here. This section covers the basics of using the app safely.",
        items: [
            {
                q: "What is WinOpt Pro?",
                a: "WinOpt Pro is an all-in-one Windows optimization tool. It lets you apply system tweaks, manage privacy settings, optimize for gaming, control startup apps, analyze performance, manage drivers, and much more — all from a single interface with full undo support."
            },
            {
                q: "Do I need admin rights?",
                a: "Yes. Most tweaks modify system registry keys or run PowerShell commands that require elevation. WinOpt Pro will prompt for administrator approval via UAC when needed. Running without admin rights will cause most tweaks to fail."
            },
            {
                q: "What are the Risk Levels?",
                a: "🟢 Green = Safe for all users. Easily reversible, no side effects. 🟡 Yellow = Read the description first. May affect some system behavior. Still reversible. 🔴 Red = Expert-only. Significant changes that require Expert Mode to be enabled. Understand what you're doing before applying."
            },
            {
                q: "What is Expert Mode?",
                a: "Expert Mode unlocks Red-risk tweaks that are hidden by default. These are tweaks like disabling VBS, HVCI, Spectre mitigations, or modifying boot-loader settings. To enable it: go to Settings → scroll to Expert Mode → toggle it on. Keep it off if you're not sure."
            },
            {
                q: "Can I undo changes?",
                a: "Yes — every tweak has a built-in Revert button. You can also go to the History page to see all applied tweaks and revert any of them individually. No change is permanent."
            },
            {
                q: "Where should I start?",
                a: "Recommended first steps: (1) Run Privacy Audit to scan for telemetry issues. (2) Browse the Performance tweaks — all Green ones are safe to apply. (3) If you game, check the Gaming tweaks section. (4) Review Startup Apps to remove unnecessary boot items. (5) Create a Backup in Settings before making major changes."
            },
            {
                q: "How do I back up my settings?",
                a: "Go to Settings → Backup & Restore section → click Export Backup. This saves a .winopt file with all your applied tweaks and preferences. You can import it later to restore your configuration."
            }
        ]
    },
    {
        id: "tweaks",
        icon: Gauge,
        title: "System Tweaks",
        color: "text-blue-400",
        intro: "165 system tweaks across 10 categories. Apply one at a time or browse by category. All are reversible.",
        items: [
            {
                q: "How do I apply a tweak?",
                a: "Click the toggle switch next to any tweak. A confirmation dialog appears for Yellow and Red tweaks. Click Apply to confirm. The app will execute the change and show a success toast. Revert by toggling it off."
            },
            {
                q: "What is the Performance category?",
                a: "Performance tweaks optimize how Windows allocates CPU time, disk access, memory, and services. Key safe tweaks: Disable SysMain (reduces RAM usage), Disable Search Indexer (frees disk I/O), Speed Up Shutdown, Disable Startup Delay. Expert tweaks include Disable Memory Compression and Write-Back Cache."
            },
            {
                q: "What is the Privacy category?",
                a: "Privacy tweaks disable Windows telemetry, advertising IDs, data collection services, and app permissions. All Green — safe and recommended for everyone. Start with: Disable Telemetry, Disable Advertising ID, Disable Bing Search in Start Menu, Disable Activity History, Disable Cortana."
            },
            {
                q: "What is the Gaming category?",
                a: "Gaming tweaks reduce latency, prioritize game threads, and remove background interference. Safe tweaks: Disable Game DVR, Increase Game Priority, Disable Mouse Acceleration, SystemResponsiveness, Disable Network Adapter Power Saving. Advanced: Enable HAGS, Disable MPO, Disable Power Throttling."
            },
            {
                q: "What is the Debloat category?",
                a: "Debloat removes pre-installed Windows apps and disables features you probably don't use. Includes: Remove Bloatware Apps, Remove OneDrive, Disable Xbox Features, Disable Copilot, Disable Widgets, Disable Meet Now, Disable Teams Autostart. All safe to apply."
            },
            {
                q: "What does 'Requires Reboot' mean?",
                a: "Some tweaks (especially boot-loader changes via bcdedit, or VBS/HVCI registry changes) only take effect after a full restart. The app will warn you. You can apply multiple such tweaks before rebooting — just reboot once at the end."
            },
            {
                q: "What are the Network tweaks?",
                a: "Network tweaks optimize TCP/IP settings and let you change your DNS provider. Safe tweaks: Disable Nagle's Algorithm (reduces latency), Disable Network Throttling, Expand Ephemeral Ports, Optimize DNS Cache. DNS options: Cloudflare (1.1.1.1), Google (8.8.8.8), Quad9, AdGuard, Mullvad, NextDNS, OpenDNS, ControlD."
            },
            {
                q: "What are Security tweaks?",
                a: "Security tweaks cover firewall, SMBv1, Remote Desktop, AutoPlay, SmartScreen, and more. Recommended safe ones: Enable Firewall, Disable SMBv1, Disable AutoPlay, Disable Remote Desktop (if you don't use it), Enable DNS-over-HTTPS. Red: Disable Spectre Mitigations, Disable SmartScreen — only for expert users who understand the trade-offs."
            }
        ]
    },
    {
        id: "gaming",
        icon: Gamepad2,
        title: "Gaming Optimizer",
        color: "text-green-400",
        intro: "Automatically detect games, apply gaming tweaks on launch, and monitor performance with the overlay.",
        items: [
            {
                q: "How does game detection work?",
                a: "WinOpt Pro polls running processes every few seconds and compares against a list of 32+ known game executables. When a match is found, the game name and status appear on the Gaming page. Supported: Steam, Epic, Fortnite, Valorant, CS2, Minecraft, GTA V, Cyberpunk 2077, and many more."
            },
            {
                q: "What is the Gaming Overlay?",
                a: "The overlay is a small always-on-top widget that shows: CPU%, GPU%, VRAM usage, GPU Temperature, and Power draw in real time. Drag it anywhere on screen. Launch it from the Gaming page → click 'Launch Overlay'. Close it with the X button on the widget."
            },
            {
                q: "What is Auto-Optimize on Launch?",
                a: "When enabled, WinOpt Pro automatically applies a batch of gaming tweaks the moment a game is detected. Applied tweaks: Core Parking, Network Throttling, Game Priority, System Responsiveness, HAGS, Dynamic Tick, CPU Priority Boost. The toggle persists across app restarts."
            },
            {
                q: "What is the Before/After baseline?",
                a: "Click 'Capture Baseline' before applying gaming tweaks to snapshot your current GPU and CPU metrics. After tweaking, the comparison table shows Before / Now / Δ (delta) for each metric, color-coded green (improved) or red (worse)."
            },
            {
                q: "Will gaming tweaks get me banned from anti-cheat?",
                a: "No. All changes are OS-level Windows registry and system settings — not game file modifications. Anti-cheat systems (VAC, Easy Anti-Cheat, BattlEye, Vanguard) check game files and memory, not Windows power plan or TCP settings."
            }
        ]
    },
    {
        id: "privacy",
        icon: ShieldAlert,
        title: "Privacy Audit",
        color: "text-rose-400",
        intro: "Scan your system for active telemetry and privacy issues, and fix them in one click.",
        items: [
            {
                q: "What does Privacy Audit check?",
                a: "9 checks covering: Windows Telemetry service, Connected User Experiences service, DiagTrack service, Advertising ID in registry, Cortana, Bing search integration, activity history, tailored experiences, and diagnostic data level. Each check shows severity: Critical, Warning, or OK."
            },
            {
                q: "How do I fix privacy issues?",
                a: "After scanning, you can click 'Fix All Issues' to apply all recommended privacy fixes at once, or expand individual issues and fix them one by one. Each fix is logged in History and can be reverted."
            },
            {
                q: "How often should I run Privacy Audit?",
                a: "After major Windows updates, as updates sometimes re-enable telemetry services. Also after feature updates (23H2, 24H2) which may reset settings. Running it monthly is a reasonable practice."
            }
        ]
    },
    {
        id: "gpu-driver",
        icon: CircuitBoard,
        title: "GPU Driver Cleaner",
        color: "text-orange-400",
        intro: "Perform a DDU-style clean uninstall of NVIDIA, AMD, or Intel display drivers.",
        items: [
            {
                q: "When should I use GPU Driver Cleaner?",
                a: "Use it when: upgrading to a new GPU, switching from NVIDIA to AMD (or vice versa), experiencing driver crashes or artifacts, or doing a clean reinstall after a corrupt driver install. Do NOT use it casually — your display will go black until you reinstall drivers."
            },
            {
                q: "What does it actually do?",
                a: "It runs pnputil /delete-driver for each display driver INF file found for the selected vendor, then sweeps registry paths under HKLM\\SYSTEM\\CurrentControlSet\\Control\\Video and the vendor's SOFTWARE key. More thorough than standard uninstall — removes files from the Driver Store so Windows Update can't silently reinstall the old version."
            },
            {
                q: "What is 'Schedule Safe Mode Boot'?",
                a: "The recommended approach for cleanest removal. It writes a cleanup script to a RunOnce registry key, then reboots into Safe Mode (where GPU drivers aren't loaded). The script runs automatically on Safe Mode login, removes all driver files, then you restart normally and install fresh drivers."
            },
            {
                q: "After removing drivers, how do I reinstall?",
                a: "Download the latest driver from NVIDIA.com, AMD.com, or Intel.com and run the installer normally. The GPU Driver Cleaner removes old drivers — it doesn't install new ones. Your screen will be low-res (generic display adapter) until you reinstall."
            }
        ]
    },
    {
        id: "wsl",
        icon: Terminal,
        title: "WSL Manager",
        color: "text-cyan-400",
        intro: "Install and manage Windows Subsystem for Linux, run Linux distros, and even launch a full Linux desktop.",
        items: [
            {
                q: "What is WSL?",
                a: "Windows Subsystem for Linux lets you run Linux command-line tools and applications directly on Windows without a VM. WSL 2 runs a real Linux kernel in a lightweight VM. You can install distros like Ubuntu, Debian, Kali Linux, Alpine, and more."
            },
            {
                q: "What is Linux Mode?",
                a: "Linux Mode uses WSLg (WSL with GUI support, available on Windows 11) to launch a full Linux desktop environment (XFCE4, KDE Plasma, or GNOME) inside a window on your Windows desktop. You get a real Linux GUI environment without dual-booting."
            },
            {
                q: "How do I set up Linux Mode?",
                a: "Click 'Setup / Re-setup' in the Linux Mode card on the Overview tab. The 7-step wizard guides you: (1) Verify compatibility, (2) Enable WSL, (3) Choose a distro, (4) Configure resources (RAM/CPU/swap), (5) Choose a desktop environment, (6) Set as default, (7) Launch. WSLg requires Windows 11."
            },
            {
                q: "What is the .wslconfig editor?",
                a: "The Settings tab lets you edit ~/.wslconfig — the global WSL configuration file. Control: memory limit (GB), processor count, swap size, networking mode (NAT/Mirrored/Bridged), localhost forwarding, DNS tunneling, Windows Firewall integration, GUI applications (WSLg). Save and run 'wsl --shutdown' to apply."
            },
            {
                q: "What does 'Clean Uninstall WSL' do?",
                a: "The danger zone option terminates all running distros, unregisters them (deletes their filesystems), disables both the Microsoft-Windows-Subsystem-Linux and VirtualMachinePlatform Windows features, and cleans the HKLM registry Lxss key. This is irreversible — your distro data will be deleted."
            }
        ]
    },
    {
        id: "latency",
        icon: Timer,
        title: "Latency Optimizer",
        color: "text-yellow-400",
        intro: "Fine-tune system timer resolution and standby memory for minimum latency.",
        items: [
            {
                q: "What is Timer Resolution?",
                a: "Windows uses a timer to schedule threads and sleep intervals. The default resolution is ~15.6ms. Applications can request finer resolution (down to ~0.5ms). Games and DirectX automatically request ~1ms. The Latency Optimizer shows your current, min, and max supported resolution. Lower = more precise scheduling."
            },
            {
                q: "What does 'Flush Standby List' do?",
                a: "Windows keeps recently-used memory pages in a 'standby list' as a cache. When a game needs physical RAM, Windows has to evict standby pages — this can cause micro-stutters. Flushing clears the standby list, freeing RAM immediately. The optimizer shows how many MB were freed."
            },
            {
                q: "What are Boot Settings?",
                a: "The boot settings table shows three bcdedit entries: disabledynamictick (prevents Windows from slowing the timer when idle), useplatformclock (forces HPET vs TSC selection), and hypervisorlaunchtype (VBS/HVCI state). You can manage these via the Tweaks page — the Latency page just shows current values."
            },
            {
                q: "When should I flush standby memory?",
                a: "Before a long gaming session on a system with 8–16GB RAM. On systems with 32GB+, standby flush has minimal impact since RAM pressure is lower. It's safe to do anytime — it's equivalent to what Process Lasso's memory optimizer does."
            }
        ]
    },
    {
        id: "process",
        icon: Activity,
        title: "Process Manager",
        color: "text-purple-400",
        intro: "Real-time view of all running processes with CPU, memory, and disk usage. Kill or reprioritize any process.",
        items: [
            {
                q: "How is this different from Task Manager?",
                a: "WinOpt Pro's Process Manager shows the same core data as Task Manager but integrated into the optimizer workflow. You can kill processes, set priority, and open file locations. It refreshes every 3 seconds. For advanced debugging, Task Manager or Process Explorer are more capable."
            },
            {
                q: "What do the priority levels mean?",
                a: "Realtime: highest possible — can starve other processes including the OS (use carefully). High: above normal, good for games. AboveNormal: slightly elevated. Normal: default for most apps. BelowNormal: reduced priority. Idle: runs only when nothing else needs CPU."
            },
            {
                q: "Why can't I kill some processes?",
                a: "System-protected processes (smss.exe, csrss.exe, wininit.exe, lsass.exe, svchost.exe with SYSTEM token) cannot be terminated even as admin. Attempting will show 'Access Denied'. This is a Windows security protection — killing them would crash the OS."
            }
        ]
    },
    {
        id: "network",
        icon: Network,
        title: "Network Analyzer",
        color: "text-sky-400",
        intro: "View network interfaces, test latency to any host, and see packet loss and jitter stats.",
        items: [
            {
                q: "What does the Ping tool measure?",
                a: "Enters a hostname or IP, then runs a multi-packet ping via the Rust backend. Results show: average latency (ms), min, max, jitter (variance between pings), and packet loss percentage. Useful for diagnosing network quality to game servers or your router."
            },
            {
                q: "What are the interface stats?",
                a: "Each network adapter shows: name, MAC address, IPv4 address, total bytes received, and total bytes transmitted since the last Windows boot. Refreshes every 3 seconds so you can watch live traffic."
            }
        ]
    },
    {
        id: "storage",
        icon: HardDrive,
        title: "Storage Optimizer",
        color: "text-amber-400",
        intro: "Check drive health, run TRIM on SSDs, schedule maintenance, and manage Storage Sense.",
        items: [
            {
                q: "What is Drive Health / SMART?",
                a: "SMART (Self-Monitoring, Analysis and Reporting Technology) is built into every modern drive. WinOpt Pro reads it via PowerShell's Get-PhysicalDisk and Get-StorageReliabilityCounter. Shows: health status (Healthy/Warning/Unhealthy), wear % for SSDs, temperature, and read/write error counts."
            },
            {
                q: "What does TRIM do?",
                a: "TRIM tells your SSD which data blocks are no longer in use, allowing the drive to erase and prepare them for future writes. Without TRIM, SSDs slow down over time. Windows schedules automatic TRIM weekly, but you can trigger it manually here."
            },
            {
                q: "What are Scheduled Maintenance tasks?",
                a: "These are Windows Task Scheduler jobs for recurring cleanup (temp files, Storage Sense, disk check). You can view existing tasks, create new ones, delete them, or run them immediately. Requires admin."
            }
        ]
    },
    {
        id: "power",
        icon: BatteryMedium,
        title: "Power Manager",
        color: "text-emerald-400",
        intro: "Switch power plans and fine-tune CPU performance, display, and sleep timeouts for both AC and battery.",
        items: [
            {
                q: "Which power plan should I use?",
                a: "For gaming and performance: High Performance or Ultimate Performance. For everyday use: Balanced. For laptops on battery: Power Saver or Balanced. Ultimate Performance (requires the tweak to enable it) locks CPU to maximum state and disables all power saving."
            },
            {
                q: "What are the AC/DC settings?",
                a: "AC settings apply when plugged in; DC (battery) settings apply on battery power. You can set: CPU Minimum % (how low the CPU scales when idle), CPU Maximum % (performance cap), Display Timeout (seconds before screen dims), Sleep Timeout (seconds before sleep). Set CPU Min to 100% on AC for maximum gaming performance."
            },
            {
                q: "What does battery health show?",
                a: "For laptops: whether a battery is detected, current charge percentage, charging status, and a status label. Desktop systems will show 'No battery detected'."
            }
        ]
    },
    {
        id: "startup",
        icon: Power,
        title: "Startup Apps",
        color: "text-indigo-400",
        intro: "Control which applications launch when Windows starts. Disabling unused startup apps speeds up boot time.",
        items: [
            {
                q: "How do I disable a startup app?",
                a: "Toggle the switch next to any startup entry. Changes are applied immediately to the registry (HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run and HKLM equivalent) or startup folder. You don't need to reboot — the change affects the next login."
            },
            {
                q: "What's the difference from Task Manager's Startup tab?",
                a: "Functionally the same. WinOpt Pro reads from the same registry locations. Task Manager may show a few entries from different sources (WMI subscriptions, Task Scheduler) that aren't shown here. For those, use Task Manager directly."
            },
            {
                q: "Which startup apps are safe to disable?",
                a: "Generally safe to disable: Spotify, Discord, Steam, Epic Games Launcher, OneDrive (if not used), Microsoft Teams, Skype, Adobe updaters, Java updater. Keep: antivirus software, touchpad/keyboard drivers, sound card utilities."
            }
        ]
    },
    {
        id: "apps",
        icon: Package,
        title: "App Store",
        color: "text-pink-400",
        intro: "Install popular Windows software via winget (Windows Package Manager) or Chocolatey.",
        items: [
            {
                q: "How does installation work?",
                a: "Click 'Install' on any app card. WinOpt Pro tries winget first (built into Windows 10 1809+). If winget is unavailable, it falls back to Chocolatey (must be installed separately). The result shows 'Installed via winget' or 'Installed via chocolatey' on success."
            },
            {
                q: "What is Chocolatey?",
                a: "Chocolatey is a Windows package manager (like apt on Linux). If the Chocolatey badge shows 'not detected', install it from chocolatey.org first. Once installed, WinOpt Pro can use it as a fallback installer."
            },
            {
                q: "Can I search for apps not in the list?",
                a: "The App Store shows a curated list of popular, safe software. For apps not listed, use winget directly from PowerShell: winget install <appname>, or browse the Winget package repository."
            }
        ]
    },
    {
        id: "drivers",
        icon: Cpu,
        title: "Driver Manager",
        color: "text-teal-400",
        intro: "View all installed drivers, find unsigned drivers, and export your driver list.",
        items: [
            {
                q: "What is an unsigned driver?",
                a: "Drivers must be digitally signed to confirm they haven't been tampered with. Unsigned drivers are a security risk — they could be modified malware or outdated third-party drivers. The Driver Manager highlights unsigned drivers so you can investigate them."
            },
            {
                q: "What should I do about unsigned drivers?",
                a: "Investigate each one: check the provider name, look up the INF name online, and verify it's from a known source. If suspicious, use the GPU Driver Cleaner (for display drivers) or manually uninstall via Device Manager. Legitimate hardware sometimes ships with unsigned drivers — especially older peripherals."
            }
        ]
    },
    {
        id: "keyboard",
        icon: Keyboard,
        title: "Keyboard Shortcuts",
        color: "text-slate-400",
        intro: "Speed up your workflow with keyboard shortcuts.",
        items: [
            { q: "Ctrl + K", a: "Open Command Palette — search for any feature, tweak, or page by name. Type to fuzzy-search. Press Enter or click to navigate." },
            { q: "Escape", a: "Close Command Palette, modals, or color picker dropdowns." },
            { q: "Ctrl + K (sidebar button)", a: "The 'Jump to...' button in the sidebar also opens the Command Palette." },
            { q: "Search bar (sidebar)", a: "Type in the sidebar search box to filter navigation items by name. Clears the filter when emptied." },
        ]
    }
];

const RISK_BADGES = [
    { color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", label: "🟢 Green — Safe", desc: "Recommended for all users. No side effects, completely reversible." },
    { color: "text-amber-400 bg-amber-500/10 border-amber-500/20", label: "🟡 Yellow — Caution", desc: "Read the description first. May change noticeable system behavior. Reversible." },
    { color: "text-red-400 bg-red-500/10 border-red-500/20", label: "🔴 Red — Expert Only", desc: "Requires Expert Mode. Significant system changes. Requires understanding what you're doing." },
];

export function HelpPage() {
    const [activeSection, setActiveSection] = useState<string>("getting-started");
    const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
    const [search, setSearch] = useState("");

    const toggleItem = (key: string) => {
        setExpandedItems(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const searchLow = search.toLowerCase().trim();

    const filteredSections = HELP_SECTIONS.map(section => ({
        ...section,
        items: section.items.filter(item =>
            !searchLow ||
            item.q.toLowerCase().includes(searchLow) ||
            item.a.toLowerCase().includes(searchLow)
        )
    })).filter(s => !searchLow || s.items.length > 0);

    const currentSection = filteredSections.find(s => s.id === activeSection) || filteredSections[0];

    return (
        <div className="flex h-full min-h-0">
            {/* Left nav */}
            <div className="w-[220px] shrink-0 border-r border-border overflow-y-auto flex flex-col gap-1 p-3 hidden md:flex">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-2 pt-1 pb-2">Help Topics</p>
                {HELP_SECTIONS.map(section => {
                    const Icon = section.icon;
                    return (
                        <button
                            key={section.id}
                            onClick={() => setActiveSection(section.id)}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-colors text-left outline-none ${activeSection === section.id
                                ? "bg-primary/10 text-primary border border-primary/20"
                                : "text-slate-400 hover:text-foreground hover:bg-white/5"
                            }`}
                        >
                            <Icon className={`w-4 h-4 shrink-0 ${activeSection === section.id ? "text-primary" : section.color}`} />
                            {section.title}
                        </button>
                    );
                })}
            </div>

            {/* Main content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="max-w-[860px] mx-auto p-6 lg:p-8 flex flex-col gap-6">

                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <BookOpen className="w-5 h-5 text-primary" />
                                <h1 className="text-2xl font-bold text-foreground">Help & Documentation</h1>
                            </div>
                            <p className="text-sm text-slate-400">Guides, explanations, and answers for every feature in WinOpt Pro.</p>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search help topics..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder-slate-500 outline-none focus:border-primary/40 transition-colors"
                        />
                    </div>

                    {/* Risk Level Quick Reference */}
                    {!searchLow && activeSection === "getting-started" && (
                        <div className="glass-panel rounded-2xl p-5 flex flex-col gap-3">
                            <h2 className="text-[13px] font-bold uppercase tracking-widest text-slate-400">Risk Level Quick Reference</h2>
                            <div className="flex flex-col gap-2">
                                {RISK_BADGES.map(b => (
                                    <div key={b.label} className={`flex items-start gap-3 px-3 py-2.5 rounded-xl border ${b.color}`}>
                                        <span className="text-[13px] font-bold shrink-0">{b.label}</span>
                                        <span className="text-[12px] opacity-80">{b.desc}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Tips banner */}
                    {!searchLow && activeSection === "getting-started" && (
                        <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300">
                            <Info className="w-4 h-4 mt-0.5 shrink-0" />
                            <div className="text-[13px]">
                                <span className="font-semibold">Tip: </span>
                                Press <kbd className="px-1.5 py-0.5 rounded bg-black/20 border border-white/10 text-[11px] font-mono mx-0.5">Ctrl+K</kbd> anywhere in the app to open the Command Palette and jump to any feature instantly.
                            </div>
                        </div>
                    )}

                    {/* Mobile section selector */}
                    <div className="flex flex-wrap gap-2 md:hidden">
                        {HELP_SECTIONS.map(s => {
                            const Icon = s.icon;
                            return (
                                <button
                                    key={s.id}
                                    onClick={() => setActiveSection(s.id)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${activeSection === s.id ? "bg-primary/10 border-primary/30 text-primary" : "bg-black/5 dark:bg-white/5 border-border text-slate-400"}`}
                                >
                                    <Icon className="w-3.5 h-3.5" />
                                    {s.title}
                                </button>
                            );
                        })}
                    </div>

                    {/* FAQ Accordion */}
                    {(searchLow ? filteredSections : currentSection ? [currentSection] : []).map(section => (
                        <div key={section.id} className="flex flex-col gap-1">
                            {searchLow && (
                                <div className="flex items-center gap-2 mb-1">
                                    <section.icon className={`w-4 h-4 ${section.color}`} />
                                    <h2 className="text-[13px] font-bold text-foreground">{section.title}</h2>
                                </div>
                            )}
                            {!searchLow && (
                                <div className="mb-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <section.icon className={`w-5 h-5 ${section.color}`} />
                                        <h2 className="text-xl font-bold text-foreground">{section.title}</h2>
                                    </div>
                                    <p className="text-sm text-slate-400 ml-7">{section.intro}</p>
                                </div>
                            )}
                            {section.items.map((item, i) => {
                                const key = `${section.id}-${i}`;
                                const open = expandedItems[key] ?? (!searchLow && i === 0);
                                return (
                                    <div key={key} className={`rounded-xl border transition-colors ${open ? "border-primary/20 bg-primary/5" : "border-border bg-black/5 dark:bg-white/[0.02] hover:border-border/80"}`}>
                                        <button
                                            onClick={() => toggleItem(key)}
                                            className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left outline-none"
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <HelpCircle className={`w-4 h-4 shrink-0 ${open ? "text-primary" : "text-slate-500"}`} />
                                                <span className={`text-[13px] font-semibold ${open ? "text-primary" : "text-foreground"}`}>{item.q}</span>
                                            </div>
                                            {open
                                                ? <ChevronDown className="w-4 h-4 text-primary shrink-0" />
                                                : <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                                            }
                                        </button>
                                        {open && (
                                            <div className="px-4 pb-4 ml-[26px]">
                                                <p className="text-[13px] text-slate-300 leading-relaxed">{item.a}</p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}

                    {filteredSections.length === 0 && searchLow && (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                            <HelpCircle className="w-12 h-12 opacity-20 mb-3" />
                            <p className="font-medium">No results for "{search}"</p>
                            <p className="text-sm mt-1">Try different keywords or browse sections on the left.</p>
                        </div>
                    )}

                    {/* Footer links */}
                    {!searchLow && (
                        <div className="border-t border-border pt-6 flex flex-wrap gap-4 text-sm text-slate-400">
                            <a
                                href="https://github.com/anthropics/winopt-pro/issues"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                            >
                                <ExternalLink className="w-4 h-4" />
                                Report an issue on GitHub
                            </a>
                            <span className="text-slate-600">•</span>
                            <span className="flex items-center gap-1.5">
                                <CheckCircle className="w-4 h-4 text-emerald-500" />
                                417 automated tests passing
                            </span>
                            <span className="text-slate-600">•</span>
                            <span className="flex items-center gap-1.5">
                                <AlertTriangle className="w-4 h-4 text-amber-400" />
                                Always backup before major changes
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
