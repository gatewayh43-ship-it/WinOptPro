# WinOpt Pro — Tweaks Reference

Complete reference for all 165 system tweaks available in WinOpt Pro.

## Risk Level Guide

| Badge | Level | Meaning |
|---|---|---|
| 🟢 | Safe | Recommended for all users. Easily reversible. |
| 🟡 | Caution | May affect some system behaviour. Read the description before applying. |
| 🔴 | Expert | Requires Expert Mode to be enabled. Significant system changes — understand what you're doing. |

> ⚠️ All tweaks are fully reversible via the **Revert** button in the app.

---

## Performance

### 🟢 Disable SysMain (Superfetch)

**ID:** `DisableSysMain` | **Category:** Performance | **Risk:** Green

Stops Windows from pre-loading apps into RAM.

**How it works:** Analyzes app usage and pre-loads them to memory.

**Benefits:** Saves CPU overhead on ultra-fast NVMe drives.

**Risks/Cons:** Will drastically slow down HDD loading times.

**Expert details:** Disables the 'SysMain' (formerly SuperFetch) service, which preloads frequently used applications into RAM. Exact modification: 'Set-Service -Name SysMain -StartupType Disabled'. While this frees up RAM and reduces disk I/O on older HDDs, on modern NVMe SSDs the performance gain is negligible, and disabling it can actually increase application launch times as they must be read directly from the disk every time.

**Interactions with other tweaks:** Conflicts with 'Optimize Prefetcher for SSD' if Prefetch is completely disabled. Redundant if you already have extreme RAM constraints where Windows handles paging.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Stop-Service -Name 'SysMain' -Force -ErrorAction SilentlyContinue; Set-Service -Name 'SysMain' -StartupType Disabled
```

**Revert:**
```powershell
Set-Service -Name 'SysMain' -StartupType Automatic; Start-Service -Name 'SysMain' -ErrorAction SilentlyContinue
```

</details>

---

### 🟡 Disable Windows Search Indexer

**ID:** `DisableSearchIndexer` | **Category:** Performance | **Risk:** Yellow

Stops constant background file scanning for search index.

**How it works:** Constantly reads drives in the background to build a search index.

**Benefits:** Saves CPU and disk I/O. Use 'Everything' app instead.

**Risks/Cons:** Start menu and Explorer search will be slower.

**Expert details:** Stops and disables the 'WSearch' service. This service continuously indexes files, emails, and other content for instant search queries within Windows Explorer and the Start Menu. Disabling it halts background CPU and disk usage significantly, but reduces Windows Search to a slow, real-time file crawl.

**Interactions with other tweaks:** Interacts favorably with 'SetServicesManual'. If you rely on Start Menu search, disabling this will break instant results for local files.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Stop-Service -Name 'WSearch' -Force -ErrorAction SilentlyContinue; Set-Service -Name 'WSearch' -StartupType Disabled
```

**Revert:**
```powershell
Set-Service -Name 'WSearch' -StartupType Automatic; Start-Service -Name 'WSearch' -ErrorAction SilentlyContinue
```

</details>

---

### 🟢 Disable Scheduled Disk Defragmentation

**ID:** `DisableDefragSchedule` | **Category:** Performance | **Risk:** Green

Prevents Windows from automatically defragmenting SSDs on a schedule.

**How it works:** Windows schedules weekly TRIM/defrag operations even on SSDs.

**Benefits:** Saves SSD write cycles and prevents background I/O spikes.

**Risks/Cons:** HDDs may fragment over time without scheduled defrag.

**Expert details:** Disables the 'ScheduledDefrag' task in Task Scheduler ('\Microsoft\Windows\Defrag'). Windows periodically runs this to optimize drives (TRIM for SSDs, defrag for HDDs). Disabling it prevents background disk activity, but requires you to manually run the 'Optimize Drives' utility to maintain SSD health and performance (TRIM).

**Interactions with other tweaks:** Can negatively impact long-term SSD performance unless you manually run TRIM or use third-party optimization tools.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
schtasks /Change /TN '\Microsoft\Windows\Defrag\ScheduledDefrag' /Disable
```

**Revert:**
```powershell
schtasks /Change /TN '\Microsoft\Windows\Defrag\ScheduledDefrag' /Enable
```

</details>

---

### 🟡 Set Visual Effects to Performance

**ID:** `VisualEffectsPerformance` | **Category:** Performance | **Risk:** Yellow

Disables all Windows UI animations and visual effects for speed.

**How it works:** Sets Windows to 'Adjust for best performance' mode, disabling transparency, animations, and shadows.

**Benefits:** Noticeably faster UI on older hardware. Reduced GPU/CPU load for compositing.

**Risks/Cons:** The desktop looks significantly less polished — no transparency, shadows, or animations.

**Expert details:** Modifies 'HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects' (VisualFXSetting=2) and disables specific UI animations in 'HKCU\Control Panel\Desktop' (e.g., UserPreferencesMask). This reduces overhead on the DWM (Desktop Window Manager) and GPU by disabling window shadows, smooth scrolling, and transparency.

**Interactions with other tweaks:** Overrides individual UI tweaks like 'Reduce Menu Animation Delay' as it applies a blanket performance profile.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects' -Name 'VisualFXSetting' -Value 2 -Type DWord -Force; Set-ItemProperty -Path 'HKCU:\Control Panel\Desktop' -Name 'UserPreferencesMask' -Value ([byte[]](0x90,0x12,0x03,0x80,0x10,0x00,0x00,0x00)) -Type Binary -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects' -Name 'VisualFXSetting' -Value 0 -Type DWord -Force
```

</details>

---

### 🟢 Remove Startup App Delay

**ID:** `DisableStartupDelay` | **Category:** Performance | **Risk:** Green

Removes the artificial 10-second delay Windows adds before launching startup apps.

**How it works:** Windows adds a ~10 second delay after logon before running startup programs.

**Benefits:** Startup apps launch immediately after login, faster overall boot experience.

**Risks/Cons:** If too many apps start at once, there may be brief system load.

**Expert details:** Creates or modifies 'HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Serialize' -> 'StartupDelayInMSec' to 0. By default, Windows delays the launch of startup apps by ~10 seconds to prioritize loading the Desktop and core services. Setting this to 0 forces all startup apps to launch immediately.

**Interactions with other tweaks:** May cause the desktop to feel unresponsive immediately after login if you have many startup apps enabled. Pairs well with 'Clean Temporary Files' and debloat tweaks.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
if (!(Test-Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Serialize')) { New-Item -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Serialize' -Force | Out-Null }; Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Serialize' -Name 'StartupDelayInMSec' -Value 0 -Type DWord -Force
```

**Revert:**
```powershell
Remove-Item -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Serialize' -Force -EA SilentlyContinue
```

</details>

---

### 🟢 Disable NTFS Last Access Timestamp

**ID:** `DisableLastAccessTimestamp` | **Category:** Performance | **Risk:** Green

Stops NTFS from updating the 'last accessed' timestamp on every file read.

**How it works:** Every file read writes a timestamp back to disk. This disables that overhead.

**Benefits:** Reduces SSD/HDD writes significantly, especially for file-heavy workloads.

**Risks/Cons:** Forensic tools and some backup software rely on last access timestamps.

**Expert details:** Executes 'fsutil behavior set disablelastaccess 1'. This stops the NTFS file system from updating the 'Last Accessed' timestamp attribute of files and directories every time they are opened. This reduces micro-writes to the storage drive, slightly improving I/O performance and increasing SSD lifespan.

**Interactions with other tweaks:** Generally safe, but may break specific forensic or backup tools that rely on the 'Last Accessed' metadata to determine file usage.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
fsutil behavior set disablelastaccess 1
```

**Revert:**
```powershell
fsutil behavior set disablelastaccess 0
```

</details>

---

### 🟡 Disable 8.3 Short File Names

**ID:** `Disable8dot3Naming` | **Category:** Performance | **Risk:** Yellow

Disables legacy DOS 8.3 filename generation on NTFS volumes.

**How it works:** NTFS creates a short 8.3 alias (like PROGRA~1) for every file, adding overhead.

**Benefits:** Speeds up file creation in directories with many files (10-20% improvement).

**Risks/Cons:** Very old 16-bit applications may fail to find files.

**Expert details:** Executes 'fsutil behavior set disable8dot3 1'. Disables the legacy NTFS feature that automatically generates 8.3 character (DOS-compatible) short names for all long file names. This significantly speeds up directory enumeration in folders with thousands of files.

**Interactions with other tweaks:** Breaking risk: 16-bit applications or extremely old enterprise software hardcoded to use MS-DOS paths (like 'PROGRA~1') will fail.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
fsutil 8dot3name set 1
```

**Revert:**
```powershell
fsutil 8dot3name set 0
```

</details>

---

### 🟡 Disable Print Spooler Service

**ID:** `DisablePrintSpooler` | **Category:** Performance | **Risk:** Yellow

Stops the Print Spooler service — saves resources and closes the PrintNightmare vector.

**How it works:** The Print Spooler runs even if you have no printer. It's been a recurring CVE target.

**Benefits:** Reduces attack surface (PrintNightmare) and saves ~20MB RAM.

**Risks/Cons:** You cannot print to any printer while this service is disabled.

**Expert details:** Disables the 'Spooler' service. It is responsible for managing print jobs, loading printer drivers, and handling the print queue. Disabling it frees up a small amount of RAM and closes common attack vectors (like PrintNightmare).

**Interactions with other tweaks:** Prevents all printing, including PDF printers ('Print to PDF'). Must be reverted if you ever need to connect a physical or virtual printer.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Stop-Service -Name 'Spooler' -Force -EA SilentlyContinue; Set-Service -Name 'Spooler' -StartupType Disabled
```

**Revert:**
```powershell
Set-Service -Name 'Spooler' -StartupType Automatic; Start-Service -Name 'Spooler' -EA SilentlyContinue
```

</details>

---

### 🟢 Disable Fax Service

**ID:** `DisableFaxService` | **Category:** Performance | **Risk:** Green

Disables the Windows Fax service that nobody uses in the modern era.

**How it works:** The Fax service sits idle consuming memory, waiting for fax transmissions.

**Benefits:** Saves resources from an obsolete service.

**Risks/Cons:** You can't send faxes (you weren't going to).

**Expert details:** Disables the 'Fax' service. This legacy component allows the computer to send and receive faxes. It runs silently in the background but offers zero value to modern users.

**Interactions with other tweaks:** Completely isolated tweak. No negative interactions unless you are using a physical fax modem.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Stop-Service -Name 'Fax' -Force -EA SilentlyContinue; Set-Service -Name 'Fax' -StartupType Disabled -EA SilentlyContinue
```

**Revert:**
```powershell
Set-Service -Name 'Fax' -StartupType Manual -EA SilentlyContinue
```

</details>

---

### 🟡 Optimize Foreground App Priority

**ID:** `Win32PrioritySeparation` | **Category:** Performance | **Risk:** Yellow

Sets Win32PrioritySeparation to 0x26 for optimal foreground app scheduling.

**How it works:** Controls how Windows distributes CPU time between foreground and background apps.

**Benefits:** Foreground applications get shorter, more responsive quantum time slices.

**Risks/Cons:** Background tasks like downloads may be slightly slower.

**Expert details:** Modifies 'HKLM\SYSTEM\CurrentControlSet\Control\PriorityControl\Win32PrioritySeparation' to hex 26 (38 decimal). This adjusts the thread quantum (time slice) allocation, giving shorter, variable time slices prioritizing the foreground application (the active window).

**Interactions with other tweaks:** Highly beneficial for gaming ('GamePriority') and desktop responsiveness, but can slightly reduce the efficiency of heavy background rendering or encoding tasks.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\PriorityControl' -Name 'Win32PrioritySeparation' -Value 38 -Type DWord -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\PriorityControl' -Name 'Win32PrioritySeparation' -Value 2 -Type DWord -Force
```

</details>

---

### 🟢 Speed Up Shutdown Time

**ID:** `SpeedUpShutdown` | **Category:** Performance | **Risk:** Green

Reduces WaitToKillServiceTimeout and HungAppTimeout for faster shutdowns.

**How it works:** Windows waits up to 5 seconds for services and hung apps to close. This reduces it to 2 seconds.

**Benefits:** Shutdown and restart complete noticeably faster.

**Risks/Cons:** Apps with unsaved data may not get enough time to save. Most apps auto-save.

**Expert details:** Modifies 'WaitToKillServiceTimeout' in 'HKLM\SYSTEM\CurrentControlSet\Control' to heavily reduce the time (from 5000ms to 2000ms) Windows waits for services to close gracefully before force-killing them during shutdown.

**Interactions with other tweaks:** Can cause data loss if background applications (like database servers or disk write caches) are forcibly terminated before they finish saving state.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control' -Name 'WaitToKillServiceTimeout' -Value '2000' -Type String -Force; Set-ItemProperty -Path 'HKCU:\Control Panel\Desktop' -Name 'HungAppTimeout' -Value '2000' -Type String -Force; Set-ItemProperty -Path 'HKCU:\Control Panel\Desktop' -Name 'WaitToKillAppTimeout' -Value '2000' -Type String -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control' -Name 'WaitToKillServiceTimeout' -Value '5000' -Type String -Force; Set-ItemProperty -Path 'HKCU:\Control Panel\Desktop' -Name 'HungAppTimeout' -Value '5000' -Type String -Force; Set-ItemProperty -Path 'HKCU:\Control Panel\Desktop' -Name 'WaitToKillAppTimeout' -Value '20000' -Type String -Force
```

</details>

---

### 🟡 Set Unnecessary Services to Manual

**ID:** `SetServicesManual` | **Category:** Performance | **Risk:** Yellow

Sets non-essential Windows services to Manual startup so they only run when needed.

**How it works:** Many Windows services auto-start but are rarely used. Setting them to Manual means they start on-demand.

**Benefits:** Faster boot, lower RAM usage, reduced background CPU activity.

**Risks/Cons:** First use of some features may take a moment longer as the service starts.

**Expert details:** Changes the startup type from 'Automatic' to 'Manual' for several non-critical background services (e.g., edgeupdate, MapsBroker). This means they will only start when explicitly called by Windows or an application, rather than idling in the background constantly.

**Interactions with other tweaks:** A safe middle-ground compared to forcefully 'Disabling' services. Ensures features work when needed but saves RAM on boot.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
$services = @('DiagTrack','dmwappushservice','MapsBroker','lfsvc','SharedAccess','RemoteRegistry','RemoteAccess','TrkWks','WMPNetworkSvc','WSearch'); foreach ($s in $services) { if (Get-Service -Name $s -EA SilentlyContinue) { Set-Service -Name $s -StartupType Manual -EA SilentlyContinue } }; Set-Service -Name 'DiagTrack' -StartupType Disabled -EA SilentlyContinue; Stop-Service -Name 'DiagTrack' -Force -EA SilentlyContinue
```

**Revert:**
```powershell
$services = @('DiagTrack','dmwappushservice','MapsBroker','TrkWks','WSearch'); foreach ($s in $services) { if (Get-Service -Name $s -EA SilentlyContinue) { Set-Service -Name $s -StartupType Automatic -EA SilentlyContinue } }
```

</details>

---

### 🟢 Disable Explorer Automatic Folder Discovery

**ID:** `DisableExplorerFolderDiscovery` | **Category:** Performance | **Risk:** Green

Stops Explorer from auto-detecting folder types (Music, Pictures, etc.) which causes slow enumeration.

**How it works:** Explorer scans folder contents to decide the view template (Pictures, Music, etc.). This is slow for large folders.

**Benefits:** Dramatically faster folder opening, especially for game install dirs and large downloads.

**Risks/Cons:** Folders always use the General template. No automatic Music/Pictures column layouts.

**Expert details:** Modifies 'HKCU\Software\Classes\Local Settings\Software\Microsoft\Windows\Shell\Bags\AllFolders\Shell' to set 'FolderType' to 'NotSpecified'. This stops Windows Explorer from automatically scanning folder contents (like pictures or videos) to determine the view layout, speeding up folder navigation.

**Interactions with other tweaks:** Removes automatic thumbnail or media layout views for media folders. You will need to manually set the view type if you want large icons.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Classes\Local Settings\Software\Microsoft\Windows\Shell\Bags\AllFolders\Shell' -Name 'FolderType' -Value 'NotSpecified' -Type String -Force -EA SilentlyContinue
```

**Revert:**
```powershell
Remove-ItemProperty -Path 'HKCU:\SOFTWARE\Classes\Local Settings\Software\Microsoft\Windows\Shell\Bags\AllFolders\Shell' -Name 'FolderType' -EA SilentlyContinue
```

</details>

---

### 🔴 Disable Memory Compression ⚠️ **Expert Mode Required**

**ID:** `DisableMemoryCompression` | **Category:** Performance | **Risk:** Red

Disables Windows memory compression to reduce CPU overhead when RAM is plentiful.

**How it works:** Windows compresses infrequently accessed memory pages to fit more data in RAM, reducing paging to disk. This uses CPU cycles for compression/decompression.

**Benefits:** Eliminates CPU overhead from memory compression. Can reduce micro-stutters on high-RAM systems (32GB+).

**Risks/Cons:** On systems with less RAM, disabling compression increases paging to disk which is much slower. Not recommended for systems with less than 16GB RAM.

**Expert details:** Uses the 'Disable-MMAgent -MemoryCompression' PowerShell cmdlet. The Memory Manager Agent (MMAgent) also handles page combining. Current state can be checked with 'Get-MMAgent'.

**Interactions with other tweaks:** Only beneficial if you have 32GB+ RAM. On systems with 8–16GB, keeping compression enabled is better for overall performance.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Disable-MMAgent -MemoryCompression
```

**Revert:**
```powershell
Enable-MMAgent -MemoryCompression
```

</details>

---

### 🔴 Enable Disk Write-Back Cache ⚠️ **Expert Mode Required**

**ID:** `EnableWriteBackCache` | **Category:** Performance | **Risk:** Red

Enables write-back caching on all disks for faster write performance. Risk: data loss on power failure without UPS.

**How it works:** Write-back caching buffers disk writes in RAM and acknowledges them immediately to the application, flushing to disk asynchronously. This dramatically speeds up write-heavy workloads.

**Benefits:** Significantly faster disk write performance for games, compilers, and file operations.

**Risks/Cons:** If power is lost before the cache is flushed, buffered writes are lost. Not recommended without a UPS or on laptops where sudden shutdown is possible.

**Expert details:** Uses 'Set-Disk -IsWriteCacheEnabled $true' PowerShell cmdlet for each connected disk. This is equivalent to enabling 'Write caching' in Device Manager > Disk Drive Properties > Policies tab.

**Interactions with other tweaks:** SSDs typically have their own internal write-back cache. This setting enables the Windows disk driver cache layer on top. Combined effect is larger buffer, faster sequential writes.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Get-Disk | ForEach-Object { try { Set-Disk -Number $_.Number -IsWriteCacheEnabled $true -ErrorAction SilentlyContinue } catch {} }
```

**Revert:**
```powershell
Get-Disk | ForEach-Object { try { Set-Disk -Number $_.Number -IsWriteCacheEnabled $false -ErrorAction SilentlyContinue } catch {} }
```

</details>

---

### 🔴 Disable Fault Tolerant Heap (FTH) ⚠️ **Expert Mode Required**

**ID:** `DisableFTH` | **Category:** Performance | **Risk:** Red

Disables the Fault Tolerant Heap which silently patches crashing apps, adding overhead to all heap allocations.

**How it works:** The Fault Tolerant Heap (FTH) monitors applications for heap corruption crashes and automatically applies compatibility shims (heap mitigations) to prevent future crashes. These shims add overhead to memory allocations.

**Benefits:** Removes heap allocation overhead. Games and apps that FTH has 'shimmed' will see reduced CPU overhead in memory-intensive operations.

**Risks/Cons:** Applications that genuinely crash due to heap corruption will crash more often instead of being silently patched. Useful only on stable systems.

**Expert details:** Disables FTH by setting 'HKLM:\SOFTWARE\Microsoft\FTH' Enabled=0. FTH is part of the Application Compatibility subsystem. On a stable gaming system with no crashing apps, the shims provide zero benefit.

**Interactions with other tweaks:** Has no interaction with other tweaks. Independent of memory compression and VBS settings.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
if (!(Test-Path 'HKLM:\SOFTWARE\Microsoft\FTH')) { New-Item -Path 'HKLM:\SOFTWARE\Microsoft\FTH' -Force | Out-Null }; Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\FTH' -Name 'Enabled' -Value 0 -Type DWord -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\FTH' -Name 'Enabled' -Value 1 -Type DWord -Force
```

</details>

---

### 🟢 Enable CPU Priority Boost

**ID:** `SetPriorityBoost` | **Category:** Performance | **Risk:** Green

Restores Windows' dynamic CPU priority boost, ensuring foreground threads and I/O completion threads receive additional scheduling priority for better responsiveness.

**How it works:** Windows boosts thread priorities temporarily after I/O completion and for foreground applications. Setting PrioritySeparation=38 enables 2-quantum foreground boost with variable quantum lengths — the classic 'gaming' scheduler setting.

**Benefits:** Improves foreground app responsiveness and reduces perceived input lag. Ensures game threads are scheduled ahead of background tasks. No reboot required.

**Risks/Cons:** Minimal. Background tasks may receive slightly less CPU time while a foreground game is running. Effectively a no-op if the system is not CPU-bottlenecked.

**Expert details:** Sets HKLM\SYSTEM\CurrentControlSet\Control\PriorityControl PrioritySeparation=38 (hex 0x26). Value 38 = foreground boost enabled, variable quantums, 2:1 foreground:background ratio. Default Windows value is 2.

**Interactions with other tweaks:** Pairs well with SystemResponsiveness and GamePriority tweaks. Independent of memory or disk tweaks.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\PriorityControl' -Name 'PrioritySeparation' -Value 38 -Type DWord -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\PriorityControl' -Name 'PrioritySeparation' -Value 2 -Type DWord -Force
```

</details>

---

## Gaming

### 🟢 Optimize System Responsiveness

**ID:** `SystemResponsiveness` | **Category:** Gaming | **Risk:** Green

Gives 90% CPU priority to foreground apps instead of 80%.

**How it works:** Changes how Windows divides CPU time between foreground (games) and background tasks.

**Benefits:** Reduces micro-stutters in games.

**Risks/Cons:** Background tasks/downloads may be slightly slower.

**Expert details:** Modifies 'HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\SystemResponsiveness'. Default is 20 (meaning 20% of CPU is reserved for low-priority background tasks). Setting it to 0 or 10 gives multimedia and gaming tasks 100% access to CPU cycles.

**Interactions with other tweaks:** Works synergistically with 'MMCSSPriority' and 'GamePriority'. Essential for high-refresh-rate gaming to eliminate micro-stutters.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile' -Name 'SystemResponsiveness' -Value 10 -Type DWord -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile' -Name 'SystemResponsiveness' -Value 20 -Type DWord -Force
```

</details>

---

### 🟢 Increase Game CPU/GPU Priority

**ID:** `GamePriority` | **Category:** Gaming | **Risk:** Green

Ensures games get maximum hardware scheduling priority.

**How it works:** Explicitly tells Windows how to prioritize processes registered as 'Games'.

**Benefits:** Games get higher CPU/GPU priority and scheduling preference.

**Risks/Cons:** Background apps like Discord might stutter under heavy load.

**Expert details:** Adds specific registry entries to 'HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games' to configure GPU Priority to 8, Priority to 6, and Scheduling Category to 'High'. This elevates the class priority of registered games under MMCSS.

**Interactions with other tweaks:** Enhances 'DisableFSO' by ensuring the full-screen game thread is not preempted by background OS telemetry or browser threads.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
if (!(Test-Path 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games')) { New-Item -Path 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games' -Force | Out-Null }; Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games' -Name 'GPU Priority' -Value 8 -Type DWord -Force; Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games' -Name 'Priority' -Value 6 -Type DWord -Force; Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games' -Name 'Scheduling Category' -Value 'High' -Type String -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games' -Name 'GPU Priority' -Value 2 -Type DWord -Force; Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games' -Name 'Priority' -Value 2 -Type DWord -Force; Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games' -Name 'Scheduling Category' -Value 'Medium' -Type String -Force
```

</details>

---

### 🟡 Disable Full-Screen Optimizations

**ID:** `DisableFSO` | **Category:** Gaming | **Risk:** Yellow

Allows true exclusive fullscreen mode in games by forcing GameDVR to back off.

**How it works:** FSO forces games into a borderless window. This tweak disables that.

**Benefits:** Reduces input latency by 1-5ms. Better for competitive gaming.

**Risks/Cons:** Alt-Tab may be slower. Some modern DX12 games actually perform worse.

**Expert details:** Modifies 'HKCU\System\GameConfigStore\GameDVR_FSEBehaviorMode' to 2. Disables Full-Screen Optimizations, a hybrid mode introduced in Win10 where exclusive fullscreen games are rendered as borderless windowed to allow Xbox Game Bar overlays. Disabling it restores true Exclusive Fullscreen.

**Interactions with other tweaks:** Drastically reduces input lag in older APIs (DX9/11). Interacts with 'DisableGameDVR' to fully remove the Microsoft overlay stack.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKCU:\System\GameConfigStore' -Name 'GameDVR_FSEBehaviorMode' -Value 2 -Type DWord -Force; Set-ItemProperty -Path 'HKCU:\System\GameConfigStore' -Name 'GameDVR_HonorUserFSEBehaviorMode' -Value 1 -Type DWord -Force; Set-ItemProperty -Path 'HKCU:\System\GameConfigStore' -Name 'GameDVR_FSEBehavior' -Value 2 -Type DWord -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKCU:\System\GameConfigStore' -Name 'GameDVR_FSEBehaviorMode' -Value 0 -Type DWord -Force; Set-ItemProperty -Path 'HKCU:\System\GameConfigStore' -Name 'GameDVR_HonorUserFSEBehaviorMode' -Value 0 -Type DWord -Force; Set-ItemProperty -Path 'HKCU:\System\GameConfigStore' -Name 'GameDVR_FSEBehavior' -Value 0 -Type DWord -Force
```

</details>

---

### 🟢 Disable Game DVR Background Recording

**ID:** `DisableGameDVR` | **Category:** Gaming | **Risk:** Green

Stops Xbox Game Bar from recording in the background.

**How it works:** Windows constantly records the last X seconds of gameplay using GPU encoders.

**Benefits:** Saves 5-10% GPU performance. Eliminates random micro-stutters.

**Risks/Cons:** You won't be able to use Xbox DVR 'Record that' clip sharing.

**Expert details:** Sets 'AppCaptureEnabled' (in GameConfigStore) to 0, completely disabling the Xbox Game Bar's background recording (shadowplay equivalent). This halts the constant frame-buffer copying that inherently costs 2-5% GPU performance.

**Interactions with other tweaks:** Redundant if Xbox features are entirely uninstalled via the Debloat tweaks. Required for 'DisableFSO' to function immaculately.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
if (!(Test-Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\GameDVR')) { New-Item -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\GameDVR' -Force | Out-Null }; Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\GameDVR' -Name 'AppCaptureEnabled' -Value 0 -Type DWord -Force; if (!(Test-Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\GameDVR')) { New-Item -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\GameDVR' -Force | Out-Null }; Set-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\GameDVR' -Name 'AllowGameDVR' -Value 0 -Type DWord -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\GameDVR' -Name 'AppCaptureEnabled' -Value 1 -Type DWord -Force; Set-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\GameDVR' -Name 'AllowGameDVR' -Value 1 -Type DWord -Force
```

</details>

---

### 🔴 Disable HPET (High Precision Timer) ⚠️ **Expert Mode Required**

**ID:** `DisableHPET` | **Category:** Gaming | **Risk:** Red

Disables High Precision Event Timer to reduce DPC latency.

**How it works:** HPET is a hardware timer. On some systems it adds latency overhead vs. TSC timer.

**Benefits:** Can reduce DPC latency by 0.1-0.5ms, reducing micro-stutters in games.

**Risks/Cons:** Some apps depend on HPET. Extremely system-specific — can cause instability.

**Expert details:** Uses 'bcdedit /deletevalue useplatformclock' and '/set disabledynamictick yes'. Disables the High Precision Event Timer at the OS level, forcing Windows to use the invariant TSC (Time Stamp Counter). HPET reads require expensive DPC hardware polling, causing stutters.

**Interactions with other tweaks:** Can cause system timing drift on very old platforms (Core 2 Duo era). On modern Ryzen/Core systems, disabling HPET significantly improves 1% low framerates.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
bcdedit /deletevalue useplatformclock 2>$null; bcdedit /set useplatformtick yes; bcdedit /set disabledynamictick yes
```

**Revert:**
```powershell
bcdedit /deletevalue useplatformtick 2>$null; bcdedit /deletevalue disabledynamictick 2>$null
```

</details>

---

### 🟢 Disable Mouse Acceleration

**ID:** `MouseAccelOff` | **Category:** Gaming | **Risk:** Green

Enables 1:1 raw mouse input by disabling pointer acceleration.

**How it works:** Sets SmoothMouseXCurve and SmoothMouseYCurve to a linear 1:1 mapping.

**Benefits:** Consistent aiming in FPS games — your aim matches your hand movement exactly.

**Risks/Cons:** Desktop navigation may feel slower until you adjust to higher DPI settings.

**Expert details:** Regedit 'HKCU\Control Panel\Mouse\MouseSpeed' = 0 and sets the exact curve array 'SmoothMouseXCurve'/'SmoothMouseYCurve' to linear 1:1 maps. Bypasses the 'Enhance Pointer Precision' algorithm that dynamically scales cursor speed based on physical mouse velocity.

**Interactions with other tweaks:** Critical for raw input in older games. Modern games using Raw Input API bypass this entirely, making the tweak mostly for desktop/legacy parity.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKCU:\Control Panel\Mouse' -Name 'MouseSpeed' -Value '0' -Force; Set-ItemProperty -Path 'HKCU:\Control Panel\Mouse' -Name 'MouseThreshold1' -Value '0' -Force; Set-ItemProperty -Path 'HKCU:\Control Panel\Mouse' -Name 'MouseThreshold2' -Value '0' -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKCU:\Control Panel\Mouse' -Name 'MouseSpeed' -Value '1' -Force; Set-ItemProperty -Path 'HKCU:\Control Panel\Mouse' -Name 'MouseThreshold1' -Value '6' -Force; Set-ItemProperty -Path 'HKCU:\Control Panel\Mouse' -Name 'MouseThreshold2' -Value '10' -Force
```

</details>

---

### 🟡 Enable Hardware GPU Scheduling

**ID:** `EnableHWGPUScheduling` | **Category:** Gaming | **Risk:** Yellow

Enables hardware-accelerated GPU scheduling for lower input latency.

**How it works:** Moves GPU memory management from the CPU to the GPU's own scheduling processor.

**Benefits:** Reduces input latency by 1-3ms. Less CPU overhead for GPU operations.

**Risks/Cons:** Requires WDDM 2.7+ GPU drivers (NVIDIA 10xx/RTX, AMD RX 5000+). May cause instability on older GPUs.

**Expert details:** Modifies 'HKLM\SYSTEM\CurrentControlSet\Control\GraphicsDrivers\HwSchMode' = 2. Offloads high-frequency graphics scheduling from the CPU to a dedicated hardware processor on the GPU. Reduces CPU overhead in heavily draw-call bound scenarios.

**Interactions with other tweaks:** Requires a reboot and WDDM 2.7+ capable drivers. Can cause stability issues or VR stuttering on specific NVIDIA/AMD driver revisions.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers' -Name 'HwSchMode' -Value 2 -Type DWord -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers' -Name 'HwSchMode' -Value 1 -Type DWord -Force
```

</details>

---

### 🔴 Disable CPU Power Throttling ⚠️ **Expert Mode Required**

**ID:** `DisablePowerThrottling` | **Category:** Gaming | **Risk:** Red

Prevents Windows from throttling CPU performance for background efficiency.

**How it works:** Windows 10+ uses Power Throttling to slow down background apps. This disables it entirely.

**Benefits:** All processes run at full CPU speed. Eliminates frame drops from throttled threads.

**Risks/Cons:** Higher power consumption and heat. Not recommended for laptops on battery.

**Expert details:** Sets 'HKLM\SYSTEM\CurrentControlSet\Control\Power\PowerThrottling\PowerThrottlingOff' = 1. Prevents Windows 10/11 from aggressively putting background processes into EcoQoS (Efficiency mode), which limits them to E-cores or lowers their clock speed.

**Interactions with other tweaks:** Increases battery drain on laptops significantly. Counteracts the OS scheduler's attempt to isolate intensive games from background polling.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Power\PowerThrottling' -Name 'PowerThrottlingOff' -Value 1 -Type DWord -Force
```

**Revert:**
```powershell
Remove-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Power\PowerThrottling' -Name 'PowerThrottlingOff' -EA SilentlyContinue
```

</details>

---

### 🔴 Set CSRSS to High Priority ⚠️ **Expert Mode Required**

**ID:** `CSRSSHighPriority` | **Category:** Gaming | **Risk:** Red

Sets the Windows Client/Server Runtime to high priority for smoother input processing.

**How it works:** CSRSS handles raw input (mouse/keyboard). Higher priority = faster input processing.

**Benefits:** Measurably reduces mouse input latency in competitive games.

**Risks/Cons:** Other system processes get less CPU time. Can cause instability on weak CPUs.

**Expert details:** Changes the CPUPriorityClass of the Client Server Runtime Process (csrss.exe) from normal to High via 'HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Image File Execution Options\csrss.exe'. This prioritizes hardware interrupt and Win32 subsystem handling.

**Interactions with other tweaks:** Can slightly decrease input latency. Incorrectly setting this to 'Realtime' (Hex 3) instead of 'High' (Hex 4) would cause catastrophic system freezes.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Image File Execution Options\csrss.exe\PerfOptions' -Name 'CpuPriorityClass' -Value 4 -Type DWord -Force; Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Image File Execution Options\csrss.exe\PerfOptions' -Name 'IoPriority' -Value 3 -Type DWord -Force
```

**Revert:**
```powershell
Remove-Item -Path 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Image File Execution Options\csrss.exe' -Recurse -Force -EA SilentlyContinue
```

</details>

---

### 🟡 Disable Windows Game Mode

**ID:** `DisableGameMode` | **Category:** Gaming | **Risk:** Yellow

Disables Windows Game Mode which can paradoxically cause stuttering in some games.

**How it works:** Game Mode is supposed to prioritize games, but its background thread management often causes stutters.

**Benefits:** Eliminates Game Mode-induced micro-stutters and frame time inconsistencies.

**Risks/Cons:** You lose Game Mode's automatic background app suppression.

**Expert details:** Disables Windows 'Game Mode' ('HKCU\Software\Microsoft\GameBar\AllowAutoGameMode'). Historically, Game Mode caused massive stuttering by overly aggressively locking out background processes (like OBS or Discord).

**Interactions with other tweaks:** In newer Windows 11 builds, Game Mode is generally stable and beneficial. Disabling it is now mostly for troubleshooting encoder streams (e.g. OBS NVENC dropframes).

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\GameBar' -Name 'AllowAutoGameMode' -Value 0 -Type DWord -Force; Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\GameBar' -Name 'AutoGameModeEnabled' -Value 0 -Type DWord -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\GameBar' -Name 'AllowAutoGameMode' -Value 1 -Type DWord -Force; Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\GameBar' -Name 'AutoGameModeEnabled' -Value 1 -Type DWord -Force
```

</details>

---

### 🟡 Optimize Prefetcher for SSD

**ID:** `OptimizePrefetcherSSD` | **Category:** Gaming | **Risk:** Yellow

Sets Prefetcher to application-launch-only mode optimized for SSDs.

**How it works:** Windows Prefetcher pre-loads app data on boot. On SSDs, only app launch prefetch is useful.

**Benefits:** Reduces unnecessary SSD writes while keeping app launch optimization.

**Risks/Cons:** Boot prefetching is disabled (negligible on SSDs).

**Expert details:** Modifies 'HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management\PrefetchParameters\EnablePrefetcher' to 1 or 0 (disabling it). Wait, typically for SSDs, Prefetch is disabled or reduced (set to 1 for App launch, 3 is default). Reduces sequential disk caching.

**Interactions with other tweaks:** If 'DisableSysMain' is used, this tweak is technically obsolete since SysMain controls the Prefetcher service engine.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management\PrefetchParameters' -Name 'EnablePrefetcher' -Value 1 -Type DWord -Force; Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management\PrefetchParameters' -Name 'EnableSuperfetch' -Value 0 -Type DWord -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management\PrefetchParameters' -Name 'EnablePrefetcher' -Value 3 -Type DWord -Force; Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management\PrefetchParameters' -Name 'EnableSuperfetch' -Value 3 -Type DWord -Force
```

</details>

---

### 🔴 Enable Large System Cache ⚠️ **Expert Mode Required**

**ID:** `LargeSystemCache` | **Category:** Gaming | **Risk:** Red

Configures Windows to use more RAM for file caching — beneficial for 16GB+ systems.

**How it works:** Tells the memory manager to use more RAM for file system cache instead of limiting it.

**Benefits:** Faster file I/O and game loading on systems with plenty of RAM.

**Risks/Cons:** May reduce available RAM for applications on 8GB systems. Only for 16GB+.

**Expert details:** Modifies 'HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management\LargeSystemCache' to 1. Forces Windows to allocate a massive chunk of RAM (up to 1 TB) for the file system cache, reducing disk reads.

**Interactions with other tweaks:** Highly detrimental on systems with < 16GB RAM as it starves active applications of physical memory, forcing them into the pagefile. Excellent for dedicated storage servers.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management' -Name 'LargeSystemCache' -Value 1 -Type DWord -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management' -Name 'LargeSystemCache' -Value 0 -Type DWord -Force
```

</details>

---

### 🟢 Disable Network Adapter Power Saving

**ID:** `DisableAdapterPowerSaving` | **Category:** Gaming | **Risk:** Green

Prevents Windows from putting your network adapter to sleep to save power.

**How it works:** Disables 'Allow the computer to turn off this device to save power' for all network adapters.

**Benefits:** Eliminates random network disconnects during gaming and high latency spikes.

**Risks/Cons:** Slightly higher idle power consumption.

**Expert details:** Iterates through network adapters in WMI/CIM and disables 'PnPCapabilities' (Allow the computer to turn off this device). Prevents the network card from sleeping during brief periods of inactivity.

**Interactions with other tweaks:** Fixes connection drops in competitive multiplayer games running on restrictive laptop power plans. Increases power draw.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Get-NetAdapter -Physical | Get-NetAdapterPowerManagement -EA SilentlyContinue | ForEach-Object { $_.AllowComputerToTurnOffDevice = 'Disabled'; $_ | Set-NetAdapterPowerManagement -EA SilentlyContinue }
```

**Revert:**
```powershell
Get-NetAdapter -Physical | Get-NetAdapterPowerManagement -EA SilentlyContinue | ForEach-Object { $_.AllowComputerToTurnOffDevice = 'Enabled'; $_ | Set-NetAdapterPowerManagement -EA SilentlyContinue }
```

</details>

---

### 🟡 Maximize MMCSS Gaming Thread Priority

**ID:** `MMCSSPriority` | **Category:** Gaming | **Risk:** Yellow

Maximizes the Multimedia Class Scheduler priority for gaming threads.

**How it works:** MMCSS manages thread priorities for multimedia/gaming. This maximizes its effect.

**Benefits:** Game audio/video threads get maximum scheduling priority.

**Risks/Cons:** Non-gaming applications may get slightly less CPU time.

**Expert details:** Refines the Multimedia Class Scheduler Service ('HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile'). Adjusts 'NetworkThrottlingIndex' to FFFFFFFF and 'SystemResponsiveness' to 0.

**Interactions with other tweaks:** A superset of 'SystemResponsiveness'. Works alongside 'Optimize TCP/IP Stack' to prevent packet throttling during high-bandwidth media playback or gaming.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile' -Name 'SystemResponsiveness' -Value 0 -Type DWord -Force; Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games' -Name 'Priority' -Value 6 -Type DWord -Force; Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games' -Name 'Scheduling Category' -Value 'High' -Type String -Force; Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games' -Name 'SFIO Priority' -Value 'High' -Type String -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile' -Name 'SystemResponsiveness' -Value 20 -Type DWord -Force; Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games' -Name 'Priority' -Value 2 -Type DWord -Force
```

</details>

---

### 🟢 Disable Xbox Game Monitoring Service

**ID:** `DisableXboxGameMonitoring` | **Category:** Gaming | **Risk:** Green

Disables the xbgm background monitoring service that tracks game usage.

**How it works:** The xbgm service monitors game sessions for Xbox integration and telemetry.

**Benefits:** Removes background monitoring overhead during gaming sessions.

**Risks/Cons:** Xbox achievements and play time tracking won't update.

**Expert details:** Disables the 'xbgm' service. This service monitors the execution of games and hooks into them to provide Xbox Live presence and Game Bar metrics.

**Interactions with other tweaks:** Breaks Xbox achievements, Game Pass verification, and Xbox friend invites. Essential to completely detaching Xbox telemetry from Win32 games.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
schtasks /Change /TN '\Microsoft\XblGameSave\XblGameSaveTask' /Disable 2>$null; schtasks /Change /TN '\Microsoft\XblGameSave\XblGameSaveTaskLogon' /Disable 2>$null; if (Get-Service -Name 'xbgm' -EA SilentlyContinue) { Stop-Service -Name 'xbgm' -Force -EA SilentlyContinue; Set-Service -Name 'xbgm' -StartupType Disabled -EA SilentlyContinue }
```

**Revert:**
```powershell
schtasks /Change /TN '\Microsoft\XblGameSave\XblGameSaveTask' /Enable 2>$null; schtasks /Change /TN '\Microsoft\XblGameSave\XblGameSaveTaskLogon' /Enable 2>$null
```

</details>

---

### 🔴 Disable Core Isolation / Memory Integrity ⚠️ **Expert Mode Required**

**ID:** `DisableMemoryIntegrity` | **Category:** Gaming | **Risk:** Red

Disables Virtualization-Based Security memory integrity for 5-10% FPS gain.

**How it works:** VBS/HVCI uses Hyper-V to verify kernel code integrity, adding overhead to every driver call.

**Benefits:** Significant FPS improvement (5-10%) in CPU-bound games. Reduces DPC latency.

**Risks/Cons:** Disables a key security feature. Not recommended for machines handling sensitive data.

**Expert details:** Disables Hypervisor-protected Code Integrity (HVCI) via 'HKLM\SYSTEM\CurrentControlSet\Control\DeviceGuard\Scenarios\HypervisorEnforcedCodeIntegrity'. This feature uses virtualization to protect the kernel, but introduces severe virtualization overhead during gaming cache misses.

**Interactions with other tweaks:** Disabling it can improve CPU-bound 1% lows by 5-15%, but significantly reduces security against sophisticated kernel-level rootkits (and some anti-cheat systems).

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\DeviceGuard\Scenarios\HypervisorEnforcedCodeIntegrity' -Name 'Enabled' -Value 0 -Type DWord -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\DeviceGuard\Scenarios\HypervisorEnforcedCodeIntegrity' -Name 'Enabled' -Value 1 -Type DWord -Force
```

</details>

---

### 🔴 Enable GPU MSI Mode (Message Signaled Interrupts) ⚠️ **Expert Mode Required**

**ID:** `EnableGPUMSIMode` | **Category:** Gaming | **Risk:** Red

Enables MSI mode for your GPU, reducing interrupt latency for smoother gaming.

**How it works:** MSI replaces line-based interrupts with message-based ones, reducing DPC latency.

**Benefits:** Lower DPC latency (1-3ms reduction). Smoother frame delivery. Reduces micro-stutters.

**Risks/Cons:** May cause BSODs on unsupported hardware. Research your GPU model first.

**Expert details:** Modifies individual PCI registry keys under 'HKLM\SYSTEM\CurrentControlSet\Enum\PCI' to enable Message Signaled Interrupts (MSI) for the GPU. Replaces legacy Line-Based IRQ sharing, allowing the GPU to send interrupt signals without polling wait times.

**Interactions with other tweaks:** Solves DPC Latency spikes (dxgkrnl.sys). If a GPU driver doesn't support MSI natively, forcing this will cause a BSOD loop on boot.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
$gpuDevice = Get-PnpDevice -Class Display -Status OK | Select-Object -First 1; if ($gpuDevice) { $instanceId = $gpuDevice.InstanceId -replace '\\','\\'; $path = "HKLM:\SYSTEM\CurrentControlSet\Enum\$($gpuDevice.InstanceId)\Device Parameters\Interrupt Management\MessageSignaledInterruptProperties"; if (!(Test-Path $path)) { New-Item -Path $path -Force | Out-Null }; Set-ItemProperty -Path $path -Name 'MSISupported' -Value 1 -Type DWord -Force }
```

**Revert:**
```powershell
$gpuDevice = Get-PnpDevice -Class Display -Status OK | Select-Object -First 1; if ($gpuDevice) { $path = "HKLM:\SYSTEM\CurrentControlSet\Enum\$($gpuDevice.InstanceId)\Device Parameters\Interrupt Management\MessageSignaledInterruptProperties"; Set-ItemProperty -Path $path -Name 'MSISupported' -Value 0 -Type DWord -Force -EA SilentlyContinue }
```

</details>

---

### 🟡 Disable Multiplane Overlay (MPO)

**ID:** `DisableMultiplaneOverlay` | **Category:** Gaming | **Risk:** Yellow

Disables MPO which can cause black screens, flickering, and stuttering on some GPU/monitor combos.

**How it works:** MPO lets the GPU composite multiple planes (overlays) in hardware. Buggy implementations cause visual glitches.

**Benefits:** Fixes black screens, flickering, and stuttering in games on affected GPUs (esp. AMD pre-RDNA3).

**Risks/Cons:** Slightly higher GPU power usage for desktop compositing. No impact on modern NVIDIA cards.

**Expert details:** Adds 'OverlayTestMode' DWORD (Value 5) to 'HKLM\SOFTWARE\Microsoft\Windows\Dwm'. Disables MPO, a feature that allows the GPU composer to bypass the DWM for windowed video/gaming.

**Interactions with other tweaks:** Fixes severe black screen flickering, alt-tab stuttering, and cursor trails on specific NVIDIA RTX / AMD RX GPU drivers.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
if (!(Test-Path 'HKLM:\SOFTWARE\Microsoft\Windows\Dwm')) { New-Item -Path 'HKLM:\SOFTWARE\Microsoft\Windows\Dwm' -Force | Out-Null }; Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows\Dwm' -Name 'OverlayTestMode' -Value 5 -Type DWord -Force
```

**Revert:**
```powershell
Remove-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows\Dwm' -Name 'OverlayTestMode' -EA SilentlyContinue
```

</details>

---

### 🔴 Disable Dynamic Tick (Consistent Timer) ⚠️ **Expert Mode Required**

**ID:** `DisableDynamicTick` | **Category:** Gaming | **Risk:** Red

Forces a consistent system timer tick rate instead of Windows' power-saving variable tick. Reduces latency jitter.

**How it works:** Windows uses a dynamic tick by default — it slows the timer when the system is idle to save power. This causes variable timer resolution which adds jitter to frame times.

**Benefits:** More consistent frame pacing and reduced input latency variance. Useful for competitive gaming.

**Risks/Cons:** Slightly increases power consumption (prevents CPU from entering deep sleep between ticks). Requires reboot.

**Expert details:** Sets 'disabledynamictick yes' via bcdedit. Works alongside timer resolution settings. On modern Windows 11, this has less impact than on Windows 10 due to improved scheduler changes, but still measurable on some hardware.

**Interactions with other tweaks:** Pairs well with SystemResponsiveness and GamePriority tweaks. Has synergy with disabling HPET (DisableHPET) for lowest-latency timer behavior.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
bcdedit /set disabledynamictick yes
```

**Revert:**
```powershell
bcdedit /set disabledynamictick no
```

</details>

---

### 🟡 Enable Hardware-Accelerated GPU Scheduling

**ID:** `EnableHAGS` | **Category:** Gaming | **Risk:** Yellow

Enables HAGS, letting the GPU manage its own memory scheduling directly instead of routing through the CPU. Reduces GPU latency on supported hardware.

**How it works:** Normally the Windows GPU scheduler (running on the CPU) manages GPU memory pages. HAGS offloads this to the GPU's own scheduler firmware, reducing round-trip latency between CPU command submission and GPU execution.

**Benefits:** Reduces GPU frame latency by 1–5ms on supported GPUs. Improves frame pacing. Beneficial in CPU-bottlenecked scenarios.

**Risks/Cons:** Can cause instability or driver crashes on older GPUs or with outdated drivers. Some titles report lower average FPS with HAGS on certain driver versions. Requires WDDM 2.7+ driver and Windows 10 2004+.

**Expert details:** Sets HKLM\SYSTEM\CurrentControlSet\Control\GraphicsDrivers HwSchMode=2 (2=enabled, 1=disabled). Requires a modern NVIDIA (GTX 1000+) or AMD (RX 5000+) GPU with an updated driver. Intel Arc also supports it.

**Interactions with other tweaks:** Works alongside DisableDynamicTick and SystemResponsiveness for lower overall GPU latency. No conflicts with other tweaks.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
if (!(Test-Path 'HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers')) { New-Item -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers' -Force | Out-Null }; Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers' -Name 'HwSchMode' -Value 2 -Type DWord -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers' -Name 'HwSchMode' -Value 1 -Type DWord -Force
```

</details>

---

## Privacy

### 🟢 Reduce Telemetry to Basic

**ID:** `DisableTelemetry` | **Category:** Privacy | **Risk:** Green

Minimizes diagnostic data sent to Microsoft.

**How it works:** Sets Windows data collection policy to Level 1 (Basic/Required).

**Benefits:** Enhances privacy and reduces background network activity.

**Risks/Cons:** Microsoft gets less crash data to fix potential OS bugs.

**Expert details:** Sets 'HKLM\SOFTWARE\Policies\Microsoft\Windows\DataCollection\AllowTelemetry' to 0 (Security level on Enterprise/Education) or 1 (Basic level on Home/Pro). Windows uses the 'DiagTrack' (Connected User Experiences and Telemetry) service to upload telemetry blobs containing usage statistics and crash dumps. This restricts the data strictly to OS version and critical error diagnostics.

**Interactions with other tweaks:** Overrides individual telemetry toggles in the Settings app, turning them grey and displaying 'Some settings are managed by your organization'.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
if (!(Test-Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection')) { New-Item -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection' -Force | Out-Null }; Set-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection' -Name 'AllowTelemetry' -Value 1 -Type DWord -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection' -Name 'AllowTelemetry' -Value 3 -Type DWord -Force
```

</details>

---

### 🟢 Disable Activity History

**ID:** `DisableActivityHistory` | **Category:** Privacy | **Risk:** Green

Prevents Windows from tracking your app usage and browsing activity.

**How it works:** Windows collects a timeline of apps, files, and websites you use. This disables that.

**Benefits:** Stops Microsoft from building a timeline of your activity.

**Risks/Cons:** You lose the 'Timeline' feature (press Win+Tab to see past activities).

**Expert details:** Modifies 'HKLM\SOFTWARE\Policies\Microsoft\Windows\System\PublishUserActivities' to 0. This stops Windows from tracking which applications you open and which websites you visit (via Timeline feature) and uploading them to the cloud for cross-device synchronization.

**Interactions with other tweaks:** Disabling this will functionally break the 'Timeline' view in Task View on older Windows 10 versions.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\System' -Name 'EnableActivityFeed' -Value 0 -Type DWord -Force; Set-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\System' -Name 'PublishUserActivities' -Value 0 -Type DWord -Force; Set-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\System' -Name 'UploadUserActivities' -Value 0 -Type DWord -Force
```

**Revert:**
```powershell
Remove-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\System' -Name 'EnableActivityFeed' -EA SilentlyContinue; Remove-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\System' -Name 'PublishUserActivities' -EA SilentlyContinue; Remove-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\System' -Name 'UploadUserActivities' -EA SilentlyContinue
```

</details>

---

### 🟢 Disable Diagnostic Data Collection

**ID:** `DisableDiagnosticData` | **Category:** Privacy | **Risk:** Green

Stops the Connected User Experiences and Telemetry service.

**How it works:** The DiagTrack service sends diagnostic data to Microsoft in the background.

**Benefits:** Reduces CPU/network usage from background data collection.

**Risks/Cons:** Microsoft receives no crash data to improve future updates.

**Expert details:** Works alongside 'DisableTelemetry'. Specifically disables the diagnostic data viewer schedule ('DiagTrack-Listener') and clears existing diagnostic logs by triggering a 'Delete-DiagnosticData' CIM call.

**Interactions with other tweaks:** Saves a minor amount of SSD space by preventing local telemetry JSON blobs from piling up in 'C:\ProgramData\Microsoft\Diagnosis'.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Stop-Service -Name 'DiagTrack' -Force -EA SilentlyContinue; Set-Service -Name 'DiagTrack' -StartupType Disabled
```

**Revert:**
```powershell
Set-Service -Name 'DiagTrack' -StartupType Automatic; Start-Service -Name 'DiagTrack' -EA SilentlyContinue
```

</details>

---

### 🟢 Disable Advertising ID

**ID:** `DisableAdvertisingId` | **Category:** Privacy | **Risk:** Green

Prevents apps from using your advertising ID for targeted ads.

**How it works:** Windows assigns a unique advertising ID to your profile for cross-app ad targeting.

**Benefits:** Apps can no longer track you via advertising identifiers.

**Risks/Cons:** Ads you see may be less relevant (which many consider a benefit).

**Expert details:** Sets 'Enabled' to 0 in 'HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\AdvertisingInfo'. Disables the unique device GUID that Microsoft apps use to provide personalized retargeted advertisements across the OS.

**Interactions with other tweaks:** Ads in Windows apps will still appear, but they will be generic rather than tracked to your personal Microsoft Account behavior.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
if (!(Test-Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\AdvertisingInfo')) { New-Item -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\AdvertisingInfo' -Force | Out-Null }; Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\AdvertisingInfo' -Name 'Enabled' -Value 0 -Type DWord -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\AdvertisingInfo' -Name 'Enabled' -Value 1 -Type DWord -Force
```

</details>

---

### 🟡 Disable Location Tracking

**ID:** `DisableLocationTracking` | **Category:** Privacy | **Risk:** Yellow

Prevents Windows and apps from accessing your physical location.

**How it works:** Disables the Windows Location Framework that provides GPS/WiFi-based positioning to apps.

**Benefits:** No app or service can determine your physical location.

**Risks/Cons:** Weather, Maps, Find My Device, and location-based apps will stop working.

**Expert details:** Disables the 'lfsvc' (Geolocation Service) via 'HKLM\SYSTEM\CurrentControlSet\Services' and revokes global location app permissions in 'LetAppsAccessLocation'.

**Interactions with other tweaks:** Breaks automated time-zone switching and accuracy of weather/maps apps. Applications will either prompt for manual zip codes or fail to geolocate.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
if (!(Test-Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\LocationAndSensors')) { New-Item -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\LocationAndSensors' -Force | Out-Null }; Set-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\LocationAndSensors' -Name 'DisableLocation' -Value 1 -Type DWord -Force
```

**Revert:**
```powershell
Remove-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\LocationAndSensors' -Name 'DisableLocation' -EA SilentlyContinue
```

</details>

---

### 🟢 Disable Clipboard Cloud Sync

**ID:** `DisableClipboardSync` | **Category:** Privacy | **Risk:** Green

Prevents your clipboard contents from being uploaded to Microsoft's cloud.

**How it works:** Windows can sync your clipboard across devices via your Microsoft account. This disables that.

**Benefits:** Sensitive copied text (passwords, keys) never leaves your device.

**Risks/Cons:** You lose cross-device paste capability.

**Expert details:** Zeroes out 'AllowCrossDeviceClipboard' in 'HKLM\SOFTWARE\Policies\Microsoft\Windows\System'. Stops the 'cbdhsvc' (Clipboard User Service) from uploading your copied text and images (Win+V history) to Microsoft servers.

**Interactions with other tweaks:** Does not break local clipboard history (Win+V), only the cross-device sync feature associated with your Microsoft Account.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Clipboard' -Name 'EnableClipboardHistory' -Value 0 -Type DWord -Force; if (!(Test-Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\System')) { New-Item -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\System' -Force | Out-Null }; Set-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\System' -Name 'AllowCrossDeviceClipboard' -Value 0 -Type DWord -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Clipboard' -Name 'EnableClipboardHistory' -Value 1 -Type DWord -Force; Set-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\System' -Name 'AllowCrossDeviceClipboard' -Value 1 -Type DWord -Force
```

</details>

---

### 🟢 Disable Cortana

**ID:** `DisableCortana` | **Category:** Privacy | **Risk:** Green

Disables Cortana assistant and prevents it from collecting data.

**How it works:** Cortana collects voice, typing, and search data. This policy disables it system-wide.

**Benefits:** Eliminates Microsoft's voice/search data collection. Reduces background CPU.

**Risks/Cons:** You lose Cortana voice commands and smart search.

**Expert details:** Sets 'AllowCortana' to 0 in 'HKLM\SOFTWARE\Policies\Microsoft\Windows\Windows Search'. Prevents the Cortana agent from running in the background and listening for 'Hey Cortana' voice triggers. On Win11, this affects remnants of the legacy voice assistant.

**Interactions with other tweaks:** Saves ~30-50MB of background RAM. No longer highly relevant on Windows 11 as Cortana is deprecated in favor of Copilot, but good for legacy cleanup.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
if (!(Test-Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\Windows Search')) { New-Item -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\Windows Search' -Force | Out-Null }; Set-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\Windows Search' -Name 'AllowCortana' -Value 0 -Type DWord -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\Windows Search' -Name 'AllowCortana' -Value 1 -Type DWord -Force
```

</details>

---

### 🟢 Disable Windows Error Reporting

**ID:** `DisableErrorReporting` | **Category:** Privacy | **Risk:** Green

Stops crash reports from being sent to Microsoft.

**How it works:** WER collects crash dumps and sends them to Microsoft for analysis.

**Benefits:** No crash data leaves your machine. Saves bandwidth and CPU.

**Risks/Cons:** Microsoft cannot analyze crashes to improve driver/OS stability.

**Expert details:** Modifies 'HKLM\SOFTWARE\Microsoft\Windows\Windows Error Reporting\Disabled' to 1. Stops WerFault.exe from intercepting application crashes to dump memory and send it to Microsoft.

**Interactions with other tweaks:** Severely hampers your ability to debug BSODs or application crashes, as minidumps will no longer be reliably generated.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows\Windows Error Reporting' -Name 'Disabled' -Value 1 -Type DWord -Force; Stop-Service -Name 'WerSvc' -Force -EA SilentlyContinue; Set-Service -Name 'WerSvc' -StartupType Disabled
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows\Windows Error Reporting' -Name 'Disabled' -Value 0 -Type DWord -Force; Set-Service -Name 'WerSvc' -StartupType Manual
```

</details>

---

### 🟢 Disable Bing Search in Start Menu

**ID:** `DisableBingSearch` | **Category:** Privacy | **Risk:** Green

Prevents Start Menu searches from querying Bing/web results.

**How it works:** Every Start Menu keystroke is sent to Bing. This disables web search.

**Benefits:** Faster local-only search. No keystrokes sent to Microsoft.

**Risks/Cons:** You won't see web results in Start Menu search.

**Expert details:** Adds 'DisableSearchBoxSuggestions' to 'HKCU\Software\Policies\Microsoft\Windows\Explorer'. This completely disconnects the Start Menu search bar from Bing, preventing your local keystrokes from being sent to Microsoft servers while searching for local files.

**Interactions with other tweaks:** Massively speeds up Start Menu search results and removes 'web results' clutter. Essential for privacy.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Search' -Name 'BingSearchEnabled' -Value 0 -Type DWord -Force; Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Search' -Name 'CortanaConsent' -Value 0 -Type DWord -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Search' -Name 'BingSearchEnabled' -Value 1 -Type DWord -Force
```

</details>

---

### 🟢 Disable App Suggestions & Tips

**ID:** `DisableAppSuggestions` | **Category:** Privacy | **Risk:** Green

Stops Microsoft from suggesting apps and showing tips/ads.

**How it works:** Windows shows 'suggested apps' in Start Menu and lock screen — essentially ads.

**Benefits:** Removes bloatware suggestions and promotional notifications.

**Risks/Cons:** You won't see Microsoft's recommended apps (most users see this as a benefit).

**Expert details:** Sets 'SubscribedContent-338388Enabled' and 'SubscribedContent-338389Enabled' to 0 in the ContentDeliveryManager. Disables 'suggested apps' (Candy Crush, TikTok) from silently installing or appearing in the Start Menu.

**Interactions with other tweaks:** Prevents the OS from using network bandwidth to download bloatware payload links after major feature updates.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\ContentDeliveryManager' -Name 'SystemPaneSuggestionsEnabled' -Value 0 -Type DWord -Force; Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\ContentDeliveryManager' -Name 'SilentInstalledAppsEnabled' -Value 0 -Type DWord -Force; Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\ContentDeliveryManager' -Name 'SoftLandingEnabled' -Value 0 -Type DWord -Force; Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\ContentDeliveryManager' -Name 'SubscribedContent-338388Enabled' -Value 0 -Type DWord -Force; Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\ContentDeliveryManager' -Name 'SubscribedContent-310093Enabled' -Value 0 -Type DWord -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\ContentDeliveryManager' -Name 'SystemPaneSuggestionsEnabled' -Value 1 -Type DWord -Force; Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\ContentDeliveryManager' -Name 'SilentInstalledAppsEnabled' -Value 1 -Type DWord -Force
```

</details>

---

### 🟢 Disable Tailored Experiences

**ID:** `DisableTailoredExperiences` | **Category:** Privacy | **Risk:** Green

Stops Microsoft from using your diagnostic data for personalized ads.

**How it works:** Microsoft uses your usage data to personalize ads, tips, and recommendations.

**Benefits:** No personalized tracking for advertising purposes.

**Risks/Cons:** Suggestions in Windows may be less relevant.

**Expert details:** Disables 'Tailored Experiences with diagnostic data' in 'Privacy -> Diagnostics & feedback'. Sets 'TailoredExperiencesWithDiagnosticDataEnabled' to 0. Stops Microsoft from using telemetry data to offer tips, ads, and recommendations.

**Interactions with other tweaks:** General privacy tightening. Works well with 'DisableActivityHistory'.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Privacy' -Name 'TailoredExperiencesWithDiagnosticDataEnabled' -Value 0 -Type DWord -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Privacy' -Name 'TailoredExperiencesWithDiagnosticDataEnabled' -Value 1 -Type DWord -Force
```

</details>

---

### 🟢 Disable Handwriting Data Sharing

**ID:** `DisableHandwritingData` | **Category:** Privacy | **Risk:** Green

Prevents Windows from sending handwriting recognition data to Microsoft.

**How it works:** Windows collects handwriting/typing patterns to improve recognition.

**Benefits:** Typing/handwriting patterns stay private.

**Risks/Cons:** Handwriting recognition accuracy may not improve over time.

**Expert details:** Modifies 'HKLM\SOFTWARE\Policies\Microsoft\Windows\TabletPC\PreventHandwritingDataSharing' to 1. Stops the OS from uploading your local ink strokes, typing history, and custom dictionary to Microsoft to 'improve language recognition'.

**Interactions with other tweaks:** Mainly beneficial on 2-in-1 devices or tablets using a stylus. Redundant on desktop machines without touchscreens.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
if (!(Test-Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\TabletPC')) { New-Item -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\TabletPC' -Force | Out-Null }; Set-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\TabletPC' -Name 'PreventHandwritingDataSharing' -Value 1 -Type DWord -Force; if (!(Test-Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\HandwritingErrorReports')) { New-Item -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\HandwritingErrorReports' -Force | Out-Null }; Set-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\HandwritingErrorReports' -Name 'PreventHandwritingErrorReports' -Value 1 -Type DWord -Force
```

**Revert:**
```powershell
Remove-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\TabletPC' -Name 'PreventHandwritingDataSharing' -EA SilentlyContinue; Remove-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\HandwritingErrorReports' -Name 'PreventHandwritingErrorReports' -EA SilentlyContinue
```

</details>

---

### 🟡 Disable App Camera Access

**ID:** `DisableCameraAccess` | **Category:** Privacy | **Risk:** Yellow

Prevents UWP/Store apps from accessing your camera.

**How it works:** Controls the LetAppsAccessCamera policy for Windows Store apps.

**Benefits:** No Store app can spy via your webcam without explicit re-enable.

**Risks/Cons:** Camera won't work in UWP apps (Teams UWP, Camera app). Desktop apps unaffected.

**Expert details:** Sets 'LetAppsAccessCamera' to 2 (Force Deny) in 'HKLM\SOFTWARE\Policies\Microsoft\Windows\AppPrivacy'. Globally blocks UWP apps from accessing the webcam.

**Interactions with other tweaks:** May break Teams/Zoom if they use the UWP abstraction layer; however, native Win32 apps (e.g., Discord) might still bypass this. Highly destructive if you rely on video calls.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\webcam' -Name 'Value' -Value 'Deny' -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\webcam' -Name 'Value' -Value 'Allow' -Force
```

</details>

---

### 🟡 Disable App Microphone Access

**ID:** `DisableMicrophoneAccess` | **Category:** Privacy | **Risk:** Yellow

Prevents UWP/Store apps from accessing your microphone.

**How it works:** Controls the LetAppsAccessMicrophone policy for Windows Store apps.

**Benefits:** No Store app can listen via your microphone without re-enabling.

**Risks/Cons:** Mic won't work in UWP apps. Desktop apps (Discord, Zoom) are unaffected.

**Expert details:** Sets 'LetAppsAccessMicrophone' to 2 (Force Deny). Functionally identical to the camera block but for audio input.

**Interactions with other tweaks:** Breaks Voice Chat in practically all Microsoft Store games/apps. Revert this immediately if your mic 'doesn't work' in Xbox Party Chat.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\microphone' -Name 'Value' -Value 'Deny' -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\microphone' -Name 'Value' -Value 'Allow' -Force
```

</details>

---

### 🟢 Disable Background Apps

**ID:** `DisableBackgroundApps` | **Category:** Privacy | **Risk:** Green

Prevents UWP apps from running in the background consuming resources.

**How it works:** Windows allows Store apps to run background tasks even when not open.

**Benefits:** Saves CPU, RAM, and battery. Reduces telemetry from background apps.

**Risks/Cons:** UWP apps won't receive push notifications or update live tiles.

**Expert details:** Sets 'LetAppsRunInBackground' to 2 in AppPrivacy policies. Prevents UWP (Universal Windows Platform) apps from running suspended background tasks (e.g. Mail syncing, Weather updating, Spotify hardware media keys).

**Interactions with other tweaks:** Saves significant laptop battery life, but prevents you from receiving Mail app notifications and breaks hardware media keys for Store apps.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\BackgroundAccessApplications' -Name 'GlobalUserDisabled' -Value 1 -Type DWord -Force; Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Search' -Name 'BackgroundAppGlobalToggle' -Value 0 -Type DWord -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\BackgroundAccessApplications' -Name 'GlobalUserDisabled' -Value 0 -Type DWord -Force; Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Search' -Name 'BackgroundAppGlobalToggle' -Value 1 -Type DWord -Force
```

</details>

---

### 🟢 Disable Wi-Fi Sense

**ID:** `DisableWiFiSense` | **Category:** Privacy | **Risk:** Green

Prevents Windows from sharing Wi-Fi passwords and auto-connecting to open networks.

**How it works:** Wi-Fi Sense shares your saved Wi-Fi passwords with contacts via Microsoft's cloud.

**Benefits:** Your Wi-Fi credentials stay private and are not uploaded to Microsoft.

**Risks/Cons:** You can't auto-share Wi-Fi with contacts (most consider this a benefit).

**Expert details:** Disables AutoConnectAllowedOEM in 'WcmSvc\wifinetworkmanager'. Prevents Windows from automatically connecting to open Wi-Fi hotspots and sharing network credentials with Outlook/Skype contacts.

**Interactions with other tweaks:** Removes a major security vulnerability (credential leakage over shared networks).

<details>
<summary>Commands</summary>

**Apply:**
```powershell
if (!(Test-Path 'HKLM:\SOFTWARE\Microsoft\WcmSvc\wifinetworkmanager\config')) { New-Item -Path 'HKLM:\SOFTWARE\Microsoft\WcmSvc\wifinetworkmanager\config' -Force | Out-Null }; Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\WcmSvc\wifinetworkmanager\config' -Name 'AutoConnectAllowedOEM' -Value 0 -Type DWord -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\WcmSvc\wifinetworkmanager\config' -Name 'AutoConnectAllowedOEM' -Value 1 -Type DWord -Force
```

</details>

---

### 🟢 Disable App Contacts Access

**ID:** `DisableContactsAccess` | **Category:** Privacy | **Risk:** Green

Prevents apps from accessing your contacts list.

**How it works:** Denies UWP apps access to the Contacts capability via ConsentStore.

**Benefits:** No app can read your contact list without re-enabling.

**Risks/Cons:** People/Mail apps won't auto-complete contact names.

**Expert details:** Globally revokes App Access to the Windows Contacts database ('LetAppsAccessContacts').

**Interactions with other tweaks:** Breaks autocomplete in the native Mail and People apps.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\contacts' -Name 'Value' -Value 'Deny' -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\contacts' -Name 'Value' -Value 'Allow' -Force
```

</details>

---

### 🟢 Disable App Calendar Access

**ID:** `DisableCalendarAccess` | **Category:** Privacy | **Risk:** Green

Prevents apps from reading your calendar appointments.

**How it works:** Denies UWP apps access to the Calendar capability.

**Benefits:** Calendar data stays private from third-party apps.

**Risks/Cons:** Calendar sync apps won't function properly.

**Expert details:** Globally revokes App Access to the Calendar.

**Interactions with other tweaks:** Breaks the Taskbar calendar flyout agenda view and native Calendar app syncing.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\appointments' -Name 'Value' -Value 'Deny' -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\appointments' -Name 'Value' -Value 'Allow' -Force
```

</details>

---

### 🟢 Disable App Email Access

**ID:** `DisableEmailAccess` | **Category:** Privacy | **Risk:** Green

Prevents apps from reading your email.

**How it works:** Denies UWP apps access to the Email capability.

**Benefits:** No app can silently read your email content.

**Risks/Cons:** Windows Mail app won't function.

**Expert details:** Prevents UWP apps from accessing locally stored email databases.

**Interactions with other tweaks:** Renders the native Windows Mail app completely inoperable until reverted.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\email' -Name 'Value' -Value 'Deny' -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\email' -Name 'Value' -Value 'Allow' -Force
```

</details>

---

### 🟢 Disable App Messaging Access

**ID:** `DisableMessagingAccess` | **Category:** Privacy | **Risk:** Green

Prevents apps from reading or sending SMS/MMS messages.

**How it works:** Denies UWP apps access to the Chat/Messaging capability.

**Benefits:** No app can read your text messages.

**Risks/Cons:** Your Phone Companion messaging won't work.

**Expert details:** Prevents apps from reading or sending SMS/MMS messages (usually via Phone Link).

**Interactions with other tweaks:** Breaks the messaging capabilities of the 'Phone Link' app.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\chat' -Name 'Value' -Value 'Deny' -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\chat' -Name 'Value' -Value 'Allow' -Force
```

</details>

---

### 🟡 Disable App Notification Access

**ID:** `DisableNotificationsAccess` | **Category:** Privacy | **Risk:** Yellow

Prevents apps from accessing your notification history.

**How it works:** Denies UWP apps access to user notifications.

**Benefits:** No app can read your notifications from other apps.

**Risks/Cons:** Some apps that aggregate notifications won't function.

**Expert details:** Prevents apps from reading other apps' notifications.

**Interactions with other tweaks:** Enhances privacy against malicious apps scraping notification contents (like OTPs).

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\userNotificationListener' -Name 'Value' -Value 'Deny' -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\userNotificationListener' -Name 'Value' -Value 'Allow' -Force
```

</details>

---

### 🟢 Disable App Account Info Access

**ID:** `DisableAccountInfoAccess` | **Category:** Privacy | **Risk:** Green

Prevents apps from accessing your Microsoft account name and picture.

**How it works:** Denies UWP apps access to your account information.

**Benefits:** Apps can't see your name, email, or profile picture.

**Risks/Cons:** Some personalized app experiences won't work.

**Expert details:** Sets 'LetAppsAccessAccountInfo' to 2. Stops apps from reading your Microsoft Account name, picture, and domain details.

**Interactions with other tweaks:** Some games downloaded from the Xbox App may fail to authenticate seamlessly if they cannot read your Xbox Live gamertag info.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\userAccountInformation' -Name 'Value' -Value 'Deny' -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\userAccountInformation' -Name 'Value' -Value 'Allow' -Force
```

</details>

---

### 🟢 Disable Online Speech Recognition

**ID:** `DisableOnlineSpeechRecognition` | **Category:** Privacy | **Risk:** Green

Prevents Windows from sending your voice data to Microsoft's cloud for processing.

**How it works:** Disables the cloud-based speech recognition that sends voice to Microsoft servers.

**Benefits:** Your voice data stays on your device. Offline recognition still works.

**Risks/Cons:** Speech recognition quality may be lower without cloud processing.

**Expert details:** Disables the cloud-based speech dictation service (Win+H) which sends your voice to Microsoft for processing.

**Interactions with other tweaks:** Breaks the Win+H dictation overlay completely. Local accessibility speech recognition remains unaffected.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
if (!(Test-Path 'HKCU:\SOFTWARE\Microsoft\Speech_OneCore\Settings\OnlineSpeechPrivacy')) { New-Item -Path 'HKCU:\SOFTWARE\Microsoft\Speech_OneCore\Settings\OnlineSpeechPrivacy' -Force | Out-Null }; Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Speech_OneCore\Settings\OnlineSpeechPrivacy' -Name 'HasAccepted' -Value 0 -Type DWord -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Speech_OneCore\Settings\OnlineSpeechPrivacy' -Name 'HasAccepted' -Value 1 -Type DWord -Force
```

</details>

---

### 🟢 Disable Input Personalization

**ID:** `DisableInputPersonalization` | **Category:** Privacy | **Risk:** Green

Stops Windows from learning your typing patterns and building a user dictionary.

**How it works:** Windows learns your writing style to improve autocomplete. This data can be shared.

**Benefits:** Your typing patterns and vocabulary are not collected.

**Risks/Cons:** Autocomplete and text predictions won't improve over time.

**Expert details:** Clears the local custom dictionary and stops Windows from locally analyzing your typing patterns to predict text.

**Interactions with other tweaks:** You will lose autocorrect and text prediction across native Windows text fields.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\InputPersonalization' -Name 'RestrictImplicitInkCollection' -Value 1 -Type DWord -Force; Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\InputPersonalization' -Name 'RestrictImplicitTextCollection' -Value 1 -Type DWord -Force; Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\InputPersonalization\TrainedDataStore' -Name 'HarvestContacts' -Value 0 -Type DWord -Force; Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Personalization\Settings' -Name 'AcceptedPrivacyPolicy' -Value 0 -Type DWord -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\InputPersonalization' -Name 'RestrictImplicitInkCollection' -Value 0 -Type DWord -Force; Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\InputPersonalization' -Name 'RestrictImplicitTextCollection' -Value 0 -Type DWord -Force
```

</details>

---

### 🟢 Disable Feedback Notifications

**ID:** `DisableFeedback` | **Category:** Privacy | **Risk:** Green

Stops Windows from asking for feedback and sending usage frequency data.

**How it works:** Sets feedback frequency to Never and disables the Feedback Hub prompts.

**Benefits:** No more 'Rate your experience' popups or background feedback collection.

**Risks/Cons:** Microsoft receives less direct user feedback.

**Expert details:** Disables the 'Windows Feedback Experience' service and associated scheduled tasks that periodically prompt 'How likely are you to recommend Windows 10?'.

**Interactions with other tweaks:** Removes a major annoyance with zero drawbacks.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
if (!(Test-Path 'HKCU:\SOFTWARE\Microsoft\Siuf\Rules')) { New-Item -Path 'HKCU:\SOFTWARE\Microsoft\Siuf\Rules' -Force | Out-Null }; Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Siuf\Rules' -Name 'NumberOfSIUFInPeriod' -Value 0 -Type DWord -Force; Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Siuf\Rules' -Name 'PeriodInNanoSeconds' -Value 0 -Type DWord -Force
```

**Revert:**
```powershell
Remove-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Siuf\Rules' -Name 'NumberOfSIUFInPeriod' -EA SilentlyContinue; Remove-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Siuf\Rules' -Name 'PeriodInNanoSeconds' -EA SilentlyContinue
```

</details>

---

### 🟢 Disable Automatic Map Updates

**ID:** `DisableAutomaticMaps` | **Category:** Privacy | **Risk:** Green

Prevents Windows from automatically downloading map data in the background.

**How it works:** Disables the MapsBroker service and auto-update settings.

**Benefits:** Saves bandwidth and disk space from map data downloads.

**Risks/Cons:** Windows Maps app won't have up-to-date offline maps.

**Expert details:** Disables the 'MapsBroker' service out of 'MapsUpdateTask', stopping background downloads of offline map data.

**Interactions with other tweaks:** No negative effects unless you actively use the Windows Maps app offline.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKLM:\SYSTEM\Maps' -Name 'AutoUpdateEnabled' -Value 0 -Type DWord -Force; Stop-Service -Name 'MapsBroker' -Force -EA SilentlyContinue; Set-Service -Name 'MapsBroker' -StartupType Disabled -EA SilentlyContinue
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKLM:\SYSTEM\Maps' -Name 'AutoUpdateEnabled' -Value 1 -Type DWord -Force; Set-Service -Name 'MapsBroker' -StartupType Automatic -EA SilentlyContinue
```

</details>

---

### 🟢 Disable Microsoft Edge Telemetry

**ID:** `DisableEdgeTelemetry` | **Category:** Privacy | **Risk:** Green

Disables Edge browser data collection and telemetry services.

**How it works:** Disables Edge's MicrosoftEdgeUpdate and telemetry scheduled tasks.

**Benefits:** Stops Edge from phoning home when you don't use it as your browser.

**Risks/Cons:** Edge may not auto-update (use Windows Update instead).

**Expert details:** Adds policies to 'HKLM\SOFTWARE\Policies\Microsoft\Edge' (SendSiteInfoToImproveServices, MetricsReportingEnabled) to stop the Edge browser from uploading browsing history and interaction telemetry to MS.

**Interactions with other tweaks:** Works regardless of whether Edge is your primary browser, as webview2 instances are used across the OS.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
if (!(Test-Path 'HKLM:\SOFTWARE\Policies\Microsoft\Edge')) { New-Item -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Edge' -Force | Out-Null }; Set-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Edge' -Name 'MetricsReportingEnabled' -Value 0 -Type DWord -Force; Set-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Edge' -Name 'SendSiteInfoToImproveServices' -Value 0 -Type DWord -Force; Set-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Edge' -Name 'PersonalizationReportingEnabled' -Value 0 -Type DWord -Force
```

**Revert:**
```powershell
Remove-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Edge' -Name 'MetricsReportingEnabled' -EA SilentlyContinue; Remove-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Edge' -Name 'SendSiteInfoToImproveServices' -EA SilentlyContinue
```

</details>

---

### 🟡 Disable Telemetry Scheduled Tasks

**ID:** `DisableTelemetryScheduledTasks` | **Category:** Privacy | **Risk:** Yellow

Disables Windows scheduled tasks that collect and submit telemetry data.

**How it works:** Disables Microsoft Compatibility Appraiser, ProgramDataUpdater, Proxy, and other telemetry tasks.

**Benefits:** Eliminates periodic background telemetry collection that spikes CPU usage.

**Risks/Cons:** Windows compatibility checks and diagnostic data won't run.

**Expert details:** Uses 'schtasks /change /disable' on various deeply embedded Microsoft scheduled tasks under '\Microsoft\Windows\Customer Experience Improvement Program'. Stops the OS from waking up to compress and send telemetry logs.

**Interactions with other tweaks:** Eliminates highly irritating 3 AM CPU/Disk usage spikes common on Windows 10/11.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
$tasks = @('\Microsoft\Windows\Application Experience\Microsoft Compatibility Appraiser','\Microsoft\Windows\Application Experience\ProgramDataUpdater','\Microsoft\Windows\Autochk\Proxy','\Microsoft\Windows\Customer Experience Improvement Program\Consolidator','\Microsoft\Windows\Customer Experience Improvement Program\UsbCeip','\Microsoft\Windows\DiskDiagnostic\Microsoft-Windows-DiskDiagnosticDataCollector'); foreach ($t in $tasks) { schtasks /Change /TN $t /Disable 2>$null }
```

**Revert:**
```powershell
$tasks = @('\Microsoft\Windows\Application Experience\Microsoft Compatibility Appraiser','\Microsoft\Windows\Application Experience\ProgramDataUpdater','\Microsoft\Windows\Autochk\Proxy','\Microsoft\Windows\Customer Experience Improvement Program\Consolidator','\Microsoft\Windows\Customer Experience Improvement Program\UsbCeip'); foreach ($t in $tasks) { schtasks /Change /TN $t /Enable 2>$null }
```

</details>

---

### 🟢 Disable Settings Sync

**ID:** `DisableSettingsSync` | **Category:** Privacy | **Risk:** Green

Prevents Windows from syncing your settings, passwords, and themes to Microsoft's cloud.

**How it works:** Windows syncs theme, password, language, and other settings across devices.

**Benefits:** Your settings and saved passwords never leave your device.

**Risks/Cons:** Settings won't sync to other Windows PCs using your Microsoft account.

**Expert details:** Disables 'Sync your settings' via group policy. Stops Windows from uploading your wallpaper, theme, passwords, and language preferences to the cloud.

**Interactions with other tweaks:** Prevents new Windows installations from automatically pulling down your previous desktop wallpaper and Wi-Fi passwords.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\SettingSync' -Name 'SyncPolicy' -Value 5 -Type DWord -Force; Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\SettingSync\Groups\Personalization' -Name 'Enabled' -Value 0 -Type DWord -Force -EA SilentlyContinue; Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\SettingSync\Groups\BrowserSettings' -Name 'Enabled' -Value 0 -Type DWord -Force -EA SilentlyContinue; Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\SettingSync\Groups\Credentials' -Name 'Enabled' -Value 0 -Type DWord -Force -EA SilentlyContinue
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\SettingSync' -Name 'SyncPolicy' -Value 1 -Type DWord -Force
```

</details>

---

### 🟢 Disable App Radio Control Access

**ID:** `DisableRadiosAccess` | **Category:** Privacy | **Risk:** Green

Prevents apps from controlling your Bluetooth and Wi-Fi radios.

**How it works:** Denies UWP apps access to toggle radios (Bluetooth, Wi-Fi) on/off.

**Benefits:** No app can silently enable Bluetooth or Wi-Fi.

**Risks/Cons:** Some companion apps may not toggle Bluetooth devices.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\radios' -Name 'Value' -Value 'Deny' -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\radios' -Name 'Value' -Value 'Allow' -Force
```

</details>

---

### 🟢 Disable Windows Recall AI

**ID:** `DisableRecallAI` | **Category:** Privacy | **Risk:** Green

Disables Windows Recall that continuously screenshots your activity.

**How it works:** Windows Recall takes periodic screenshots and indexes them with AI. This disables it.

**Benefits:** Prevents AI from recording everything you do on your PC.

**Risks/Cons:** You lose the ability to search past activity with natural language.

**Expert details:** Stops Windows 11's 'Recall' feature by terminating its associated background scanning service and disabling the group policy. Recall takes constant screenshots of the desktop to create an AI-searchable timeline.

**Interactions with other tweaks:** Massive privacy and security gain. Prevents gigabytes of local SSD space from being consumed by unencrypted OCR screenshots.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
if (!(Test-Path 'HKCU:\SOFTWARE\Policies\Microsoft\Windows\WindowsAI')) { New-Item -Path 'HKCU:\SOFTWARE\Policies\Microsoft\Windows\WindowsAI' -Force | Out-Null }; Set-ItemProperty -Path 'HKCU:\SOFTWARE\Policies\Microsoft\Windows\WindowsAI' -Name 'DisableAIDataAnalysis' -Value 1 -Type DWord -Force; if (!(Test-Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsAI')) { New-Item -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsAI' -Force | Out-Null }; Set-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsAI' -Name 'DisableAIDataAnalysis' -Value 1 -Type DWord -Force
```

**Revert:**
```powershell
Remove-ItemProperty -Path 'HKCU:\SOFTWARE\Policies\Microsoft\Windows\WindowsAI' -Name 'DisableAIDataAnalysis' -EA SilentlyContinue; Remove-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsAI' -Name 'DisableAIDataAnalysis' -EA SilentlyContinue
```

</details>

---

### 🟢 Disable Advertising ID

**ID:** `DisableAdvertisingID` | **Category:** Privacy | **Risk:** Green

Disables your unique advertising identifier that Microsoft uses to track you across apps.

**How it works:** Windows assigns a unique advertising ID to your profile for targeted ads in apps and browsers.

**Benefits:** Apps can no longer track you via Microsoft's advertising ID.

**Risks/Cons:** You may see less relevant ads in free Microsoft Store apps.

**Expert details:** Sets 'Enabled' to 0 in 'HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\AdvertisingInfo'. Disables the unique device GUID that Microsoft apps use to provide personalized retargeted advertisements across the OS.

**Interactions with other tweaks:** Ads in Windows apps will still appear, but they will be generic rather than tracked to your personal Microsoft Account behavior.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\AdvertisingInfo' -Name 'Enabled' -Value 0 -Type DWord -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\AdvertisingInfo' -Name 'Enabled' -Value 1 -Type DWord -Force
```

</details>

---

### 🟢 Disable Location Capability Access

**ID:** `DisableLocationCapabilityAccess` | **Category:** Privacy | **Risk:** Green

Disables Windows location services and prevents apps from accessing your location.

**How it works:** Windows collects location data via GPS, Wi-Fi, and IP geolocation. This disables it system-wide.

**Benefits:** No app or Microsoft service can access your physical location.

**Risks/Cons:** Weather, Maps, and Find My Device won't work correctly.

**Expert details:** Similar to DisableLocationTracking but explicitly targets App Privacy capability overrides.

**Interactions with other tweaks:** Redundant if the location service is fully disabled.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\location' -Name 'Value' -Value 'Deny' -Force; Set-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\LocationAndSensors' -Name 'DisableLocation' -Value 1 -Type DWord -Force -EA SilentlyContinue
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\location' -Name 'Value' -Value 'Allow' -Force; Remove-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\LocationAndSensors' -Name 'DisableLocation' -EA SilentlyContinue
```

</details>

---

### 🟢 Disable Clipboard Cloud History

**ID:** `DisableClipboardCloudHistory` | **Category:** Privacy | **Risk:** Green

Prevents clipboard contents from being synced to the cloud across devices.

**How it works:** Windows syncs clipboard data (including copied passwords) across your Microsoft account devices.

**Benefits:** Your clipboard contents (passwords, sensitive text) stay local.

**Risks/Cons:** You can't paste between your Windows devices via the cloud.

**Expert details:** Duplicate or alias for 'DisableClipboardSync'.

**Interactions with other tweaks:** Redundant if clipboard sync is already stopped.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Clipboard' -Name 'EnableCloudClipboard' -Value 0 -Type DWord -Force; Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Clipboard' -Name 'EnableClipboardHistory' -Value 0 -Type DWord -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Clipboard' -Name 'EnableCloudClipboard' -Value 1 -Type DWord -Force; Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Clipboard' -Name 'EnableClipboardHistory' -Value 1 -Type DWord -Force
```

</details>

---

### 🟢 Block Cortana

**ID:** `BlockCortana` | **Category:** Privacy | **Risk:** Green

Disables Cortana and prevents it from running in the background.

**How it works:** Cortana runs as a background process even when not in use, consuming RAM and sending data to Microsoft.

**Benefits:** Saves 50-100MB RAM. No more background data collection by Cortana.

**Risks/Cons:** Voice search and Cortana features will not work.

**Expert details:** Duplicate or alias for 'DisableCortana'.

**Interactions with other tweaks:** Ensures Cortana is fully disabled across different feature updates.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
if (!(Test-Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\Windows Search')) { New-Item -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\Windows Search' -Force | Out-Null }; Set-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\Windows Search' -Name 'AllowCortana' -Value 0 -Type DWord -Force; Set-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\Windows Search' -Name 'AllowCortanaAboveLock' -Value 0 -Type DWord -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\Windows Search' -Name 'AllowCortana' -Value 1 -Type DWord -Force; Remove-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\Windows Search' -Name 'AllowCortanaAboveLock' -EA SilentlyContinue
```

</details>

---

### 🟢 Disable App Launch Tracking

**ID:** `DisableAppLaunchTracking` | **Category:** Privacy | **Risk:** Green

Stops Windows from tracking which apps you launch and how often.

**How it works:** Windows records every app launch to personalize Start Menu and search results. This stops that tracking.

**Benefits:** No more app launch history recorded by Windows.

**Risks/Cons:** Start Menu 'Most used' apps section won't update.

**Expert details:** Stops Windows from tracking which Win32 applications you launch. Normally tracked to populate the 'Most Used' list in the Start Menu.

**Interactions with other tweaks:** The 'Most Used' section in the Start Menu will be blank or freeze updating.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced' -Name 'Start_TrackProgs' -Value 0 -Type DWord -Force; Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced' -Name 'Start_TrackDocs' -Value 0 -Type DWord -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced' -Name 'Start_TrackProgs' -Value 1 -Type DWord -Force; Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced' -Name 'Start_TrackDocs' -Value 1 -Type DWord -Force
```

</details>

---

### 🟢 Disable Feedback Requests

**ID:** `DisableFeedbackFrequency` | **Category:** Privacy | **Risk:** Green

Stops Windows from asking for feedback and sending diagnostic feedback data.

**How it works:** Windows periodically prompts you for feedback about your experience. This silences it.

**Benefits:** No more 'How likely are you to recommend Windows?' popups.

**Risks/Cons:** Microsoft won't receive your feedback about bugs or features.

**Expert details:** Duplicate or alias for 'DisableFeedback'. Sets frequency to 'Never'.

**Interactions with other tweaks:** Quietens the OS.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
if (!(Test-Path 'HKCU:\SOFTWARE\Microsoft\Siuf\Rules')) { New-Item -Path 'HKCU:\SOFTWARE\Microsoft\Siuf\Rules' -Force | Out-Null }; Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Siuf\Rules' -Name 'NumberOfSIUFInPeriod' -Value 0 -Type DWord -Force; Remove-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Siuf\Rules' -Name 'PeriodInNanoSeconds' -EA SilentlyContinue
```

**Revert:**
```powershell
Remove-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Siuf\Rules' -Name 'NumberOfSIUFInPeriod' -EA SilentlyContinue
```

</details>

---

### 🟢 Disable Typing & Inking Data Collection

**ID:** `DisableTypingData` | **Category:** Privacy | **Risk:** Green

Stops Windows from collecting typing patterns and inking data to send to Microsoft.

**How it works:** Windows sends keyboard typing patterns and handwriting data to improve speech/ink recognition models.

**Benefits:** Your typing patterns and handwriting data stay completely private.

**Risks/Cons:** Personalized autocorrect and ink recognition may be less accurate.

**Expert details:** Duplicate or alias for 'DisableHandwritingData'.

**Interactions with other tweaks:** Prevents keylogging-style data collection.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Input\TIPC' -Name 'Enabled' -Value 0 -Type DWord -Force; Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Privacy' -Name 'TailoredExperiencesWithDiagnosticDataEnabled' -Value 0 -Type DWord -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Input\TIPC' -Name 'Enabled' -Value 1 -Type DWord -Force
```

</details>

---

### 🟢 Set Diagnostic Data to Minimum

**ID:** `SetDiagnosticDataMinimum` | **Category:** Privacy | **Risk:** Green

Sets Windows diagnostic data collection to 'Required' (minimum) — the lowest level allowed.

**How it works:** Windows collects diagnostic data at Full or Required levels. This forces the minimum level.

**Benefits:** Minimizes telemetry sent to Microsoft to only what's required for security updates.

**Risks/Cons:** Tailored experiences and optional diagnostic insights won't work.

**Expert details:** Alias for 'DisableTelemetry' specifically targeting the '0' or '1' registry hex value for DiagTrack.

**Interactions with other tweaks:** Requires the 'DiagTrack' service to be running to respect the flag, whereas completely disabling the service halts it entirely.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\DataCollection' -Name 'AllowTelemetry' -Value 0 -Type DWord -Force; Set-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection' -Name 'AllowTelemetry' -Value 0 -Type DWord -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\DataCollection' -Name 'AllowTelemetry' -Value 3 -Type DWord -Force; Remove-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection' -Name 'AllowTelemetry' -EA SilentlyContinue
```

</details>

---

### 🟢 Disable PowerShell 7 Telemetry

**ID:** `DisablePSTelementry` | **Category:** Privacy | **Risk:** Green

Sets the environment variable to disable PowerShell 7+ telemetry data collection.

**How it works:** PowerShell 7+ sends usage telemetry unless the POWERSHELL_TELEMETRY_OPTOUT variable is set.

**Benefits:** No PowerShell usage data sent to Microsoft.

**Risks/Cons:** None. This only affects telemetry, not functionality.

**Expert details:** Sets an environment variable 'POWERSHELL_TELEMETRY_OPTOUT=1' which prevents PowerShell core from sending startup analytics to Microsoft.

**Interactions with other tweaks:** Highly recommended for developers. Invisible to normal users.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
[System.Environment]::SetEnvironmentVariable('POWERSHELL_TELEMETRY_OPTOUT', '1', 'Machine')
```

**Revert:**
```powershell
[System.Environment]::SetEnvironmentVariable('POWERSHELL_TELEMETRY_OPTOUT', $null, 'Machine')
```

</details>

---

### 🟢 Disable Cross-Device Resume

**ID:** `DisableCrossDeviceResume` | **Category:** Privacy | **Risk:** Green

Disables the cross-device activity resume feature in Windows 11 24H2+.

**How it works:** Windows 11 24H2 can resume activities started on your phone or other devices. This disables it.

**Benefits:** No cross-device activity data shared with Microsoft servers.

**Risks/Cons:** You can't resume mobile activities on your PC.

**Expert details:** Disables the CloudStore sync mechanism that allows you to 'continue where you left off' across multiple Windows machines.

**Interactions with other tweaks:** Redundancy check against Timeline and Clipboard sync limitations.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
if (!(Test-Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\CrossDeviceResume\Configuration')) { New-Item -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\CrossDeviceResume\Configuration' -Force | Out-Null }; Set-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\CrossDeviceResume\Configuration' -Name 'IsResumeAllowed' -Value 0 -Type DWord -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\CrossDeviceResume\Configuration' -Name 'IsResumeAllowed' -Value 1 -Type DWord -Force
```

</details>

---

## Network

### 🟢 Disable Network Throttling

**ID:** `DisableNetworkThrottling` | **Category:** Network | **Risk:** Green

Removes bandwidth limits during multimedia playback.

**How it works:** Windows limits network to ~10Mbps while playing video/audio to prevent stuttering. This removes the limit.

**Benefits:** Provides maximum unrestricted download speeds.

**Risks/Cons:** None for modern gigabit local networks.

**Expert details:** Modifies 'HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\NetworkThrottlingIndex' to FFFFFFFF. Normally, Windows throttles non-multimedia network traffic to 10 packets per millisecond to prioritize audio/video playback streams.

**Interactions with other tweaks:** Resolves extreme ping spikes in games when another app (like Spotify or a browser tab) suddenly requests a buffer. No known downsides on modern multi-core CPUs.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile' -Name 'NetworkThrottlingIndex' -Value 0xFFFFFFFF -Type DWord -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile' -Name 'NetworkThrottlingIndex' -Value 10 -Type DWord -Force
```

</details>

---

### 🟢 Disable Nagle's Algorithm

**ID:** `DisableNagle` | **Category:** Network | **Risk:** Green

Sends network packets immediately instead of batching.

**How it works:** Sets TcpAckFrequency and TcpNoDelay to 1 for all active network adapters.

**Benefits:** Reduces ping/latency in online games by preventing packet buffering.

**Risks/Cons:** Slightly increases network overhead, but negligible today.

**Expert details:** Sets 'TcpAckFrequency', 'TCPNoDelay', and 'TcpDelAckTicks' to 1 for all interfaces under 'HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces\'. Nagle's algorithm buffers small packets to send them as a single larger payload, improving bandwidth efficiency but adding latency.

**Interactions with other tweaks:** Critical for competitive gaming as it forces immediate transmission of movement/action packets. It slightly increases total packet overhead on your home router.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
$adapters = Get-NetAdapter | Where-Object {$_.Status -eq 'Up'}; foreach ($adapter in $adapters) { $tcpPath = 'HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces'; Get-ChildItem -Path $tcpPath | ForEach-Object { Set-ItemProperty -Path $_.PSPath -Name 'TcpAckFrequency' -Value 1 -Type DWord -Force -EA SilentlyContinue; Set-ItemProperty -Path $_.PSPath -Name 'TcpNoDelay' -Value 1 -Type DWord -Force -EA SilentlyContinue } }
```

**Revert:**
```powershell
$tcpPath = 'HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces'; Get-ChildItem -Path $tcpPath | ForEach-Object { Remove-ItemProperty -Path $_.PSPath -Name 'TcpAckFrequency' -EA SilentlyContinue; Remove-ItemProperty -Path $_.PSPath -Name 'TcpNoDelay' -EA SilentlyContinue }
```

</details>

---

### 🟡 Optimize TCP/IP Stack

**ID:** `OptimizeTCP` | **Category:** Network | **Risk:** Yellow

Tunes TCP autotuning, ECN, and RSS for maximum throughput.

**How it works:** Adjusts Windows TCP/IP stack parameters: enables RSS, sets autotuning to normal, enables ECN.

**Benefits:** Better network throughput and reduced latency on modern hardware.

**Risks/Cons:** Some older routers or VPNs may not support ECN, causing connectivity issues.

**Expert details:** Uses 'netsh int tcp set global' to apply comprehensive parameters: sets 'autotuninglevel' to normal, disables 'scalingheuristics', disables 'ecncapability', and sets 'timestamps' to disabled.

**Interactions with other tweaks:** Disabling scalingheuristics ensures the TCP receive window isn't aggressively minimized by faulty router implementations. A bedrock baseline for network tuning.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
netsh int tcp set global autotuninglevel=normal; netsh int tcp set global ecncapability=enabled; netsh int tcp set global rss=enabled
```

**Revert:**
```powershell
netsh int tcp set global autotuninglevel=normal; netsh int tcp set global ecncapability=disabled; netsh int tcp set global rss=enabled
```

</details>

---

### 🟢 Set DNS to Cloudflare (1.1.1.1)

**ID:** `SetDNSCloudflare` | **Category:** Network | **Risk:** Green

Sets your primary DNS to Cloudflare's 1.1.1.1 and Google's 8.8.8.8 as backup.

**How it works:** Replaces your ISP's DNS with faster, privacy-focused DNS resolvers.

**Benefits:** Faster resolution, no ISP DNS logging, blocks some phishing domains.

**Risks/Cons:** If Cloudflare is down, falls back to Google DNS.

**Expert details:** Sets primary DNS to 1.1.1.1 and secondary to 1.0.0.1. Directly interfaces with Cloudflare's massive global CDN network for the lowest latency possible.

**Interactions with other tweaks:** Overrides your ISP's default DHCP-assigned DNS.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
$adapters = Get-NetAdapter | Where-Object {$_.Status -eq 'Up'}; foreach ($a in $adapters) { Set-DnsClientServerAddress -InterfaceIndex $a.ifIndex -ServerAddresses ('1.1.1.1','8.8.8.8','1.0.0.1','8.8.4.4') }
```

**Revert:**
```powershell
$adapters = Get-NetAdapter | Where-Object {$_.Status -eq 'Up'}; foreach ($a in $adapters) { Set-DnsClientServerAddress -InterfaceIndex $a.ifIndex -ResetServerAddresses }
```

</details>

---

### 🟢 Expand Ephemeral Port Range

**ID:** `ExpandEphemeralPorts` | **Category:** Network | **Risk:** Green

Expands the dynamic TCP/UDP port range to 1025–65535, reducing port exhaustion under heavy connection loads (servers, gaming, streaming).

**How it works:** Windows defaults to ports 49152–65535 for outbound connections (~16K ports). Expanding to 64K+ ports prevents 'no ports available' failures under high concurrency.

**Benefits:** Prevents connection failures in high-traffic scenarios. Useful for game servers, streaming software, and heavily multi-threaded downloaders.

**Risks/Cons:** Negligible. Wider range just means more ports available; doesn't open inbound attack surface.

**Expert details:** Uses 'netsh int ipv4 set dynamicport tcp start=1025 num=64511'. Ephemeral ports are short-lived transport protocol ports. Expanding the default pool (which is often restricted to 16,384 ports) prevents port exhaustion during heavy torrenting, server loads, or extreme multitasking.

**Interactions with other tweaks:** Only necessary if you regularly open thousands of concurrent connections. Safe baseline tweak.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
netsh int ipv4 set dynamicport tcp start=1025 num=64511; netsh int ipv4 set dynamicport udp start=1025 num=64511
```

**Revert:**
```powershell
netsh int ipv4 set dynamicport tcp start=49152 num=16384; netsh int ipv4 set dynamicport udp start=49152 num=16384
```

</details>

---

### 🟢 Reduce TCP TIME_WAIT Delay

**ID:** `ReduceTCPTimedWaitDelay` | **Category:** Network | **Risk:** Green

Reduces the time TCP connections linger in the TIME_WAIT state from 4 minutes to 30 seconds, allowing ports to be recycled faster.

**How it works:** After a TCP connection closes, Windows holds the port in TIME_WAIT for 240 seconds (default) to catch late-arriving packets. Most modern protocols don't need this long.

**Benefits:** Faster port recycling improves throughput for apps that open many short-lived connections (REST APIs, game matchmaking, download managers).

**Risks/Cons:** Very rare: if packets arrive more than 30s after connection close, they could be mis-associated with a new connection on the same port.

**Expert details:** Sets 'TcpTimedWaitDelay' in 'HKLM\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters' to 30. Changes how long a closed TCP connection stays in the TIME_WAIT state before the socket is released back to the OS pool (from default 120s to 30s).

**Interactions with other tweaks:** Prevents socket exhaustion if you rapidly connect/disconnect from dozens of IPs. Works perfectly alongside 'ExpandEphemeralPorts'.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters' -Name 'TcpTimedWaitDelay' -Value 30 -Type DWord -Force
```

**Revert:**
```powershell
Remove-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters' -Name 'TcpTimedWaitDelay' -ErrorAction SilentlyContinue
```

</details>

---

### 🟢 Optimize DNS Cache Size

**ID:** `OptimizeDNSCache` | **Category:** Network | **Risk:** Green

Increases the Windows DNS cache from its conservative default to 4096 entries and eliminates negative TTL caching, speeding up domain lookups.

**How it works:** The DNS Client service caches resolved hostnames locally. A larger cache means fewer round-trips to DNS servers. Zeroing MaxNegativeCacheTtl prevents caching of failed lookups that may later succeed.

**Benefits:** Faster page loads and connection establishment for frequently visited domains. Reduces DNS server load.

**Risks/Cons:** Slightly more RAM used for the cache (negligible, < 1 MB). Stale entries could persist longer if a DNS record changes mid-session.

**Expert details:** Increases 'MaxCacheTtl' (to 86400) and 'MaxNegativeCacheTtl' (to 0) in 'HKLM\SYSTEM\CurrentControlSet\Services\Dnscache\Parameters'. Caches successful DNS queries for 24 hours and ignores negative (failed) queries entirely.

**Interactions with other tweaks:** Speeds up initial connection to heavily visited websites by skipping the 15-30ms DNS resolution phase. Disabling negative cache prevents 'stuck' unresolvable domains.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Services\Dnscache\Parameters' -Name 'MaxCacheSize' -Value 4096 -Type DWord -Force; Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Services\Dnscache\Parameters' -Name 'MaxNegativeCacheTtl' -Value 0 -Type DWord -Force
```

**Revert:**
```powershell
Remove-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Services\Dnscache\Parameters' -Name 'MaxCacheSize' -ErrorAction SilentlyContinue; Remove-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Services\Dnscache\Parameters' -Name 'MaxNegativeCacheTtl' -ErrorAction SilentlyContinue
```

</details>

---

### 🟢 Enable Receive-Side Scaling (RSS)

**ID:** `EnableRSS` | **Category:** Network | **Risk:** Green

Ensures RSS is enabled so incoming network traffic is distributed across multiple CPU cores, preventing a single core from becoming a bottleneck.

**How it works:** Without RSS, all network interrupts are handled by CPU 0 alone. RSS spreads the interrupt processing across cores, improving throughput on multi-core systems under sustained network load.

**Benefits:** Higher sustained throughput, lower CPU usage per-core, reduced network latency under heavy loads.

**Risks/Cons:** None on modern hardware. RSS is a standard feature supported by all modern NICs.

**Expert details:** Uses 'netsh int tcp set global rss=enabled'. Receive-Side Scaling (RSS) allows the network adapter hardware to distribute inbound network processing across multiple CPU cores rather than slamming Core 0.

**Interactions with other tweaks:** Relies entirely on your network adapter supporting RSS (most do). If disabled, high-bandwidth transfers will bottleneck on a single CPU thread.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
netsh int tcp set global rss=enabled
```

**Revert:**
```powershell
netsh int tcp set global rss=disabled
```

</details>

---

### 🟡 Disable TCP Auto-Tuning

**ID:** `DisableTCPAutoTuning` | **Category:** Network | **Risk:** Yellow

Disables Windows' automatic TCP receive-window scaling, which can cause inconsistent throughput on connections with high latency or packet loss.

**How it works:** TCP Auto-Tuning dynamically adjusts the receive buffer window size. On some networks (high-latency satellite, VPN, enterprise firewalls) this can cause throughput to oscillate unpredictably.

**Benefits:** More stable, predictable throughput on problematic connections. Can improve gaming latency on certain ISP configurations.

**Risks/Cons:** On a healthy broadband connection, auto-tuning typically achieves better peak throughput than a fixed window. Only disable if experiencing instability.

**Expert details:** Modifies 'netsh int tcp set global autotuninglevel=disabled'. Restricts the TCP Receive Window to a flat 64KB instead of allowing it to scale dynamically up to 16MB.

**Interactions with other tweaks:** Warning: Only use this if you are on an archaic connection (e.g. < 5 Mbps) or specific VPNs that misbehave. On modern fiber/cable connections, disabling auto-tuning crushes download speeds to 10-20% of their maximum.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
netsh int tcp set global autotuninglevel=disabled
```

**Revert:**
```powershell
netsh int tcp set global autotuninglevel=normal
```

</details>

---

### 🟡 Disable NetBIOS over TCP/IP

**ID:** `DisableNetBIOS` | **Category:** Network | **Risk:** Yellow

Disables the legacy NetBIOS protocol on all active network adapters. Not needed in modern pure-IP environments and eliminates associated attack surface.

**How it works:** NetBIOS is a 1980s protocol used for Windows network discovery and name resolution in pre-Active Directory environments. It generates background broadcast traffic and has known security vulnerabilities (LLMNR poisoning, NBNS spoofing).

**Benefits:** Eliminates broadcast pollution on the network. Removes NBNS/LLMNR attack vectors. Reduces network interface CPU overhead.

**Risks/Cons:** Breaks network discovery on legacy Windows workgroups (Windows XP-era file sharing). Do not disable on corporate networks relying on old NetBIOS-dependent software.

**Expert details:** Disables NetBIOS over TCP/IP in the WMI network adapter configuration. NetBIOS is a legacy broadcast protocol used for older networked file sharing.

**Interactions with other tweaks:** Reduces network broadcast noise and closes an archaic local attack vector. Will break access to old NAS devices or Windows XP/7 shared folders.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
$adapters = Get-WmiObject -Class Win32_NetworkAdapterConfiguration -Filter 'IPEnabled=True'; foreach ($a in $adapters) { $a.SetTcpipNetbios(2) | Out-Null }
```

**Revert:**
```powershell
$adapters = Get-WmiObject -Class Win32_NetworkAdapterConfiguration -Filter 'IPEnabled=True'; foreach ($a in $adapters) { $a.SetTcpipNetbios(0) | Out-Null }
```

</details>

---

### 🟢 Increase IRPStackSize

**ID:** `IncreaseIRPStackSize` | **Category:** Network | **Risk:** Green

Increases the I/O Request Packet stack size for better network file sharing performance.

**How it works:** IRPStackSize controls how many I/O request packets the network stack can queue. Default of 15 is too low for many NAS/SMB setups.

**Benefits:** Faster SMB file transfers. Eliminates 'insufficient server storage' errors.

**Risks/Cons:** Negligible additional memory usage. Safe on all systems.

**Expert details:** Modifies 'IRPStackSize' in 'HKLM\System\CurrentControlSet\Services\LanmanServer\Parameters'. Allocates more memory stack for the local Server service to handle concurrent network file I/O commands.

**Interactions with other tweaks:** Fixes 'Not enough server storage is available' errors when copying massive files over gigabit/10Gb LAN.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Services\LanmanServer\Parameters' -Name 'IRPStackSize' -Value 32 -Type DWord -Force
```

**Revert:**
```powershell
Remove-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Services\LanmanServer\Parameters' -Name 'IRPStackSize' -EA SilentlyContinue
```

</details>

---

### 🟡 Disable IPv6

**ID:** `DisableIPv6` | **Category:** Network | **Risk:** Yellow

Disables IPv6 on all network adapters. Can fix connectivity issues on IPv4-only networks.

**How it works:** Disables the IPv6 protocol stack. Most consumer ISPs still primarily use IPv4.

**Benefits:** Fixes DNS leaks in some VPN configs. Can resolve connectivity issues on IPv4-only networks.

**Risks/Cons:** Breaks IPv6-only services. Some modern apps and services are moving to IPv6.

**Expert details:** Unbinds the IPv6 protocol component from all active network adapters using 'Disable-NetAdapterBinding'.

**Interactions with other tweaks:** Breaks Xbox Live Teredo tunneling, HomeGroup (legacy), and some modern ISPs that use native IPv6 routing. Only applies if your router or VPN struggles with dual-stack leakage.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Get-NetAdapterBinding -ComponentID ms_tcpip6 -EA SilentlyContinue | Disable-NetAdapterBinding -ComponentID ms_tcpip6 -EA SilentlyContinue; Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters' -Name 'DisabledComponents' -Value 255 -Type DWord -Force
```

**Revert:**
```powershell
Get-NetAdapterBinding -ComponentID ms_tcpip6 -EA SilentlyContinue | Enable-NetAdapterBinding -ComponentID ms_tcpip6 -EA SilentlyContinue; Remove-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters' -Name 'DisabledComponents' -EA SilentlyContinue
```

</details>

---

### 🟢 Set DNS to Mullvad (100.64.0.4)

**ID:** `SetDNSMullvad` | **Category:** Network | **Risk:** Green

Sets DNS to Mullvad's privacy-focused DNS with ad/tracker blocking.

**How it works:** Mullvad DNS blocks ads, trackers, and malware at the DNS level. No logs, no data collection.

**Benefits:** Privacy-first DNS with built-in ad/tracker blocking. No logging policy.

**Risks/Cons:** Slower than Cloudflare for raw speed. Some sites may break if ads are blocked.

**Expert details:** Sets DNS to 100.64.0.4. Uses Mullvad's privacy-focused, zero-logging DNS resolvers.

**Interactions with other tweaks:** Overrides ISP DNS. Uncensored and strongly audited for privacy.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
$adapters = Get-NetAdapter | Where-Object {$_.Status -eq 'Up'}; foreach ($a in $adapters) { Set-DnsClientServerAddress -InterfaceIndex $a.ifIndex -ServerAddresses ('194.242.2.3','194.242.2.4') }
```

**Revert:**
```powershell
$adapters = Get-NetAdapter | Where-Object {$_.Status -eq 'Up'}; foreach ($a in $adapters) { Set-DnsClientServerAddress -InterfaceIndex $a.ifIndex -ResetServerAddresses }
```

</details>

---

### 🟢 Set DNS to AdGuard (94.140.14.14)

**ID:** `SetDNSAdGuard` | **Category:** Network | **Risk:** Green

Sets DNS to AdGuard's DNS which blocks ads, trackers, and phishing domains.

**How it works:** AdGuard DNS resolves normal domains but returns NXDOMAIN for known ad/tracker/malware domains.

**Benefits:** System-wide ad blocking at the DNS level. Blocks trackers and phishing sites.

**Risks/Cons:** Some ad-supported sites or services may not work correctly.

**Expert details:** Sets DNS to 94.140.14.14 and 94.140.15.15. Routes all requests through AdGuard's DNS-level sinkhole, dropping requests to known ad and tracking domains.

**Interactions with other tweaks:** Provides system-wide ad blocking (even inside Metro apps) without needing a browser extension.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
$adapters = Get-NetAdapter | Where-Object {$_.Status -eq 'Up'}; foreach ($a in $adapters) { Set-DnsClientServerAddress -InterfaceIndex $a.ifIndex -ServerAddresses ('94.140.14.14','94.140.15.15') }
```

**Revert:**
```powershell
$adapters = Get-NetAdapter | Where-Object {$_.Status -eq 'Up'}; foreach ($a in $adapters) { Set-DnsClientServerAddress -InterfaceIndex $a.ifIndex -ResetServerAddresses }
```

</details>

---

### 🟢 Set DNS to Quad9 (9.9.9.9)

**ID:** `SetDNSQuad9` | **Category:** Network | **Risk:** Green

Sets DNS to Quad9 which provides malware blocking and privacy protection.

**How it works:** Quad9 uses threat intelligence from 40+ partners to block malicious domains at the DNS level.

**Benefits:** Strong malware domain blocking. Non-profit, privacy-focused. Swiss legal jurisdiction.

**Risks/Cons:** Slightly slower than Cloudflare. Very aggressive blocking may rarely flag legitimate sites.

**Expert details:** Sets DNS to 9.9.9.9 and 149.112.112.112. Quad9 cross-references queries against IBM X-Force threat intelligence to silently block malware/phishing domains at the DNS level.

**Interactions with other tweaks:** Provides baseline system security against zero-day phishing links.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
$adapters = Get-NetAdapter | Where-Object {$_.Status -eq 'Up'}; foreach ($a in $adapters) { Set-DnsClientServerAddress -InterfaceIndex $a.ifIndex -ServerAddresses ('9.9.9.9','149.112.112.112') }
```

**Revert:**
```powershell
$adapters = Get-NetAdapter | Where-Object {$_.Status -eq 'Up'}; foreach ($a in $adapters) { Set-DnsClientServerAddress -InterfaceIndex $a.ifIndex -ResetServerAddresses }
```

</details>

---

### 🟢 Set DNS to NextDNS (45.90.28.0)

**ID:** `SetDNSNextDNS` | **Category:** Network | **Risk:** Green

Sets DNS to NextDNS — a customizable DNS with ad blocking, analytics, and parental controls.

**How it works:** NextDNS lets you customize your blocklists online. The default server provides basic protection.

**Benefits:** Highly customizable via nextdns.io dashboard. Excellent analytics and logging controls.

**Risks/Cons:** Free tier limited to 300K queries/month. Full customization requires creating a NextDNS account.

**Expert details:** Sets DNS to 45.90.28.0 and 45.90.30.0. NextDNS is a highly configurable cloud firewall.

**Interactions with other tweaks:** Using the raw IPs provides basic filtering, but to get full customization (custom blocklists), you need their dedicated client or DoH profile.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
$adapters = Get-NetAdapter | Where-Object {$_.Status -eq 'Up'}; foreach ($a in $adapters) { Set-DnsClientServerAddress -InterfaceIndex $a.ifIndex -ServerAddresses ('45.90.28.0','45.90.30.0') }
```

**Revert:**
```powershell
$adapters = Get-NetAdapter | Where-Object {$_.Status -eq 'Up'}; foreach ($a in $adapters) { Set-DnsClientServerAddress -InterfaceIndex $a.ifIndex -ResetServerAddresses }
```

</details>

---

### 🟢 Set DNS to OpenDNS / Cisco Umbrella (208.67.222.222)

**ID:** `SetDNSOpenDNS` | **Category:** Network | **Risk:** Green

Sets DNS to Cisco's OpenDNS with phishing/botnet protection and content filtering.

**How it works:** OpenDNS (now Cisco Umbrella) provides DNS-level security with enterprise-grade threat detection.

**Benefits:** Excellent phishing and botnet protection. Optional content filtering via OpenDNS account.

**Risks/Cons:** Owned by Cisco — may log queries for analytics. Slightly slower in some regions.

**Expert details:** Sets DNS to 208.67.222.222 and 208.67.220.220. A venerable, highly reliable DNS service operated by Cisco.

**Interactions with other tweaks:** Faster than ISP DNS, includes basic anti-phishing.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
$adapters = Get-NetAdapter | Where-Object {$_.Status -eq 'Up'}; foreach ($a in $adapters) { Set-DnsClientServerAddress -InterfaceIndex $a.ifIndex -ServerAddresses ('208.67.222.222','208.67.220.220') }
```

**Revert:**
```powershell
$adapters = Get-NetAdapter | Where-Object {$_.Status -eq 'Up'}; foreach ($a in $adapters) { Set-DnsClientServerAddress -InterfaceIndex $a.ifIndex -ResetServerAddresses }
```

</details>

---

### 🟢 Set DNS to Control D (76.76.2.0)

**ID:** `SetDNSControlD` | **Category:** Network | **Risk:** Green

Sets DNS to Control D — a customizable DNS with ad blocking and geo-unblocking.

**How it works:** Control D provides DNS-level ad blocking and can unblock geo-restricted content.

**Benefits:** Ad blocking + geo-unblocking in one DNS. Very fast resolver infrastructure.

**Risks/Cons:** Full features require a paid account. Free tier is basic DNS resolution.

**Expert details:** Sets DNS to 76.76.2.0 and 76.76.10.0.

**Interactions with other tweaks:** A modern alternative to NextDNS/AdGuard with extremely fast anycast routing.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
$adapters = Get-NetAdapter | Where-Object {$_.Status -eq 'Up'}; foreach ($a in $adapters) { Set-DnsClientServerAddress -InterfaceIndex $a.ifIndex -ServerAddresses ('76.76.2.0','76.76.10.0') }
```

**Revert:**
```powershell
$adapters = Get-NetAdapter | Where-Object {$_.Status -eq 'Up'}; foreach ($a in $adapters) { Set-DnsClientServerAddress -InterfaceIndex $a.ifIndex -ResetServerAddresses }
```

</details>

---

### 🟢 Set DNS to Google (8.8.8.8)

**ID:** `SetDNSGoogle` | **Category:** Network | **Risk:** Green

Sets DNS to Google Public DNS — the most widely used public DNS resolver.

**How it works:** Google Public DNS is a fast, reliable DNS resolver. No ad blocking or filtering.

**Benefits:** Extremely fast and reliable. Massive global infrastructure with low latency.

**Risks/Cons:** Google logs DNS queries (anonymized after 48h). No ad/tracker blocking.

**Expert details:** Sets DNS to 8.8.8.8 and 8.8.4.4. The most widespread public DNS.

**Interactions with other tweaks:** Fastest sheer resolution time globally, but queries are logged by Google.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
$adapters = Get-NetAdapter | Where-Object {$_.Status -eq 'Up'}; foreach ($a in $adapters) { Set-DnsClientServerAddress -InterfaceIndex $a.ifIndex -ServerAddresses ('8.8.8.8','8.8.4.4') }
```

**Revert:**
```powershell
$adapters = Get-NetAdapter | Where-Object {$_.Status -eq 'Up'}; foreach ($a in $adapters) { Set-DnsClientServerAddress -InterfaceIndex $a.ifIndex -ResetServerAddresses }
```

</details>

---

### 🟢 Reset DNS to ISP Default (DHCP)

**ID:** `ResetDNSDefault` | **Category:** Network | **Risk:** Green

Resets DNS back to your ISP's default DNS servers via DHCP.

**How it works:** Removes any manually set DNS servers and lets your router/ISP assign DNS automatically via DHCP.

**Benefits:** Returns to default network configuration. Useful if a custom DNS is causing issues.

**Risks/Cons:** Your ISP can see and log all your DNS queries. Usually slower than public DNS.

**Expert details:** Removes manual DNS server assignments, reverting the adapter back to dynamic (DHCP) from your router.

**Interactions with other tweaks:** Necessary to revert any connection issues caused by a custom DNS going offline.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
$adapters = Get-NetAdapter | Where-Object {$_.Status -eq 'Up'}; foreach ($a in $adapters) { Set-DnsClientServerAddress -InterfaceIndex $a.ifIndex -ResetServerAddresses }
```

**Revert:**
```powershell
Write-Output 'DNS is already at default.'
```

</details>

---

## Power

### 🔴 Disable CPU Core Parking ⚠️ **Expert Mode Required**

**ID:** `DisableCoreParking` | **Category:** Power | **Risk:** Red

Keeps all CPU cores active instead of allowing them to sleep.

**How it works:** Changes the hidden power plan setting CPMINCORES to 100%.

**Benefits:** Eliminates latency penalty from waking up sleeping cores. Great for high-end gaming.

**Risks/Cons:** Significantly increases idle thermals and power draw.

**Expert details:** Modifies the ACPI power-management profile in 'HKLM\SYSTEM\CurrentControlSet\Control\Power\PowerSettings\...\ValueMax' for Core Parking algorithms. Forces Windows to never put logical CPU cores into a deep C-state sleep.

**Interactions with other tweaks:** Massively increases idle temperatures and power consumption. Eliminates completely the microsecond delay caused by waking up a parked core.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
powercfg -setacvalueindex scheme_current sub_processor CPMINCORES 100; powercfg -setactive scheme_current
```

**Revert:**
```powershell
powercfg -setacvalueindex scheme_current sub_processor CPMINCORES 5; powercfg -setactive scheme_current
```

</details>

---

### 🟡 Enable Ultimate Performance Power Plan

**ID:** `UltimatePowerPlan` | **Category:** Power | **Risk:** Yellow

Activates the hidden Ultimate Performance power plan for maximum throughput.

**How it works:** Windows hides a power plan designed for workstations that disables power throttling.

**Benefits:** Eliminates all CPU frequency scaling delays. Maximum responsiveness.

**Risks/Cons:** Higher power consumption and heat generation. Not recommended for laptops.

**Expert details:** Executes 'powercfg -duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61'. Enables an obscured Microsoft Enterprise power plan that hides all power-saving heuristics, disables link state management, and sets CPU minimum state to 100%.

**Interactions with other tweaks:** Overrides 'DisableCoreParking' entirely, as the Ultimate plan natively sets the parking index to 0%. Terribly destructive to laptop battery life.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
powercfg -duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61 2>$null; powercfg /setactive e9a42b02-d5df-448d-aa00-03f14749eb61
```

**Revert:**
```powershell
powercfg /setactive 381b4222-f694-41f0-9685-ff5bb260df2e
```

</details>

---

### 🟢 Disable Hibernation

**ID:** `DisableHibernation` | **Category:** Power | **Risk:** Green

Disables hibernation and reclaims disk space from hiberfil.sys.

**How it works:** Hibernation writes your entire RAM to disk (hiberfil.sys). This disables it.

**Benefits:** Reclaims disk space equal to your RAM size (e.g. 32GB drive space saved).

**Risks/Cons:** You lose the ability to hibernate. Shutdown/restart still works normally.

**Expert details:** Runs 'powercfg.exe /hibernate off'. Deletes the 'hiberfil.sys' file from the root of the C: drive. Disables the ability for the OS to dump RAM contents to disk to enter S4 sleep state.

**Interactions with other tweaks:** Instantly recovers physical disk space equal to 40-75% of your total RAM capacity. Also disables Fast Startup ('DisableFastStartup').

<details>
<summary>Commands</summary>

**Apply:**
```powershell
powercfg -h off
```

**Revert:**
```powershell
powercfg -h on
```

</details>

---

### 🔴 Disable Connected Standby ⚠️ **Expert Mode Required**

**ID:** `DisableConnectedStandby` | **Category:** Power | **Risk:** Red

Disables Modern Standby (S0ix) and uses classic S3 sleep instead.

**How it works:** Modern Standby keeps the CPU partially active, often causing battery drain and wake issues.

**Benefits:** True deep sleep. Eliminates phantom drain and random wake-ups.

**Risks/Cons:** Instant-on wake-up is disabled. PC takes 2-3 seconds longer to wake.

**Expert details:** Modifies 'HKLM\System\CurrentControlSet\Control\Power\CsEnabled' to 0 (or 'PlatformAoAcOverride' to 0 in Win11). Disables Modern Standby (S0ix), forcing the computer back to legacy S3 sleep where power is physically cut to the CPU.

**Interactions with other tweaks:** Fixes issues where laptops drain completely in a backpack and overheat because they were downloading Windows Updates while 'asleep'.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Power' -Name 'PlatformAoAcOverride' -Value 0 -Type DWord -Force
```

**Revert:**
```powershell
Remove-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Power' -Name 'PlatformAoAcOverride' -EA SilentlyContinue
```

</details>

---

### 🟡 Disable Fast Startup

**ID:** `DisableFastStartup` | **Category:** Power | **Risk:** Yellow

Disables Windows Fast Startup (hybrid boot). Ensures full cold boots that apply all pending driver and Windows updates correctly on restart.

**How it works:** Fast Startup saves a partial hibernation file on shutdown so the next boot resumes from that state rather than doing a full cold boot. This means drivers and system state are not fully re-initialized.

**Benefits:** Fixes driver-loading issues, ensures Windows Updates apply on restart, prevents stale system state that can cause BSoDs or performance regressions after updates.

**Risks/Cons:** Slightly slower cold boot (typically 3–8 seconds longer). The difference is negligible on NVMe SSDs.

**Expert details:** Modifies 'HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Power\HiberbootEnabled' to 0. Fast Startup uses a hybrid logoff/hibernate sequence to boot faster. Disabling it ensures a 'True' shutdown, clearing full kernel memory and driver states.

**Interactions with other tweaks:** Increases cold boot time by ~2-5 seconds on SSDs, but resolves 99% of 'uptime'-related memory leaks and driver desync issues.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Power' -Name 'HiberbootEnabled' -Value 0 -Type DWord -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Power' -Name 'HiberbootEnabled' -Value 1 -Type DWord -Force
```

</details>

---

### 🟢 Disable USB Selective Suspend

**ID:** `DisableUSBSelectiveSuspend` | **Category:** Power | **Risk:** Green

Prevents Windows from powering down idle USB devices. Eliminates the reconnection stutter experienced with USB headsets, controllers, and audio interfaces.

**How it works:** USB Selective Suspend lets Windows cut power to idle USB devices to save energy. When the device is needed again, it must wake up — causing a 50–500ms dropout that can disrupt audio, input, or storage.

**Benefits:** No more USB audio dropouts or controller disconnects during gameplay. Zero-latency USB device responses.

**Risks/Cons:** Higher idle power consumption (typically 1–3W for all USB devices combined). Not recommended if maximizing laptop battery life is a priority.

**Expert details:** Modifies 'powercfg' specific index keys for the USB profile. Disables the mechanism where the USB hub driver selectively cuts power to individual USB ports when devices are 'idle'.

**Interactions with other tweaks:** Fixes USB audio DAC popping, mouse sensor polling rate drops, and VR headset disconnections caused by aggressive power gating.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
powercfg -setacvalueindex SCHEME_CURRENT 2a737441-1930-4402-8d77-b2bebba308a3 48e6b7a6-50f5-4782-a5d4-53bb8f07e226 0; powercfg -setdcvalueindex SCHEME_CURRENT 2a737441-1930-4402-8d77-b2bebba308a3 48e6b7a6-50f5-4782-a5d4-53bb8f07e226 0; powercfg -setactive SCHEME_CURRENT
```

**Revert:**
```powershell
powercfg -setacvalueindex SCHEME_CURRENT 2a737441-1930-4402-8d77-b2bebba308a3 48e6b7a6-50f5-4782-a5d4-53bb8f07e226 1; powercfg -setdcvalueindex SCHEME_CURRENT 2a737441-1930-4402-8d77-b2bebba308a3 48e6b7a6-50f5-4782-a5d4-53bb8f07e226 1; powercfg -setactive SCHEME_CURRENT
```

</details>

---

### 🟢 Disable PCIe Link State Power Management

**ID:** `DisablePCIeLinkStatePM` | **Category:** Power | **Risk:** Green

Prevents the PCIe bus from entering low-power states, ensuring GPU and NVMe SSD remain at full performance without latency spikes from power state transitions.

**How it works:** PCIe Active State Power Management (ASPM) allows devices to enter L1/L0s low-power states when idle. Transitioning out of these states takes 10–40µs which causes micro-stutters in games and storage workloads.

**Benefits:** Eliminates GPU micro-stutters and NVMe latency spikes caused by PCIe power state transitions. Particularly noticeable in 1% low frametimes in benchmarks.

**Risks/Cons:** Slightly higher system idle power draw (typically 2–5W). No impact on laptop battery life is minimal if you're gaming on AC anyway.

**Expert details:** Modifies Active State Power Management (ASPM) for the PCI Express bus via 'powercfg'. Changes the link state from 'Maximum power savings' to 'Off'.

**Interactions with other tweaks:** Crucial for preventing NVMe SSDs and discrete GPUs from dropping PCIe gen bandwidth during low loads, which strictly reduces latency spikes.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
powercfg -setacvalueindex SCHEME_CURRENT SUB_PCIEXPRESS ASPM 0; powercfg -setactive SCHEME_CURRENT
```

**Revert:**
```powershell
powercfg -setacvalueindex SCHEME_CURRENT SUB_PCIEXPRESS ASPM 2; powercfg -setactive SCHEME_CURRENT
```

</details>

---

### 🟢 Enable Aggressive CPU Boost Mode

**ID:** `EnableAggressiveCPUBoost` | **Category:** Power | **Risk:** Green

Sets CPU performance boost to Aggressive mode, allowing the processor to reach and sustain its maximum boost clock more readily for compute-intensive workloads.

**How it works:** Windows exposes a CPU performance boost setting through the power plan. Aggressive mode instructs the processor to boost to its turbo frequency more eagerly and maintain it longer, versus Efficient Aggressive which is the common default.

**Benefits:** Higher sustained CPU boost clocks. Reduced latency in single-threaded workloads. Measurable improvement in lightly-threaded games.

**Risks/Cons:** Slightly higher CPU temperature and power draw under sustained boost. On systems without adequate cooling, may cause more thermal throttling.

**Expert details:** Modifies powercfg PROCFREQ attributes (PerfBoostMode) to 'Aggressive'. Forces the CPU governor to respond instantly to any workload spike by raising P-state voltage/clocks.

**Interactions with other tweaks:** Mainly applicable to Ryzen CPUs (CPPC2). Can cause fan RPM spikes ('yo-yo' acoustics) as temperature fluctuates violently with minimal loads.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
powercfg -setacvalueindex SCHEME_CURRENT SUB_PROCESSOR PERFBOOSTMODE 2; powercfg -setactive SCHEME_CURRENT
```

**Revert:**
```powershell
powercfg -setacvalueindex SCHEME_CURRENT SUB_PROCESSOR PERFBOOSTMODE 1; powercfg -setactive SCHEME_CURRENT
```

</details>

---

### 🟢 Disable Adaptive Display Brightness

**ID:** `DisableAdaptiveBrightness` | **Category:** Power | **Risk:** Green

Stops Windows from automatically adjusting display brightness based on ambient light. Provides consistent, predictable brightness levels.

**How it works:** On systems with an ambient light sensor, Windows can dim or brighten the display automatically. This often triggers unexpectedly during gameplay, video watching, or screen recording.

**Benefits:** Consistent brightness without unexpected dimming. Eliminates brightness drift during gaming sessions or screen recordings.

**Risks/Cons:** You must manually adjust brightness for ambient lighting changes. Slightly higher display power draw in bright environments.

**Expert details:** Modifies display power configuration settings. Disables Intel DPST / AMD Vari-Bright via registry or powercfg commands, which dynamically lowers screen brightness based on the dark/light content of the currently rendered frames.

**Interactions with other tweaks:** Restores accurate color rendering and prevents annoying brightness flickering, at the cost of slight battery drain.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
powercfg -setacvalueindex SCHEME_CURRENT SUB_VIDEO ADAPTBRIGHT 0; powercfg -setdcvalueindex SCHEME_CURRENT SUB_VIDEO ADAPTBRIGHT 0; powercfg -setactive SCHEME_CURRENT
```

**Revert:**
```powershell
powercfg -setacvalueindex SCHEME_CURRENT SUB_VIDEO ADAPTBRIGHT 1; powercfg -setdcvalueindex SCHEME_CURRENT SUB_VIDEO ADAPTBRIGHT 1; powercfg -setactive SCHEME_CURRENT
```

</details>

---

### 🟡 Lock CPU Minimum Performance to 100%

**ID:** `SetMinCPUState100` | **Category:** Power | **Risk:** Yellow

Forces the CPU to always operate at 100% of its performance state, eliminating clock speed ramp-up delays at the cost of higher idle power draw.

**How it works:** By default, Windows allows the CPU to idle at as low as 5% of its performance state (e.g., 400 MHz on a 4 GHz chip). Setting the minimum to 100% prevents downclocking, so the CPU is always ready to respond instantly.

**Benefits:** Zero latency to reach full CPU frequency. Eliminates 'wake-up' stutters at the start of frames in CPU-bound games. Measurable improvement in minimum frametimes.

**Risks/Cons:** Significantly higher idle power and heat. CPU will not throttle down when idle, increasing electricity use by 10–30W. Not recommended for laptops or thermally constrained systems.

**Expert details:** Executes 'powercfg -setacvalueindex SCHEME_CURRENT SUB_PROCESSOR PROCTHROTTLEMIN 100'. Forces the CPU to permanently run at its base/boost clock, never downclocking to idle frequencies (e.g. 800MHz).

**Interactions with other tweaks:** Causes extremely high idle temperatures. Provides zero discernible performance gain over the standard 'High Performance' plan which already ramps effectively.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
powercfg -setacvalueindex SCHEME_CURRENT SUB_PROCESSOR PROCTHROTTLEMIN 100; powercfg -setactive SCHEME_CURRENT
```

**Revert:**
```powershell
powercfg -setacvalueindex SCHEME_CURRENT SUB_PROCESSOR PROCTHROTTLEMIN 5; powercfg -setactive SCHEME_CURRENT
```

</details>

---

### 🟡 Enable Ultimate Performance Power Plan

**ID:** `UltimatePerformancePlan` | **Category:** Power | **Risk:** Yellow

Unhides and activates the Ultimate Performance power plan — Microsoft's highest performance preset.

**How it works:** Windows ships with a hidden 'Ultimate Performance' plan that disables all power-saving features. This command enables it.

**Benefits:** Maximum CPU/GPU performance. Eliminates all power-saving latency. Best for desktop gaming rigs.

**Risks/Cons:** Higher power consumption and heat. Not suitable for laptops on battery.

**Expert details:** Duplicate of UltimatePowerPlan (e9a42b02-d5df-448d-aa00-03f14749eb61). Enables Microsoft's Enterprise power profile.

**Interactions with other tweaks:** Overwrites existing Active power plan. Highly recommended to use this instead of manually hacking individual Powercfg PROCFREQ flags.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
powercfg -duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61; powercfg -setactive e9a42b02-d5df-448d-aa00-03f14749eb61
```

**Revert:**
```powershell
powercfg -setactive SCHEME_BALANCED
```

</details>

---

## Tools

### 🟢 Clean Temporary Files

**ID:** `ClearTempFiles` | **Category:** Tools | **Risk:** Green

Deletes Windows temp files, user temp cache, and prefetch data.

**How it works:** Removes files from %TEMP%, Windows\Temp, and Prefetch directories.

**Benefits:** Reclaims disk space. Can fix some app issues caused by stale temp files.

**Risks/Cons:** Apps may take slightly longer to start next time as caches are rebuilt.

**Expert details:** Executes 'Remove-Item -Path $env:TEMP\* -Recurse -Force' and targets 'C:\Windows\Temp\*'. Unlocks and purges stranded installation residue and orphaned application caches.

**Interactions with other tweaks:** Painless and essential. Will fail silently on files currently locked by open processes, which is the intended safe behavior.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Remove-Item -Path "$env:TEMP\*" -Recurse -Force -EA SilentlyContinue; Remove-Item -Path "$env:SystemRoot\Temp\*" -Recurse -Force -EA SilentlyContinue; Remove-Item -Path "$env:SystemRoot\Prefetch\*" -Recurse -Force -EA SilentlyContinue
```

**Revert:**
```powershell
Write-Output 'Temp files cannot be restored after deletion.'
```

</details>

---

### 🟢 Flush DNS Cache

**ID:** `FlushDNS` | **Category:** Tools | **Risk:** Green

Clears the local DNS resolver cache to fix stale domain lookups.

**How it works:** Empties Windows' local DNS cache, forcing fresh lookups for all domains.

**Benefits:** Fixes websites that fail to load due to stale DNS records.

**Risks/Cons:** Temporary slowdown as DNS cache is rebuilt over the next few minutes.

**Expert details:** Runs 'Clear-DnsClientCache'. Immediately voids the local DNS resolver cache, forcing the OS to perform a fresh lookup on the next web request.

**Interactions with other tweaks:** Required instantly after swapping DNS providers or attempting to bypass a stale localization node.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
ipconfig /flushdns; Clear-DnsClientCache
```

**Revert:**
```powershell
Write-Output 'DNS cache will repopulate automatically.'
```

</details>

---

### 🟡 Reset Network Stack

**ID:** `ResetNetworkStack` | **Category:** Tools | **Risk:** Yellow

Resets Winsock, IP stack, and firewall to default — fixes most network issues.

**How it works:** Runs netsh commands to reset the TCP/IP stack, Winsock catalog, and Windows Firewall to factory defaults.

**Benefits:** Fixes VPN remnants, broken adapters, and corrupt network configurations.

**Risks/Cons:** Requires a reboot. You may need to reconfigure VPN/proxy settings.

**Expert details:** Calls 'netsh winsock reset' and 'netsh int ip reset'. Wipes the layered service providers (LSPs) and TCP/IP routing tables back to factory fresh states.

**Interactions with other tweaks:** Extremely powerful. Fixes 99% of inexplicable 'No Internet Connection' bugs. You MUST restart your PC immediately after running this.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
netsh winsock reset; netsh int ip reset; netsh advfirewall reset
```

**Revert:**
```powershell
Write-Output 'Network stack reset cannot be automatically reverted. Reconfigure manually.'
```

</details>

---

### 🟢 Enable Storage Sense Auto Cleanup

**ID:** `EnableStorageSense` | **Category:** Tools | **Risk:** Green

Enables automatic cleanup of temp files, recycle bin, and downloads when disk is low.

**How it works:** Storage Sense auto-cleans temp files every 30 days and empties Recycle Bin.

**Benefits:** Automatically frees disk space without manual intervention.

**Risks/Cons:** Files in Downloads older than 30 days may be deleted (configurable).

**Expert details:** Enables the 'StoragePolicy' keys to automatically run Storage Sense. Instructs Windows to silently clean up recycle bin files older than 30 days and purge the downloads folder dynamically.

**Interactions with other tweaks:** A set-and-forget maintenance routine. Can be disastrous if you treat your Downloads folder as a permanent archive.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\StorageSense\Parameters\StoragePolicy' -Name '01' -Value 1 -Type DWord -Force; Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\StorageSense\Parameters\StoragePolicy' -Name '04' -Value 1 -Type DWord -Force; Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\StorageSense\Parameters\StoragePolicy' -Name '08' -Value 1 -Type DWord -Force; Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\StorageSense\Parameters\StoragePolicy' -Name '2048' -Value 30 -Type DWord -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\StorageSense\Parameters\StoragePolicy' -Name '01' -Value 0 -Type DWord -Force
```

</details>

---

### 🟢 Clean Windows Component Store

**ID:** `CleanComponentStore` | **Category:** Tools | **Risk:** Green

Runs DISM to clean up superseded Windows update packages and free disk space.

**How it works:** DISM removes old component store versions that are no longer needed.

**Benefits:** Can reclaim 1-5GB of disk space from accumulated update leftovers.

**Risks/Cons:** You cannot uninstall old updates after cleanup. Takes 2-5 minutes.

**Expert details:** Runs 'DISM.exe /Online /Cleanup-Image /StartComponentCleanup /ResetBase'. Brutally compresses the WinSxS folder by deleting superseded versions of Windows Updates and permanently baking in the current updates.

**Interactions with other tweaks:** Frees up to 5-10GB of SSD space space instantly. The huge downside is that you can NEVER uninstall current Windows Updates once this processes—they become permanent.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
DISM /Online /Cleanup-Image /StartComponentCleanup /ResetBase
```

**Revert:**
```powershell
Write-Output 'Component store cleanup cannot be reversed.'
```

</details>

---

### 🟢 Repair System Files (SFC + DISM)

**ID:** `RepairSystemFiles` | **Category:** Tools | **Risk:** Green

Runs DISM and SFC to repair corrupted Windows system files.

**How it works:** DISM repairs the component store, then SFC scans and fixes protected system files.

**Benefits:** Fixes random crashes, blue screens, and broken features from corrupted files.

**Risks/Cons:** Takes 5-15 minutes. Requires internet for DISM to download clean files.

**Expert details:** Executes 'DISM /Online /Cleanup-Image /RestoreHealth' followed cleanly by 'sfc /scannow'. Connects to Windows Update to download uncorrupted versions of core system files and violently overwrites damaged local caches.

**Interactions with other tweaks:** Takes 5-20 minutes depending on SSD speed. Best run whenever experiencing random application crashes or blue screens.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
DISM /Online /Cleanup-Image /RestoreHealth; sfc /scannow
```

**Revert:**
```powershell
Write-Output 'System file repair cannot be reversed (it restores original files).'
```

</details>

---

### 🟢 Flush DNS Cache

**ID:** `FlushDNSCache` | **Category:** Tools | **Risk:** Green

Clears the local DNS resolver cache to fix stale DNS entries and resolve connectivity issues.

**How it works:** Clears all cached DNS lookups. The next connection will do a fresh DNS resolution.

**Benefits:** Fixes websites not loading after DNS changes. Resolves stale cache entries.

**Risks/Cons:** First visit to each site will be slightly slower (one DNS lookup). Cache rebuilds in seconds.

**Expert details:** Duplicate alias for FlushDNS.

**Interactions with other tweaks:** Same as FlushDNS.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Clear-DnsClientCache; ipconfig /flushdns
```

**Revert:**
```powershell
Write-Output 'DNS cache is rebuilt automatically as you browse.'
```

</details>

---

### 🟡 Reset Winsock Catalog

**ID:** `ResetWinsock` | **Category:** Tools | **Risk:** Yellow

Resets the Winsock catalog to fix network connectivity issues caused by corrupted LSP entries.

**How it works:** Winsock is Windows' network socket API. Corrupted entries from VPNs or security software can break all networking.

**Benefits:** Fixes 'no internet' issues, DNS failures, and corrupted network stacks.

**Risks/Cons:** Requires a reboot. Some VPN/proxy software may need reinstalling.

**Expert details:** Duplicate alias handling network resets.

**Interactions with other tweaks:** Requires a reboot.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
netsh winsock reset; netsh int ip reset
```

**Revert:**
```powershell
Write-Output 'Winsock reset cannot be explicitly reversed. Network will reconfigure on reboot.'
```

</details>

---

### 🟢 Set Time to UTC (Dual Boot Fix)

**ID:** `SetUTCTime` | **Category:** Tools | **Risk:** Green

Makes Windows use UTC for the hardware clock — essential for dual-booting with Linux.

**How it works:** Linux uses UTC for the hardware clock, Windows uses local time. This makes both consistent.

**Benefits:** Fixes the time being wrong every time you switch between Linux and Windows.

**Risks/Cons:** None if you're dual-booting. Slight confusion if you later remove Linux.

**Expert details:** Sets 'RealTimeIsUniversal' (DWORD 1) in 'HKLM\SYSTEM\CurrentControlSet\Control\TimeZoneInformation'. Forces Windows to treat the motherboard hardware clock (RTC) as pure UTC instead of local time.

**Interactions with other tweaks:** The absolute cure-all for time synchronization bugs when dual-booting Windows and Linux (Ubuntu/Arch).

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\TimeZoneInformation' -Name 'RealTimeIsUniversal' -Value 1 -Type QWord -Force
```

**Revert:**
```powershell
Remove-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\TimeZoneInformation' -Name 'RealTimeIsUniversal' -EA SilentlyContinue
```

</details>

---

## Security

### 🟢 Ensure Windows Firewall is Active

**ID:** `EnableFirewall` | **Category:** Security | **Risk:** Green

Verifies and enables Windows Firewall on all profiles.

**How it works:** Enables the firewall for Domain, Private, and Public network profiles.

**Benefits:** Blocks unauthorized inbound traffic. Essential security baseline.

**Risks/Cons:** Some peer-to-peer applications may need manual firewall rules.

**Expert details:** Uses 'Set-NetFirewallProfile' to forcefully enable the Domain, Private, and Public firewall profiles.

**Interactions with other tweaks:** May silently conflict with third-party antiviruses (like Kaspersky/Bitdefender) which prefer to manage the firewall themselves.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled True
```

**Revert:**
```powershell
Write-Output 'Disabling Windows Firewall is not recommended.'
```

</details>

---

### 🟢 Disable Remote Desktop

**ID:** `DisableRemoteDesktop` | **Category:** Security | **Risk:** Green

Prevents remote connections to your PC via RDP.

**How it works:** Disables the Remote Desktop Protocol server listening for incoming connections.

**Benefits:** Closes a common attack vector used by ransomware and hackers.

**Risks/Cons:** You won't be able to remotely access this PC via RDP.

**Expert details:** Sets 'fDenyTSConnections' to 1 in 'HKLM\SYSTEM\CurrentControlSet\Control\Terminal Server'. Closes Port 3389 and disables the background listening service for RDP.

**Interactions with other tweaks:** Closes a major remote-access attack vector. You will not be able to remote into this PC until reverted.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Terminal Server' -Name 'fDenyTSConnections' -Value 1 -Type DWord -Force; Disable-NetFirewallRule -DisplayGroup 'Remote Desktop' -EA SilentlyContinue
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Terminal Server' -Name 'fDenyTSConnections' -Value 0 -Type DWord -Force; Enable-NetFirewallRule -DisplayGroup 'Remote Desktop' -EA SilentlyContinue
```

</details>

---

### 🟢 Disable SMBv1 Protocol

**ID:** `DisableSMBv1` | **Category:** Security | **Risk:** Green

Disables the legacy SMBv1 protocol exploited by WannaCry and other ransomware.

**How it works:** SMBv1 is a 30-year-old file sharing protocol with known critical vulnerabilities.

**Benefits:** Eliminates the attack vector used by WannaCry, NotPetya, and EternalBlue.

**Risks/Cons:** Very old NAS devices or XP-era machines may not connect for file sharing.

**Expert details:** Sets 'SMB1' to 0 in 'HKLM\SYSTEM\CurrentControlSet\Services\LanmanServer\Parameters' and uninstalls the 'FS-SMB1' optional feature.

**Interactions with other tweaks:** Closes the attack vector used by WannaCry ransomware. Do not revert this unless accessing a 20-year-old network drive.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-SmbServerConfiguration -EnableSMB1Protocol $false -Force; Disable-WindowsOptionalFeature -Online -FeatureName SMB1Protocol -NoRestart -EA SilentlyContinue
```

**Revert:**
```powershell
Set-SmbServerConfiguration -EnableSMB1Protocol $true -Force
```

</details>

---

### 🟡 Disable Windows Script Host

**ID:** `DisableWindowsScriptHost` | **Category:** Security | **Risk:** Yellow

Prevents .vbs and .js scripts from running — blocks a common malware vector.

**How it works:** Disables the Windows Script Host engine (wscript.exe / cscript.exe).

**Benefits:** Blocks VBScript/JScript malware that arrives via email attachments.

**Risks/Cons:** Legitimate .vbs scripts (login scripts, admin tools) won't execute.

**Expert details:** Sets 'Enabled' to 0 in 'HKLM\SOFTWARE\Microsoft\Windows Script Host\Settings'. Prevents execution of .vbs and .js files natively by wscript.exe or cscript.exe.

**Interactions with other tweaks:** An excellent defense against email phishing payloads. May break very old legacy login scripts in enterprise active directories.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows Script Host\Settings' -Name 'Enabled' -Value 0 -Type DWord -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows Script Host\Settings' -Name 'Enabled' -Value 1 -Type DWord -Force
```

</details>

---

### 🟢 Disable Lock Screen Ads & Tips

**ID:** `DisableLockScreenAds` | **Category:** Security | **Risk:** Green

Removes Microsoft ads, tips, and 'fun facts' from the lock screen.

**How it works:** Disables RotatingLockScreenOverlayEnabled and related ContentDeliveryManager keys.

**Benefits:** Clean lock screen without promotional content.

**Risks/Cons:** You won't see Windows tips or Bing daily images on the lock screen.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\ContentDeliveryManager' -Name 'RotatingLockScreenOverlayEnabled' -Value 0 -Type DWord -Force; Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\ContentDeliveryManager' -Name 'RotatingLockScreenEnabled' -Value 0 -Type DWord -Force; Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\ContentDeliveryManager' -Name 'SubscribedContent-338387Enabled' -Value 0 -Type DWord -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\ContentDeliveryManager' -Name 'RotatingLockScreenOverlayEnabled' -Value 1 -Type DWord -Force; Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\ContentDeliveryManager' -Name 'RotatingLockScreenEnabled' -Value 1 -Type DWord -Force
```

</details>

---

### 🟢 Disable AutoPlay & AutoRun

**ID:** `DisableAutoplay` | **Category:** Security | **Risk:** Green

Prevents USB drives and CDs from automatically running programs when inserted.

**How it works:** Disables AutoPlay for all media types, blocking autorun.inf execution.

**Benefits:** Blocks a major USB malware infection vector.

**Risks/Cons:** You must manually open USB drives in Explorer instead of auto-launching.

**Expert details:** Sets 'NoDriveTypeAutoRun' to 255 (FF). Completely disables Windows from automatically executing 'autorun.inf' or prompting what to do when inserting a USB drive or CD.

**Interactions with other tweaks:** Prevents automated malware infections (BadUSB/Autorun worms) from executing merely by plugging in a flash drive.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\AutoplayHandlers' -Name 'DisableAutoplay' -Value 1 -Type DWord -Force; Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\Explorer' -Name 'NoDriveTypeAutoRun' -Value 255 -Type DWord -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\AutoplayHandlers' -Name 'DisableAutoplay' -Value 0 -Type DWord -Force; Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\Explorer' -Name 'NoDriveTypeAutoRun' -Value 91 -Type DWord -Force
```

</details>

---

### 🔴 Disable Spectre/Meltdown Mitigations ⚠️ **Expert Mode Required**

**ID:** `DisableSpectreMitigations` | **Category:** Security | **Risk:** Red

Disables CPU vulnerability mitigations for maximum performance at the cost of security.

**How it works:** Removes kernel-level Spectre V2 and Meltdown patches that add CPU overhead.

**Benefits:** Can recover 5-30% CPU performance depending on workload and CPU generation.

**Risks/Cons:** Your system is vulnerable to Spectre/Meltdown side-channel attacks. DANGEROUS.

**Expert details:** Modifies 'FeatureSettingsOverride' to 3 and 'FeatureSettingsOverrideMask' to 3. Disables the Retpoline and kernel-page-table isolation (KPTI) patches for hardware-level CPU exploits (Meltdown/Spectre).

**Interactions with other tweaks:** Increases I/O and syscall performance heavily on older Intel architectures (Haswell/Skylake). Extremely dangerous if you run untrusted virtual machines or execute random JavaScript.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management' -Name 'FeatureSettingsOverride' -Value 3 -Type DWord -Force; Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management' -Name 'FeatureSettingsOverrideMask' -Value 3 -Type DWord -Force
```

**Revert:**
```powershell
Remove-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management' -Name 'FeatureSettingsOverride' -EA SilentlyContinue; Remove-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management' -Name 'FeatureSettingsOverrideMask' -EA SilentlyContinue
```

</details>

---

### 🟡 Disable Defender Auto Sample Submission

**ID:** `DisableDefenderSampleSubmission` | **Category:** Security | **Risk:** Yellow

Prevents Windows Defender from automatically uploading suspicious files to Microsoft.

**How it works:** Defender uploads files it considers suspicious to Microsoft's cloud for analysis.

**Benefits:** Your files never leave your PC. Essential for privacy-sensitive work.

**Risks/Cons:** New malware detection may be slightly slower without cloud analysis.

**Expert details:** Sets 'SubmitSamplesConsent' to 2 (Never Send) in 'HKLM\SOFTWARE\Policies\Microsoft\Windows Defender\Spynet'.

**Interactions with other tweaks:** Prevents Defender from uploading unknown executing files directly from your SSD to Microsoft servers for cloud analysis.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-MpPreference -SubmitSamplesConsent 2
```

**Revert:**
```powershell
Set-MpPreference -SubmitSamplesConsent 1
```

</details>

---

### 🔴 Disable SmartScreen Filter ⚠️ **Expert Mode Required**

**ID:** `DisableSmartScreen` | **Category:** Security | **Risk:** Red

Disables the SmartScreen filter for apps and web browsing.

**How it works:** SmartScreen checks downloaded files and URLs against Microsoft's database.

**Benefits:** No data about your downloads sent to Microsoft. Faster first-run of new apps.

**Risks/Cons:** You lose protection against known malicious downloads. USE WITH CAUTION.

**Expert details:** Sets 'EnableSmartScreen' to 0 and 'SmartScreenEnabled' to 'Off' across Explorer and Edge paradigms.

**Interactions with other tweaks:** Stops Windows from sending hashes of every downloaded executable to Microsoft for reputation checking. Removes the "Windows protected your PC" blue popup.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\System' -Name 'EnableSmartScreen' -Value 0 -Type DWord -Force; Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\AppHost' -Name 'EnableWebContentEvaluation' -Value 0 -Type DWord -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\System' -Name 'EnableSmartScreen' -Value 1 -Type DWord -Force; Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\AppHost' -Name 'EnableWebContentEvaluation' -Value 1 -Type DWord -Force
```

</details>

---

### 🟢 Clear Page File at Shutdown

**ID:** `ClearPageFileShutdown` | **Category:** Security | **Risk:** Green

Clears the virtual memory page file when Windows shuts down for security.

**How it works:** The page file can contain sensitive data swapped from RAM. This zeros it out at shutdown.

**Benefits:** Prevents extracting passwords/keys from the page file on stolen drives.

**Risks/Cons:** Shutdown takes slightly longer (depends on page file size).

**Expert details:** Modifies 'ClearPageFileAtShutdown' to 1 in the Session Manager\Memory Management. Forces Windows to securely overwrite the pagefile.sys with zeros on shutdown.

**Interactions with other tweaks:** Increases shutdown times drastically (can take minutes on a slow HDD), but ensures extracted passwords or encryption keys aren't left behind in the swap on cold rest.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management' -Name 'ClearPageFileAtShutdown' -Value 1 -Type DWord -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management' -Name 'ClearPageFileAtShutdown' -Value 0 -Type DWord -Force
```

</details>

---

### 🟢 Enable DNS over HTTPS (DoH)

**ID:** `EnableDNSOverHTTPS` | **Category:** Security | **Risk:** Green

Enables DNS over HTTPS to encrypt DNS queries and prevent ISP snooping.

**How it works:** DoH wraps DNS queries in HTTPS, preventing ISPs and network observers from seeing what domains you visit.

**Benefits:** Encrypted DNS queries. ISP can't see your browsing domains. Prevents DNS hijacking.

**Risks/Cons:** Requires Windows 11 or higher. Slightly higher latency on first lookup.

**Expert details:** Configures Native Windows 11 DoH strictly via 'netsh dns add global auto'. Encrypts your DNS requests using HTTPS so your ISP cannot read or tamper with them.

**Interactions with other tweaks:** Provides immense privacy. You MUST use a supported DNS provider (like Cloudflare, Quad9, Google) as your primary DNS for this to take effect.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Services\Dnscache\Parameters' -Name 'EnableAutoDoh' -Value 2 -Type DWord -Force
```

**Revert:**
```powershell
Remove-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Services\Dnscache\Parameters' -Name 'EnableAutoDoh' -EA SilentlyContinue
```

</details>

---

### 🟢 Disable Windows Platform Binary Table

**ID:** `DisableWPBT` | **Category:** Security | **Risk:** Green

Blocks OEMs from force-installing software via UEFI firmware on every boot.

**How it works:** WPBT lets motherboard vendors embed executables in UEFI that Windows runs automatically at boot.

**Benefits:** Prevents vendor bloatware from re-installing itself. Closes a firmware-level attack vector.

**Risks/Cons:** Some vendor-specific features (anti-theft, driver helpers) may stop working.

**Expert details:** Sets 'DisableWpbtExecution' to 1 in 'HKLM\SYSTEM\CurrentControlSet\Control\Session Manager'. Windows Platform Binary Table allows OEM BIOS firmware (like Lenovo/Dell) to auto-inject bloatware into the OS on every boot, even on a clean install.

**Interactions with other tweaks:** A brilliant defense against persistent OEM bloatware like 'Lenovo Vantage' silently resurrecting itself.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager' -Name 'DisableWpbtExecution' -Value 1 -Type DWord -Force
```

**Revert:**
```powershell
Remove-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager' -Name 'DisableWpbtExecution' -EA SilentlyContinue
```

</details>

---

### 🔴 Disable Virtualization-Based Security (VBS) ⚠️ **Expert Mode Required**

**ID:** `DisableVBS` | **Category:** Security | **Risk:** Red

Disables VBS to recover 5–15% GPU/CPU performance lost to hypervisor overhead. Requires reboot.

**How it works:** VBS uses Windows Hypervisor to create an isolated virtual environment protecting kernel memory. It runs even on non-Hyper-V systems and incurs a measurable performance cost.

**Benefits:** Recovers 5–15% GPU performance in games; reduces CPU overhead; useful on older hardware.

**Risks/Cons:** Removes kernel-level memory isolation. Windows Defender Credential Guard will be disabled. Increases risk from kernel exploits.

**Expert details:** Sets the bootloader entry 'hypervisorlaunchtype' to 'off' via bcdedit. VBS is enabled by default on Windows 11. Disabling it also disables HVCI (Memory Integrity) since that feature depends on VBS. Reboot is required for changes to take effect.

**Interactions with other tweaks:** Disabling VBS automatically disables HVCI/Memory Integrity (DisableMemoryIntegrity tweak becomes redundant). Conflicts with Credential Guard.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
bcdedit /set hypervisorlaunchtype off
```

**Revert:**
```powershell
bcdedit /set hypervisorlaunchtype auto
```

</details>

---

### 🔴 Disable HVCI / Memory Integrity ⚠️ **Expert Mode Required**

**ID:** `DisableHVCI` | **Category:** Security | **Risk:** Red

Disables Hypervisor-Protected Code Integrity (Memory Integrity) to recover CPU performance lost to kernel code verification overhead.

**How it works:** HVCI runs kernel code integrity checks inside a VBS hypervisor enclave. Every kernel module load is verified in the isolated environment, adding CPU overhead — typically 3–7% in games.

**Benefits:** Recovers 3–7% CPU overhead in performance-sensitive workloads. Reduces DPC latency on some hardware.

**Risks/Cons:** Removes hypervisor-enforced driver code integrity. Malicious or vulnerable kernel drivers can execute without this protection layer.

**Expert details:** Sets HKLM\SYSTEM\CurrentControlSet\Control\DeviceGuard\Scenarios\HypervisorEnforcedCodeIntegrity Enabled=0 via registry. Requires a reboot. Note: if VBS (DisableVBS) is also disabled, HVCI is implicitly disabled — applying both tweaks is redundant but harmless.

**Interactions with other tweaks:** Redundant if DisableVBS is applied (VBS must be running for HVCI to function). Conflicts with Credential Guard and Windows Defender Kernel Protection features.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
if (!(Test-Path 'HKLM:\SYSTEM\CurrentControlSet\Control\DeviceGuard\Scenarios\HypervisorEnforcedCodeIntegrity')) { New-Item -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\DeviceGuard\Scenarios\HypervisorEnforcedCodeIntegrity' -Force | Out-Null }; Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\DeviceGuard\Scenarios\HypervisorEnforcedCodeIntegrity' -Name 'Enabled' -Value 0 -Type DWord -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\DeviceGuard\Scenarios\HypervisorEnforcedCodeIntegrity' -Name 'Enabled' -Value 1 -Type DWord -Force
```

</details>

---

## Debloat

### 🟢 Remove Pre-installed Bloatware

**ID:** `RemoveBloatwareApps` | **Category:** Debloat | **Risk:** Green

Removes common pre-installed Windows apps like Solitaire, News, Weather widgets, etc.

**How it works:** Uses Get-AppxPackage to uninstall known bloatware provisioned packages.

**Benefits:** Frees disk space and reduces background processes from unused apps.

**Risks/Cons:** Removed apps can be reinstalled from the Microsoft Store if needed.

**Expert details:** Uses 'Get-AppxPackage | Remove-AppxPackage' via a predefined array of known junk AppX bundle IDs (e.g., Candy Crush, Disney+, McAfee, TikTok, LinkedIn). Removes them from the current user profile.

**Interactions with other tweaks:** Does not remove them from 'Provisioned' packages, meaning a new user account creation might still reinstall them. See provisioning tweaks for permanent nuking.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
$bloat = @('Microsoft.BingNews','Microsoft.BingWeather','Microsoft.GetHelp','Microsoft.Getstarted','Microsoft.MicrosoftSolitaireCollection','Microsoft.People','Microsoft.PowerAutomate','Microsoft.Todos','Microsoft.WindowsFeedbackHub','Microsoft.ZuneMusic','Microsoft.ZuneVideo','MicrosoftCorporationII.QuickAssist','Microsoft.WindowsMaps','Microsoft.YourPhone','Clipchamp.Clipchamp','Microsoft.MicrosoftOfficeHub','Microsoft.SkypeApp'); foreach ($app in $bloat) { Get-AppxPackage -Name $app -AllUsers -EA SilentlyContinue | Remove-AppxPackage -AllUsers -EA SilentlyContinue; Get-AppxProvisionedPackage -Online -EA SilentlyContinue | Where-Object DisplayName -eq $app | Remove-AppxProvisionedPackage -Online -EA SilentlyContinue }
```

**Revert:**
```powershell
Write-Output 'Removed apps can be reinstalled from the Microsoft Store.'
```

</details>

---

### 🟡 Remove OneDrive

**ID:** `RemoveOneDrive` | **Category:** Debloat | **Risk:** Yellow

Completely removes Microsoft OneDrive from the system.

**How it works:** Kills OneDrive, runs the uninstaller, and cleans up leftover folders/registry.

**Benefits:** Removes cloud sync nags and saves background CPU/network usage.

**Risks/Cons:** You lose OneDrive cloud sync. Use manual backup or alternative cloud storage.

**Expert details:** Kills the 'OneDrive.exe' process, uninstalls it using '%systemroot%\SysWOW64\OneDriveSetup.exe /uninstall', and aggressively cleans up the Explorer namespace registry keys (CLSID {018D5C66-4533-4307-9B53-224DE2ED1FE6}) removing the folder icon from the navigation pane.

**Interactions with other tweaks:** Extremely destructive if you use OneDrive for file backups. Will break Office 365 auto-save functionality.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Stop-Process -Name 'OneDrive' -Force -EA SilentlyContinue; Start-Sleep 2; $x86 = "$env:SystemRoot\System32\OneDriveSetup.exe"; $x64 = "$env:SystemRoot\SysWOW64\OneDriveSetup.exe"; if (Test-Path $x64) { & $x64 /uninstall } elseif (Test-Path $x86) { & $x86 /uninstall }; Remove-Item "$env:USERPROFILE\OneDrive" -Recurse -Force -EA SilentlyContinue; Remove-Item "$env:LOCALAPPDATA\Microsoft\OneDrive" -Recurse -Force -EA SilentlyContinue
```

**Revert:**
```powershell
Write-Output 'Reinstall OneDrive from https://onedrive.live.com/download'
```

</details>

---

### 🟡 Disable Xbox Services & Features

**ID:** `DisableXboxFeatures` | **Category:** Debloat | **Risk:** Yellow

Disables all Xbox-related background services.

**How it works:** Stops and disables XboxGipSvc, XblAuthManager, XblGameSave, and XboxNetApiSvc.

**Benefits:** Saves CPU and RAM from Xbox services you don't use.

**Risks/Cons:** Xbox Game Pass, Xbox app, and Game Bar features will stop working.

**Expert details:** Uninstalls Xbox App, Xbox Game Bar, and disables the associated authentication and networking services (XblAuthManager, XblGameSave, XboxNetApiSvc).

**Interactions with other tweaks:** Entirely breaks the ability to play PC Game Pass games or connect to Xbox Live multiplayer. Do not use if you are a PC Game Pass subscriber.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
$svcs = @('XboxGipSvc','XblAuthManager','XblGameSave','XboxNetApiSvc'); foreach ($s in $svcs) { Stop-Service -Name $s -Force -EA SilentlyContinue; Set-Service -Name $s -StartupType Disabled -EA SilentlyContinue }
```

**Revert:**
```powershell
$svcs = @('XboxGipSvc','XblAuthManager','XblGameSave','XboxNetApiSvc'); foreach ($s in $svcs) { Set-Service -Name $s -StartupType Manual -EA SilentlyContinue }
```

</details>

---

### 🟢 Remove Cortana App

**ID:** `RemoveCortanaApp` | **Category:** Debloat | **Risk:** Green

Removes the standalone Cortana app package from Windows.

**How it works:** Uninstalls the Microsoft.549981C3F5F10 (Cortana) app package.

**Benefits:** Fully removes Cortana UWP app and its background processes.

**Risks/Cons:** Cortana voice commands become unavailable (policy disable in Privacy is separate).

**Expert details:** Forcefully uninstalls the 'Microsoft.549981C3F5F10' (Cortana) AppX package. This is a step further than just disabling the background service.

**Interactions with other tweaks:** Completely removes the Cortana icon from the Start Menu. Updates to Windows 11 normally handle this automatically now.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Get-AppxPackage -Name 'Microsoft.549981C3F5F10' -AllUsers -EA SilentlyContinue | Remove-AppxPackage -AllUsers -EA SilentlyContinue; Get-AppxProvisionedPackage -Online -EA SilentlyContinue | Where-Object DisplayName -eq 'Microsoft.549981C3F5F10' | Remove-AppxProvisionedPackage -Online -EA SilentlyContinue
```

**Revert:**
```powershell
Write-Output 'Reinstall Cortana from the Microsoft Store.'
```

</details>

---

### 🟢 Remove 3D Viewer & Mixed Reality

**ID:** `Remove3DAndMixedReality` | **Category:** Debloat | **Risk:** Green

Removes 3D Viewer, 3D Builder, Paint 3D, and Mixed Reality Portal.

**How it works:** Uninstalls 3D/MR packages that most users never open.

**Benefits:** Reclaims disk space from unused 3D applications.

**Risks/Cons:** You lose 3D model viewing capabilities (rarely needed).

**Expert details:** Uninstalls the 'MixedReality.Portal', '3DBuilder', and 'Print3D' AppX packages, and removes the '3D Objects' folder from 'This PC' in File Explorer by deleting its namespace CLSID.

**Interactions with other tweaks:** Cleans up File Explorer significantly. No downsides unless you own a Windows Mixed Reality headset.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
$apps = @('Microsoft.Microsoft3DViewer','Microsoft.3DBuilder','Microsoft.MSPaint','Microsoft.MixedReality.Portal','Microsoft.Print3D'); foreach ($app in $apps) { Get-AppxPackage -Name $app -AllUsers -EA SilentlyContinue | Remove-AppxPackage -AllUsers -EA SilentlyContinue }
```

**Revert:**
```powershell
Write-Output 'Reinstall removed apps from the Microsoft Store.'
```

</details>

---

### 🟢 Disable Widgets Board (Win 11)

**ID:** `DisableWidgets` | **Category:** Debloat | **Risk:** Green

Disables the Windows 11 Widgets panel and its background process.

**How it works:** Sets TaskbarDa policy to 0, preventing the Widgets board from loading.

**Benefits:** Saves RAM and CPU from the Edge WebView2 process that powers Widgets.

**Risks/Cons:** You lose the news/weather/stocks widget panel on the taskbar.

**Expert details:** Disables the 'TaskbarDa' feature (Windows 11 Widgets board) via Group Policy ('Dsh\AllowNewsAndInterests'). Kills the associated 'msedgewebview2' processes that render the widgets.

**Interactions with other tweaks:** Frees up ~150-300MB of RAM and removes the distracting weather icon/news feed from the left side of the Windows 11 taskbar.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced' -Name 'TaskbarDa' -Value 0 -Type DWord -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced' -Name 'TaskbarDa' -Value 1 -Type DWord -Force
```

</details>

---

### 🟢 Disable Microsoft Teams Autostart

**ID:** `DisableTeamsAutostart` | **Category:** Debloat | **Risk:** Green

Prevents Microsoft Teams from launching at startup.

**How it works:** Disables the Teams Chat icon and removes startup registry entries.

**Benefits:** Faster boot times and less background RAM usage.

**Risks/Cons:** Teams won't auto-connect on login. You can still launch it manually.

**Expert details:** Removes the 'Teams' string from 'HKCU\Software\Microsoft\Windows\CurrentVersion\Run' and disables the built-in Windows 11 'Chat' icon from the taskbar ('TaskbarMn').

**Interactions with other tweaks:** Speeds up login times heavily. You can still manually open Teams, but it won't force-load into the system tray on boot.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced' -Name 'TaskbarMn' -Value 0 -Type DWord -Force; $startupPath = 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run'; Remove-ItemProperty -Path $startupPath -Name 'com.squirrel.Teams.Teams' -EA SilentlyContinue; Remove-ItemProperty -Path $startupPath -Name 'MicrosoftTeams' -EA SilentlyContinue
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced' -Name 'TaskbarMn' -Value 1 -Type DWord -Force
```

</details>

---

### 🟢 Disable Windows Copilot

**ID:** `DisableCopilot` | **Category:** Debloat | **Risk:** Green

Disables Windows Copilot AI assistant and removes its taskbar button.

**How it works:** Sets TurnOffWindowsCopilot policy and removes the taskbar Copilot button.

**Benefits:** No AI sidebar. Saves Edge WebView2 RAM and prevents data collection.

**Risks/Cons:** You lose the Copilot AI assistant in Windows.

**Expert details:** Sets 'TurnOffWindowsCopilot' to 1 in 'HKCU\Software\Policies\Microsoft\Windows\WindowsCopilot'. This disables the centralized AI assistant, completely removing the Copilot icon from the taskbar and Win+C shortcut.

**Interactions with other tweaks:** Removes aggressive AI integrations. Win+C will no longer do anything.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
if (!(Test-Path 'HKCU:\SOFTWARE\Policies\Microsoft\Windows\WindowsCopilot')) { New-Item -Path 'HKCU:\SOFTWARE\Policies\Microsoft\Windows\WindowsCopilot' -Force | Out-Null }; Set-ItemProperty -Path 'HKCU:\SOFTWARE\Policies\Microsoft\Windows\WindowsCopilot' -Name 'TurnOffWindowsCopilot' -Value 1 -Type DWord -Force; Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced' -Name 'ShowCopilotButton' -Value 0 -Type DWord -Force
```

**Revert:**
```powershell
Remove-ItemProperty -Path 'HKCU:\SOFTWARE\Policies\Microsoft\Windows\WindowsCopilot' -Name 'TurnOffWindowsCopilot' -EA SilentlyContinue; Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced' -Name 'ShowCopilotButton' -Value 1 -Type DWord -Force
```

</details>

---

### 🟢 Disable Meet Now Taskbar Button

**ID:** `DisableMeetNow` | **Category:** Debloat | **Risk:** Green

Removes the 'Meet Now' (Skype) icon from the taskbar system tray.

**How it works:** Sets HideSCAMeetNow policy to remove the Meet Now camera button.

**Benefits:** Cleaner taskbar. Removes unused Skype integration.

**Risks/Cons:** You lose quick access to Skype Meet Now.

**Expert details:** Hides the 'Meet Now' (Skype integration) button from the Windows 10 system tray via 'HideSCAMeetNow' registry DWORD.

**Interactions with other tweaks:** Purely cosmetic UI cleanup.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
if (!(Test-Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\Explorer')) { New-Item -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\Explorer' -Force | Out-Null }; Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\Explorer' -Name 'HideSCAMeetNow' -Value 1 -Type DWord -Force
```

**Revert:**
```powershell
Remove-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\Explorer' -Name 'HideSCAMeetNow' -EA SilentlyContinue
```

</details>

---

### 🟢 Disable Search Highlights & Web Results

**ID:** `DisableSearchHighlights` | **Category:** Debloat | **Risk:** Green

Removes Bing web results and trending highlights from Windows Search.

**How it works:** Disables dynamic content and web integration in the Start Menu search.

**Benefits:** Faster, cleaner search that only shows local files and apps.

**Risks/Cons:** You won't see web suggestions or trending topics in search.

**Expert details:** Disables the daily rotating images and 'fun facts' (Search Highlights) inside the Start Menu search interface by disabling the 'DynamicSearchBoxEnabled' DWORD.

**Interactions with other tweaks:** Makes the Start menu search UI completely blank and sterile, exactly like older robust versions of Windows.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\SearchSettings' -Name 'IsDynamicSearchBoxEnabled' -Value 0 -Type DWord -Force; if (!(Test-Path 'HKCU:\SOFTWARE\Policies\Microsoft\Windows\Explorer')) { New-Item -Path 'HKCU:\SOFTWARE\Policies\Microsoft\Windows\Explorer' -Force | Out-Null }; Set-ItemProperty -Path 'HKCU:\SOFTWARE\Policies\Microsoft\Windows\Explorer' -Name 'DisableSearchBoxSuggestions' -Value 1 -Type DWord -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\SearchSettings' -Name 'IsDynamicSearchBoxEnabled' -Value 1 -Type DWord -Force; Remove-ItemProperty -Path 'HKCU:\SOFTWARE\Policies\Microsoft\Windows\Explorer' -Name 'DisableSearchBoxSuggestions' -EA SilentlyContinue
```

</details>

---

### 🟢 Disable Phone Link / Your Phone

**ID:** `DisablePhoneLink` | **Category:** Debloat | **Risk:** Green

Removes the Phone Link app integration and background service.

**How it works:** Uninstalls the Your Phone / Phone Link app and blocks its background service.

**Benefits:** Removes background syncing with your phone that uses CPU and network.

**Risks/Cons:** You can't mirror Android notifications or texts to your PC.

**Expert details:** Uninstalls the 'Microsoft.YourPhone' AppX package. This app constantly runs a background suspended process to listen for Bluetooth beacons from paired phones.

**Interactions with other tweaks:** Completely breaks the ability to mirror Android notifications, SMS, or calls to your PC.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Get-AppxPackage -Name 'Microsoft.YourPhone' -AllUsers -EA SilentlyContinue | Remove-AppxPackage -AllUsers -EA SilentlyContinue; if (!(Test-Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\System')) { New-Item -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\System' -Force | Out-Null }; Set-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\System' -Name 'EnableMmx' -Value 0 -Type DWord -Force
```

**Revert:**
```powershell
Remove-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\System' -Name 'EnableMmx' -EA SilentlyContinue; Write-Output 'Reinstall Phone Link from the Microsoft Store.'
```

</details>

---

### 🟢 Disable Edge Pre-launch & Pre-load

**ID:** `DisableEdgePrelaunch` | **Category:** Debloat | **Risk:** Green

Prevents Microsoft Edge from pre-launching and pre-loading in the background.

**How it works:** Edge starts background processes at boot even if you use another browser.

**Benefits:** Saves 100-200MB RAM from Edge processes running in the background.

**Risks/Cons:** Edge will take 1-2 seconds longer to launch when you do use it.

**Expert details:** Modifies 'TabPreloader' and 'Prelaunch' keys in Edge policies to prevent Microsoft Edge from silently launching invisible processes on boot to make the browser launch 'faster' when clicked.

**Interactions with other tweaks:** Saves around 40-60MB of RAM on boot. Edge will take ~0.5s longer to open visually the first time.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
if (!(Test-Path 'HKLM:\SOFTWARE\Policies\Microsoft\MicrosoftEdge\Main')) { New-Item -Path 'HKLM:\SOFTWARE\Policies\Microsoft\MicrosoftEdge\Main' -Force | Out-Null }; Set-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\MicrosoftEdge\Main' -Name 'AllowPrelaunch' -Value 0 -Type DWord -Force; if (!(Test-Path 'HKLM:\SOFTWARE\Policies\Microsoft\MicrosoftEdge\TabPreloader')) { New-Item -Path 'HKLM:\SOFTWARE\Policies\Microsoft\MicrosoftEdge\TabPreloader' -Force | Out-Null }; Set-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\MicrosoftEdge\TabPreloader' -Name 'AllowTabPreloading' -Value 0 -Type DWord -Force
```

**Revert:**
```powershell
Remove-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\MicrosoftEdge\Main' -Name 'AllowPrelaunch' -EA SilentlyContinue; Remove-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\MicrosoftEdge\TabPreloader' -Name 'AllowTabPreloading' -EA SilentlyContinue
```

</details>

---

### 🟢 Disable Start Menu Recommendations & Suggestions

**ID:** `DisableStartMenuSuggestions` | **Category:** Debloat | **Risk:** Green

Removes app suggestions and recommendations from the Windows 11 Start Menu.

**How it works:** Windows 11 shows 'Recommended' apps and tips in the Start Menu. This disables them.

**Benefits:** Cleaner Start Menu with no ads or suggestions. Faster Start Menu rendering.

**Risks/Cons:** You won't see recently opened files or app suggestions in Start.

**Expert details:** Disables 'ShowRecommendations' in the Windows 11 Start Menu, pushing the 'Recommended' section down and trying to force it to show solely pinned apps.

**Interactions with other tweaks:** On Windows 11, this leaves a large blank empty space in the Start Menu unless you also use a third-party tool like StartAllBack to modify the UI.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced' -Name 'Start_TrackProgs' -Value 0 -Type DWord -Force; if (!(Test-Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\Explorer')) { New-Item -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\Explorer' -Force | Out-Null }; Set-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\Explorer' -Name 'HideRecommendedSection' -Value 1 -Type DWord -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced' -Name 'Start_TrackProgs' -Value 1 -Type DWord -Force; Remove-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\Explorer' -Name 'HideRecommendedSection' -EA SilentlyContinue
```

</details>

---

### 🟢 Disable Lock Screen Ads & Spotlight

**ID:** `DisableLockScreenAdsSpotlight` | **Category:** Debloat | **Risk:** Green

Removes ads, tips, and Microsoft Spotlight from the lock screen.

**How it works:** Windows shows ads disguised as 'tips' and 'fun facts' on the lock screen. This disables all of them.

**Benefits:** Clean lock screen with no marketing content. Faster lock screen loading.

**Risks/Cons:** You lose the rotating Bing wallpapers from Windows Spotlight.

**Expert details:** Switches the lock screen from 'Windows Spotlight' (which downloads high-res images and ads from Bing) to 'Picture' mode, and disables the underlying ContentDeliveryManager tasks.

**Interactions with other tweaks:** Your lock screen will statically display a single image forever, without rotating or showing tooltip facts.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\ContentDeliveryManager' -Name 'RotatingLockScreenOverlayEnabled' -Value 0 -Type DWord -Force; Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\ContentDeliveryManager' -Name 'SubscribedContent-338387Enabled' -Value 0 -Type DWord -Force; Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\ContentDeliveryManager' -Name 'SubscribedContent-338389Enabled' -Value 0 -Type DWord -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\ContentDeliveryManager' -Name 'RotatingLockScreenOverlayEnabled' -Value 1 -Type DWord -Force; Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\ContentDeliveryManager' -Name 'SubscribedContent-338387Enabled' -Value 1 -Type DWord -Force
```

</details>

---

## Windows UI

### 🟢 Restore Classic Right-Click Menu (Win 11)

**ID:** `ClassicContextMenu` | **Category:** Windows UI | **Risk:** Green

Brings back the full Windows 10 right-click context menu in Windows 11.

**How it works:** Creates an InprocServer32 override that forces Explorer to use the legacy context menu.

**Benefits:** All right-click options visible immediately without clicking 'Show more options'.

**Risks/Cons:** Requires Explorer restart. New Windows 11 context menu extensions won't appear.

**Expert details:** Creates an empty key at 'HKCU\Software\Classes\CLSID\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\InprocServer32'. This overrides the COM object for the Windows 11 XAML context menu, forcing Explorer back to the legacy Win32 command bar system.

**Interactions with other tweaks:** Eliminates the 'Show More Options' barrier in Windows 11. Requires an explorer.exe restart to take effect.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
New-Item -Path 'HKCU:\SOFTWARE\Classes\CLSID\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\InprocServer32' -Force -Value '' | Out-Null; Stop-Process -Name explorer -Force -EA SilentlyContinue
```

**Revert:**
```powershell
Remove-Item -Path 'HKCU:\SOFTWARE\Classes\CLSID\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}' -Recurse -Force -EA SilentlyContinue; Stop-Process -Name explorer -Force -EA SilentlyContinue
```

</details>

---

### 🟢 Show File Extensions

**ID:** `ShowFileExtensions` | **Category:** Windows UI | **Risk:** Green

Shows file extensions (.exe, .pdf, .docx) for all files.

**How it works:** Sets HideFileExt to 0 so Windows displays file extensions in Explorer.

**Benefits:** See exactly what type every file is. Helps identify disguised malware (.pdf.exe).

**Risks/Cons:** File names look slightly longer. Renaming requires preserving the extension.

**Expert details:** Changes 'HideFileExt' in 'HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced' to 0. Forces Explorer to display the raw extension (e.g., .txt, .exe) instead of hiding it based on file association.

**Interactions with other tweaks:** Crucial anti-malware step preventing 'document.pdf.exe' spoofing attacks.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced' -Name 'HideFileExt' -Value 0 -Type DWord -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced' -Name 'HideFileExt' -Value 1 -Type DWord -Force
```

</details>

---

### 🟢 Show Hidden Files & Folders

**ID:** `ShowHiddenFiles` | **Category:** Windows UI | **Risk:** Green

Makes hidden files, folders, and system files visible in Explorer.

**How it works:** Sets Hidden to 1 and ShowSuperHidden to 1 in Explorer Advanced settings.

**Benefits:** See all files including AppData, hidden configs, and system files.

**Risks/Cons:** Explorer shows many system files you normally wouldn't interact with.

**Expert details:** Changes 'Hidden' in 'Explorer\Advanced' to 1. Forces the display of files and folders marked with the 'Hidden' file attribute.

**Interactions with other tweaks:** Your user directory will now show 'AppData', and drives will show '$RECYCLE.BIN'.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced' -Name 'Hidden' -Value 1 -Type DWord -Force; Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced' -Name 'ShowSuperHidden' -Value 1 -Type DWord -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced' -Name 'Hidden' -Value 2 -Type DWord -Force; Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced' -Name 'ShowSuperHidden' -Value 0 -Type DWord -Force
```

</details>

---

### 🟢 Align Taskbar to Left (Win 11)

**ID:** `TaskbarAlignLeft` | **Category:** Windows UI | **Risk:** Green

Moves the Windows 11 taskbar icons to the left instead of center.

**How it works:** Sets TaskbarAl registry value to 0 (left-aligned).

**Benefits:** Traditional left-aligned taskbar like Windows 10.

**Risks/Cons:** Purely cosmetic preference — no performance impact.

**Expert details:** Modifies 'Al' in 'HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced' to 0 (Left). Centers the Start button exactly like Windows 10.

**Interactions with other tweaks:** Purely ergonomic. Does not affect the ability to use third party tools like StartAllBack, which heavily override this.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced' -Name 'TaskbarAl' -Value 0 -Type DWord -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced' -Name 'TaskbarAl' -Value 1 -Type DWord -Force
```

</details>

---

### 🟢 Enable Verbose Startup Messages

**ID:** `VerboseStartup` | **Category:** Windows UI | **Risk:** Green

Shows detailed status messages during boot, shutdown, logon, and logoff.

**How it works:** Sets VerboseStatus in the Windows policies to show step-by-step boot messages.

**Benefits:** Helps diagnose slow boot by showing exactly what's happening.

**Risks/Cons:** Boot screen shows text instead of the animation spinner.

**Expert details:** Adds 'VerboseStatus' (DWORD 1) to 'HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System'. Replaces the spinning dots on boot/shutdown with highly detailed text explaining exactly what Windows is doing (e.g., 'Applying computer policy', 'Starting Group Policy Services').

**Interactions with other tweaks:** Invaluable for troubleshooting slow boot times or stalled shutdown operations.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
if (!(Test-Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System')) { New-Item -Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System' -Force | Out-Null }; Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System' -Name 'VerboseStatus' -Value 1 -Type DWord -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System' -Name 'VerboseStatus' -Value 0 -Type DWord -Force
```

</details>

---

### 🟢 Reduce Menu Animation Delay

**ID:** `ReduceMenuShowDelay` | **Category:** Windows UI | **Risk:** Green

Reduces the delay before menus appear from 400ms to 0ms for snappier UI.

**How it works:** Sets MenuShowDelay registry value to 0, removing the artificial animation pause.

**Benefits:** Menus and context menus appear instantly. System feels more responsive.

**Risks/Cons:** Purely visual — menus may feel abrupt without the fade-in.

**Expert details:** Changes 'MenuShowDelay' in 'HKCU\Control Panel\Desktop' from the default 400ms down to 10ms. Modifies how long you have to hover over a cascaded menu (like 'Send To') before it springs open.

**Interactions with other tweaks:** Makes navigating deeply nested folders or Start Menu folders feel blisteringly fast. Does not impact DWM animations.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKCU:\Control Panel\Desktop' -Name 'MenuShowDelay' -Value '0' -Type String -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKCU:\Control Panel\Desktop' -Name 'MenuShowDelay' -Value '400' -Type String -Force
```

</details>

---

### 🟢 Disable Aero Shake

**ID:** `DisableAeroShake` | **Category:** Windows UI | **Risk:** Green

Prevents shaking a window from minimizing all other windows.

**How it works:** When you shake a title bar, Windows minimizes everything else. This disables that behavior.

**Benefits:** No more accidental minimization when dragging windows.

**Risks/Cons:** You lose the shake-to-minimize gesture.

**Expert details:** Disables 'DisallowShaking' in 'HKCU\Software\Policies\Microsoft\Windows\Explorer'. Prevents Windows from automatically minimizing all other windows when you grab a title bar and 'shake' the mouse.

**Interactions with other tweaks:** Prevents accidental mass-minimization during frantic mouse movements in windowed games or intense workflows.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced' -Name 'DisallowShaking' -Value 1 -Type DWord -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced' -Name 'DisallowShaking' -Value 0 -Type DWord -Force
```

</details>

---

### 🟡 Disable Lock Screen

**ID:** `DisableLockScreen` | **Category:** Windows UI | **Risk:** Yellow

Skips the lock screen and goes straight to the password/PIN prompt.

**How it works:** Sets NoLockScreen policy so Windows goes directly to the login prompt.

**Benefits:** Saves a click/swipe every time you unlock. Faster access.

**Risks/Cons:** No at-a-glance info (time, notifications) on the lock screen.

**Expert details:** Sets 'NoLockScreen' (DWORD 1) in 'HKLM\SOFTWARE\Policies\Microsoft\Windows\Personalization'. Entirely skips the graphical lock screen (the one showing the clock and wallpaper).

**Interactions with other tweaks:** Takes you instantly from wake/boot to the password/PIN entry screen. Saves exactly one click/keypress every single time you wake the PC.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
if (!(Test-Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\Personalization')) { New-Item -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\Personalization' -Force | Out-Null }; Set-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\Personalization' -Name 'NoLockScreen' -Value 1 -Type DWord -Force
```

**Revert:**
```powershell
Remove-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\Personalization' -Name 'NoLockScreen' -EA SilentlyContinue
```

</details>

---

### 🟢 Enable Last Active Click (Taskbar)

**ID:** `EnableLastActiveClick` | **Category:** Windows UI | **Risk:** Green

Clicking a grouped taskbar icon opens the last used window instead of showing a preview.

**How it works:** Sets LastActiveClick to 1 so taskbar clicks go directly to the last active window.

**Benefits:** One click instead of two to switch to your last used instance of an app.

**Risks/Cons:** You must hover (not click) to see the preview thumbnail.

**Expert details:** Sets 'LastActiveClick' in 'Explorer\Advanced' to 1. If you have multiple windows of the same app open (e.g., 3 Chrome windows), clicking the taskbar icon will immediately open the last active one instead of forcing you to choose from the thumbnail preview popup.

**Interactions with other tweaks:** Massively improves taskbar multitasking ergonomics for power users.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced' -Name 'LastActiveClick' -Value 1 -Type DWord -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced' -Name 'LastActiveClick' -Value 0 -Type DWord -Force
```

</details>

---

### 🟢 Disable Notification Center & Tips

**ID:** `DisableNotificationCenter` | **Category:** Windows UI | **Risk:** Green

Disables Windows notification popups and tip balloons.

**How it works:** Disables toast notifications and tip notifications system-wide.

**Benefits:** No more popup distractions during gaming or focused work.

**Risks/Cons:** You won't see any app notifications until you re-enable.

**Expert details:** Enables 'DisableNotificationCenter' under Explorer policies. Completely nukes the Action Center sidebar and stops all toast notifications from rendering.

**Interactions with other tweaks:** A draconian UI cleanup. You will miss USB plugin sounds, email toasts, and system warnings. Use with caution.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\PushNotifications' -Name 'ToastEnabled' -Value 0 -Type DWord -Force; Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Notifications\Settings' -Name 'NOC_GLOBAL_SETTING_TOASTS_ENABLED' -Value 0 -Type DWord -Force -EA SilentlyContinue; Set-ItemProperty -Path 'HKCU:\SOFTWARE\Policies\Microsoft\Windows\Explorer' -Name 'DisableNotificationCenter' -Value 1 -Type DWord -Force -EA SilentlyContinue
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\PushNotifications' -Name 'ToastEnabled' -Value 1 -Type DWord -Force; Remove-ItemProperty -Path 'HKCU:\SOFTWARE\Policies\Microsoft\Windows\Explorer' -Name 'DisableNotificationCenter' -EA SilentlyContinue
```

</details>

---

### 🟢 Enable 'End Task' in Taskbar Right-Click

**ID:** `EnableEndTaskTaskbar` | **Category:** Windows UI | **Risk:** Green

Adds 'End Task' to the taskbar right-click context menu (Win11 23H2+).

**How it works:** Windows 11 23H2+ has a hidden 'End Task' option in the taskbar right-click menu. This enables it.

**Benefits:** Kill frozen apps directly from the taskbar without opening Task Manager.

**Risks/Cons:** None. This is a hidden QoL feature that Microsoft should have enabled by default.

**Expert details:** A Windows 11 23H2+ exclusive. Sets 'TaskbarEndTask' to 1 in DeveloperSettings. Adds a native 'End Task' button when right-clicking any app icon on the taskbar.

**Interactions with other tweaks:** Allows instantly force-killing a hung application (SIGKILL) without needing to ever open Task Manager.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced\TaskbarDeveloperSettings' -Name 'TaskbarEndTask' -Value 1 -Type DWord -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced\TaskbarDeveloperSettings' -Name 'TaskbarEndTask' -Value 0 -Type DWord -Force
```

</details>

---

### 🟢 Disable Sticky Keys Popup

**ID:** `DisableStickyKeys` | **Category:** Windows UI | **Risk:** Green

Disables the Sticky Keys popup when pressing Shift 5 times — essential for gaming.

**How it works:** Pressing Shift 5 times triggers a Sticky Keys accessibility prompt. This disables that shortcut.

**Benefits:** No more annoying popups during gaming when spamming Shift.

**Risks/Cons:** You lose the Shift×5 shortcut to enable Sticky Keys (still accessible via Settings).

**Expert details:** Overrides 'Flags' under 'HKCU\Control Panel\Accessibility\StickyKeys'. Turns off the atrocious shortcut that interrupts games when mashing the SHIFT key 5 times.

**Interactions with other tweaks:** Critical for gaming. Has zero negative impact unless you legitimately require single-finger modifier key sequences.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKCU:\Control Panel\Accessibility\StickyKeys' -Name 'Flags' -Value '58' -Type String -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKCU:\Control Panel\Accessibility\StickyKeys' -Name 'Flags' -Value '510' -Type String -Force
```

</details>

---

### 🟢 Remove Home from File Explorer

**ID:** `RemoveExplorerHome` | **Category:** Windows UI | **Risk:** Green

Removes the 'Home' page from File Explorer in Windows 11 and opens to 'This PC' instead.

**How it works:** Sets Explorer to open to This PC instead of the Home view that shows recent files and favorites.

**Benefits:** Faster access to drives. No privacy-leaking recent files shown on Explorer open.

**Risks/Cons:** You lose the quick access to recent files and favorites on the Home page.

**Expert details:** Changes 'LaunchTo' to 1 (This PC) and removes the 'HomeFolder' Quick Access items. Booting File Explorer opens directly to your drives instead of a messy list of recent generic files.

**Interactions with other tweaks:** Drastically cleans up the navigation pane. Restores legacy Windows 7/10 'My Computer' behavior.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced' -Name 'LaunchTo' -Value 1 -Type DWord -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Advanced' -Name 'LaunchTo' -Value 2 -Type DWord -Force
```

</details>

---

### 🟡 Disable Action Center

**ID:** `DisableActionCenter` | **Category:** Windows UI | **Risk:** Yellow

Removes the Action Center and notifications sidebar.

**How it works:** Sets DisableNotificationCenter in Group Policy.

**Benefits:** Removes notification distractions and frees up taskbar space.

**Risks/Cons:** You will no longer receive any Windows notifications.

**Expert details:** Duplicate or alias for 'DisableNotificationCenter'.

**Interactions with other tweaks:** Same caveats apply.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
if (!(Test-Path 'HKCU:\Software\Policies\Microsoft\Windows\Explorer')) { New-Item -Path 'HKCU:\Software\Policies\Microsoft\Windows\Explorer' -Force | Out-Null }; Set-ItemProperty -Path 'HKCU:\Software\Policies\Microsoft\Windows\Explorer' -Name 'DisableNotificationCenter' -Value 1 -Type DWord -Force; Stop-Process -Name explorer -Force -EA SilentlyContinue
```

**Revert:**
```powershell
Remove-ItemProperty -Path 'HKCU:\Software\Policies\Microsoft\Windows\Explorer' -Name 'DisableNotificationCenter' -EA SilentlyContinue; Stop-Process -Name explorer -Force -EA SilentlyContinue
```

</details>

---

## Windows Update

### 🟢 Disable Delivery Optimization (P2P Updates)

**ID:** `DisableDeliveryOptimization` | **Category:** Windows Update | **Risk:** Green

Prevents Windows from uploading updates to other PCs on the internet.

**How it works:** Windows shares downloaded updates with other PCs via peer-to-peer, using your bandwidth.

**Benefits:** Your upload bandwidth is never used to distribute Microsoft updates.

**Risks/Cons:** Updates may download slightly slower without peer sources.

**Expert details:** Translates to setting 'DODownloadMode' to 0 in 'HKLM\SOFTWARE\Policies\Microsoft\Windows\DeliveryOptimization'. Stops your PC from uploading Windows Updates and Store apps to other PCs on your local network or the internet (P2P).

**Interactions with other tweaks:** Saves massive amounts of upload bandwidth on home connections. You must reboot for this to apply cleanly to the DOsvc.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\DeliveryOptimization\Config' -Name 'DODownloadMode' -Value 0 -Type DWord -Force -EA SilentlyContinue; if (!(Test-Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\DeliveryOptimization')) { New-Item -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\DeliveryOptimization' -Force | Out-Null }; Set-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\DeliveryOptimization' -Name 'DODownloadMode' -Value 0 -Type DWord -Force
```

**Revert:**
```powershell
Set-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\DeliveryOptimization' -Name 'DODownloadMode' -Value 1 -Type DWord -Force
```

</details>

---

### 🟢 Disable Auto-Restart After Updates

**ID:** `DisableAutoRestart` | **Category:** Windows Update | **Risk:** Green

Prevents Windows from automatically restarting your PC after installing updates.

**How it works:** Sets NoAutoRebootWithLoggedOnUsers policy so Windows waits for you to restart manually.

**Benefits:** Never lose unsaved work from surprise restarts.

**Risks/Cons:** You must remember to restart after updates to apply security patches.

**Expert details:** Sets 'NoAutoRebootWithLoggedOnUsers' to 1. Prevents Windows Update from forcibly restarting your PC overnight or while you are rendering a video.

**Interactions with other tweaks:** You must remember to manually restart your PC after updates install, or they will stay pending.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
if (!(Test-Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU')) { New-Item -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU' -Force | Out-Null }; Set-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU' -Name 'NoAutoRebootWithLoggedOnUsers' -Value 1 -Type DWord -Force
```

**Revert:**
```powershell
Remove-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU' -Name 'NoAutoRebootWithLoggedOnUsers' -EA SilentlyContinue
```

</details>

---

### 🟡 Disable Driver Updates via Windows Update

**ID:** `DisableDriverUpdates` | **Category:** Windows Update | **Risk:** Yellow

Prevents Windows Update from installing driver updates automatically.

**How it works:** Sets ExcludeWUDriversInQualityUpdate policy to block driver delivery via WU.

**Benefits:** Prevents broken drivers from being force-installed. Essential for GPU users.

**Risks/Cons:** You must manually update drivers via manufacturer tools (NVIDIA, AMD, Intel).

**Expert details:** Sets 'ExcludeWUDriversInQualityUpdate' to 1. Strongly instructs Windows Update to never automatically download and overwrite your cleanly installed GPU, Audio, or Chipset drivers.

**Interactions with other tweaks:** Essential for gamers to prevent Windows from randomly overwriting a stable proprietary NVIDIA/AMD driver with a broken DCH baseline driver.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
if (!(Test-Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate')) { New-Item -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate' -Force | Out-Null }; Set-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate' -Name 'ExcludeWUDriversInQualityUpdate' -Value 1 -Type DWord -Force
```

**Revert:**
```powershell
Remove-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate' -Name 'ExcludeWUDriversInQualityUpdate' -EA SilentlyContinue
```

</details>

---

### 🟡 Pause Windows Updates for 35 Days

**ID:** `PauseUpdates35Days` | **Category:** Windows Update | **Risk:** Yellow

Pauses all Windows updates for the maximum allowed 35-day period.

**How it works:** Sets the FlightSettingsMaxPauseDays and PauseUpdatesStartTime in Windows Update settings.

**Benefits:** No updates interrupt your workflow for over a month.

**Risks/Cons:** You miss security patches during the pause. Re-apply after 35 days.

**Expert details:** Writes a futuristic date into 'PauseUpdatesExpiryTime'. Instantly pauses all Windows Update activity for roughly 35 days, bypassing the restrictive 7-day GUI limit.

**Interactions with other tweaks:** You will miss out on zero-day security patches. Must be clicked again every month, or updates will resume with a vengeance.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
$pauseDate = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ssZ'); $resumeDate = (Get-Date).AddDays(35).ToString('yyyy-MM-ddTHH:mm:ssZ'); Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\WindowsUpdate\UX\Settings' -Name 'PauseUpdatesExpiryTime' -Value $resumeDate -Force; Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\WindowsUpdate\UX\Settings' -Name 'PauseQualityUpdatesStartTime' -Value $pauseDate -Force; Set-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\WindowsUpdate\UX\Settings' -Name 'PauseFeatureUpdatesStartTime' -Value $pauseDate -Force
```

**Revert:**
```powershell
Remove-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\WindowsUpdate\UX\Settings' -Name 'PauseUpdatesExpiryTime' -EA SilentlyContinue; Remove-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\WindowsUpdate\UX\Settings' -Name 'PauseQualityUpdatesStartTime' -EA SilentlyContinue; Remove-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\WindowsUpdate\UX\Settings' -Name 'PauseFeatureUpdatesStartTime' -EA SilentlyContinue
```

</details>

---

### 🔴 Security-Only Updates (Delay Feature Updates) ⚠️ **Expert Mode Required**

**ID:** `SecurityOnlyUpdates` | **Category:** Windows Update | **Risk:** Red

Defers feature updates by 365 days, allowing only security patches.

**How it works:** Sets DeferFeatureUpdatesPeriodInDays to 365 via Group Policy.

**Benefits:** You get security fixes but avoid potentially unstable feature updates for a year.

**Risks/Cons:** You'll be on an older Windows version. Some new features won't be available.

**Expert details:** Sets 'BranchReadinessLevel' and 'DeferFeatureUpdatesPeriodInDays' via advanced Windows Update group policies. Forces the system to only ingest critical security fixes (Quality Updates) while delaying UI/Feature bloated updates by 365 days.

**Interactions with other tweaks:** The golden standard for operational stability. Keeps you safe without forcing new broken features down your throat.

<details>
<summary>Commands</summary>

**Apply:**
```powershell
if (!(Test-Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate')) { New-Item -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate' -Force | Out-Null }; Set-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate' -Name 'DeferFeatureUpdates' -Value 1 -Type DWord -Force; Set-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate' -Name 'DeferFeatureUpdatesPeriodInDays' -Value 365 -Type DWord -Force
```

**Revert:**
```powershell
Remove-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate' -Name 'DeferFeatureUpdates' -EA SilentlyContinue; Remove-ItemProperty -Path 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate' -Name 'DeferFeatureUpdatesPeriodInDays' -EA SilentlyContinue
```

</details>

---

