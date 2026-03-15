# App Store Bundles Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Bundles sub-feature to the App Store — 22 curated collections plus user-created custom bundles — installable via a checklist modal with per-app expand, installed detection, and sequential install with per-app status.

**Architecture:** New `BundlesPage` linked from a hero card on `AppsPage`. A `useBundles` hook manages curated (static JSON) and custom (localStorage) bundles and resolves app metadata from the flat dictionary in `app_metadata.json`. A `BundleInstallModal` receives `installApp`/`installedApps` as props from `BundlesPage` and tracks per-app install results in local state.

**Tech Stack:** React 19, TypeScript, Tailwind 4, Lucide React, Vitest + Testing Library, localStorage (no new dependencies)

---

## File Map

| Path | Status | Purpose |
|------|--------|---------|
| `src/data/bundles.json` | **Create** | 22 curated bundle definitions |
| `src/types/bundles.ts` | **Create** | Bundle, AppMetadata, ResolvedBundle, BundleInstallModalProps interfaces |
| `src/hooks/useBundles.ts` | **Create** | Hook: load curated, CRUD custom, resolve, search |
| `src/components/BundleInstallModal.tsx` | **Create** | Checklist install modal |
| `src/pages/BundlesPage.tsx` | **Create** | Full bundles page (groups + create panel) |
| `src/data/app_metadata.json` | **Modify** | Add 10 missing flat-dict entries |
| `src/pages/AppsPage.tsx` | **Modify** | Add optional `setView` prop + hero card |
| `src/App.tsx` | **Modify** | Register `bundles` view; pass `setView` to `AppsPage` |
| `src/components/layout/Sidebar.tsx` | **Modify** | Add Bundles nav item under Apps & Packages |
| `src/__tests__/hooks/useBundles.test.ts` | **Create** | Hook unit tests |
| `src/__tests__/components/BundleInstallModal.test.tsx` | **Create** | Modal unit tests |
| `src/__tests__/pages/BundlesPage.test.tsx` | **Create** | Page integration tests |
| `src/__tests__/pages/AppsPage.test.tsx` | **Modify** | Add hero card tests |

---

## Chunk 1: Data Foundation

### Task 1: Extend app_metadata.json flat dictionary

**Files:**
- Modify: `src/data/app_metadata.json`

> **Note:** `Microsoft.Sysinternals.ProcessExplorer` is already present in the flat dictionary — do NOT add it. The list below contains only the 10 truly missing entries.

The flat dictionary section starts after the `categories` array. Each entry follows this shape:
```json
"Vendor.AppId": {
  "id": "Vendor.AppId",
  "name": "Display Name",
  "publisher": "Publisher Name",
  "author": "Author Name",
  "description": "One paragraph description.",
  "version": "1.0.0",
  "license": "License Type",
  "logo": "https://ui-avatars.com/api/?name=App+Name&background=random&color=fff&rounded=true&bold=true&size=128",
  "website": "https://example.com/",
  "support_url": "https://example.com/support",
  "github_link": "https://github.com/org/repo",
  "is_verified": true,
  "trust_score": 90,
  "rating": 4.5,
  "reviews": [{"author": "TechReviewer99", "rating": 4.5, "text": "Essential application. I install App Name on every new machine.", "date": "2024-01-15"}],
  "insights": {"pros": ["Free and open source", "Lightweight", "Widely trusted"], "cons": ["No auto-update", "UI could be modern"]}
}
```

- [ ] **Step 1: Verify which entries are truly absent**

Run from repo root:
```bash
node -e "
const m = require('./src/data/app_metadata.json');
const flatKeys = Object.keys(m).filter(k => k !== 'categories');
const needed = [
  'Notepad.Notepad-plus-plus',
  'BlackmagicDesign.DaVinciResolve',
  'BitSum.ProcessLasso',
  'OCBase.OCCT',
  'Geeks3D.FurMark',
  'CrystalDewWorld.CrystalDiskInfo',
  'CrystalDewWorld.CrystalDiskMark',
  'Cockos.REAPER',
  'ProtonTechnologies.ProtonVPN',
  'KeePassXCTeam.KeePassXC',
];
needed.forEach(id => console.log(id, flatKeys.includes(id) ? '✅ present' : '❌ MISSING'));
"
```

Expected: all 10 show `❌ MISSING`.

- [ ] **Step 2: Add the 10 missing entries to the flat dictionary**

Open `src/data/app_metadata.json`. Find the last entry in the flat dictionary (before the closing `}` of the root object). Add these entries. Use the `ui-avatars.com` logo URL pattern for all new entries since logos won't be pre-generated.

```json
,
"Notepad.Notepad-plus-plus": {
  "id": "Notepad.Notepad-plus-plus",
  "name": "Notepad++",
  "publisher": "Don HO",
  "author": "Don HO",
  "description": "Notepad++ is a free source code editor and Notepad replacement that supports several languages. Running in the MS Windows environment, its use is governed by GNU General Public License.",
  "version": "8.7.1",
  "license": "GPL-2.0",
  "logo": "https://ui-avatars.com/api/?name=Notepad%2B%2B&background=2ecc71&color=fff&rounded=true&bold=true&size=128",
  "website": "https://notepad-plus-plus.org/",
  "support_url": "https://notepad-plus-plus.org/community/",
  "github_link": "https://github.com/notepad-plus-plus/notepad-plus-plus",
  "is_verified": true,
  "trust_score": 97,
  "rating": 4.8,
  "reviews": [{"author": "TechReviewer99", "rating": 4.8, "text": "Essential application. I install Notepad++ on every new machine.", "date": "2024-01-15"}],
  "insights": {"pros": ["Free and open source", "Lightweight", "Syntax highlighting for 80+ languages"], "cons": ["Windows only", "Plugin ecosystem can be inconsistent"]}
},
"BlackmagicDesign.DaVinciResolve": {
  "id": "BlackmagicDesign.DaVinciResolve",
  "name": "DaVinci Resolve",
  "publisher": "Blackmagic Design",
  "author": "Blackmagic Design Pty. Ltd.",
  "description": "DaVinci Resolve is the world's only solution that combines professional 8K editing, color correction, visual effects and audio post production all in one software tool.",
  "version": "19.1",
  "license": "Freeware",
  "logo": "https://ui-avatars.com/api/?name=DaVinci+Resolve&background=222222&color=fff&rounded=true&bold=true&size=128",
  "website": "https://www.blackmagicdesign.com/products/davinciresolve",
  "support_url": "https://forum.blackmagicdesign.com/",
  "github_link": "https://www.blackmagicdesign.com/products/davinciresolve",
  "is_verified": true,
  "trust_score": 96,
  "rating": 4.7,
  "reviews": [{"author": "TechReviewer99", "rating": 4.7, "text": "Essential application. I install DaVinci Resolve on every new machine.", "date": "2024-01-15"}],
  "insights": {"pros": ["Professional-grade color grading", "Free version is extremely capable", "All-in-one editing suite"], "cons": ["High system requirements", "Steep learning curve for beginners"]}
},
"BitSum.ProcessLasso": {
  "id": "BitSum.ProcessLasso",
  "name": "Process Lasso",
  "publisher": "Bitsum",
  "author": "Bitsum LLC",
  "description": "Process Lasso is a unique new technology that will, among other things, improve your PC's responsiveness during high CPU loads. It does this by temporarily adjusting the priorities of running processes.",
  "version": "12.5.0",
  "license": "Freemium",
  "logo": "https://ui-avatars.com/api/?name=Process+Lasso&background=0070c0&color=fff&rounded=true&bold=true&size=128",
  "website": "https://bitsum.com/",
  "support_url": "https://bitsum.com/support/",
  "github_link": "https://bitsum.com/",
  "is_verified": true,
  "trust_score": 88,
  "rating": 4.4,
  "reviews": [{"author": "TechReviewer99", "rating": 4.4, "text": "Essential application. I install Process Lasso on every new machine.", "date": "2024-01-15"}],
  "insights": {"pros": ["Improves PC responsiveness", "Detailed process management", "Gaming mode available"], "cons": ["Free version limited", "Can feel complex"]}
},
"OCBase.OCCT": {
  "id": "OCBase.OCCT",
  "name": "OCCT",
  "publisher": "OCBase",
  "author": "OCBase",
  "description": "OCCT is the most popular all-in-one stability check & stress test tool for PC. It generates heavy loads on your components and checks for errors, helping ensure system stability.",
  "version": "13.1.3",
  "license": "Freemium",
  "logo": "https://ui-avatars.com/api/?name=OCCT&background=e74c3c&color=fff&rounded=true&bold=true&size=128",
  "website": "https://www.ocbase.com/",
  "support_url": "https://www.ocbase.com/support",
  "github_link": "https://www.ocbase.com/",
  "is_verified": true,
  "trust_score": 90,
  "rating": 4.5,
  "reviews": [{"author": "TechReviewer99", "rating": 4.5, "text": "Essential application. I install OCCT on every new machine.", "date": "2024-01-15"}],
  "insights": {"pros": ["Comprehensive stress testing", "Error detection", "GPU, CPU, PSU tests"], "cons": ["Free version limited to 1 hour tests"]}
},
"Geeks3D.FurMark": {
  "id": "Geeks3D.FurMark",
  "name": "FurMark",
  "publisher": "Geeks3D",
  "author": "Geeks3D",
  "description": "FurMark is a very intensive OpenGL benchmark that uses fur rendering algorithms to measure the performance of the graphics card. Fur rendering is especially stressful for GPU.",
  "version": "2.3.0",
  "license": "Freeware",
  "logo": "https://ui-avatars.com/api/?name=FurMark&background=8e44ad&color=fff&rounded=true&bold=true&size=128",
  "website": "https://geeks3d.com/furmark/",
  "support_url": "https://geeks3d.com/furmark/",
  "github_link": "https://geeks3d.com/furmark/",
  "is_verified": true,
  "trust_score": 87,
  "rating": 4.3,
  "reviews": [{"author": "TechReviewer99", "rating": 4.3, "text": "Essential application. I install FurMark on every new machine.", "date": "2024-01-15"}],
  "insights": {"pros": ["Free GPU stress test", "Widely used benchmark", "Simple interface"], "cons": ["Very aggressive on GPU — use short runs", "No longer updated frequently"]}
},
"CrystalDewWorld.CrystalDiskInfo": {
  "id": "CrystalDewWorld.CrystalDiskInfo",
  "name": "CrystalDiskInfo",
  "publisher": "Crystal Dew World",
  "author": "Noriyuki Miyazaki",
  "description": "CrystalDiskInfo is a HDD/SSD utility software which supports a part of USB, Intel RAID and NVMe. In the main window, you can see the SMART information, disk temperature and drive status.",
  "version": "9.4.1",
  "license": "Freeware",
  "logo": "https://ui-avatars.com/api/?name=CrystalDiskInfo&background=3498db&color=fff&rounded=true&bold=true&size=128",
  "website": "https://crystalmark.info/en/software/crystaldiskinfo/",
  "support_url": "https://crystalmark.info/en/software/crystaldiskinfo/",
  "github_link": "https://github.com/hiyohiyo/CrystalDiskInfo",
  "is_verified": true,
  "trust_score": 95,
  "rating": 4.7,
  "reviews": [{"author": "TechReviewer99", "rating": 4.7, "text": "Essential application. I install CrystalDiskInfo on every new machine.", "date": "2024-01-15"}],
  "insights": {"pros": ["Free SMART monitoring", "Supports HDD/SSD/NVMe", "Lightweight"], "cons": ["Interface looks dated", "Limited to SMART data only"]}
},
"CrystalDewWorld.CrystalDiskMark": {
  "id": "CrystalDewWorld.CrystalDiskMark",
  "name": "CrystalDiskMark",
  "publisher": "Crystal Dew World",
  "author": "Noriyuki Miyazaki",
  "description": "CrystalDiskMark is a disk benchmark software that measures sequential and random read/write speeds. It is widely used as a reference for disk performance testing.",
  "version": "8.0.5",
  "license": "Freeware",
  "logo": "https://ui-avatars.com/api/?name=CrystalDiskMark&background=2980b9&color=fff&rounded=true&bold=true&size=128",
  "website": "https://crystalmark.info/en/software/crystaldiskmark/",
  "support_url": "https://crystalmark.info/en/software/crystaldiskmark/",
  "github_link": "https://github.com/hiyohiyo/CrystalDiskMark",
  "is_verified": true,
  "trust_score": 95,
  "rating": 4.7,
  "reviews": [{"author": "TechReviewer99", "rating": 4.7, "text": "Essential application. I install CrystalDiskMark on every new machine.", "date": "2024-01-15"}],
  "insights": {"pros": ["Industry-standard benchmark", "Free", "Simple to use"], "cons": ["Results vary by test parameters", "No hardware info beyond speed"]}
},
"Cockos.REAPER": {
  "id": "Cockos.REAPER",
  "name": "REAPER",
  "publisher": "Cockos Incorporated",
  "author": "Cockos Incorporated",
  "description": "REAPER is a complete digital audio production application for Windows, offering a full multitrack audio and MIDI recording, editing, processing, mixing and mastering toolset.",
  "version": "7.24",
  "license": "Paid (discounted license available)",
  "logo": "https://ui-avatars.com/api/?name=REAPER&background=e67e22&color=fff&rounded=true&bold=true&size=128",
  "website": "https://www.reaper.fm/",
  "support_url": "https://forum.cockos.com/forumdisplay.php?f=20",
  "github_link": "https://www.reaper.fm/",
  "is_verified": true,
  "trust_score": 94,
  "rating": 4.8,
  "reviews": [{"author": "TechReviewer99", "rating": 4.8, "text": "Essential application. I install REAPER on every new machine.", "date": "2024-01-15"}],
  "insights": {"pros": ["Professional DAW at low price", "Highly customizable", "Very stable and fast"], "cons": ["Paid (though freely evaluable)", "UI less polished than competitors"]}
},
"ProtonTechnologies.ProtonVPN": {
  "id": "ProtonTechnologies.ProtonVPN",
  "name": "Proton VPN",
  "publisher": "Proton AG",
  "author": "Proton AG",
  "description": "Proton VPN is a security-focused VPN service with a strict no-logs policy. It is the only free VPN service with no data limits, ads, or logs, and is developed by the team behind ProtonMail.",
  "version": "3.5.0",
  "license": "Freemium",
  "logo": "https://ui-avatars.com/api/?name=Proton+VPN&background=6d4aff&color=fff&rounded=true&bold=true&size=128",
  "website": "https://protonvpn.com/",
  "support_url": "https://protonvpn.com/support/",
  "github_link": "https://github.com/ProtonVPN",
  "is_verified": true,
  "trust_score": 95,
  "rating": 4.6,
  "reviews": [{"author": "TechReviewer99", "rating": 4.6, "text": "Essential application. I install Proton VPN on every new machine.", "date": "2024-01-15"}],
  "insights": {"pros": ["Free tier with no data limits", "Strong privacy policy", "Open source"], "cons": ["Free tier limited to 3 countries", "Paid plan needed for speed"]}
},
"KeePassXCTeam.KeePassXC": {
  "id": "KeePassXCTeam.KeePassXC",
  "name": "KeePassXC",
  "publisher": "KeePassXC Team",
  "author": "KeePassXC Contributors",
  "description": "KeePassXC is a cross-platform community-driven port of the Windows application KeePass. It allows users to store passwords in an encrypted database with a master password or keyfile.",
  "version": "2.7.9",
  "license": "GPL-3.0",
  "logo": "https://ui-avatars.com/api/?name=KeePassXC&background=27ae60&color=fff&rounded=true&bold=true&size=128",
  "website": "https://keepassxc.org/",
  "support_url": "https://keepassxc.org/docs/",
  "github_link": "https://github.com/keepassxreboot/keepassxc",
  "is_verified": true,
  "trust_score": 96,
  "rating": 4.8,
  "reviews": [{"author": "TechReviewer99", "rating": 4.8, "text": "Essential application. I install KeePassXC on every new machine.", "date": "2024-01-15"}],
  "insights": {"pros": ["Free and open source", "Offline password manager", "Cross-platform"], "cons": ["No cloud sync out of the box", "Less polished UI than cloud alternatives"]}
}
```

- [ ] **Step 3: Validate JSON is still valid**

```bash
node -e "require('./src/data/app_metadata.json'); console.log('JSON valid ✅')"
```

Expected: `JSON valid ✅`

- [ ] **Step 4: Verify all 10 entries are now present**

```bash
node -e "
const m = require('./src/data/app_metadata.json');
const flatKeys = Object.keys(m).filter(k => k !== 'categories');
const needed = [
  'Notepad.Notepad-plus-plus', 'BlackmagicDesign.DaVinciResolve',
  'BitSum.ProcessLasso', 'OCBase.OCCT', 'Geeks3D.FurMark',
  'CrystalDewWorld.CrystalDiskInfo', 'CrystalDewWorld.CrystalDiskMark',
  'Cockos.REAPER', 'ProtonTechnologies.ProtonVPN',
  'KeePassXCTeam.KeePassXC',
];
needed.forEach(id => console.log(id, flatKeys.includes(id) ? '✅' : '❌'));
"
```

Expected: all 10 show `✅`.

- [ ] **Step 5: Commit**

```bash
git add src/data/app_metadata.json
git commit -m "feat: add 10 missing apps to app_metadata.json flat dictionary"
```

---

### Task 2: Create bundles.json

**Files:**
- Create: `src/data/bundles.json`

- [ ] **Step 1: Create bundles.json**

Create `src/data/bundles.json` with all 22 bundles. All `apps` arrays use exact flat-dict keys from `app_metadata.json`:

```json
[
  {
    "id": "beginner-essentials",
    "type": "curated",
    "group": "Starters",
    "name": "Beginner Essentials",
    "description": "Everything you need on a fresh Windows install. Safe, free, and trusted by millions.",
    "icon": "Star",
    "color": "blue",
    "apps": ["Mozilla.Firefox", "7zip.7zip", "VideoLAN.VLC", "Notepad.Notepad-plus-plus", "voidtools.Everything", "Microsoft.PowerToys", "Bitwarden.Bitwarden"]
  },
  {
    "id": "office-wfh",
    "type": "curated",
    "group": "Starters",
    "name": "Office & WFH",
    "description": "A complete remote-work stack: office suite, communication apps, and productivity utilities.",
    "icon": "Briefcase",
    "color": "emerald",
    "apps": ["TheDocumentFoundation.LibreOffice", "Zoom.Zoom", "SlackTechnologies.Slack", "Microsoft.Teams", "7zip.7zip", "VideoLAN.VLC", "Microsoft.PowerToys", "Bitwarden.Bitwarden"]
  },
  {
    "id": "student-setup",
    "type": "curated",
    "group": "Starters",
    "name": "Student Setup",
    "description": "Research tools, note-taking, communication, and multimedia — everything a student needs.",
    "icon": "GraduationCap",
    "color": "violet",
    "apps": ["TheDocumentFoundation.LibreOffice", "Mozilla.Firefox", "Bitwarden.Bitwarden", "DigitalScholar.Zotero", "Discord.Discord", "7zip.7zip", "VideoLAN.VLC", "Obsidian.Obsidian"]
  },
  {
    "id": "gamers-setup",
    "type": "curated",
    "group": "Gaming",
    "name": "The Gamer's Setup",
    "description": "All your game launchers, comms, and performance monitoring in one click.",
    "icon": "Gamepad2",
    "color": "green",
    "apps": ["Valve.Steam", "EpicGames.EpicGamesLauncher", "GOG.Galaxy", "Discord.Discord", "Playnite.Playnite", "Guru3D.Afterburner", "OBSProject.OBSStudio"]
  },
  {
    "id": "competitive-edge",
    "type": "curated",
    "group": "Gaming",
    "name": "Competitive Edge",
    "description": "System monitoring, hardware info, and process optimization for competitive gaming.",
    "icon": "Crosshair",
    "color": "red",
    "apps": ["Valve.Steam", "Discord.Discord", "REALiX.HWiNFO", "Guru3D.Afterburner", "CPUID.CPU-Z", "TechPowerUp.GPU-Z", "BitSum.ProcessLasso"]
  },
  {
    "id": "game-dev-starter",
    "type": "curated",
    "group": "Gaming",
    "name": "Game Dev Starter",
    "description": "Everything you need to start making games: engine, editor, version control, and 3D art.",
    "icon": "Wrench",
    "color": "orange",
    "apps": ["Unity.UnityHub", "Microsoft.VisualStudioCode", "Git.Git", "BlenderFoundation.Blender", "7zip.7zip", "Discord.Discord"]
  },
  {
    "id": "developer-workstation",
    "type": "curated",
    "group": "Power Users",
    "name": "Developer Workstation",
    "description": "A full dev environment: editor, terminal, version control, runtimes, containers, and API tools.",
    "icon": "Code2",
    "color": "cyan",
    "apps": ["Microsoft.VisualStudioCode", "Git.Git", "Microsoft.WindowsTerminal", "OpenJS.NodeJS", "Python.Python.3.14", "Docker.DockerDesktop", "Postman.Postman", "WinSCP.WinSCP"]
  },
  {
    "id": "overclocker-suite",
    "type": "curated",
    "group": "Power Users",
    "name": "Overclocker & Stress Tester",
    "description": "Every tool you need to push your hardware and verify it's stable under load.",
    "icon": "Thermometer",
    "color": "amber",
    "apps": ["CPUID.CPU-Z", "TechPowerUp.GPU-Z", "REALiX.HWiNFO", "OCBase.OCCT", "Geeks3D.FurMark", "CrystalDewWorld.CrystalDiskMark", "Maxon.CinebenchR23", "Guru3D.Afterburner"]
  },
  {
    "id": "windows-power-user",
    "type": "curated",
    "group": "Power Users",
    "name": "Windows Power User",
    "description": "Deep Windows inspection and remote management tools for advanced users.",
    "icon": "Monitor",
    "color": "blue",
    "apps": ["Microsoft.Sysinternals.ProcessExplorer", "Microsoft.WindowsTerminal", "Microsoft.VisualStudioCode", "WinSCP.WinSCP", "PuTTY.PuTTY", "7zip.7zip"]
  },
  {
    "id": "sysadmin-toolkit",
    "type": "curated",
    "group": "Power Users",
    "name": "Sysadmin Toolkit",
    "description": "Network analysis, remote access, and infrastructure monitoring for IT professionals.",
    "icon": "Network",
    "color": "slate",
    "apps": ["WiresharkFoundation.Wireshark", "PuTTY.PuTTY", "WinSCP.WinSCP", "Famatech.AdvancedIPScanner", "Insecure.Nmap", "Microsoft.WindowsTerminal"]
  },
  {
    "id": "content-creator",
    "type": "curated",
    "group": "Creative",
    "name": "Content Creator",
    "description": "Stream, record, edit video, make thumbnails, and communicate with your audience.",
    "icon": "Video",
    "color": "rose",
    "apps": ["OBSProject.OBSStudio", "BlackmagicDesign.DaVinciResolve", "Audacity.Audacity", "GIMP.GIMP.3", "Discord.Discord", "HandBrake.HandBrake"]
  },
  {
    "id": "video-editor",
    "type": "curated",
    "group": "Creative",
    "name": "Video Editor",
    "description": "A complete free video production suite from capture to export.",
    "icon": "Film",
    "color": "fuchsia",
    "apps": ["BlackmagicDesign.DaVinciResolve", "HandBrake.HandBrake", "VideoLAN.VLC", "Audacity.Audacity", "GIMP.GIMP.3", "Inkscape.Inkscape"]
  },
  {
    "id": "music-producer",
    "type": "curated",
    "group": "Creative",
    "name": "Music Producer",
    "description": "Record, edit, mix, and listen. A focused music production and playback setup.",
    "icon": "Music",
    "color": "pink",
    "apps": ["Audacity.Audacity", "Cockos.REAPER", "PeterPawlowski.foobar2000", "VideoLAN.VLC"]
  },
  {
    "id": "pc-diagnostics",
    "type": "curated",
    "group": "Community Picks",
    "name": "PC Diagnostics Toolkit",
    "description": "Trusted by r/techsupport and r/pcmasterrace — the essential diagnostic set for any PC issue.",
    "icon": "Stethoscope",
    "color": "teal",
    "apps": ["REALiX.HWiNFO", "CPUID.CPU-Z", "TechPowerUp.GPU-Z", "Guru3D.Afterburner", "CrystalDewWorld.CrystalDiskInfo", "CrystalDewWorld.CrystalDiskMark"]
  },
  {
    "id": "forum-all-stars",
    "type": "curated",
    "group": "Community Picks",
    "name": "Forum All-Stars",
    "description": "The apps that appear on every 'essential software' list across PC forums and subreddits.",
    "icon": "Trophy",
    "color": "yellow",
    "apps": ["7zip.7zip", "VideoLAN.VLC", "Mozilla.Firefox", "Guru3D.Afterburner", "REALiX.HWiNFO", "TheDocumentFoundation.LibreOffice", "voidtools.Everything", "Notepad.Notepad-plus-plus", "Discord.Discord"]
  },
  {
    "id": "privacy-first",
    "type": "curated",
    "group": "Community Picks",
    "name": "Privacy First",
    "description": "A privacy-focused stack: open source browser, offline password manager, VPN, and encrypted messaging.",
    "icon": "ShieldCheck",
    "color": "emerald",
    "apps": ["Mozilla.Firefox", "Brave.Brave", "Bitwarden.Bitwarden", "ProtonTechnologies.ProtonVPN", "OpenWhisperSystems.Signal", "KeePassXCTeam.KeePassXC"]
  },
  {
    "id": "the-minimalist",
    "type": "curated",
    "group": "Community Picks",
    "name": "The Minimalist",
    "description": "Just the essentials. Five apps that solve 90% of everyday computing needs.",
    "icon": "Minus",
    "color": "gray",
    "apps": ["Mozilla.Firefox", "7zip.7zip", "VideoLAN.VLC", "Notepad.Notepad-plus-plus", "voidtools.Everything"]
  },
  {
    "id": "pc-builders-kit",
    "type": "curated",
    "group": "Curated Collections",
    "name": "PC Builder's Kit",
    "description": "Validate your new build: check GPU/CPU specs, monitor sensors, and capture the first boot.",
    "icon": "Cpu",
    "color": "indigo",
    "apps": ["TechPowerUp.GPU-Z", "CPUID.CPU-Z", "REALiX.HWiNFO", "Guru3D.Afterburner", "OBSProject.OBSStudio"]
  },
  {
    "id": "benchmark-suite",
    "type": "curated",
    "group": "Curated Collections",
    "name": "Benchmark & Stress Test Suite",
    "description": "A comprehensive set of tools to benchmark performance and verify system stability.",
    "icon": "BarChart2",
    "color": "orange",
    "apps": ["REALiX.HWiNFO", "CPUID.CPU-Z", "TechPowerUp.GPU-Z", "Guru3D.Afterburner", "OCBase.OCCT", "Geeks3D.FurMark", "CrystalDewWorld.CrystalDiskMark", "Maxon.CinebenchR23"]
  },
  {
    "id": "fresh-start-pack",
    "type": "curated",
    "group": "Curated Collections",
    "name": "Fresh Start Pack",
    "description": "The perfect post-format install list. Browsing, compression, media, productivity, and gaming.",
    "icon": "RefreshCcw",
    "color": "sky",
    "apps": ["Mozilla.Firefox", "Brave.Brave", "VideoLAN.VLC", "7zip.7zip", "Microsoft.PowerToys", "voidtools.Everything", "Notepad.Notepad-plus-plus", "Microsoft.VisualStudioCode", "Valve.Steam"]
  },
  {
    "id": "the-all-rounder",
    "type": "curated",
    "group": "Curated Collections",
    "name": "The All-Rounder",
    "description": "A comprehensive setup for general use: productivity, media, comms, and performance monitoring.",
    "icon": "Layers",
    "color": "purple",
    "apps": ["7zip.7zip", "VideoLAN.VLC", "Mozilla.Firefox", "Guru3D.Afterburner", "REALiX.HWiNFO", "TheDocumentFoundation.LibreOffice", "voidtools.Everything", "Notepad.Notepad-plus-plus", "Discord.Discord"]
  },
  {
    "id": "windows-internals",
    "type": "curated",
    "group": "Curated Collections",
    "name": "Windows Internals Kit",
    "description": "Deep Windows inspection tools: process management, SSH, SFTP, network analysis.",
    "icon": "Terminal",
    "color": "zinc",
    "apps": ["Microsoft.Sysinternals.ProcessExplorer", "Microsoft.WindowsTerminal", "Microsoft.VisualStudioCode", "WinSCP.WinSCP", "PuTTY.PuTTY", "WiresharkFoundation.Wireshark"]
  }
]
```

- [ ] **Step 2: Validate JSON**

```bash
node -e "const b = require('./src/data/bundles.json'); console.log('Bundles:', b.length, 'JSON valid ✅')"
```

Expected: `Bundles: 22 JSON valid ✅`

- [ ] **Step 3: Verify all app IDs exist in flat dict**

```bash
node -e "
const meta = require('./src/data/app_metadata.json');
const bundles = require('./src/data/bundles.json');
const flat = Object.keys(meta).filter(k => k !== 'categories');
let missing = [];
bundles.forEach(b => b.apps.forEach(id => { if (!flat.includes(id)) missing.push(id + ' (' + b.id + ')'); }));
if (missing.length === 0) console.log('All app IDs resolve ✅');
else console.log('MISSING:', missing);
"
```

Expected: `All app IDs resolve ✅`

- [ ] **Step 4: Commit**

```bash
git add src/data/bundles.json
git commit -m "feat: add bundles.json with 22 curated bundle definitions"
```

---

## Chunk 2: useBundles Hook

### Task 3: Implement useBundles.ts (TDD)

**Files:**
- Create: `src/types/bundles.ts`
- Create: `src/__tests__/hooks/useBundles.test.ts`
- Create: `src/hooks/useBundles.ts`

- [ ] **Step 1: Create shared type definitions**

Create `src/types/bundles.ts`:

```typescript
export interface Bundle {
  id: string;
  type: "persona" | "curated" | "custom";
  group: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  apps: string[];
  createdAt?: string;
}

export interface AppMetadata {
  id: string;
  name: string;
  publisher?: string;
  author?: string;
  description: string;
  version?: string;
  license?: string;
  logo: string;
  website?: string;
  support_url?: string;
  github_link?: string;
  is_verified?: boolean;
  trust_score?: number;
  rating?: number;
  reviews?: Array<{ author: string; rating: number; text: string; date: string }>;
  insights?: { pros: string[]; cons: string[] };
}

export interface ResolvedBundle extends Bundle {
  resolvedApps: Array<{
    appId: string;
    metadata: AppMetadata | null;
  }>;
}

export interface BundleInstallModalProps {
  bundle: ResolvedBundle;
  isOpen: boolean;
  onClose: () => void;
  installApp: (wingetId: string, chocoId: string, appId: string) => Promise<AppInstallResult>;
  installedApps: Record<string, boolean>;
}

// Re-export from useApps — single source of truth
export type { AppInstallResult } from "@/hooks/useApps";
```

- [ ] **Step 2: Write failing tests for useBundles**

Create `src/__tests__/hooks/useBundles.test.ts`:

```typescript
import { renderHook, act } from "@/test/utils";
import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Bundle } from "@/types/bundles";

// Mock JSON data — mirror the real structure: { categories: [...], apps: { ... } }
vi.mock("@/data/app_metadata.json", () => ({
  default: {
    categories: [],
    apps: {
      "Mozilla.Firefox": {
        id: "Mozilla.Firefox", name: "Firefox", description: "A browser",
        logo: "/logo.png", license: "MPL-2.0",
      },
      "7zip.7zip": {
        id: "7zip.7zip", name: "7-Zip", description: "An archiver",
        logo: "/logo.png", license: "LGPL",
      },
    },
  },
}));

const MOCK_BUNDLE: Bundle = {
  id: "test-bundle",
  type: "curated",
  group: "Starters",
  name: "Test Bundle",
  description: "A test bundle description",
  icon: "Star",
  color: "blue",
  apps: ["Mozilla.Firefox", "7zip.7zip"],
};

const MOCK_BUNDLE_UNKNOWN_APP: Bundle = {
  id: "unknown-bundle",
  type: "curated",
  group: "Starters",
  name: "Unknown Bundle",
  description: "Has unknown app",
  icon: "Star",
  color: "blue",
  apps: ["Mozilla.Firefox", "Unknown.App"],
};

vi.mock("@/data/bundles.json", () => ({
  default: [MOCK_BUNDLE, MOCK_BUNDLE_UNKNOWN_APP],
}));

describe("useBundles", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("curatedBundles", () => {
    it("loads curated bundles from bundles.json", async () => {
      const { useBundles } = await import("@/hooks/useBundles");
      const { result } = renderHook(() => useBundles());
      expect(result.current.curatedBundles).toHaveLength(2);
      expect(result.current.curatedBundles[0].id).toBe("test-bundle");
    });
  });

  describe("resolveBundle", () => {
    it("resolves known apps to metadata, unknown to null", async () => {
      const { useBundles } = await import("@/hooks/useBundles");
      const { result } = renderHook(() => useBundles());
      const resolved = result.current.resolveBundle(MOCK_BUNDLE_UNKNOWN_APP);
      expect(resolved.resolvedApps).toHaveLength(2);
      expect(resolved.resolvedApps[0].metadata).not.toBeNull();
      expect(resolved.resolvedApps[0].metadata?.name).toBe("Firefox");
      expect(resolved.resolvedApps[1].appId).toBe("Unknown.App");
      expect(resolved.resolvedApps[1].metadata).toBeNull();
    });

    it("returns all apps resolved for fully known bundle", async () => {
      const { useBundles } = await import("@/hooks/useBundles");
      const { result } = renderHook(() => useBundles());
      const resolved = result.current.resolveBundle(MOCK_BUNDLE);
      expect(resolved.resolvedApps.every(a => a.metadata !== null)).toBe(true);
    });
  });

  describe("custom bundle CRUD", () => {
    it("saveCustomBundle persists to localStorage and returns in customBundles", async () => {
      const { useBundles } = await import("@/hooks/useBundles");
      const { result } = renderHook(() => useBundles());
      expect(result.current.customBundles).toHaveLength(0);

      act(() => {
        result.current.saveCustomBundle({
          group: "Other",
          name: "My Bundle",
          description: "custom desc",
          icon: "Star",
          color: "red",
          apps: ["Mozilla.Firefox"],
        });
      });

      expect(result.current.customBundles).toHaveLength(1);
      expect(result.current.customBundles[0].name).toBe("My Bundle");
      expect(result.current.customBundles[0].type).toBe("custom");
      expect(result.current.customBundles[0].id).toBeTruthy();
      expect(result.current.customBundles[0].createdAt).toBeTruthy();
      const stored = JSON.parse(localStorage.getItem("winopt_custom_bundles") ?? "[]");
      expect(stored).toHaveLength(1);
    });

    it("saveCustomBundle appends (2) on name collision", async () => {
      const { useBundles } = await import("@/hooks/useBundles");
      const { result } = renderHook(() => useBundles());

      act(() => {
        result.current.saveCustomBundle({ group: "Other", name: "Dupe", description: "", icon: "Star", color: "blue", apps: ["Mozilla.Firefox"] });
        result.current.saveCustomBundle({ group: "Other", name: "Dupe", description: "", icon: "Star", color: "blue", apps: ["7zip.7zip"] });
      });

      const names = result.current.customBundles.map(b => b.name);
      expect(names).toContain("Dupe");
      expect(names).toContain("Dupe (2)");
    });

    it("deleteCustomBundle removes from state and localStorage", async () => {
      const { useBundles } = await import("@/hooks/useBundles");
      const { result } = renderHook(() => useBundles());

      act(() => {
        result.current.saveCustomBundle({ group: "Other", name: "ToDelete", description: "", icon: "Star", color: "blue", apps: ["Mozilla.Firefox"] });
      });
      const id = result.current.customBundles[0].id;

      act(() => {
        result.current.deleteCustomBundle(id);
      });

      expect(result.current.customBundles).toHaveLength(0);
      expect(JSON.parse(localStorage.getItem("winopt_custom_bundles") ?? "[]")).toHaveLength(0);
    });

    it("updateCustomBundle updates name in state and localStorage", async () => {
      const { useBundles } = await import("@/hooks/useBundles");
      const { result } = renderHook(() => useBundles());

      act(() => {
        result.current.saveCustomBundle({ group: "Other", name: "Original", description: "", icon: "Star", color: "blue", apps: ["Mozilla.Firefox"] });
      });
      const id = result.current.customBundles[0].id;

      act(() => {
        result.current.updateCustomBundle(id, { name: "Updated" });
      });

      expect(result.current.customBundles[0].name).toBe("Updated");
      const stored = JSON.parse(localStorage.getItem("winopt_custom_bundles") ?? "[]");
      expect(stored[0].name).toBe("Updated");
    });

    it("hydrates customBundles from localStorage on mount", async () => {
      const saved = [{ id: "x", type: "custom", group: "Other", name: "Hydrated", description: "", icon: "Star", color: "blue", apps: [], createdAt: "2026-01-01" }];
      localStorage.setItem("winopt_custom_bundles", JSON.stringify(saved));
      const { useBundles } = await import("@/hooks/useBundles");
      const { result } = renderHook(() => useBundles());
      expect(result.current.customBundles[0].name).toBe("Hydrated");
    });
  });

  describe("search / filteredBundles", () => {
    it("returns all bundles (custom first) when searchQuery empty", async () => {
      const { useBundles } = await import("@/hooks/useBundles");
      const { result } = renderHook(() => useBundles());

      act(() => {
        result.current.saveCustomBundle({ group: "Other", name: "My Custom", description: "", icon: "Star", color: "blue", apps: ["Mozilla.Firefox"] });
      });

      const ids = result.current.filteredBundles.map(b => b.id);
      expect(ids[0]).toBe(result.current.customBundles[0].id); // custom first
      expect(ids).toContain("test-bundle");
    });

    it("filters bundles by name match", async () => {
      const { useBundles } = await import("@/hooks/useBundles");
      const { result } = renderHook(() => useBundles());

      act(() => { result.current.setSearchQuery("test bundle"); });

      expect(result.current.filteredBundles.every(b => b.name.toLowerCase().includes("test") || b.description.toLowerCase().includes("test"))).toBe(true);
    });

    it("sorts name matches before description-only matches", async () => {
      const { useBundles } = await import("@/hooks/useBundles");
      const { result } = renderHook(() => useBundles());

      act(() => { result.current.setSearchQuery("bundle"); });

      // "Test Bundle" has "bundle" in name; "Unknown Bundle" also; "A test bundle description" has it in desc
      const nameMatches = result.current.filteredBundles.filter(b => b.name.toLowerCase().includes("bundle"));
      const descOnlyMatches = result.current.filteredBundles.filter(b => !b.name.toLowerCase().includes("bundle") && b.description.toLowerCase().includes("bundle"));
      if (nameMatches.length > 0 && descOnlyMatches.length > 0) {
        const lastNameMatchIdx = result.current.filteredBundles.indexOf(nameMatches[nameMatches.length - 1]);
        const firstDescMatchIdx = result.current.filteredBundles.indexOf(descOnlyMatches[0]);
        expect(lastNameMatchIdx).toBeLessThan(firstDescMatchIdx);
      }
    });
  });
});
```

- [ ] **Step 3: Run tests — verify they fail**

```bash
npx vitest run src/__tests__/hooks/useBundles.test.ts
```

Expected: FAIL (module not found or similar)

- [ ] **Step 4: Implement useBundles.ts**

Create `src/hooks/useBundles.ts`:

```typescript
import { useState, useCallback, useMemo } from "react";
import type { Bundle, AppMetadata, ResolvedBundle } from "@/types/bundles";
import rawBundles from "@/data/bundles.json";
import rawMeta from "@/data/app_metadata.json";

// app_metadata.json structure: { categories: [...], apps: { "Mozilla.Firefox": {...}, ... } }
// Access the apps sub-object for O(1) lookup
const appLookup = (rawMeta as any).apps as Record<string, AppMetadata>;

// Module-level constant — stable reference so useMemo deps work correctly
const curatedBundles = rawBundles as Bundle[];

const STORAGE_KEY = "winopt_custom_bundles";

function loadCustomBundles(): Bundle[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as Bundle[]) : [];
  } catch {
    return [];
  }
}

function persist(bundles: Bundle[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bundles));
  } catch {
    // localStorage unavailable — silent fail, curated bundles unaffected
  }
}

export function useBundles() {
  const [customBundles, setCustomBundles] = useState<Bundle[]>(loadCustomBundles);
  const [searchQuery, setSearchQuery] = useState("");

  const resolveBundle = useCallback((bundle: Bundle): ResolvedBundle => ({
    ...bundle,
    resolvedApps: bundle.apps.map((appId) => ({
      appId,
      metadata: appLookup[appId] ?? null,
    })),
  }), []);

  const saveCustomBundle = useCallback(
    (bundle: Omit<Bundle, "id" | "type" | "createdAt">) => {
      setCustomBundles((prev) => {
        let name = bundle.name;
        let suffix = 2;
        while (prev.some((b) => b.name === name)) {
          name = `${bundle.name} (${suffix++})`;
        }
        const newBundle: Bundle = {
          ...bundle,
          name,
          id: crypto.randomUUID(),
          type: "custom",
          createdAt: new Date().toISOString(),
        };
        const updated = [...prev, newBundle];
        persist(updated);
        return updated;
      });
    },
    []
  );

  const updateCustomBundle = useCallback(
    (id: string, updates: Partial<Bundle>) => {
      setCustomBundles((prev) => {
        const updated = prev.map((b) => (b.id === id ? { ...b, ...updates } : b));
        persist(updated);
        return updated;
      });
    },
    []
  );

  const deleteCustomBundle = useCallback((id: string) => {
    setCustomBundles((prev) => {
      const updated = prev.filter((b) => b.id !== id);
      persist(updated);
      return updated;
    });
  }, []);

  const filteredBundles = useMemo((): Bundle[] => {
    if (!searchQuery.trim()) {
      return [...customBundles, ...curatedBundles];
    }
    const q = searchQuery.toLowerCase();
    return [...customBundles, ...curatedBundles]
      .filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.description.toLowerCase().includes(q)
      )
      .sort((a, b) => {
        const aName = a.name.toLowerCase().includes(q);
        const bName = b.name.toLowerCase().includes(q);
        if (aName && !bName) return -1;
        if (!aName && bName) return 1;
        return 0;
      });
  }, [customBundles, curatedBundles, searchQuery]);

  return {
    curatedBundles,
    customBundles,
    saveCustomBundle,
    updateCustomBundle,
    deleteCustomBundle,
    resolveBundle,
    searchQuery,
    setSearchQuery,
    filteredBundles,
  };
}
```

- [ ] **Step 5: Run tests — verify they pass**

```bash
npx vitest run src/__tests__/hooks/useBundles.test.ts
```

Expected: all tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/types/bundles.ts src/hooks/useBundles.ts src/__tests__/hooks/useBundles.test.ts
git commit -m "feat: implement useBundles hook with full TDD coverage"
```

---

## Chunk 3: BundleInstallModal

### Task 4: Implement BundleInstallModal.tsx (TDD)

**Files:**
- Create: `src/__tests__/components/BundleInstallModal.test.tsx`
- Create: `src/components/BundleInstallModal.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/__tests__/components/BundleInstallModal.test.tsx`:

```typescript
import { render, screen, fireEvent, waitFor } from "@/test/utils";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { BundleInstallModal } from "@/components/BundleInstallModal";
import type { ResolvedBundle, AppInstallResult } from "@/types/bundles";

// framer-motion mock
vi.mock("framer-motion", () => ({
  motion: { div: ({ children, ...p }: any) => <div {...p}>{children}</div> },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const mockInstallApp = vi.fn();
const mockOnClose = vi.fn();

const RESOLVED_BUNDLE: ResolvedBundle = {
  id: "test",
  type: "curated",
  group: "Starters",
  name: "Test Bundle",
  description: "desc",
  icon: "Star",
  color: "blue",
  apps: ["Mozilla.Firefox", "7zip.7zip", "Unknown.App"],
  resolvedApps: [
    { appId: "Mozilla.Firefox", metadata: { id: "Mozilla.Firefox", name: "Firefox", description: "Browser", logo: "/logo.png", license: "MPL-2.0" } },
    { appId: "7zip.7zip", metadata: { id: "7zip.7zip", name: "7-Zip", description: "Archiver", logo: "/logo.png", license: "LGPL" } },
    { appId: "Unknown.App", metadata: null },
  ],
};

const SUCCESS_RESULT: AppInstallResult = { success: true, method: "winget", output: "Installed", error: "" };
const FAIL_RESULT: AppInstallResult = { success: false, method: "none", output: "", error: "Install failed" };

describe("BundleInstallModal", () => {
  beforeEach(() => {
    mockInstallApp.mockReset();
    mockOnClose.mockReset();
  });

  it("renders modal header with bundle name", () => {
    render(
      <BundleInstallModal
        bundle={RESOLVED_BUNDLE}
        isOpen={true}
        onClose={mockOnClose}
        installApp={mockInstallApp}
        installedApps={{}}
      />
    );
    expect(screen.getByText("Install: Test Bundle")).toBeInTheDocument();
  });

  it("shows app rows for resolved apps", () => {
    render(
      <BundleInstallModal bundle={RESOLVED_BUNDLE} isOpen={true} onClose={mockOnClose} installApp={mockInstallApp} installedApps={{}} />
    );
    expect(screen.getByText("Firefox")).toBeInTheDocument();
    expect(screen.getByText("7-Zip")).toBeInTheDocument();
  });

  it("shows warning badge and disables checkbox for unavailable apps", () => {
    render(
      <BundleInstallModal bundle={RESOLVED_BUNDLE} isOpen={true} onClose={mockOnClose} installApp={mockInstallApp} installedApps={{}} />
    );
    // Unknown.App should show app ID and a warning
    expect(screen.getByText("Unknown.App")).toBeInTheDocument();
    expect(screen.getByTestId("unavailable-Unknown.App")).toBeInTheDocument();
  });

  it("shows Installed badge for already-installed apps and excludes from count", () => {
    render(
      <BundleInstallModal bundle={RESOLVED_BUNDLE} isOpen={true} onClose={mockOnClose} installApp={mockInstallApp} installedApps={{ "Mozilla.Firefox": true }} />
    );
    expect(screen.getByTestId("installed-badge-Mozilla.Firefox")).toBeInTheDocument();
    // Count should be 1 (7-Zip only — Firefox installed, Unknown.App unavailable)
    expect(screen.getByText(/Install 1 app/)).toBeInTheDocument();
  });

  it("install count updates live when user ticks/unticks", () => {
    render(
      <BundleInstallModal bundle={RESOLVED_BUNDLE} isOpen={true} onClose={mockOnClose} installApp={mockInstallApp} installedApps={{}} />
    );
    // Initially 2 selected (Firefox + 7-Zip; Unknown.App disabled)
    expect(screen.getByText(/Install 2 apps/)).toBeInTheDocument();

    // Uncheck Firefox
    const firefoxCheckbox = screen.getByTestId("checkbox-Mozilla.Firefox");
    fireEvent.click(firefoxCheckbox);
    expect(screen.getByText(/Install 1 app/)).toBeInTheDocument();
  });

  it("expand row reveals description", () => {
    render(
      <BundleInstallModal bundle={RESOLVED_BUNDLE} isOpen={true} onClose={mockOnClose} installApp={mockInstallApp} installedApps={{}} />
    );
    const expandBtn = screen.getByTestId("expand-Mozilla.Firefox");
    expect(screen.queryByText("Browser")).not.toBeInTheDocument();
    fireEvent.click(expandBtn);
    expect(screen.getByText("Browser")).toBeInTheDocument();
  });

  it("clicking Install calls installApp sequentially for selected non-installed apps", async () => {
    mockInstallApp.mockResolvedValue(SUCCESS_RESULT);
    render(
      <BundleInstallModal bundle={RESOLVED_BUNDLE} isOpen={true} onClose={mockOnClose} installApp={mockInstallApp} installedApps={{}} />
    );
    fireEvent.click(screen.getByText(/Install 2 apps/));
    await waitFor(() => {
      expect(mockInstallApp).toHaveBeenCalledTimes(2);
    });
    expect(mockInstallApp).toHaveBeenNthCalledWith(1, "Mozilla.Firefox", "", "Mozilla.Firefox");
    expect(mockInstallApp).toHaveBeenNthCalledWith(2, "7zip.7zip", "", "7zip.7zip");
  });

  it("shows green success status after successful install", async () => {
    mockInstallApp.mockResolvedValue(SUCCESS_RESULT);
    render(
      <BundleInstallModal bundle={RESOLVED_BUNDLE} isOpen={true} onClose={mockOnClose} installApp={mockInstallApp} installedApps={{}} />
    );
    fireEvent.click(screen.getByText(/Install 2 apps/));
    await waitFor(() => {
      expect(screen.getByTestId("result-success-Mozilla.Firefox")).toBeInTheDocument();
    });
  });

  it("shows red error status after failed install", async () => {
    mockInstallApp.mockResolvedValue(FAIL_RESULT);
    render(
      <BundleInstallModal bundle={RESOLVED_BUNDLE} isOpen={true} onClose={mockOnClose} installApp={mockInstallApp} installedApps={{}} />
    );
    fireEvent.click(screen.getByText(/Install 2 apps/));
    await waitFor(() => {
      expect(screen.getByTestId("result-error-Mozilla.Firefox")).toBeInTheDocument();
    });
  });

  it("calls onClose when Cancel is clicked", () => {
    render(
      <BundleInstallModal bundle={RESOLVED_BUNDLE} isOpen={true} onClose={mockOnClose} installApp={mockInstallApp} installedApps={{}} />
    );
    fireEvent.click(screen.getByText("Cancel"));
    expect(mockOnClose).toHaveBeenCalledOnce();
  });

  it("does not render when isOpen is false", () => {
    render(
      <BundleInstallModal bundle={RESOLVED_BUNDLE} isOpen={false} onClose={mockOnClose} installApp={mockInstallApp} installedApps={{}} />
    );
    expect(screen.queryByText("Install: Test Bundle")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run src/__tests__/components/BundleInstallModal.test.tsx
```

Expected: FAIL (module not found)

- [ ] **Step 3: Implement BundleInstallModal.tsx**

Create `src/components/BundleInstallModal.tsx`:

```typescript
import { useState, useCallback } from "react";
import { X, ChevronDown, ChevronRight, AlertTriangle, CheckCircle, XCircle, ExternalLink } from "lucide-react";
import type { ResolvedBundle, AppInstallResult } from "@/types/bundles";

interface BundleInstallModalProps {
  bundle: ResolvedBundle;
  isOpen: boolean;
  onClose: () => void;
  installApp: (wingetId: string, chocoId: string, appId: string) => Promise<AppInstallResult>;
  installedApps: Record<string, boolean>;
}

export function BundleInstallModal({
  bundle,
  isOpen,
  onClose,
  installApp,
  installedApps,
}: BundleInstallModalProps) {
  const [selected, setSelected] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    bundle.resolvedApps.forEach(({ appId, metadata }) => {
      if (metadata && !installedApps[appId]) {
        init[appId] = true;
      }
    });
    return init;
  });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [installing, setInstalling] = useState(false);
  const [results, setResults] = useState<Record<string, AppInstallResult>>({});

  const selectedCount = Object.values(selected).filter(Boolean).length;

  const toggleSelect = useCallback((appId: string) => {
    setSelected((prev) => ({ ...prev, [appId]: !prev[appId] }));
  }, []);

  const toggleExpand = useCallback((appId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(appId) ? next.delete(appId) : next.add(appId);
      return next;
    });
  }, []);

  const handleInstall = useCallback(async () => {
    const toInstall = bundle.resolvedApps.filter(
      ({ appId, metadata }) => metadata && selected[appId] && !installedApps[appId]
    );
    setInstalling(true);
    for (const { appId } of toInstall) {
      const result = await installApp(appId, "", appId);
      setResults((prev) => ({ ...prev, [appId]: result }));
    }
    setInstalling(false);
  }, [bundle.resolvedApps, selected, installedApps, installApp]);

  if (!isOpen) return null;

  const buttonLabel = installing
    ? "Installing…"
    : selectedCount === 0
    ? "No apps selected"
    : `Install ${selectedCount} app${selectedCount === 1 ? "" : "s"} →`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-semibold">Install: {bundle.name}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* App list */}
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {bundle.resolvedApps.map(({ appId, metadata }) => {
            const isInstalled = installedApps[appId] === true;
            const isUnavailable = metadata === null;
            const isExpanded = expanded.has(appId);
            const result = results[appId];

            return (
              <div key={appId} className="border border-border rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 p-3">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    data-testid={`checkbox-${appId}`}
                    checked={!isUnavailable && !isInstalled && (selected[appId] ?? false)}
                    disabled={isUnavailable || isInstalled || installing}
                    onChange={() => toggleSelect(appId)}
                    className="w-4 h-4 rounded accent-primary"
                  />

                  {/* Logo */}
                  {metadata?.logo ? (
                    <img src={metadata.logo} alt={metadata.name} className="w-8 h-8 rounded-lg object-contain" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                      {(metadata?.name ?? appId).slice(0, 2).toUpperCase()}
                    </div>
                  )}

                  {/* Name + badges */}
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm font-medium ${isUnavailable ? "text-muted-foreground line-through" : isInstalled ? "text-muted-foreground" : ""}`}>
                      {metadata?.name ?? appId}
                    </span>
                    <div className="flex gap-1.5 mt-0.5 flex-wrap">
                      {isUnavailable && (
                        <span data-testid={`unavailable-${appId}`} className="inline-flex items-center gap-1 text-xs text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                          <AlertTriangle size={10} />
                          Not available
                        </span>
                      )}
                      {isInstalled && (
                        <span data-testid={`installed-badge-${appId}`} className="inline-flex items-center gap-1 text-xs text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                          <CheckCircle size={10} />
                          Installed ✓
                        </span>
                      )}
                      {result?.success === true && (
                        <span data-testid={`result-success-${appId}`} className="inline-flex items-center gap-1 text-xs text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                          <CheckCircle size={10} />
                          Done
                        </span>
                      )}
                      {result?.success === false && (
                        <span data-testid={`result-error-${appId}`} className="inline-flex items-center gap-1 text-xs text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded-full">
                          <XCircle size={10} />
                          Failed
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expand button */}
                  {metadata && (
                    <button
                      data-testid={`expand-${appId}`}
                      onClick={() => toggleExpand(appId)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                  )}
                </div>

                {/* Expanded details */}
                {isExpanded && metadata && (
                  <div className="px-4 pb-3 border-t border-border/50 pt-2 space-y-1.5">
                    <p className="text-xs text-muted-foreground">{metadata.description}</p>
                    {metadata.license && (
                      <p className="text-xs text-muted-foreground">License: <span className="font-medium">{metadata.license}</span></p>
                    )}
                    {metadata.website && (
                      <a href={metadata.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                        <ExternalLink size={10} /> Website
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border">
          <span className="text-sm text-muted-foreground">
            {selectedCount} app{selectedCount !== 1 ? "s" : ""} selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleInstall}
              disabled={selectedCount === 0 || installing}
              className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {buttonLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run src/__tests__/components/BundleInstallModal.test.tsx
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/BundleInstallModal.tsx src/__tests__/components/BundleInstallModal.test.tsx
git commit -m "feat: implement BundleInstallModal with TDD coverage"
```

---

## Chunk 4: BundlesPage

### Task 5: Implement BundlesPage.tsx (TDD)

**Files:**
- Create: `src/__tests__/pages/BundlesPage.test.tsx`
- Create: `src/pages/BundlesPage.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/__tests__/pages/BundlesPage.test.tsx`:

```typescript
import { render, screen, fireEvent } from "@/test/utils";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { BundlesPage } from "@/pages/BundlesPage";
import type { Bundle, ResolvedBundle } from "@/types/bundles";

vi.mock("framer-motion", () => ({
  motion: { div: ({ children, ...p }: any) => <div {...p}>{children}</div> },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock useBundles hook
const mockSaveCustomBundle = vi.fn();
const mockDeleteCustomBundle = vi.fn();
const mockUpdateCustomBundle = vi.fn();
const mockResolveBundle = vi.fn((b: Bundle): ResolvedBundle => ({
  ...b,
  resolvedApps: b.apps.map(appId => ({ appId, metadata: { id: appId, name: appId, description: "desc", logo: "/logo.png", license: "Free" } })),
}));
const mockSetSearchQuery = vi.fn();

const STARTERS_BUNDLE: Bundle = {
  id: "beginner-essentials", type: "curated", group: "Starters",
  name: "Beginner Essentials", description: "desc", icon: "Star", color: "blue",
  apps: ["Mozilla.Firefox", "7zip.7zip"],
};
const GAMING_BUNDLE: Bundle = {
  id: "gamers-setup", type: "curated", group: "Gaming",
  name: "The Gamer's Setup", description: "desc", icon: "Gamepad2", color: "green",
  apps: ["Valve.Steam"],
};
const CUSTOM_BUNDLE: Bundle = {
  id: "custom-1", type: "custom", group: "Other",
  name: "My Custom Bundle", description: "my bundle", icon: "Star", color: "red",
  apps: ["Mozilla.Firefox"],
};

let mockUseBundlesReturn: ReturnType<typeof import("@/hooks/useBundles").useBundles>;

vi.mock("@/hooks/useBundles", () => ({
  useBundles: () => mockUseBundlesReturn,
}));

vi.mock("@/components/BundleInstallModal", () => ({
  BundleInstallModal: ({ isOpen, bundle }: any) =>
    isOpen ? <div data-testid="install-modal">{bundle.name}</div> : null,
}));

vi.mock("@/hooks/useApps", () => ({
  useApps: () => ({
    installApp: vi.fn().mockResolvedValue({ success: true, method: "winget", output: "", error: "" }),
    installedApps: {},
    checkInstalled: vi.fn(),
  }),
}));

function makeUseBundles(overrides: Partial<typeof mockUseBundlesReturn> = {}) {
  mockUseBundlesReturn = {
    curatedBundles: [STARTERS_BUNDLE, GAMING_BUNDLE],
    customBundles: [],
    saveCustomBundle: mockSaveCustomBundle,
    deleteCustomBundle: mockDeleteCustomBundle,
    updateCustomBundle: mockUpdateCustomBundle,
    resolveBundle: mockResolveBundle,
    searchQuery: "",
    setSearchQuery: mockSetSearchQuery,
    filteredBundles: [STARTERS_BUNDLE, GAMING_BUNDLE],
    ...overrides,
  } as any;
}

describe("BundlesPage", () => {
  beforeEach(() => {
    makeUseBundles();
    mockSaveCustomBundle.mockReset();
  });

  it("renders Starters group section", () => {
    render(<BundlesPage />);
    expect(screen.getByText("Starters")).toBeInTheDocument();
  });

  it("renders Gaming group section", () => {
    render(<BundlesPage />);
    expect(screen.getByText("Gaming")).toBeInTheDocument();
  });

  it("renders bundle cards with name and app count", () => {
    render(<BundlesPage />);
    expect(screen.getByText("Beginner Essentials")).toBeInTheDocument();
    expect(screen.getByText("2 apps")).toBeInTheDocument();
  });

  it("shows My Bundles section when custom bundles exist", () => {
    makeUseBundles({ customBundles: [CUSTOM_BUNDLE], filteredBundles: [CUSTOM_BUNDLE, STARTERS_BUNDLE, GAMING_BUNDLE] });
    render(<BundlesPage />);
    expect(screen.getByText("My Bundles")).toBeInTheDocument();
    expect(screen.getByText("My Custom Bundle")).toBeInTheDocument();
  });

  it("does not show My Bundles section when no custom bundles", () => {
    render(<BundlesPage />);
    expect(screen.queryByText("My Bundles")).not.toBeInTheDocument();
  });

  it("search input calls setSearchQuery", () => {
    render(<BundlesPage />);
    const input = screen.getByPlaceholderText(/search bundles/i);
    fireEvent.change(input, { target: { value: "gamer" } });
    expect(mockSetSearchQuery).toHaveBeenCalledWith("gamer");
  });

  it("shows flat Search Results list when searchQuery is set", () => {
    makeUseBundles({
      searchQuery: "gamer",
      filteredBundles: [GAMING_BUNDLE],
    });
    render(<BundlesPage />);
    expect(screen.getByText("Search Results")).toBeInTheDocument();
    expect(screen.queryByText("Starters")).not.toBeInTheDocument();
  });

  it("opens install modal when Install Bundle is clicked", () => {
    render(<BundlesPage />);
    const installBtns = screen.getAllByText("Install Bundle");
    fireEvent.click(installBtns[0]);
    expect(screen.getByTestId("install-modal")).toBeInTheDocument();
  });

  it("shows create bundle panel when + Create Bundle clicked", () => {
    render(<BundlesPage />);
    fireEvent.click(screen.getByText("+ Create Bundle"));
    expect(screen.getByPlaceholderText(/bundle name/i)).toBeInTheDocument();
  });

  it("create bundle save button disabled until name and ≥1 app entered", () => {
    render(<BundlesPage />);
    fireEvent.click(screen.getByText("+ Create Bundle"));
    const saveBtn = screen.getByRole("button", { name: /save bundle/i });
    expect(saveBtn).toBeDisabled();
  });

  it("delete button on custom bundle card calls deleteCustomBundle", () => {
    makeUseBundles({ customBundles: [CUSTOM_BUNDLE], filteredBundles: [CUSTOM_BUNDLE] });
    render(<BundlesPage />);
    fireEvent.click(screen.getByTestId(`delete-bundle-${CUSTOM_BUNDLE.id}`));
    expect(mockDeleteCustomBundle).toHaveBeenCalledWith(CUSTOM_BUNDLE.id);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run src/__tests__/pages/BundlesPage.test.tsx
```

Expected: FAIL (module not found)

- [ ] **Step 3: Implement BundlesPage.tsx**

Create `src/pages/BundlesPage.tsx`:

```typescript
import { useState, useCallback } from "react";
import { Search, Plus, Trash2, Edit3, Package, Boxes } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { useBundles } from "@/hooks/useBundles";
import { useApps } from "@/hooks/useApps";
import { BundleInstallModal } from "@/components/BundleInstallModal";
import type { Bundle, ResolvedBundle } from "@/types/bundles";

const GROUP_ORDER = [
  "Starters",
  "Gaming",
  "Power Users",
  "Creative",
  "Community Picks",
  "Curated Collections",
];

const ICON_OPTIONS = [
  "Star", "Zap", "Rocket", "Shield", "Code2", "Gamepad2",
  "Music", "Video", "Briefcase", "Terminal", "Globe", "Lock",
];

const COLOR_OPTIONS = [
  { value: "blue", label: "Blue", class: "bg-blue-500" },
  { value: "green", label: "Green", class: "bg-green-500" },
  { value: "violet", label: "Violet", class: "bg-violet-500" },
  { value: "red", label: "Red", class: "bg-red-500" },
  { value: "amber", label: "Amber", class: "bg-amber-500" },
  { value: "cyan", label: "Cyan", class: "bg-cyan-500" },
];

function BundleIcon({ name, className }: { name: string; className?: string }) {
  const Icon = (LucideIcons as Record<string, React.ComponentType<{ size?: number; className?: string }>>)[name];
  return Icon ? <Icon size={20} className={className} /> : <Package size={20} className={className} />;
}

function BundleCard({
  bundle,
  onInstall,
  onDelete,
  onEdit,
  resolvedApps,
}: {
  bundle: Bundle;
  onInstall: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  resolvedApps: Array<{ appId: string; metadata: { name: string } | null }>;
}) {
  const firstThree = resolvedApps.slice(0, 3);
  const overflow = resolvedApps.length - 3;
  const colorMap: Record<string, string> = {
    blue: "text-blue-400 bg-blue-400/10",
    green: "text-green-400 bg-green-400/10",
    violet: "text-violet-400 bg-violet-400/10",
    red: "text-red-400 bg-red-400/10",
    amber: "text-amber-400 bg-amber-400/10",
    cyan: "text-cyan-400 bg-cyan-400/10",
    orange: "text-orange-400 bg-orange-400/10",
    rose: "text-rose-400 bg-rose-400/10",
    pink: "text-pink-400 bg-pink-400/10",
    teal: "text-teal-400 bg-teal-400/10",
    yellow: "text-yellow-400 bg-yellow-400/10",
    indigo: "text-indigo-400 bg-indigo-400/10",
    fuchsia: "text-fuchsia-400 bg-fuchsia-400/10",
    slate: "text-slate-400 bg-slate-400/10",
    sky: "text-sky-400 bg-sky-400/10",
    purple: "text-purple-400 bg-purple-400/10",
    zinc: "text-zinc-400 bg-zinc-400/10",
    gray: "text-gray-400 bg-gray-400/10",
    emerald: "text-emerald-400 bg-emerald-400/10",
  };
  const iconColor = colorMap[bundle.color] ?? "text-primary bg-primary/10";

  return (
    <div className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-3 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconColor}`}>
          <BundleIcon name={bundle.icon} />
        </div>
        <div className="flex gap-1 ml-auto">
          {bundle.type === "custom" && onEdit && (
            <button data-testid={`edit-bundle-${bundle.id}`} onClick={onEdit} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <Edit3 size={14} />
            </button>
          )}
          {bundle.type === "custom" && onDelete && (
            <button data-testid={`delete-bundle-${bundle.id}`} onClick={onDelete} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold text-sm">{bundle.name}</h3>
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{bundle.group}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{bundle.description}</p>
      </div>

      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-xs text-muted-foreground font-medium">{resolvedApps.length} apps</span>
        {firstThree.map(({ appId, metadata }) => (
          <span key={appId} className="text-xs px-1.5 py-0.5 rounded-full bg-muted/50 text-muted-foreground">
            {metadata?.name ?? appId}
          </span>
        ))}
        {overflow > 0 && (
          <span className="text-xs text-muted-foreground">+{overflow} more</span>
        )}
      </div>

      <button
        onClick={onInstall}
        className="w-full mt-auto py-2 text-sm font-medium rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Install Bundle
      </button>
    </div>
  );
}

interface CreatePanelProps {
  onSave: (bundle: Omit<Bundle, "id" | "type" | "createdAt">) => void;
  onCancel: () => void;
}

function CreateBundlePanel({ onSave, onCancel }: CreatePanelProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("Star");
  const [color, setColor] = useState("blue");
  const [group, setGroup] = useState("Other");
  const [appSearch, setAppSearch] = useState("");
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const canSave = name.trim().length > 0 && selectedApps.length > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave({ name: name.trim(), description, icon, color, group, apps: selectedApps });
  };

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    e.dataTransfer.setData("text/plain", String(idx));
  };

  const handleDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    const srcIdx = parseInt(e.dataTransfer.getData("text/plain"), 10);
    if (srcIdx === targetIdx) return;
    const updated = [...selectedApps];
    const [removed] = updated.splice(srcIdx, 1);
    updated.splice(targetIdx, 0, removed);
    setSelectedApps(updated);
    setDragOver(null);
  };

  return (
    <div className="border border-primary/30 rounded-2xl p-5 bg-primary/5 space-y-4">
      <h3 className="font-semibold">Create Bundle</h3>

      {/* Name */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Bundle Name *</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Bundle name..."
          className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {/* Description */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Description</label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this bundle for?"
          className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {/* Group */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Group</label>
        <select
          value={group}
          onChange={(e) => setGroup(e.target.value)}
          className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          {[...GROUP_ORDER, "Other"].map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>

      {/* Icon picker */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Icon</label>
        <div className="flex gap-2 flex-wrap">
          {ICON_OPTIONS.map((i) => (
            <button
              key={i}
              onClick={() => setIcon(i)}
              className={`p-2 rounded-xl border transition-colors ${icon === i ? "border-primary bg-primary/10" : "border-border hover:bg-muted"}`}
            >
              <BundleIcon name={i} className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>

      {/* Color picker */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Color</label>
        <div className="flex gap-2 flex-wrap">
          {COLOR_OPTIONS.map((c) => (
            <button
              key={c.value}
              onClick={() => setColor(c.value)}
              className={`w-6 h-6 rounded-full ${c.class} ${color === c.value ? "ring-2 ring-offset-2 ring-primary" : ""}`}
            />
          ))}
        </div>
      </div>

      {/* App search */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Add Apps</label>
        <input
          value={appSearch}
          onChange={(e) => setAppSearch(e.target.value)}
          placeholder="Type an app ID (e.g. Mozilla.Firefox)"
          className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        {appSearch.trim() && (
          <button
            onClick={() => {
              const id = appSearch.trim();
              if (!selectedApps.includes(id)) setSelectedApps((prev) => [...prev, id]);
              setAppSearch("");
            }}
            className="mt-1.5 text-xs text-primary hover:underline"
          >
            + Add "{appSearch.trim()}"
          </button>
        )}
      </div>

      {/* Selected apps with drag-to-reorder */}
      {selectedApps.length > 0 && (
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Selected Apps ({selectedApps.length})</label>
          <div className="space-y-1">
            {selectedApps.map((appId, idx) => (
              <div
                key={appId}
                draggable
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => { e.preventDefault(); setDragOver(idx); }}
                onDrop={(e) => handleDrop(e, idx)}
                onDragLeave={() => setDragOver(null)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted text-sm cursor-grab ${dragOver === idx ? "ring-2 ring-primary" : ""}`}
              >
                <span className="text-muted-foreground">⠿</span>
                <span className="flex-1 font-mono text-xs">{appId}</span>
                <button
                  onClick={() => setSelectedApps((prev) => prev.filter((_, i) => i !== idx))}
                  className="text-muted-foreground hover:text-red-400 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button onClick={onCancel} className="flex-1 py-2 text-sm rounded-xl border border-border hover:bg-muted transition-colors">
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!canSave}
          className="flex-1 py-2 text-sm font-medium rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Save Bundle
        </button>
      </div>
    </div>
  );
}

export function BundlesPage({ setView }: { setView?: (view: string) => void }) {
  const {
    curatedBundles,
    customBundles,
    saveCustomBundle,
    deleteCustomBundle,
    resolveBundle,
    searchQuery,
    setSearchQuery,
    filteredBundles,
  } = useBundles();

  const { installApp, installedApps, checkInstalled } = useApps();

  const [showCreate, setShowCreate] = useState(false);
  const [modalBundle, setModalBundle] = useState<ResolvedBundle | null>(null);

  const openModal = useCallback(
    async (bundle: Bundle) => {
      const resolved = resolveBundle(bundle);
      // Prefetch installed status for all resolved apps
      await Promise.all(
        resolved.resolvedApps
          .filter(({ metadata }) => metadata !== null)
          .map(({ appId }) => checkInstalled(appId, appId))
      );
      setModalBundle(resolved);
    },
    [resolveBundle, checkInstalled]
  );

  const isSearching = searchQuery.trim().length > 0;

  // Group curated bundles by group for display
  const groupedCurated: Record<string, Bundle[]> = {};
  curatedBundles.forEach((b) => {
    if (!groupedCurated[b.group]) groupedCurated[b.group] = [];
    groupedCurated[b.group].push(b);
  });

  return (
    <div className="flex-1 w-full max-w-[1300px] mx-auto pb-20 px-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6 pt-6">
        <div>
          <div className="flex items-center gap-2">
            <Boxes size={24} className="text-primary" />
            <h1 className="text-2xl font-bold">App Bundles</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Curated app collections for every setup. Install in one click.</p>
        </div>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors whitespace-nowrap"
        >
          <Plus size={16} />
          + Create Bundle
        </button>
      </div>

      {/* Create panel */}
      {showCreate && (
        <div className="mb-6">
          <CreateBundlePanel
            onSave={(bundle) => {
              saveCustomBundle(bundle);
              setShowCreate(false);
            }}
            onCancel={() => setShowCreate(false)}
          />
        </div>
      )}

      {/* Search */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search bundles..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {/* Bundle list */}
      {isSearching ? (
        /* Search results */
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Search Results ({filteredBundles.length})
          </h2>
          {filteredBundles.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No bundles match "{searchQuery}"</p>
              <button onClick={() => setSearchQuery("")} className="mt-2 text-sm text-primary hover:underline">
                Clear search
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBundles.map((bundle) => {
                const resolved = resolveBundle(bundle);
                return (
                  <BundleCard
                    key={bundle.id}
                    bundle={bundle}
                    resolvedApps={resolved.resolvedApps}
                    onInstall={() => openModal(bundle)}
                    onDelete={bundle.type === "custom" ? () => deleteCustomBundle(bundle.id) : undefined}
                  />
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-10">
          {/* My Bundles */}
          {customBundles.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">My Bundles</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {customBundles.map((bundle) => {
                  const resolved = resolveBundle(bundle);
                  return (
                    <BundleCard
                      key={bundle.id}
                      bundle={bundle}
                      resolvedApps={resolved.resolvedApps}
                      onInstall={() => openModal(bundle)}
                      onDelete={() => deleteCustomBundle(bundle.id)}
                      onEdit={undefined}
                    />
                  );
                })}
              </div>
            </section>
          )}

          {/* Curated groups */}
          {GROUP_ORDER.map((group) => {
            const bundles = groupedCurated[group];
            if (!bundles?.length) return null;
            return (
              <section key={group}>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{group}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {bundles.map((bundle) => {
                    const resolved = resolveBundle(bundle);
                    return (
                      <BundleCard
                        key={bundle.id}
                        bundle={bundle}
                        resolvedApps={resolved.resolvedApps}
                        onInstall={() => openModal(bundle)}
                      />
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Install modal */}
      {modalBundle && (
        <BundleInstallModal
          bundle={modalBundle}
          isOpen={true}
          onClose={() => setModalBundle(null)}
          installApp={installApp}
          installedApps={installedApps}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run src/__tests__/pages/BundlesPage.test.tsx
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/BundlesPage.tsx src/__tests__/pages/BundlesPage.test.tsx
git commit -m "feat: implement BundlesPage with group layout, search, and create panel"
```

---

## Chunk 5: Integration Wiring

### Task 6: Add hero card to AppsPage.tsx (TDD)

**Files:**
- Modify: `src/__tests__/pages/AppsPage.test.tsx`
- Modify: `src/pages/AppsPage.tsx`

- [ ] **Step 1: Add hero card tests to AppsPage.test.tsx**

Open `src/__tests__/pages/AppsPage.test.tsx`. Find the existing test suite. Add these tests inside the `describe` block (after existing tests):

```typescript
describe("Bundles hero card", () => {
  it("renders the App Bundles hero card", () => {
    render(<AppsPage />);
    expect(screen.getByText("App Bundles")).toBeInTheDocument();
    expect(screen.getByText(/curated app collections/i)).toBeInTheDocument();
  });

  it("hero card calls setView('bundles') when clicked", () => {
    const mockSetView = vi.fn();
    render(<AppsPage setView={mockSetView} />);
    fireEvent.click(screen.getByText("App Bundles").closest("[data-testid='bundles-hero-card']")!);
    expect(mockSetView).toHaveBeenCalledWith("bundles");
  });

  it("hero card renders without crashing when setView not provided", () => {
    expect(() => render(<AppsPage />)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run new tests — verify they fail**

```bash
npx vitest run src/__tests__/pages/AppsPage.test.tsx -t "Bundles hero card"
```

Expected: FAIL (no hero card yet)

- [ ] **Step 3: Add setView prop and hero card to AppsPage.tsx**

Open `src/pages/AppsPage.tsx`. Make these changes:

1. Update the function signature (find `export function AppsPage()` or `export default function AppsPage()`):
```typescript
export function AppsPage({ setView }: { setView?: (view: string) => void }) {
```

2. Add `Boxes` to the existing `lucide-react` import line (`ArrowRight` is already imported — do not add it again, but do not remove it either as the hero card JSX uses it):
```typescript
// Find the existing: import { Search, Sparkles, ..., ArrowRight, ... } from "lucide-react";
// Add Boxes to that same import list.
```

3. Insert the hero card after the view-toggle block and before `<div className="flex-1 w-full max-w-[1300px]...">`. Find the closing `)}` of the view-toggle conditional (around line 146), then add:

```typescript
{/* Bundles hero card */}
<div
  data-testid="bundles-hero-card"
  onClick={() => setView?.("bundles")}
  className="w-full cursor-pointer rounded-2xl bg-gradient-to-r from-primary/10 via-violet-500/10 to-primary/5 border border-primary/20 p-5 flex items-center gap-4 hover:border-primary/40 hover:from-primary/15 transition-all group mb-4"
>
  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0 group-hover:bg-primary/30 transition-colors">
    <Boxes size={22} className="text-primary" />
  </div>
  <div className="flex-1 min-w-0">
    <div className="flex items-center gap-2 flex-wrap">
      <span className="font-semibold">App Bundles</span>
      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">22 bundles</span>
    </div>
    <p className="text-sm text-muted-foreground mt-0.5">Install curated app collections in one click.</p>
  </div>
  <div className="flex items-center gap-1 text-sm text-primary font-medium shrink-0">
    Browse <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
  </div>
</div>
```

- [ ] **Step 4: Run all AppsPage tests**

```bash
npx vitest run src/__tests__/pages/AppsPage.test.tsx
```

Expected: all tests PASS (including pre-existing ones and new hero card tests)

- [ ] **Step 5: Commit**

```bash
git add src/pages/AppsPage.tsx src/__tests__/pages/AppsPage.test.tsx
git commit -m "feat: add bundles hero card to AppsPage with setView prop"
```

---

### Task 7: Register view and add sidebar nav item

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Register bundles view in App.tsx**

Open `src/App.tsx`. Add the import at the top with other page imports:

```typescript
import { BundlesPage } from "./pages/BundlesPage";
```

Find the `views` object (where `apps: <AppsPage />` is). Make two changes:

```typescript
// Change:
apps: <AppsPage />,
// To:
apps: <AppsPage setView={setCurrentView} />,

// Add after apps:
bundles: <BundlesPage setView={setCurrentView} />,
```

- [ ] **Step 2: Add Bundles nav item to Sidebar.tsx**

Open `src/components/layout/Sidebar.tsx`.

Add `Boxes` to the Lucide import line (near the top of the file):
```typescript
// Find the existing lucide-react import and add Boxes:
import { ..., Boxes } from "lucide-react";
```

Find the `NAV_GROUPS` definition. Locate the `apps` group. Add the Bundles item after "App Store":

```typescript
// Find the apps group items array and add:
{ id: "bundles", label: "Bundles", lucideIcon: Boxes },
// immediately after the App Store item
```

- [ ] **Step 3: Run full test suite**

```bash
npx vitest run
```

Expected: all tests PASS (same count as before + new tests)

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/components/layout/Sidebar.tsx
git commit -m "feat: register bundles view in App.tsx and add Bundles nav item to Sidebar"
```

---

### Task 8: Final verification

- [ ] **Step 1: Run full test suite and confirm all pass**

```bash
npx vitest run
```

Expected: all tests pass. Note the new count (previous + useBundles + BundleInstallModal + BundlesPage + AppsPage hero card tests).

- [ ] **Step 2: Type-check the full project**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Verify bundle resolution in browser (npm run dev)**

```bash
npm run dev
```

- Open App Store → click "App Bundles" hero card → arrives at Bundles page
- Bundles page shows 6 group sections with correct bundle counts
- Click "Install Bundle" on any bundle → modal opens with app checklist
- Expand an app row → description visible
- My Bundles section absent until "+ Create Bundle" is used and a bundle is saved
- Search input filters bundles live

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "feat: complete App Store Bundles feature — 22 curated bundles, install modal, custom bundles"
```

---

*Plan saved: 2026-03-14*
