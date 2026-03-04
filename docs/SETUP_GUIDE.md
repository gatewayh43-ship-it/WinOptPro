# WinOpt Pro — Setup Guide

This guide covers everything you need to get WinOpt Pro installed, configured, and safely running on your Windows machine. Read through it once before applying any tweaks.

---

## Table of Contents

1. [System Requirements](#1-system-requirements)
2. [Download and Install](#2-download-and-install)
3. [First Launch Walkthrough](#3-first-launch-walkthrough)
4. [Understanding the Interface](#4-understanding-the-interface)
5. [Before You Start Tweaking](#5-before-you-start-tweaking)
6. [Your First Optimization](#6-your-first-optimization)
7. [Reverting Changes](#7-reverting-changes)
8. [Staying Safe](#8-staying-safe)
9. [Keeping Up to Date](#9-keeping-up-to-date)
10. [Getting Help](#10-getting-help)

---

## 1. System Requirements

### Minimum Requirements

| Component | Minimum |
|-----------|---------|
| OS | Windows 10 version 2004 (May 2020 Update, build 19041) |
| RAM | 4 GB |
| Disk space | 200 MB free |
| Architecture | x86-64 (64-bit) only |
| Privileges | Administrator account required |

### Recommended Requirements

| Component | Recommended |
|-----------|-------------|
| OS | Windows 11 22H2 or later |
| RAM | 8 GB or more |
| Disk space | 500 MB free (for logs, backups, and reports) |
| Display | 1280x720 or higher |
| Internet | Required for App Store, AI Assistant (Ollama), and update checks |

### Feature-Specific Requirements

- **AI Assistant**: Requires [Ollama](https://ollama.ai) installed locally with at least one model pulled (e.g., `ollama pull llama3`). Ollama must be running before launching WinOpt Pro.
- **GPU Overlay / Gaming Module**: NVIDIA GPU metrics via `nvidia-smi` require an NVIDIA driver with the management tools installed. AMD/Intel GPU information is available without additional tools.
- **WSL Manager**: Windows Subsystem for Linux 2 must be installable (Windows 10 build 19041+ or Windows 11). WSLg (Linux GUI apps) requires Windows 11 or Windows 10 Insider Preview build 21364+.
- **Scheduler features**: Windows Task Scheduler service must be running.
- **Network features**: Some network tweaks and diagnostics require an active network adapter.

### Administrator Rights

WinOpt Pro requires administrator privileges for the majority of its features. The application will request elevation (UAC prompt) at launch. Without admin rights:

- Most tweaks cannot be applied (registry and service changes require admin)
- GPU driver removal will fail
- Scheduled tasks cannot be created or deleted
- Some system information may not be readable

You can launch WinOpt Pro as a standard user to browse the interface, but no changes can be applied.

---

## 2. Download and Install

### Downloading

1. Go to the [WinOpt Pro GitHub Releases page](https://github.com/your-repo/WinOptimizerRevamp/releases).
2. Find the latest release at the top of the list.
3. Under "Assets," download the `.msi` installer file (e.g., `WinOptPro_1.x.x_x64_en-US.msi`).
4. Do not download from any other source — unofficial builds may be tampered with.

### Running the Installer

Double-click the `.msi` file to begin installation. You will likely see a Windows SmartScreen warning that looks like this:

> "Windows protected your PC — Microsoft Defender SmartScreen prevented an unrecognized app from starting."

**Why does this appear?** SmartScreen flags applications that do not have a code-signing certificate from a recognized Certificate Authority. Code signing certificates cost several hundred dollars per year. WinOpt Pro is open-source and currently unsigned. This warning does not mean the software is malicious.

**How to proceed safely:**

1. Click **"More info"** (the small link below the warning text).
2. The app name and publisher will appear.
3. Click **"Run anyway"** to proceed.
4. If you are uncomfortable proceeding, you can verify the file by checking its SHA-256 hash against the hash posted on the GitHub Releases page.

**Verifying the download hash (optional but recommended):**

Open PowerShell and run:
```powershell
Get-FileHash "C:\Users\YourName\Downloads\WinOptPro_1.x.x_x64_en-US.msi" -Algorithm SHA256
```
Compare the output against the `SHA256SUMS.txt` file posted in the GitHub release.

### Installation Steps

1. Accept the license agreement.
2. Choose an installation directory (default: `C:\Program Files\WinOpt Pro\`).
3. Click **Install**.
4. When prompted by UAC ("Do you want to allow this app to make changes to your device?"), click **Yes** — this is the installer, not the app itself.
5. Click **Finish**. A shortcut will be placed on your Desktop and Start Menu.

### First-Time UAC Prompt

When you launch WinOpt Pro for the first time (and on every subsequent launch), you will see a UAC prompt:

> "Do you want to allow this app to make changes to your device? WinOpt Pro — Verified publisher: (Unknown)"

Click **Yes**. This elevation is required for the application to read system information and apply tweaks. The app runs as an elevated process for its entire session.

---

## 3. First Launch Walkthrough

### The Dashboard

On first launch, you will see the **Dashboard** — the home screen of WinOpt Pro. It displays:

- **System Vitals panel** (top): Live CPU usage, RAM usage, disk activity, and GPU information. These update in real time.
- **Quick Actions panel**: One-click shortcuts to the most common tasks (run Privacy Audit, open Gaming Optimizer, etc.).
- **Recent Activity**: A short list of the last tweaks applied or actions taken.
- **System Summary**: Your Windows version, hardware summary, and a score indicating optimization potential.

### Status Indicators

| Indicator | Meaning |
|-----------|---------|
| Green dot | Feature is active/healthy |
| Yellow dot | Feature needs attention or is in a caution state |
| Red dot | Issue detected or feature is in a risky state |
| Grey dot | Feature is disabled or not applicable |

### The Sidebar

The left sidebar is your primary navigation. It is organized into groups:

- **Tuning**: Tweaks, Profiles, History
- **Apps**: App Store, Startup Apps, Process Manager
- **Utilities**: Gaming Optimizer, Privacy Audit, Network Analyzer, Storage Optimizer, Power Manager, Latency Optimizer, Driver Manager, GPU Driver Cleaner, WSL Manager
- **System**: System Report, Settings, AI Assistant

Click any item to navigate to that page. Groups can be collapsed by clicking the group header.

---

## 4. Understanding the Interface

### Sidebar Navigation

The sidebar collapses to icons-only on smaller screens. Hover over an icon to see the label. The current page is highlighted with an accent color.

At the bottom of the sidebar you will see:

- **Theme toggle**: Switch between light and dark mode.
- **Color scheme picker**: Choose an accent color for the UI.
- **Status badge**: Shows your current elevation status (Admin / Standard User) and a brief system health summary.

### Search Bar (Command Palette)

Press **Ctrl+K** at any time to open the Command Palette. You can:

- Type the name of any feature (e.g., "gaming," "latency," "drivers") to jump to it instantly.
- Search for specific tweaks by name.
- Run quick actions without navigating menus.

The Command Palette uses semantic search, so approximate phrasing works (e.g., "speed up boot" will find startup-related features).

### Tweak Cards

On the Tweaks page, each tweak is displayed as a card showing:

- **Name**: The tweak identifier.
- **Description**: What the tweak does in plain English.
- **Risk badge**: Green (Safe), Yellow (Caution), or Red (Expert Only).
- **Category tag**: Performance, Gaming, Privacy, etc.
- **Status toggle**: Whether the tweak is currently applied.
- **Apply / Revert buttons**.

Red-risk tweaks are hidden behind Expert Mode and will not appear unless Expert Mode is enabled in Settings.

### Risk Level Colors

| Color | Label | Meaning |
|-------|-------|---------|
| Green | Safe | Reversible, no system stability risk |
| Yellow | Caution | Read description carefully; minor system impact possible |
| Red | Expert Only | Can cause instability, security reduction, or data loss if misused |

---

## 5. Before You Start Tweaking

Do not apply tweaks immediately after installing. Take five minutes to set up a safety net first.

### Step 1: Create a Backup

1. Open **Settings** (gear icon in the sidebar).
2. Scroll to the **Backup and Restore** section.
3. Click **Export Backup**.
4. Choose a save location outside your system drive (e.g., an external drive or USB stick).
5. The backup is saved as a `.winopt` file containing your current settings, tweak state, and preferences.

This backup can be restored later from the same Settings section if anything goes wrong.

### Step 2: Create a Windows System Restore Point

WinOpt Pro backups cover the app's own state. For a full system safety net, also create a Windows System Restore point:

1. Press **Win+S**, search for "Create a restore point," and open it.
2. Select your system drive (usually C:) and click **Create**.
3. Name it something like "Before WinOpt Pro" and click **Create**.

### Step 3: Create a Profile

Profiles save a named snapshot of which tweaks are applied. This lets you switch between configurations (e.g., "Daily Use" vs "Gaming Session").

1. Navigate to **Profiles** in the sidebar.
2. Click **New Profile**.
3. Name it (e.g., "Clean Baseline") and save it.
4. After applying tweaks, you can save another profile named "Optimized."

### Step 4: Understand Risk Levels

Before applying any tweak, read its description. Pay attention to:

- **Green tweaks**: Generally safe to apply for any user.
- **Yellow tweaks**: May affect a feature you rely on (e.g., disabling Windows Search indexing will make search slower for a few minutes while the index rebuilds after re-enabling).
- **Red tweaks**: Require understanding of what they disable. Some reduce security, some can cause driver incompatibilities, some require a reboot to take effect and may affect boot if something goes wrong.

### Step 5: Decide Whether to Enable Expert Mode

Expert Mode unlocks Red-risk tweaks. Do not enable it on your first session. Only enable it when you have:

- Read the descriptions of the specific Red tweaks you want to apply.
- Created a backup and a System Restore point.
- Understood what the tweak disables and what you lose by disabling it.

To enable Expert Mode: **Settings** → scroll to the **Expert Mode** toggle → enable it. A confirmation dialog will warn you.

---

## 6. Your First Optimization

Follow this recommended flow for first-time users.

### Step 1: Run a Privacy Audit

1. Navigate to **Privacy Audit** in the sidebar.
2. Click **Run Scan**.
3. WinOpt Pro will scan 9 telemetry and data-collection sources on your system.
4. Review the results. Each issue shows what is collecting data and why it might matter.
5. Click **Fix All** to resolve all detected issues at once, or click individual **Fix** buttons to address them one at a time.

The Privacy Audit is the safest starting point — all checks are either Green or Yellow risk, and fixes are reversible.

### Step 2: Apply Recommended Performance Tweaks

1. Navigate to **Tweaks** in the sidebar.
2. Filter by **Performance** category.
3. Apply these safe Green tweaks to start:
   - **Disable SysMain** (reduces RAM overhead on SSDs)
   - **Disable Startup Delay** (apps launch faster after boot)
   - **Speed Up Shutdown** (reduces the Windows shutdown wait time)
   - **Disable Search Indexer** (reduces background disk activity; search still works, just slower initially)
4. Each tweak shows whether a reboot is required. Note which ones do.

### Step 3: Check the Gaming Section (if applicable)

If you play games on this machine:

1. Navigate to **Gaming Optimizer**.
2. Review the **Recommended Gaming Tweaks** section.
3. Enable **Auto-Optimize** if you want tweaks applied automatically when a game is detected.
4. The overlay can be launched here — it appears as a small transparent window you can drag anywhere on screen.

### Step 4: Reboot if Required

If any applied tweaks show a "Reboot Required" indicator, restart your PC before evaluating performance differences. Some changes (especially service and driver-level tweaks) do not take effect until after a reboot.

### Step 5: Evaluate

After rebooting:
- Check the Dashboard for updated system vitals.
- Use the **History** page to review what was applied.
- If anything feels wrong, use the History page to revert specific tweaks.

---

## 7. Reverting Changes

WinOpt Pro logs every change in its audit history. Nothing is permanent.

### Reverting a Single Tweak

1. Go to the **Tweaks** page.
2. Find the applied tweak (use the "Applied" filter to see only active tweaks).
3. Click **Revert** on the tweak card.
4. Confirm the dialog.

Alternatively, toggling the status switch back to "off" on a tweak card will revert it.

### Bulk Revert via History Page

1. Navigate to **History** in the sidebar.
2. You will see a chronological log of all applied tweaks with timestamps.
3. Use the checkboxes to select multiple tweaks.
4. Click **Revert Selected** to undo them all at once.
5. You can also use **Revert All** to undo every change ever made — this returns your system to the state it was in before you used WinOpt Pro.

### Restoring from a Backup

1. Navigate to **Settings** → **Backup and Restore**.
2. Click **Import Backup**.
3. Select your `.winopt` backup file.
4. WinOpt Pro will apply the state from the backup, reverting any tweaks that differ from the saved snapshot.

### Using Windows System Restore

If WinOpt Pro itself is inaccessible or you cannot boot normally:

1. Boot into Windows Recovery Environment (hold Shift while clicking Restart, or press F8/F11 during boot depending on your motherboard).
2. Go to **Troubleshoot** → **Advanced options** → **System Restore**.
3. Select the restore point you created ("Before WinOpt Pro") and restore.

This restores the Windows registry and system files to that point, undoing any tweaks applied at the OS level.

---

## 8. Staying Safe

### When NOT to Use Expert Tweaks

Avoid Red-risk tweaks in the following situations:

- **On a work or corporate machine**: IT policy may prohibit changes to security features like VBS, HVCI, or SmartScreen. Disabling these may violate your employer's security requirements.
- **On a machine with sensitive data**: Tweaks like disabling memory protection features reduce security. Do not apply them on machines with financial data, credentials, or personal information.
- **Before a critical deadline**: Never apply multiple Red tweaks right before a presentation, deadline, or event. Do it on a day when a reboot or troubleshooting session would not be disruptive.
- **Without a backup**: Always export a backup before applying Red tweaks.
- **Without understanding what the tweak does**: Read the full description. If a tweak mentions "disables kernel protection" or "reduces exploit mitigation," understand what that means for your threat model.

### What to Do If Something Breaks

**Scenario: App behaves strangely or crashes**
- Revert the last applied tweak via the History page.
- Reboot.

**Scenario: A Windows feature stopped working**
- Open History, find the most recently applied tweak, and revert it.
- If unsure which tweak caused it, revert all tweaks applied in the last session.

**Scenario: Cannot boot normally**
1. Boot into Safe Mode (hold Shift + Restart → Troubleshoot → Advanced Options → Startup Settings → Safe Mode with Networking).
2. Launch WinOpt Pro and use History → Revert All.
3. Alternatively, use Windows System Restore from the Recovery Environment.

**Scenario: WinOpt Pro itself will not launch**
- Uninstall via Control Panel → Programs → WinOpt Pro → Uninstall. This does NOT revert tweaks.
- Use Windows System Restore to undo OS-level changes.

### General Safe Usage Rules

- Apply tweaks in small batches (3-5 at a time), then test before applying more.
- Always reboot after applying tweaks that require it before assessing impact.
- Keep a `.winopt` backup on an external drive, not only on the system drive.
- Do not apply the same tweak multiple times — check the tweak's current status before clicking Apply.

---

## 9. Keeping Up to Date

WinOpt Pro does not currently include an auto-update mechanism. To check for updates:

1. Visit the [GitHub Releases page](https://github.com/your-repo/WinOptimizerRevamp/releases) periodically.
2. Compare the latest release version with your installed version (visible in **Settings** → **About**).
3. If a new version is available, download the new `.msi` installer and run it. It will update over the existing installation.

### Before Updating

- Export a backup of your current settings first (**Settings** → **Backup and Restore** → **Export Backup**).
- Read the release notes (changelog) for the new version to understand what changed.
- If the release notes mention database or settings format changes, keep your backup in a safe location.

### After Updating

- Launch the app and check **Settings** → **About** to confirm the new version is installed.
- Your tweak history and profiles should be preserved across updates.

---

## 10. Getting Help

### In-App Help

- Press **Ctrl+K** and type "help" to find documentation links and the AI Assistant.
- The **AI Assistant** (sidebar) can answer questions about specific tweaks and Windows optimization in plain English. It uses a local Ollama model — your questions never leave your machine.

### GitHub Issues

Report bugs or request features at:

> https://github.com/your-repo/WinOptimizerRevamp/issues

Before opening an issue:
- Check if an existing issue covers your problem.
- Include your Windows version (`winver`), WinOpt Pro version, and a description of what you did and what happened.
- Export a **System Report** (System Report page → Generate Report) and attach it if the issue relates to hardware or system-specific behavior.

### Community

- Check the GitHub Discussions tab for community Q&A and tips.
- For feature ideas, open a Discussion rather than an Issue.

### Generating a System Report for Support

1. Navigate to **System Report** in the sidebar.
2. Click **Generate Report**.
3. The report exports as an HTML file with full hardware info, tweak history, and system state.
4. Attach this file when reporting issues or asking for community help.

---

*WinOpt Pro — Setup Guide | Last updated: 2026-03-04*
