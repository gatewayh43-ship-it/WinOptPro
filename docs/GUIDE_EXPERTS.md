# WinOpt Pro — Advanced / Expert Guide

This guide is written for system administrators, power users, developers, and security engineers who want to understand what WinOpt Pro does at a technical level, why certain tweaks are gated, and how to extend or operate the tool beyond its standard UI.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Expert Mode](#2-expert-mode)
3. [Deep Dive: Security Trade-offs](#3-deep-dive-security-trade-offs)
4. [Deep Dive: Timer and Scheduler](#4-deep-dive-timer-and-scheduler)
5. [Deep Dive: Memory](#5-deep-dive-memory)
6. [GPU Driver Cleaner Internals](#6-gpu-driver-cleaner-internals)
7. [WSL Manager Advanced](#7-wsl-manager-advanced)
8. [Backup and Profile System](#8-backup-and-profile-system)
9. [History and Audit Log](#9-history-and-audit-log)
10. [Building from Source](#10-building-from-source)
11. [Extending WinOpt Pro](#11-extending-winopt-pro)

---

## 1. Introduction

WinOpt Pro is a Tauri 2 application: a Rust backend exposed via Tauri's command system, with a React 19 frontend. The backend handles all system interactions — registry reads/writes, WMI queries, FFI calls to `ntdll.dll`, process management, and external tool invocation (`pnputil`, `bcdedit`, `schtasks`, `powercfg`, `nvidia-smi`, `wsl.exe`). The frontend is a pure UI layer with no direct OS access.

This guide assumes familiarity with:
- Windows internals (registry, kernel objects, scheduling, VBS/Hyper-V architecture)
- Basic Rust and TypeScript/React
- Command-line tools (`bcdedit`, `pnputil`, `powercfg`)
- Security concepts (exploit mitigations, kernel code integrity, virtualization)

---

## 2. Expert Mode

### What Expert Mode Unlocks

Expert Mode is a boolean flag stored in the app's persistent settings. When enabled:

1. **Red-risk tweaks become visible** in the Tweaks page. Without Expert Mode, these tweaks are filtered out client-side — they still exist in `tweaks.json` but the frontend does not render them.
2. **Confirmation dialogs for Red tweaks are bypassed** for secondary confirmations. The primary "Apply Tweak?" dialog still appears, but secondary warnings (e.g., "This may reduce system security, are you sure?") are skipped.
3. **The UI shows risk badges more prominently** to make it clear you are operating in an elevated risk context.

Expert Mode does NOT:
- Change backend behavior (the Rust commands execute identically).
- Grant additional OS permissions (WinOpt Pro already runs elevated).
- Unlock hidden Tauri commands — all commands are registered at build time regardless.

### Enabling Expert Mode

**Settings** (gear icon in sidebar) → scroll to **Expert Mode** → toggle on. A confirmation dialog explains the risks. Your confirmation is logged to the audit trail with a timestamp.

### Current Red-Risk Tweaks (as of 2026-03-04)

| Tweak ID | Category | What It Changes |
|----------|----------|----------------|
| DisableVBS | Security | HKLM\SYSTEM\CurrentControlSet\Control\DeviceGuard — Enables=0 |
| DisableHVCI | Security | HKLM\SYSTEM\CurrentControlSet\Control\DeviceGuard\Scenarios\HypervisorEnforcedCodeIntegrity — Enabled=0 |
| DisableSpectreMitigations | Security | HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management — FeatureSettingsOverride/Mask |
| DisableSmartScreen | Security | HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer — SmartScreenEnabled="Off" |
| CSRSSHighPriority | Performance | HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Image File Execution Options\csrss.exe\PerfOptions — CpuPriorityClass=4 |
| LargeSystemCache | Performance | HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management — LargeSystemCache=1 |
| EnableGPUMSIMode | Gaming | HKLM\SYSTEM\CurrentControlSet\Enum\PCI\[GPU device path]\Device Parameters\Interrupt Management\MessageSignaledInterruptProperties — MSISupported=1 |
| DisableMemoryCompression | Performance | Powershell: Disable-MMAgent -MemoryCompression |
| DisableFTH | Performance | HKLM\SOFTWARE\Microsoft\FTH — Enabled=0 |
| EnableWriteBackCache | Performance | Disk device policy via DeviceIoControl IOCTL_STORAGE_SET_PROPERTY |
| DisableDynamicTick | Gaming | bcdedit /set disabledynamictick yes |

---

## 3. Deep Dive: Security Trade-offs

### VBS and HVCI (DisableVBS, DisableHVCI)

**What VBS does at the kernel level:**

Virtualization-Based Security uses the CPU's hardware virtualization extensions (Intel VT-x / AMD-V) to create two execution environments:
- The **Normal World**: Where Windows and all user-mode and kernel-mode code runs.
- The **Secure World (VSM — Virtual Secure Mode)**: A Hyper-V partition that runs at a higher privilege level than the normal Windows kernel (ring -1 vs ring 0). The Secure World hosts the Local Security Authority (LSA), Credential Guard, and the HVCI code integrity verifier.

The implication: even if an attacker compromises the Windows kernel (ring 0), they cannot access Credential Guard data or override HVCI code integrity checks because those run at a higher privilege level that the kernel cannot reach.

**What HVCI does:**

HVCI (Hypervisor-Protected Code Integrity) uses the Secure World to validate every page of code before it executes in kernel mode. Pages must be signed by Microsoft or a trusted CA, and they must be either executable or writable — never both (W^X enforcement). This prevents kernel exploits that work by writing shellcode to kernel memory and executing it.

**Performance cost of VBS/HVCI:**

The performance cost comes from:
1. The overhead of Hyper-V running under Windows (even if you do not use Hyper-V explicitly, VBS requires it).
2. Additional memory allocated to the VSM partition (typically 64-256MB depending on configuration).
3. The HVCI code validation path adds latency to driver loading and kernel code transitions.

Measured impact: approximately 5-15% reduction in CPU-bound workloads. The impact is higher on older CPUs (pre-2018) where virtualization overhead is less optimized. On Alder Lake / Zen 3 and newer, the overhead is typically 3-8%.

**When disabling VBS is appropriate:**

- Isolated gaming rigs with no sensitive data, no domain membership, no corporate network access.
- Dedicated build machines where maximum CPU throughput is the only concern.
- Test lab environments where security is handled at a perimeter level.

**When you must NOT disable VBS:**

- Corporate or domain-joined machines (likely violates policy and removes Credential Guard protection).
- Machines that authenticate to business services, banks, or anything requiring credential security.
- Any machine running as part of a security boundary.

**Implementation note:** The DisableVBS tweak sets `EnableVirtualizationBasedSecurity=0` in the DeviceGuard registry key. A reboot is required. On some hardware configurations, the BIOS may need to have "Secure Boot" and "TPM 2.0" enabled for VBS to be re-enabled after disabling — verify your firmware settings before disabling if you plan to re-enable later.

---

### Spectre and Meltdown Mitigations (DisableSpectreMitigations)

**Background:**

Spectre (CVE-2017-5753, CVE-2017-5715) and Meltdown (CVE-2017-5754) are architectural vulnerabilities in speculative execution — a fundamental CPU optimization technique. They allow user-mode or cross-VM code to read kernel or other process memory by exploiting timing side channels in the CPU's branch predictor and cache.

Microsoft shipped software mitigations for these as part of the January 2018 security update. The mitigations work by:
- Adding IBRS/IBPB (Indirect Branch Restricted Speculation / Indirect Branch Prediction Barrier) instructions at kernel transitions.
- Enabling KPTI (Kernel Page Table Isolation) to prevent user-mode from mapping kernel memory.
- Using retpoline (a return trampoline) to redirect speculative execution to a safe loop.

**Performance impact by CPU generation:**

| CPU Generation | Spectre/Meltdown Impact |
|---------------|------------------------|
| Pre-2017 (Broadwell, Skylake, pre-Ryzen) | 10-30% on syscall-heavy workloads |
| 2017-2019 (Coffee Lake, Zen 1/2) | 5-15% |
| 2020+ (Ice Lake, Zen 3+) | ~2-5% (hardware mitigations in silicon) |

Modern CPUs (Intel 10th gen+ / AMD Zen 3+) have hardware-level mitigations (eIBRS, IBRS Always-On in silicon) that eliminate most of the software overhead.

**The registry mechanism:**

```
HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management
  FeatureSettingsOverride   REG_DWORD  = 3
  FeatureSettingsOverrideMask REG_DWORD = 3
```

Setting `FeatureSettingsOverride=3` and `FeatureSettingsOverrideMask=3` disables both Spectre variant 1/2 and Meltdown mitigations. A reboot is required.

**When acceptable:** Isolated machines running trusted code only, with no untrusted JavaScript execution (disable browser JIT), no multi-tenant access, and no sensitive data. On modern CPUs the performance gain is small enough that this is rarely worth the risk.

---

### SmartScreen (DisableSmartScreen)

SmartScreen is a reputation-based filter. When you download and attempt to run an unsigned executable, SmartScreen sends a hash of the file to Microsoft's SmartScreen service and receives a reputation verdict (known-good, known-bad, or unknown).

The registry change:
```
HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer
  SmartScreenEnabled = "Off"
```

This disables the check entirely. The security impact is significant for users who download software from the web. For locked-down developer machines where all software is installed from controlled sources (package managers, internal registries), the risk is lower.

---

## 4. Deep Dive: Timer and Scheduler

### Dynamic Tick (DisableDynamicTick)

**How Windows' dynamic timer works:**

Windows Vista introduced tickless operation (dynamic tick, also called `HRTIMER_NOHZ` in Linux terminology). When no timers are pending, the system does not generate periodic timer interrupts — instead it programs the next interrupt exactly when needed. This reduces power consumption because CPUs can stay in deep sleep states (C-states) longer.

The mechanism: `bcdedit /set disabledynamictick yes` sets `HKLM\BCD00000000\...\Elements\26000058` in the BCD store to disable dynamic ticking.

**Latency implications:**

With dynamic tick disabled, the system timer fires at a fixed rate (determined by the current timer resolution, typically 15.6ms at default). This means:
- The scheduler runs more regularly, with more predictable interrupt latency.
- Threads that sleep for short periods wake up faster and with lower jitter.
- CPU C-state residency decreases, increasing idle power consumption.

For gaming, the benefit is reduced frame time variance, because the game's render loop sleep calls are serviced more predictably.

**Note:** The interaction between dynamic tick and `NtSetTimerResolution` is important. When timer resolution is set to 0.5ms, the timer fires 2000 times per second regardless of dynamic tick settings. Dynamic tick has the most impact at the default 15.6ms resolution. If you are using the Latency Optimizer's timer resolution setting, the additional benefit of disabling dynamic tick is smaller — but still measurable because dynamic tick also affects C-state transitions.

---

### HPET (High Precision Event Timer)

HPET is a legacy hardware timer introduced in 2004 as a specification. It provides a minimum of 10MHz (100ns period) reference clock, accessible via MMIO.

**TSC vs HPET:**

Modern CPUs use the TSC (Time Stamp Counter) as the primary time source. The TSC runs at the CPU's internal frequency and is synchronized across cores via hardware synchronization logic (Intel's "Invariant TSC" guarantees the TSC ticks at a constant rate independent of CPU frequency scaling).

HPET was introduced because early multi-core systems had TSCs that drifted between cores. Modern CPUs with Invariant TSC do not have this problem.

**DPC latency impact of HPET:**

Accessing the HPET counter requires an MMIO read, which is slower than reading the TSC (which is a single `RDTSC` instruction). When Windows uses HPET as the time source (via `bcdedit /set useplatformclock yes`), every time-related system call incurs MMIO latency. This contributes to higher DPC (Deferred Procedure Call) latency, which manifests as audio crackles and input handling jitter.

Disabling HPET (`bcdedit /deletevalue useplatformclock`) makes Windows use TSC instead, reducing time query overhead.

**The counterintuitive reality:** On many systems, HPET is already disabled by default in modern Windows versions. The Latency Optimizer page shows the current state via `bcdedit /enum` parsing. If it is already disabled, applying "Disable HPET" has no effect.

---

### Timer Resolution via NtSetTimerResolution

The Windows Multimedia Timer resolution API works at two levels:

1. **`timeBeginPeriod(n)`** — user-mode API (WinMM). Requests a timer resolution of `n` milliseconds. Granularity: 1ms minimum for most hardware.
2. **`NtSetTimerResolution(n, TRUE, &actual)`** — undocumented NT API. Accepts resolution in 100-nanosecond units. Can request 0.5ms (5000 units) on most hardware.

WinOpt Pro calls `NtSetTimerResolution` via FFI from Rust:

```rust
// latency.rs (simplified)
#[link(name = "ntdll")]
extern "system" {
    fn NtSetTimerResolution(
        DesiredResolution: ULONG,
        SetResolution: BOOLEAN,
        CurrentResolution: *mut ULONG,
    ) -> NTSTATUS;

    fn NtQueryTimerResolution(
        MinimumResolution: *mut ULONG,
        MaximumResolution: *mut ULONG,
        CurrentResolution: *mut ULONG,
    ) -> NTSTATUS;
}
```

The `DesiredResolution` of `5000` requests 0.5ms (5000 × 100ns = 500,000ns = 0.5ms).

**Windows 11 change:** Starting with Windows 11, Microsoft changed timer resolution behavior so that the high-resolution timer only applies to the process that requested it, not system-wide. This means games benefit most when they request the resolution themselves. WinOpt Pro's approach still benefits its own process and any child process, and the system behavior around scheduling still improves.

---

### CPU Scheduling: PrioritySeparation, MMCSS, CSRSS

**PrioritySeparation:**

```
HKLM\SYSTEM\CurrentControlSet\Control\PriorityControl
  Win32PrioritySeparation  REG_DWORD
```

This 6-bit value controls how Windows distributes CPU time between foreground and background processes. The value encodes:
- Bits 0-1: Priority separation (how much more time foreground gets vs background)
- Bits 2-3: Scheduling interval length (shorter = more context switches)
- Bits 4-5: Fixed or dynamic quanta

For gaming: `Win32PrioritySeparation=0x26` (38 decimal) — foreground gets 3x priority over background, variable quantum.

**MMCSS (Multimedia Class Scheduler Service):**

MMCSS is a Windows service that elevates the priority of multimedia threads (audio rendering, video playback, game loops). Games that call `AvSetMmThreadCharacteristics("Games", ...)` get their threads registered with MMCSS, which boosts them above normal priority and reduces scheduling latency.

The MMCSS configuration lives in:
```
HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games
  Priority            REG_DWORD  = 6  (range 1-8)
  Scheduling Category REG_SZ     = "High"
  SFIO Priority       REG_SZ     = "High"
```

WinOpt Pro's `SystemResponsiveness` tweak modifies:
```
HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile
  SystemResponsiveness REG_DWORD  = 0  (default 20; this means 0% reserved for background)
```

**CSRSS Priority:**

The Client/Server Runtime Subsystem (`csrss.exe`) handles window message routing, console operations, and user-mode to kernel-mode transitions for Win32 subsystem calls. Mouse and keyboard input is processed through CSRSS. The Image File Execution Options trick:

```
HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Image File Execution Options\csrss.exe\PerfOptions
  CpuPriorityClass REG_DWORD = 4  (REALTIME_PRIORITY_CLASS)
```

This elevates CSRSS to REALTIME priority, ensuring input processing is never delayed by other threads. The risk is that if CSRSS enters a busy loop (a bug condition), it will starve all other processes.

---

## 5. Deep Dive: Memory

### Memory Compression (DisableMemoryCompression)

**How it works:**

Windows 10 introduced the Memory Manager Agent (MMAgent) which runs a compression store in a system process. When physical RAM is under pressure, instead of immediately paging to disk, Windows compresses memory pages in RAM. A 4KB page may compress to 1-2KB, effectively increasing usable RAM.

The compression/decompression happens in kernel mode and uses a mix of Xpress (fast, moderate compression) and Xpress Huffman. The operation consumes CPU cycles.

**The trade-off:**

- **With compression enabled**: Higher RAM capacity at the cost of CPU cycles for compress/decompress operations. On memory-constrained systems (8-16GB) running memory-intensive workloads, compression prevents paging (disk I/O), which is a net win.
- **With compression disabled**: Lower effective RAM, but zero CPU overhead for compression. On 32GB+ systems where RAM pressure is rare, disabling compression removes a background CPU consumer without meaningful downside.

**Implementation:**

WinOpt Pro disables compression via PowerShell:
```powershell
Disable-MMAgent -MemoryCompression
```

And enables it via:
```powershell
Enable-MMAgent -MemoryCompression
```

The state can be queried via `Get-MMAgent | Select-Object MemoryCompression`.

No reboot required; the change takes effect immediately for new allocations.

---

### Standby List and Working Sets

Windows memory has multiple states:
- **Active**: In use by a process.
- **Modified**: Changed but not yet written to disk.
- **Standby**: Was active, is now cached in RAM but evictable. Accessed quickly if needed again (no disk I/O).
- **Free**: Available for immediate allocation.

The **standby list** acts as an in-RAM cache for recently evicted working sets. It speeds up relaunching apps and accessing recently-used files. However, on a system under RAM pressure (e.g., 16GB with a game using 12GB), the standby list occupies RAM that the game could use, forcing the game to page.

**Flushing the standby list:**

WinOpt Pro calls:
```rust
// latency.rs (simplified)
extern "system" {
    fn NtSetSystemInformation(
        SystemInformationClass: SYSTEM_INFORMATION_CLASS,
        SystemInformation: PVOID,
        SystemInformationLength: ULONG,
    ) -> NTSTATUS;
}

// SystemMemoryListCommand = 80
// MemoryFlushModifiedList = 3, MemoryPurgeStandbyList = 4
let command: u32 = 4; // MemoryPurgeStandbyList
NtSetSystemInformation(80, &command as *const _ as PVOID, size_of::<u32>() as ULONG);
```

This is an undocumented API. The `SystemMemoryListCommand` class (80) accepts commands defined in `SYSTEM_MEMORY_LIST_COMMAND`. `MemoryPurgeStandbyList` (4) flushes all standby pages, making them free for immediate allocation.

The Latency Optimizer page reports how many MB were freed by the operation.

---

### Page File at Shutdown (ClearPageFileShutdown)

```
HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management
  ClearPageFileAtShutdown REG_DWORD = 1
```

When enabled, Windows zeroes the page file on shutdown. This prevents data that was paged out during the session from being read by someone who later mounts the drive. The security benefit is meaningful in shared or physical-access threat models.

The performance cost: shutdown takes significantly longer (proportional to page file size — a 16GB page file can take 1-2 minutes to zero on a SATA drive).

---

### Fault Tolerant Heap (DisableFTH)

The Fault Tolerant Heap (FTH) is a Windows compatibility shim. When an application crashes due to heap corruption, Windows detects the pattern and activates the FTH shim for that application's heap allocator. FTH adds guard pages and validation to catch heap corruption before it causes a crash — at the cost of slower allocation and additional memory overhead.

Registry location:
```
HKLM\SOFTWARE\Microsoft\FTH
  Enabled REG_DWORD = 0
```

For well-tested applications (games, production software), FTH rarely activates and the overhead is negligible. Disabling it removes FTH from the remediation pipeline, which means a heap-corrupting bug will crash immediately rather than being silently "fixed" by FTH — which can actually be useful for debugging. For end-user gaming machines, the benefit is marginal.

---

## 6. GPU Driver Cleaner Internals

### How Driver Removal Works

WinOpt Pro's `gpu_driver.rs` executes driver removal via `pnputil.exe` — the official Microsoft tool for PnP device management:

```rust
// Uninstall the driver from the device
std::process::Command::new("pnputil")
    .args(["/remove-device", &device_instance_id])
    .output()?;

// Remove the driver package from the driver store (if checkbox enabled)
std::process::Command::new("pnputil")
    .args(["/delete-driver", &inf_path, "/uninstall", "/force"])
    .output()?;
```

`/delete-driver` with `/uninstall /force` removes the driver package from the DriverStore and uninstalls it from all devices that use it. This is equivalent to what DDU does (DDU also issues additional cleanup steps).

### Registry Sweep

After pnputil removal, WinOpt Pro performs a registry sweep to remove residual vendor keys. The paths swept (depending on vendor):

**NVIDIA:**
```
HKLM\SYSTEM\CurrentControlSet\Control\Video  (GPU subkeys)
HKLM\SOFTWARE\NVIDIA Corporation
HKCU\SOFTWARE\NVIDIA Corporation
HKLM\SYSTEM\CurrentControlSet\Services\nvlddmkm
HKLM\SYSTEM\CurrentControlSet\Services\nvdimm
HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\OpenGLDrivers  (NVIDIA entries)
```

**AMD:**
```
HKLM\SYSTEM\CurrentControlSet\Control\Video
HKLM\SOFTWARE\AMD
HKLM\SOFTWARE\ATI Technologies
HKLM\SYSTEM\CurrentControlSet\Services\amdkmdag
HKLM\SYSTEM\CurrentControlSet\Services\amdkmdap
```

**Intel:**
```
HKLM\SYSTEM\CurrentControlSet\Control\Video
HKLM\SOFTWARE\Intel
HKLM\SYSTEM\CurrentControlSet\Services\igfx
```

### Safe Mode RunOnce Approach

The `schedule_safe_mode_removal` function writes to:
```
HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\RunOnce
  WinOptGpuClean = "cmd /c pnputil /remove-device <id> && pnputil /delete-driver <inf> /uninstall /force"
```

Then calls `bcdedit /set safeboot minimal` to boot into Safe Mode on the next restart. The RunOnce command executes, performs the cleanup, and the system boots normally on the subsequent restart (WinOpt Pro also writes a second RunOnce to remove the Safe Mode boot flag after cleanup).

---

## 7. WSL Manager Advanced

### .wslconfig Deep Dive

The `.wslconfig` file (located at `%USERPROFILE%\.wslconfig`) controls the WSL 2 VM-level settings. WinOpt Pro's WSL Settings tab provides a GUI for all options.

```ini
[wsl2]
# Physical memory limit for the WSL VM
memory=8GB

# Number of logical processors allocated
processors=4

# Swap file size (0 = disable)
swap=2GB

# Networking mode: nat (default) or mirrored
# mirrored: WSL shares the Windows network stack directly
networkingMode=mirrored

# DNS tunneling via the Windows DNS resolver (used with mirrored networking)
dnsTunneling=true

# Windows Firewall rules apply to WSL traffic
firewall=true

# Auto-proxy: WSL inherits Windows proxy settings
autoProxy=true

# Nested virtualization support (for running VMs inside WSL)
nestedVirtualization=true

# Kernel command line arguments
kernelCommandLine=cgroup_no_v1=all

# GUI applications (WSLg) debug shell
guiApplications=true
```

**networkingMode=mirrored** (Windows 11 22H2+): In this mode, WSL 2 uses a mirrored network interface instead of the default NAT-based vEthernet adapter. This means:
- WSL can be reached from the local network at the same IP as the Windows host.
- localhost in WSL resolves to the Windows localhost.
- IPv6 works correctly.
- Host firewall rules apply directly to WSL traffic.

**dnsTunneling**: In mirrored mode, DNS queries from WSL are tunneled to the Windows DNS resolver. This ensures WSL respects VPN split-tunnel DNS rules.

### WSLg Architecture

WSLg (Windows Subsystem for Linux GUI) enables graphical Linux applications without an external X server. The architecture:

1. A **Wayland compositor** (`weston`) runs inside the WSL VM as a system process.
2. A **XWayland** server bridges X11 applications to Wayland.
3. The compositor renders to a **virtual GPU** using the host GPU's kernel-mode driver (via `dxgkrnl.sys` pass-through).
4. Frames are presented via **RDP** (Remote Desktop Protocol) to the Windows host's built-in RDP client (`mstsc`).
5. Windows shows the Linux window as a native Win32 window through shell integration.

This architecture means Linux GUI apps share the host GPU's acceleration without a separate virtual machine console. The RDP connection is local and high-refresh-rate capable.

**Linux Mode** in WinOpt Pro launches a full desktop environment (XFCE4, KDE Plasma, or GNOME) via:
```bash
wsl -d <distro> -- bash -c "export DISPLAY=:0; startxfce4 &"
```

The WslSetupWizard handles DE installation:
```bash
# XFCE4
sudo apt-get install -y xfce4 xfce4-terminal
# KDE
sudo apt-get install -y kde-standard
# GNOME
sudo apt-get install -y gnome-session
```

### Distro Management Commands

WinOpt Pro wraps `wsl.exe` for all distro operations:

| Operation | Command |
|-----------|---------|
| List installed | `wsl --list --verbose` |
| Install | `wsl --install -d <name>` |
| Set default | `wsl --setdefault <name>` |
| Set version | `wsl --set-version <name> 2` |
| Export | `wsl --export <name> <path.tar>` |
| Import | `wsl --import <name> <install-dir> <path.tar>` |
| Unregister | `wsl --unregister <name>` |
| Shutdown | `wsl --shutdown` |
| Run command | `wsl -d <name> -- <command>` |

---

## 8. Backup and Profile System

### .winopt File Format

Backup files exported by WinOpt Pro use the `.winopt` extension. Internally they are JSON:

```json
{
  "version": "1.0",
  "exported_at": "2026-03-04T12:00:00Z",
  "machine_id": "SHA256-truncated-machine-guid",
  "tweaks": {
    "DisableSysMain": true,
    "DisableTelemetry": true,
    "EnableHAGS": false
  },
  "profiles": [
    {
      "id": "uuid",
      "name": "Gaming",
      "tweaks": ["DisableSysMain", "SystemResponsiveness", "DisableDynamicTick"]
    }
  ],
  "settings": {
    "expert_mode": false,
    "theme": "dark",
    "accent_color": "#6366f1"
  }
}
```

The `machine_id` is a truncated SHA-256 of the machine's MachineGuid (see Section 9) — it is not the full GUID and cannot be used to re-derive the encryption key. It is present for informational purposes only (to identify which machine created the backup).

### Automating Backups

WinOpt Pro does not currently include scheduled auto-backup, but you can automate it via Windows Task Scheduler using the CLI. From PowerShell (running as admin), you could trigger the backup via Tauri's CLI interface if exposed, or simply copy the backup file produced via the UI to a network share.

For a simple approach using Task Scheduler:
1. Use WinOpt Pro's Scheduler page to create a task.
2. Set it to run a PowerShell script that copies `%APPDATA%\WinOptPro\backup.winopt` to your backup destination.

### Sharing Profiles

A `.winopt` backup file is portable. The `machine_id` field is informational only — importing on a different machine applies the same tweak set regardless of machine identity. This makes profiles shareable across systems.

To share a profile configuration:
1. Export a backup on the source machine.
2. Open the `.winopt` file in any text editor.
3. Share the file directly or extract and share the `profiles` section.
4. The recipient imports the backup on their machine — existing settings merge with the imported backup; conflicts (same tweak, different state) default to the imported value.

---

## 9. History and Audit Log

### AES-256-GCM Encryption

WinOpt Pro's audit log (`db.rs`) encrypts sensitive fields of each history entry using AES-256-GCM:

**Encrypted fields:**
- `command_executed` — the Tauri command invoked
- `stdout` — command output
- `stderr` — error output

**Plaintext fields (for browsing/filtering):**
- `id`, `timestamp`, `tweak_id`, `action` (Apply/Revert), `user`

### Key Derivation

The encryption key is derived from the machine's `MachineGuid`:

```rust
// db.rs (simplified)
fn get_machine_key() -> [u8; 32] {
    let guid = registry::get_value(
        "HKLM\\SOFTWARE\\Microsoft\\Cryptography",
        "MachineGuid"
    ).unwrap_or_default();

    let mut hasher = sha2::Sha256::new();
    hasher.update(guid.as_bytes());
    hasher.finalize().into()
}
```

The `MachineGuid` is a UUID generated at Windows installation time. It is stable across reboots but changes on re-installation. This means:
- Audit logs from one machine are not readable on another machine (different key).
- Reinstalling Windows invalidates old encrypted log entries.
- The key is never stored anywhere — it is derived fresh from the MachineGuid each time.

### Encryption Format

Each encrypted field is stored with the prefix `enc:` followed by a base64-encoded blob containing the AES-256-GCM nonce (12 bytes) + ciphertext + authentication tag:

```
enc:<base64(nonce || ciphertext || tag)>
```

The `enc:` prefix allows backward compatibility — if a log entry predates encryption (e.g., from an older WinOpt Pro version), the field is stored as plaintext without the prefix and is read directly.

### Reading Raw Logs

The audit log database is stored at:
```
%APPDATA%\WinOptPro\audit.db
```

It is a SQLite database. To read it directly:

```bash
sqlite3 "%APPDATA%/WinOptPro/audit.db" "SELECT id, timestamp, tweak_id, action FROM audit_log ORDER BY timestamp DESC LIMIT 20;"
```

Encrypted fields will appear as `enc:<base64>` strings when read directly. To decrypt them, you would need to re-implement the key derivation and AES-256-GCM decryption using the machine's MachineGuid.

---

## 10. Building from Source

### Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Rust | 1.78+ | Install via rustup |
| Node.js | 20 LTS+ | Required for frontend |
| Visual Studio Build Tools | 2022 | MSVC toolchain for Rust |
| Windows SDK | 10.0.26100+ | For Windows-specific FFI |

Install the Rust Windows target:
```bash
rustup target add x86_64-pc-windows-msvc
```

### Building

```bash
# Clone the repository
git clone https://github.com/your-repo/WinOptimizerRevamp.git
cd WinOptimizerRevamp

# Install frontend dependencies
npm install

# Type check
npx tsc --noEmit

# Run tests
npx vitest run

# Development mode (frontend + backend hot-reload)
npm run tauri dev

# Production build
npm run tauri build
```

The production build outputs to `src-tauri/target/release/bundle/`:
- `msi/WinOptPro_<version>_x64_en-US.msi` — Windows Installer package
- `nsis/WinOptPro_<version>_x64-setup.exe` — NSIS installer

### Rust-specific build notes

The `src-tauri/Cargo.toml` enables specific Windows crate features:

```toml
[dependencies.windows]
version = "0.58"
features = [
  "Win32_Foundation",
  "Win32_System_Registry",
  "Win32_System_Services",
  "Win32_System_LibraryLoader",     # For latency.rs FFI
  "Win32_Storage_FileSystem",
  "Win32_System_Wmi",
  "Win32_NetworkManagement_IpHelper",
  "Win32_System_Power",
]

[dependencies]
aes-gcm = "0.10"     # AES-256-GCM for audit log encryption
sha2 = "0.10"        # SHA-256 for key derivation
base64 = "0.22"      # Encoding encrypted blobs
sysinfo = "0.30"     # Process enumeration for gaming detection
```

### Code Signing (Not Implemented)

The build is currently unsigned. To eliminate SmartScreen warnings, you need an Extended Validation (EV) code signing certificate from a Microsoft-trusted CA (DigiCert, Sectigo, etc.). EV certificates require identity verification and cost approximately $300-500/year.

To sign the MSI after building:
```powershell
signtool sign /fd SHA256 /tr http://timestamp.digicert.com /td sha256 /f certificate.pfx /p <password> "WinOptPro_1.x.x_x64_en-US.msi"
```

---

## 11. Extending WinOpt Pro

### Adding Custom Tweaks to tweaks.json

The tweak registry is `src/data/tweaks.json`. Each entry follows this schema:

```json
{
  "id": "UniqueID",
  "name": "Human Readable Name",
  "description": "What this tweak does and why.",
  "category": "Performance",
  "risk": "green",
  "tags": ["cpu", "scheduling"],
  "rebootRequired": false,
  "expertOnly": false,
  "applyCommand": "apply_tweak_UniqueID",
  "revertCommand": "revert_tweak_UniqueID",
  "checkCommand": "check_tweak_UniqueID"
}
```

Fields:
- `id`: Unique identifier, used in history and profiles. No spaces.
- `category`: Must match one of the category filter values: `Performance`, `Gaming`, `Privacy`, `Network`, `Power`, `Security`, `Debloat`, `Windows UI`, `Windows Update`, `Tools`.
- `risk`: `"green"`, `"yellow"`, or `"red"`.
- `expertOnly`: If `true`, the tweak is hidden without Expert Mode (must also set `risk: "red"`).
- `applyCommand`, `revertCommand`, `checkCommand`: Tauri command names that the backend must implement.

### Adding Rust Commands

Tauri commands are registered in `src-tauri/src/main.rs`:

```rust
fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            // existing commands...
            my_module::my_new_command,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

Create `src-tauri/src/my_module.rs`:

```rust
use tauri::command;

#[command]
pub async fn my_new_command(param: String) -> Result<String, String> {
    // Windows registry write example
    let hklm = winreg::RegKey::predef(winreg::enums::HKEY_LOCAL_MACHINE);
    let (key, _) = hklm.create_subkey(r"SOFTWARE\Example")
        .map_err(|e| e.to_string())?;
    key.set_value("ExampleValue", &param)
        .map_err(|e| e.to_string())?;
    Ok(format!("Set ExampleValue to {}", param))
}
```

Declare the module in `main.rs`:
```rust
mod my_module;
```

### Frontend Hook Pattern

All feature hooks follow the same pattern for consistency. Use `useLatency` as a reference:

```typescript
// src/hooks/useMyFeature.ts
import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "@/lib/utils";
import { useToast } from "@/components/ToastSystem";

export function useMyFeature() {
  const [data, setData] = useState<MyData | null>(null);
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const fetchData = useCallback(async (force = false) => {
    if (!force && data) return; // Cache hit
    setLoading(true);
    try {
      if (isTauri()) {
        const result = await invoke<MyData>("my_new_command");
        setData(result);
      } else {
        setData(MOCK_DATA); // Dev mode fallback
      }
    } catch (err) {
      addToast({ type: "error", message: String(err) });
    } finally {
      setLoading(false);
    }
  }, [data, addToast]);

  useEffect(() => { fetchData(false); }, []);

  const refresh = useCallback(() => fetchData(true), [fetchData]);

  return { data, loading, refresh };
}
```

### Test Pattern for New Features

Follow the established test patterns documented in MEMORY.md. Key points:

1. Mock `@tauri-apps/api/core` with `vi.mock`.
2. Mock `@/components/ToastSystem` with a stable `addToast` reference.
3. Use `renderHook` from `@/test/utils`.
4. Clear Zustand cache in `beforeEach` if your feature uses `useGlobalCache`.
5. Use `isTauri=false` path for unit tests — the mock data path is always exercised in CI.

Run tests after adding new features:
```bash
npx vitest run
```

All 643+ existing tests must continue to pass before committing.

---

*WinOpt Pro — Advanced / Expert Guide | Last updated: 2026-03-11*
