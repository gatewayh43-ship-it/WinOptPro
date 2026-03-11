// Fix #2: Add source/store links for remaining 143 apps
// - Open-source on SourceForge/GitLab → canonical source URL
// - Open-source found on GitHub (missed earlier) → GitHub URL
// - Proprietary/Freeware → Microsoft Store URL
import { readFileSync, writeFileSync } from 'fs';

const data = JSON.parse(readFileSync('./src/data/app_metadata.json', 'utf8'));

// Keys are exact app.name values from the JSON
const sourceLinks = {
  // ── OPEN-SOURCE: GitHub repos missed in v1 ─────────────────────────────────
  'Telegram Desktop':               'https://github.com/telegramdesktop/tdesktop',
  'Wazuh Agent':                    'https://github.com/wazuh/wazuh-agent',
  'Ambie White Noise':              'https://github.com/jenius-apps/ambie',
  'Linphone':                       'https://github.com/BelledonneCommunications/linphone-desktop',
  'Python 3.14':                    'https://github.com/python/cpython',
  'Microsoft Visual Studio Code':   'https://github.com/microsoft/vscode',
  'Docker Desktop':                 'https://github.com/docker/desktop',

  // ── OPEN-SOURCE: SourceForge ───────────────────────────────────────────────
  '7-Zip':                          'https://sourceforge.net/projects/sevenzip/',
  'Dual Monitor Tools':             'https://github.com/shogunxam/dualmonitortool',
  'SageThumbs':                     'https://github.com/raspopov/SageThumbs',
  'TightVNC':                       'https://github.com/TurboVNC/tightvnc',
  'FFmpeg Batch AV Converter':      'https://sourceforge.net/projects/ffmpeg-batch/',
  'Snappy Driver Installer Origin': 'https://sourceforge.net/projects/snappy-driver-installer-origin/',

  // ── PROPRIETARY/FREEWARE: Microsoft Store ──────────────────────────────────
  // Browsers
  'Google Chrome':                  'https://apps.microsoft.com/detail/xpfftq037jwmhs',
  'Microsoft Edge':                 'https://apps.microsoft.com/detail/xpfftq037jwmhs',
  'Vivaldi':                        'https://apps.microsoft.com/detail/xp8cdznhdb6k0d',

  // Game Launchers
  'Steam':                          'https://store.steampowered.com/',
  'Epic Games Launcher':            'https://store.epicgames.com/',
  'EA app':                         'https://www.ea.com/ea-app',
  'GOG GALAXY':                     'https://www.gog.com/galaxy',
  'Amazon Games':                   'https://gaming.amazon.com/',
  'Ubisoft Connect':                'https://ubisoftconnect.com/',
  'Parsec':                         'https://apps.microsoft.com/detail/9pmkrmfnmmfd',
  'Rockstar Games Launcher':        'https://socialclub.rockstargames.com/',
  'CurseForge':                     'https://www.curseforge.com/download',
  'Overwolf':                       'https://www.overwolf.com/download/',
  'NVIDIA GeForce NOW':             'https://apps.microsoft.com/detail/xp8l4bmpbtkzlq',
  'Wargaming Game Center':          'https://wargaming.net/en/games/',
  'Arc (Arc Games)':                'https://www.arcgames.com/en/download',

  // Media & Entertainment
  'Spotify':                        'https://apps.microsoft.com/detail/9ncbcszsjrsb',
  'DaVinci Resolve':                'https://www.blackmagicdesign.com/products/davinciresolve',
  'Mp3tag':                         'https://apps.microsoft.com/detail/9nn77tcq1nc8',
  'IrfanView':                      'https://apps.microsoft.com/detail/9nl0r0jnnzm0',
  'XnView MP':                      'https://www.xnview.com/en/xnviewmp/#downloads',
  'foobar2000':                     'https://apps.microsoft.com/detail/9pb51gm7m33j',
  'Plex':                           'https://apps.microsoft.com/detail/xp9cdqw6ml4nqn',

  // System Utilities
  '1Password':                      'https://apps.microsoft.com/detail/9p6kxl0svnnl',
  'AnyDesk':                        'https://apps.microsoft.com/detail/xpf6h0jmx1drn6',
  'CPUID CPU-Z':                    'https://www.cpuid.com/softwares/cpu-z.html',
  'CPUID HWMonitor':                'https://www.cpuid.com/softwares/hwmonitor.html',
  'Glary Utilities':                'https://apps.microsoft.com/detail/9wzdncrdcbhf',
  'Google Drive':                   'https://drive.google.com/drive/downloads',
  'TechPowerUp GPU-Z':              'https://www.techpowerup.com/gpuz/',
  'HWiNFO®':                       'https://www.hwinfo.com/download/',
  'LockHunter':                     'https://lockhunter.com/downloadapp.htm',
  'Malwarebytes':                   'https://apps.microsoft.com/detail/xp8lhwlt6mmddg',
  'MSI Afterburner':                'https://www.msi.com/Landing/afterburner/graphics-cards',
  'NVCleanstall':                   'https://www.techpowerup.com/nvcleanstall/',
  'Parsec':                         'https://apps.microsoft.com/detail/9pmkrmfnmmfd',
  'Revo Uninstaller':               'https://apps.microsoft.com/detail/xp8crk76kn57kk',
  'SignalRgb':                      'https://apps.microsoft.com/detail/xpdgb3bkp1k6c2',
  'SpaceSniffer':                   'https://www.uderzo.it/main_products/space_sniffer/',
  'TeamViewer':                     'https://apps.microsoft.com/detail/xpdm17hk323c4x',
  'Total Commander':                'https://www.ghisler.com/download.htm',
  'TeraCopy':                       'https://apps.microsoft.com/detail/9nblggh517cg',
  'TreeSize Free':                  'https://apps.microsoft.com/detail/xp9m26rsclnt88',
  'WinRAR':                         'https://www.rarlab.com/download.htm',
  'Windows PC Health Check':        'https://aka.ms/GetPCHealthCheckApp',
  'Wise Program Uninstaller':       'https://apps.microsoft.com/detail/xp9m2sqhz1tgwz',
  'ZoomIt':                         'https://learn.microsoft.com/en-us/sysinternals/downloads/zoomit',
  'Cinebench R23':                  'https://www.maxon.net/cinebench',
  'Speccy':                         'https://www.ccleaner.com/speccy/download',
  'JoyToKey':                       'https://joytokey.net/en/download',
  'Tixati':                         'https://www.tixati.com/download/',
  'VistaSwitcher':                  'https://www.ntwind.com/software/vistaswitcher.html',
  'Bulk Rename Utility':            'https://www.bulkrenameutility.co.uk/Download.php',
  'Advanced Renamer':               'https://www.advancedrenamer.com/download',
  'aText':                          'https://apps.microsoft.com/detail/9n68hc1srr0k',
  'WizFile':                        'https://antibody-software.com/wizfile/',
  'WizTree':                        'https://antibody-software.com/wiztree/',
  'XnView':                         'https://www.xnview.com/en/xnview/#downloads',
  'Malwarebytes Windows Firewall Control': 'https://www.binisoft.org/wfc',
  'Syncthing Tray':                 'https://github.com/Martchus/syncthingtray',
  'Link Shell Extension':           'http://schinagl.priv.at/nt/hardlinkshellext/linkshellextension.html',

  // Communication
  'Discord':                        'https://apps.microsoft.com/detail/xpdc2rh70k22mn',
  'Zoom Workplace':                 'https://apps.microsoft.com/detail/xp99j3kp4xz4vv',
  'Slack':                          'https://apps.microsoft.com/detail/9wzdncrdk3wp',
  'Linphone':                       'https://github.com/BelledonneCommunications/linphone-desktop',
  'Microsoft Teams':                'https://apps.microsoft.com/detail/xp8bt8dw290mpq',
  'Viber':                          'https://apps.microsoft.com/detail/xpfm5p5kdwf0jp',

  // Other Tools
  'Adobe Acrobat Reader (64-bit)':  'https://apps.microsoft.com/detail/xpdp273c0xhqh2',
  'Advanced IP Scanner':            'https://www.advanced-ip-scanner.com/download.php',
  'AIMP':                           'https://www.aimp.ru/?do=download',
  'Autoruns':                       'https://learn.microsoft.com/en-us/sysinternals/downloads/autoruns',
  'Remote Desktop Connection Manager': 'https://learn.microsoft.com/en-us/sysinternals/downloads/rdcman',
  'Clone Hero':                     'https://clonehero.net/',
  'NTLite':                         'https://www.ntlite.com/download/',
  'FireAlpaca':                     'https://firealpaca.com/download',
  'Lightshot':                      'https://app.prntscr.com/en/download.html',
  'Foxit PDF Reader':               'https://apps.microsoft.com/detail/xpfm62q36fxd6d',
  'Harmonoid':                      'https://github.com/harmonoid/harmonoid',
  'ImgBurn':                        'https://www.imgburn.com/index.php?act=download',
  'iTunes':                         'https://apps.microsoft.com/detail/9pb2mz1zmb0s',
  'K-Lite Codec Pack Standard':     'https://codecguide.com/download_kl.htm',
  'TagScanner':                     'https://www.xdlab.ru/en/',
  'nGlide':                         'https://www.zeus-software.com/downloads/nglide',
  'Obsidian':                       'https://obsidian.md/download',
  'Microsoft OneDrive':             'https://www.microsoft.com/en-us/microsoft-365/onedrive/download',
  'OpenVPN Connect':                'https://openvpn.net/client/',
  'PotPlayer':                      'https://potplayer.daum.net/',
  'Process Explorer':               'https://learn.microsoft.com/en-us/sysinternals/downloads/process-explorer',
  'paint.net':                      'https://apps.microsoft.com/detail/9nbhcs1lx4r0',
  'PDF24 Creator':                  'https://www.pdf24.org/en/creator/',
  'Plex Media Server':              'https://apps.microsoft.com/detail/xpfm11z0w10r7g',
  'Power Automate for desktop':     'https://apps.microsoft.com/detail/9nftch6j7fhv',
  'Microsoft PowerBI Desktop':      'https://apps.microsoft.com/detail/9ntxr16hnw1t',
  'Process Monitor':                'https://learn.microsoft.com/en-us/sysinternals/downloads/procmon',
  'PS Remote Play':                 'https://apps.microsoft.com/detail/9phjklsh75hs',
  'PDFgear':                        'https://www.pdfgear.com/download/',
  'Microsoft SQL Server Management Studio': 'https://aka.ms/ssmsfullsetup',
  'TCPView':                        'https://learn.microsoft.com/en-us/sysinternals/downloads/tcpview',
  'TIDAL - Music Streaming':        'https://apps.microsoft.com/detail/9nncb5bs59ph',
  'Microsoft Visual C++ v14 Redistributable (x86)': 'https://aka.ms/vs/17/release/vc_redist.x86.exe',
  'Microsoft Visual C++ v14 Redistributable (x64)': 'https://aka.ms/vs/17/release/vc_redist.x64.exe',
  'Voicemeeter':                    'https://vb-audio.com/Voicemeeter/',
  'Voicemeeter Potato':             'https://vb-audio.com/Voicemeeter/potato.htm',
  'Virtual Desktop Streamer':       'https://www.vrdesktop.net/',
  'NDI Tools':                      'https://ndi.video/tools/',
  'GOG GALAXY':                     'https://www.gog.com/galaxy',

  // Development & IT
  'Anaconda3':                      'https://www.anaconda.com/download',
  'Docker Desktop':                 'https://github.com/docker/desktop',
  'JetBrains Toolbox':              'https://www.jetbrains.com/toolbox-app/',
  'Postman':                        'https://www.postman.com/downloads/',
  'Sublime Merge':                  'https://www.sublimemerge.com/download',
  'Sublime Text 4':                 'https://www.sublimetext.com/download',
  'Unity Hub':                      'https://unity.com/download',
  'Visual Studio Community 2022':   'https://visualstudio.microsoft.com/downloads/',
  'Microsoft Visual Studio Code':   'https://github.com/microsoft/vscode',
  'Miniconda3':                     'https://docs.anaconda.com/miniconda/',
  'Fork - a fast and friendly git client': 'https://git-fork.com/download',
  'Termius':                        'https://apps.microsoft.com/detail/9nk1in7k09m8',
  'Eclipse Temurin JDK with Hotspot 21': 'https://github.com/adoptium/temurin-build',
};

let fixed = 0;
for (const cat of data.categories) {
  for (const app of cat.apps) {
    if (!app.github_link && sourceLinks[app.name]) {
      app.github_link = sourceLinks[app.name];
      fixed++;
    }
  }
}

writeFileSync('./src/data/app_metadata.json', JSON.stringify(data, null, 2));
console.log(`Links added: ${fixed}`);
