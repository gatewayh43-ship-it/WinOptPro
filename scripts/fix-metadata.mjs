import { readFileSync, writeFileSync, readdirSync } from 'fs';

const data = JSON.parse(readFileSync('./src/data/app_metadata.json', 'utf8'));
const diskFiles = new Set(readdirSync('./public/app_logos').map(f => f.toLowerCase()));

// ── 1. BROKEN LOGO PATHS ──────────────────────────────────────────────────────
// For logo paths that are /app_logos/X.png but X.png doesn't exist, switch to ui-avatars.
function uiAvatars(name) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&rounded=true&bold=true&size=128`;
}

// ── 2. EXPANDED DESCRIPTIONS ──────────────────────────────────────────────────
const expandedDescs = {
  'Barrier':               'Open-source KVM software that lets you share one keyboard and mouse across multiple computers on your local network.',
  'Dual Monitor Tools':    'A collection of utilities for Windows users with multiple monitors, including wallpaper management, cursor controls, and window management.',
  'Windows PC Health Check': 'Official Microsoft tool to check your PC\'s compatibility with Windows 11 and monitor device health.',
  'Chatterino':            'Feature-rich desktop chat client for Twitch.tv with custom emotes, highlights, and notification filters.',
  'AIMP':                  'AIMP is a powerful freeware audio player supporting 30+ formats with a sleek interface and extensive plugin library.',
  'Cemu':                  'High-accuracy Nintendo Wii U emulator for PC with full gamepad support and online play capabilities.',
  'Clementine':            'Cross-platform music player and library organiser inspired by Amarok 1.4, with cloud streaming support.',
  'EFI Boot Editor':       'Graphical editor for (U)EFI boot entries, allowing you to add, edit, reorder, and delete boot options on modern systems.',
  'Emulationstation':      'Graphical front-end for organising and launching emulators from a single, controller-friendly interface.',
  'Policy Plus':           'Enhanced local Group Policy editor that goes beyond gpedit.msc, adding search and support for Home edition of Windows.',
  'Oh My Posh':            'Fully customisable prompt theme engine for any shell, with hundreds of built-in themes and segment icons.',
  'Swift':                 'Apple\'s Swift programming language toolchain for Windows, enabling cross-platform Swift development on Windows 10/11.',
};

// ── 3. GITHUB LINKS ───────────────────────────────────────────────────────────
const githubLinks = {
  // Browsers
  'Mozilla Firefox (en-US)':            'https://github.com/mozilla/gecko-dev',
  'Mozilla Firefox ESR (en-US)':        'https://github.com/mozilla/gecko-dev',
  'Brave':                               'https://github.com/brave/brave-browser',
  'Falkon':                              'https://github.com/KDE/falkon',
  'Ablaze Floorp':                       'https://github.com/Floorp-Projects/Floorp',
  'LibreWolf':                           'https://github.com/librewolf-community/browser-windows',
  'Mullvad Browser':                     'https://github.com/mullvad/mullvad-browser',
  'Pale Moon':                           'https://github.com/MoonchildProductions/Pale-Moon',
  'Tor Browser':                         'https://github.com/TheTorProject/gettorbrowser',
  // Media & Entertainment
  'OBS Studio':                          'https://github.com/obsproject/obs-studio',
  'VLC media player':                    'https://github.com/videolan/vlc',
  'HandBrake':                           'https://github.com/HandBrake/HandBrake',
  'Audacity':                            'https://github.com/audacity/audacity',
  'blender':                             'https://github.com/blender/blender',
  'GIMP':                                'https://github.com/GNOME/gimp',
  'Inkscape':                            'https://github.com/inkscape/inkscape',
  'Kdenlive':                            'https://github.com/KDE/kdenlive',
  'Krita':                               'https://github.com/KDE/krita',
  'darktable':                           'https://github.com/darktable-org/darktable',
  'digiKam':                             'https://github.com/KDE/digikam',
  'Stremio':                             'https://github.com/Stremio/stremio-shell',
  'Jellyfin Media Player':               'https://github.com/jellyfin/jellyfin-media-player',
  'calibre':                             'https://github.com/kovidgoyal/calibre',
  'Shotcut':                             'https://github.com/mltframework/shotcut',
  'Subtitle Edit':                       'https://github.com/SubtitleEdit/subtitleedit',
  'MuseScore':                           'https://github.com/musescore/MuseScore',
  'Kodi':                                'https://github.com/xbmc/xbmc',
  // System Utilities
  'AutoHotkey':                          'https://github.com/AutoHotkey/AutoHotkey',
  'Bitwarden':                           'https://github.com/bitwarden/clients',
  'BleachBit':                           'https://github.com/bleachbit/bleachbit',
  'CapFrameX':                           'https://github.com/CXWorld/CapFrameX',
  'Deluge BitTorrent Client':            'https://github.com/deluge-torrent/deluge',
  'DevToys':                             'https://github.com/DevToys-app/DevToys',
  'FFmpeg':                              'https://github.com/FFmpeg/FFmpeg',
  'KDE Connect':                         'https://github.com/KDE/kdeconnect-kde',
  'LocalSend':                           'https://github.com/localsend/localsend',
  'Meld':                                'https://github.com/GNOME/meld',
  'OpenRGB':                             'https://github.com/CalcProgrammer1/OpenRGB',
  'PeaZip':                              'https://github.com/peazip/PeaZip',
  'Rainmeter':                           'https://github.com/rainmeter/rainmeter',
  'Transmission':                        'https://github.com/transmission/transmission',
  'UltraVNC':                            'https://github.com/ultravnc/UltraVNC',
  'croc':                                'https://github.com/schollz/croc',
  'PrusaSlicer':                         'https://github.com/prusa3d/PrusaSlicer',
  'neofetch-win':                        'https://github.com/nepnep39/neofetch-win',
  'Nilesoft Shell':                      'https://github.com/moudey/Shell',
  'Intel PresentMon':                    'https://github.com/GameTechDev/PresentMon',
  'Proton Authenticator':                'https://github.com/ProtonMail/proton-authenticator-android',
  'Portmaster':                          'https://github.com/safing/portmaster',
  'Oracle VirtualBox':                   'https://github.com/oracle/VirtualBox',
  'qTox':                                'https://github.com/qTox/qTox',
  'Jami':                                'https://github.com/savoirfairelinux/jami-client-windows',
  'Barrier':                             'https://github.com/debauchee/barrier',
  // Communication
  'Mozilla Thunderbird (en-US)':         'https://github.com/mozilla/releases-comm-central',
  'Betterbird':                          'https://github.com/Betterbird/thunderbird-patches',
  // Other Tools
  'EarTrumpet':                          'https://github.com/File-New-Project/EarTrumpet',
  'Flameshot':                           'https://github.com/flameshot-org/flameshot',
  'FreeCAD':                             'https://github.com/FreeCAD/FreeCAD',
  'HeidiSQL':                            'https://github.com/HeidiSQL/HeidiSQL',
  'ImageGlass':                          'https://github.com/d2phap/ImageGlass',
  'itch':                                'https://github.com/itchio/itch',
  'Joplin':                              'https://github.com/laurent22/joplin',
  'LibreOffice':                         'https://github.com/LibreOffice/core',
  'mRemoteNG':                           'https://github.com/mRemoteNG/mRemoteNG',
  'Mullvad VPN':                         'https://github.com/mullvad/mullvadvpn-app',
  'NAPS2':                               'https://github.com/cyanfish/naps2',
  'Nmap':                                'https://github.com/nmap/nmap',
  'Okular':                              'https://github.com/KDE/okular',
  'ONLYOFFICE Desktop Editors':          'https://github.com/ONLYOFFICE/DesktopEditors',
  'OpenSCAD':                            'https://github.com/openscad/openscad',
  'Policy Plus':                         'https://github.com/Fleex255/PolicyPlus',
  'SumatraPDF':                          'https://github.com/sumatrapdfreader/sumatrapdf',
  'WinMerge':                            'https://github.com/WinMerge/winmerge',
  'WinSCP':                              'https://github.com/winscp/winscp',
  'WireGuard':                           'https://github.com/WireGuard/wireguard-windows',
  'Wireshark':                           'https://github.com/wireshark/wireshark',
  'Zim Desktop Wiki':                    'https://github.com/zim-wiki/zim-desktop-wiki',
  'Zotero':                              'https://github.com/zotero/zotero',
  'QGIS':                                'https://github.com/qgis/QGIS',
  'KiCad':                               'https://github.com/KiCad/kicad-source-mirror',
  'HeidiSQL':                            'https://github.com/HeidiSQL/HeidiSQL',
  // Development & IT
  'CMake':                               'https://github.com/Kitware/CMake',
  'GitButler':                           'https://github.com/gitbutlerapp/gitbutler',
  'Go Programming Language':             'https://github.com/golang/go',
  'Helix':                               'https://github.com/helix-editor/helix',
  'Swift':                               'https://github.com/apple/swift',
  'Eclipse Temurin JDK with Hotspot 21': 'https://github.com/adoptium/temurin-build',
  'LLVM':                                'https://github.com/llvm/llvm-project',
  'NASM':                                'https://github.com/netwide-assembler/nasm',
  'Oh My Posh':                          'https://github.com/JanDeDobbeleer/oh-my-posh',
  'Microsoft .NET Windows Desktop Runtime 3.1':  'https://github.com/dotnet/runtime',
  'Microsoft .NET Windows Desktop Runtime 5.0':  'https://github.com/dotnet/runtime',
  'Microsoft .NET Windows Desktop Runtime 6.0':  'https://github.com/dotnet/runtime',
  'Microsoft .NET Windows Desktop Runtime 7.0':  'https://github.com/dotnet/runtime',
  'Microsoft .NET Windows Desktop Runtime 8.0':  'https://github.com/dotnet/runtime',
  'Microsoft .NET Windows Desktop Runtime 9.0':  'https://github.com/dotnet/runtime',
  'Microsoft .NET Windows Desktop Runtime 10.0': 'https://github.com/dotnet/runtime',
};

// ── APPLY FIXES ───────────────────────────────────────────────────────────────
let logoBroken = 0, logoFixed = 0;
let descFixed = 0;
let githubFixed = 0;

for (const cat of data.categories) {
  for (const app of cat.apps) {
    // Fix logos: only local /app_logos/ paths where the file doesn't exist
    const logo = app.logo || '';
    if (logo.startsWith('/app_logos/')) {
      const filename = logo.split('/').pop();
      if (!diskFiles.has(filename.toLowerCase())) {
        logoBroken++;
        app.logo = uiAvatars(app.name);
        logoFixed++;
      }
    }

    // Fix short descriptions
    if (expandedDescs[app.name] && app.description.length < 40) {
      app.description = expandedDescs[app.name];
      descFixed++;
    }

    // Add missing GitHub links
    if (!app.github_link && githubLinks[app.name]) {
      app.github_link = githubLinks[app.name];
      githubFixed++;
    }
  }
}

writeFileSync('./src/data/app_metadata.json', JSON.stringify(data, null, 2));

console.log(`Logo paths fixed:      ${logoFixed} (of ${logoBroken} broken)`);
console.log(`Descriptions expanded: ${descFixed}`);
console.log(`GitHub links added:    ${githubFixed}`);
