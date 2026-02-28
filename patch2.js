import { readFileSync, writeFileSync } from 'fs';

const path = './src/data/tweaks.json';
const data = JSON.parse(readFileSync(path, 'utf8'));

const updates = {
    // PRIVACY
    "DisableTelemetry": {
        "expertDetails": "Sets 'HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection\\AllowTelemetry' to 0 (Security level on Enterprise/Education) or 1 (Basic level on Home/Pro). Windows uses the 'DiagTrack' (Connected User Experiences and Telemetry) service to upload telemetry blobs containing usage statistics and crash dumps. This restricts the data strictly to OS version and critical error diagnostics.",
        "interactions": "Overrides individual telemetry toggles in the Settings app, turning them grey and displaying 'Some settings are managed by your organization'."
    },
    "DisableActivityHistory": {
        "expertDetails": "Modifies 'HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System\\PublishUserActivities' to 0. This stops Windows from tracking which applications you open and which websites you visit (via Timeline feature) and uploading them to the cloud for cross-device synchronization.",
        "interactions": "Disabling this will functionally break the 'Timeline' view in Task View on older Windows 10 versions."
    },
    "DisableDiagnosticData": {
        "expertDetails": "Works alongside 'DisableTelemetry'. Specifically disables the diagnostic data viewer schedule ('DiagTrack-Listener') and clears existing diagnostic logs by triggering a 'Delete-DiagnosticData' CIM call.",
        "interactions": "Saves a minor amount of SSD space by preventing local telemetry JSON blobs from piling up in 'C:\\ProgramData\\Microsoft\\Diagnosis'."
    },
    "DisableAdvertisingId": {
        "expertDetails": "Sets 'Enabled' to 0 in 'HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo'. Disables the unique device GUID that Microsoft apps use to provide personalized retargeted advertisements across the OS.",
        "interactions": "Ads in Windows apps will still appear, but they will be generic rather than tracked to your personal Microsoft Account behavior."
    },
    "DisableAdvertisingID": { // Handle duplicate ID
        "expertDetails": "Sets 'Enabled' to 0 in 'HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo'. Disables the unique device GUID that Microsoft apps use to provide personalized retargeted advertisements across the OS.",
        "interactions": "Ads in Windows apps will still appear, but they will be generic rather than tracked to your personal Microsoft Account behavior."
    },
    "DisableLocationTracking": {
        "expertDetails": "Disables the 'lfsvc' (Geolocation Service) via 'HKLM\\SYSTEM\\CurrentControlSet\\Services' and revokes global location app permissions in 'LetAppsAccessLocation'.",
        "interactions": "Breaks automated time-zone switching and accuracy of weather/maps apps. Applications will either prompt for manual zip codes or fail to geolocate."
    },
    "DisableClipboardSync": {
        "expertDetails": "Zeroes out 'AllowCrossDeviceClipboard' in 'HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System'. Stops the 'cbdhsvc' (Clipboard User Service) from uploading your copied text and images (Win+V history) to Microsoft servers.",
        "interactions": "Does not break local clipboard history (Win+V), only the cross-device sync feature associated with your Microsoft Account."
    },
    "DisableCortana": {
        "expertDetails": "Sets 'AllowCortana' to 0 in 'HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search'. Prevents the Cortana agent from running in the background and listening for 'Hey Cortana' voice triggers. On Win11, this affects remnants of the legacy voice assistant.",
        "interactions": "Saves ~30-50MB of background RAM. No longer highly relevant on Windows 11 as Cortana is deprecated in favor of Copilot, but good for legacy cleanup."
    },
    "DisableErrorReporting": {
        "expertDetails": "Modifies 'HKLM\\SOFTWARE\\Microsoft\\Windows\\Windows Error Reporting\\Disabled' to 1. Stops WerFault.exe from intercepting application crashes to dump memory and send it to Microsoft.",
        "interactions": "Severely hampers your ability to debug BSODs or application crashes, as minidumps will no longer be reliably generated."
    },
    "DisableBingSearch": {
        "expertDetails": "Adds 'DisableSearchBoxSuggestions' to 'HKCU\\Software\\Policies\\Microsoft\\Windows\\Explorer'. This completely disconnects the Start Menu search bar from Bing, preventing your local keystrokes from being sent to Microsoft servers while searching for local files.",
        "interactions": "Massively speeds up Start Menu search results and removes 'web results' clutter. Essential for privacy."
    },
    "DisableAppSuggestions": {
        "expertDetails": "Sets 'SubscribedContent-338388Enabled' and 'SubscribedContent-338389Enabled' to 0 in the ContentDeliveryManager. Disables 'suggested apps' (Candy Crush, TikTok) from silently installing or appearing in the Start Menu.",
        "interactions": "Prevents the OS from using network bandwidth to download bloatware payload links after major feature updates."
    },
    "DisableTailoredExperiences": {
        "expertDetails": "Disables 'Tailored Experiences with diagnostic data' in 'Privacy -> Diagnostics & feedback'. Sets 'TailoredExperiencesWithDiagnosticDataEnabled' to 0. Stops Microsoft from using telemetry data to offer tips, ads, and recommendations.",
        "interactions": "General privacy tightening. Works well with 'DisableActivityHistory'."
    },
    "DisableHandwritingData": {
        "expertDetails": "Modifies 'HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\TabletPC\\PreventHandwritingDataSharing' to 1. Stops the OS from uploading your local ink strokes, typing history, and custom dictionary to Microsoft to 'improve language recognition'.",
        "interactions": "Mainly beneficial on 2-in-1 devices or tablets using a stylus. Redundant on desktop machines without touchscreens."
    },
    "DisableCameraAccess": {
        "expertDetails": "Sets 'LetAppsAccessCamera' to 2 (Force Deny) in 'HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\AppPrivacy'. Globally blocks UWP apps from accessing the webcam.",
        "interactions": "May break Teams/Zoom if they use the UWP abstraction layer; however, native Win32 apps (e.g., Discord) might still bypass this. Highly destructive if you rely on video calls."
    },
    "DisableMicrophoneAccess": {
        "expertDetails": "Sets 'LetAppsAccessMicrophone' to 2 (Force Deny). Functionally identical to the camera block but for audio input.",
        "interactions": "Breaks Voice Chat in practically all Microsoft Store games/apps. Revert this immediately if your mic 'doesn't work' in Xbox Party Chat."
    },
    "DisableBackgroundApps": {
        "expertDetails": "Sets 'LetAppsRunInBackground' to 2 in AppPrivacy policies. Prevents UWP (Universal Windows Platform) apps from running suspended background tasks (e.g. Mail syncing, Weather updating, Spotify hardware media keys).",
        "interactions": "Saves significant laptop battery life, but prevents you from receiving Mail app notifications and breaks hardware media keys for Store apps."
    },
    "DisableWiFiSense": {
        "expertDetails": "Disables AutoConnectAllowedOEM in 'WcmSvc\\wifinetworkmanager'. Prevents Windows from automatically connecting to open Wi-Fi hotspots and sharing network credentials with Outlook/Skype contacts.",
        "interactions": "Removes a major security vulnerability (credential leakage over shared networks)."
    },
    "DisableContactsAccess": {
        "expertDetails": "Globally revokes App Access to the Windows Contacts database ('LetAppsAccessContacts').",
        "interactions": "Breaks autocomplete in the native Mail and People apps."
    },
    "DisableCalendarAccess": {
        "expertDetails": "Globally revokes App Access to the Calendar.",
        "interactions": "Breaks the Taskbar calendar flyout agenda view and native Calendar app syncing."
    },
    "DisableEmailAccess": {
        "expertDetails": "Prevents UWP apps from accessing locally stored email databases.",
        "interactions": "Renders the native Windows Mail app completely inoperable until reverted."
    },
    "DisableMessagingAccess": {
        "expertDetails": "Prevents apps from reading or sending SMS/MMS messages (usually via Phone Link).",
        "interactions": "Breaks the messaging capabilities of the 'Phone Link' app."
    },
    "DisableNotificationsAccess": {
        "expertDetails": "Prevents apps from reading other apps' notifications.",
        "interactions": "Enhances privacy against malicious apps scraping notification contents (like OTPs)."
    },
    "DisableAccountInfoAccess": {
        "expertDetails": "Sets 'LetAppsAccessAccountInfo' to 2. Stops apps from reading your Microsoft Account name, picture, and domain details.",
        "interactions": "Some games downloaded from the Xbox App may fail to authenticate seamlessly if they cannot read your Xbox Live gamertag info."
    },
    "DisableOnlineSpeechRecognition": {
        "expertDetails": "Disables the cloud-based speech dictation service (Win+H) which sends your voice to Microsoft for processing.",
        "interactions": "Breaks the Win+H dictation overlay completely. Local accessibility speech recognition remains unaffected."
    },
    "DisableInputPersonalization": {
        "expertDetails": "Clears the local custom dictionary and stops Windows from locally analyzing your typing patterns to predict text.",
        "interactions": "You will lose autocorrect and text prediction across native Windows text fields."
    },
    "DisableFeedback": {
        "expertDetails": "Disables the 'Windows Feedback Experience' service and associated scheduled tasks that periodically prompt 'How likely are you to recommend Windows 10?'.",
        "interactions": "Removes a major annoyance with zero drawbacks."
    },
    "DisableAutomaticMaps": {
        "expertDetails": "Disables the 'MapsBroker' service out of 'MapsUpdateTask', stopping background downloads of offline map data.",
        "interactions": "No negative effects unless you actively use the Windows Maps app offline."
    },
    "DisableEdgeTelemetry": {
        "expertDetails": "Adds policies to 'HKLM\\SOFTWARE\\Policies\\Microsoft\\Edge' (SendSiteInfoToImproveServices, MetricsReportingEnabled) to stop the Edge browser from uploading browsing history and interaction telemetry to MS.",
        "interactions": "Works regardless of whether Edge is your primary browser, as webview2 instances are used across the OS."
    },
    "DisableTelemetryScheduledTasks": {
        "expertDetails": "Uses 'schtasks /change /disable' on various deeply embedded Microsoft scheduled tasks under '\\Microsoft\\Windows\\Customer Experience Improvement Program'. Stops the OS from waking up to compress and send telemetry logs.",
        "interactions": "Eliminates highly irritating 3 AM CPU/Disk usage spikes common on Windows 10/11."
    },
    "DisableSettingsSync": {
        "expertDetails": "Disables 'Sync your settings' via group policy. Stops Windows from uploading your wallpaper, theme, passwords, and language preferences to the cloud.",
        "interactions": "Prevents new Windows installations from automatically pulling down your previous desktop wallpaper and Wi-Fi passwords."
    },
    "DisableLocationCapabilityAccess": {
        "expertDetails": "Similar to DisableLocationTracking but explicitly targets App Privacy capability overrides.",
        "interactions": "Redundant if the location service is fully disabled."
    },
    "DisableClipboardCloudHistory": {
        "expertDetails": "Duplicate or alias for 'DisableClipboardSync'.",
        "interactions": "Redundant if clipboard sync is already stopped."
    },
    "BlockCortana": {
        "expertDetails": "Duplicate or alias for 'DisableCortana'.",
        "interactions": "Ensures Cortana is fully disabled across different feature updates."
    },
    "DisableAppLaunchTracking": {
        "expertDetails": "Stops Windows from tracking which Win32 applications you launch. Normally tracked to populate the 'Most Used' list in the Start Menu.",
        "interactions": "The 'Most Used' section in the Start Menu will be blank or freeze updating."
    },
    "DisableFeedbackFrequency": {
        "expertDetails": "Duplicate or alias for 'DisableFeedback'. Sets frequency to 'Never'.",
        "interactions": "Quietens the OS."
    },
    "DisableTypingData": {
        "expertDetails": "Duplicate or alias for 'DisableHandwritingData'.",
        "interactions": "Prevents keylogging-style data collection."
    },
    "SetDiagnosticDataMinimum": {
        "expertDetails": "Alias for 'DisableTelemetry' specifically targeting the '0' or '1' registry hex value for DiagTrack.",
        "interactions": "Requires the 'DiagTrack' service to be running to respect the flag, whereas completely disabling the service halts it entirely."
    },
    "DisablePSTelementry": {
        "expertDetails": "Sets an environment variable 'POWERSHELL_TELEMETRY_OPTOUT=1' which prevents PowerShell core from sending startup analytics to Microsoft.",
        "interactions": "Highly recommended for developers. Invisible to normal users."
    },
    "DisableCrossDeviceResume": {
        "expertDetails": "Disables the CloudStore sync mechanism that allows you to 'continue where you left off' across multiple Windows machines.",
        "interactions": "Redundancy check against Timeline and Clipboard sync limitations."
    },
    "DisableRecallAI": {
        "expertDetails": "Stops Windows 11's 'Recall' feature by terminating its associated background scanning service and disabling the group policy. Recall takes constant screenshots of the desktop to create an AI-searchable timeline.",
        "interactions": "Massive privacy and security gain. Prevents gigabytes of local SSD space from being consumed by unencrypted OCR screenshots."
    },

    // DEBLOAT
    "RemoveBloatwareApps": {
        "expertDetails": "Uses 'Get-AppxPackage | Remove-AppxPackage' via a predefined array of known junk AppX bundle IDs (e.g., Candy Crush, Disney+, McAfee, TikTok, LinkedIn). Removes them from the current user profile.",
        "interactions": "Does not remove them from 'Provisioned' packages, meaning a new user account creation might still reinstall them. See provisioning tweaks for permanent nuking."
    },
    "RemoveOneDrive": {
        "expertDetails": "Kills the 'OneDrive.exe' process, uninstalls it using '%systemroot%\\SysWOW64\\OneDriveSetup.exe /uninstall', and aggressively cleans up the Explorer namespace registry keys (CLSID {018D5C66-4533-4307-9B53-224DE2ED1FE6}) removing the folder icon from the navigation pane.",
        "interactions": "Extremely destructive if you use OneDrive for file backups. Will break Office 365 auto-save functionality."
    },
    "DisableXboxFeatures": {
        "expertDetails": "Uninstalls Xbox App, Xbox Game Bar, and disables the associated authentication and networking services (XblAuthManager, XblGameSave, XboxNetApiSvc).",
        "interactions": "Entirely breaks the ability to play PC Game Pass games or connect to Xbox Live multiplayer. Do not use if you are a PC Game Pass subscriber."
    },
    "RemoveCortanaApp": {
        "expertDetails": "Forcefully uninstalls the 'Microsoft.549981C3F5F10' (Cortana) AppX package. This is a step further than just disabling the background service.",
        "interactions": "Completely removes the Cortana icon from the Start Menu. Updates to Windows 11 normally handle this automatically now."
    },
    "Remove3DAndMixedReality": {
        "expertDetails": "Uninstalls the 'MixedReality.Portal', '3DBuilder', and 'Print3D' AppX packages, and removes the '3D Objects' folder from 'This PC' in File Explorer by deleting its namespace CLSID.",
        "interactions": "Cleans up File Explorer significantly. No downsides unless you own a Windows Mixed Reality headset."
    },
    "DisableWidgets": {
        "expertDetails": "Disables the 'TaskbarDa' feature (Windows 11 Widgets board) via Group Policy ('Dsh\\AllowNewsAndInterests'). Kills the associated 'msedgewebview2' processes that render the widgets.",
        "interactions": "Frees up ~150-300MB of RAM and removes the distracting weather icon/news feed from the left side of the Windows 11 taskbar."
    },
    "DisableTeamsAutostart": {
        "expertDetails": "Removes the 'Teams' string from 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run' and disables the built-in Windows 11 'Chat' icon from the taskbar ('TaskbarMn').",
        "interactions": "Speeds up login times heavily. You can still manually open Teams, but it won't force-load into the system tray on boot."
    },
    "DisableCopilot": {
        "expertDetails": "Sets 'TurnOffWindowsCopilot' to 1 in 'HKCU\\Software\\Policies\\Microsoft\\Windows\\WindowsCopilot'. This disables the centralized AI assistant, completely removing the Copilot icon from the taskbar and Win+C shortcut.",
        "interactions": "Removes aggressive AI integrations. Win+C will no longer do anything."
    },
    "DisableSearchHighlights": {
        "expertDetails": "Disables the daily rotating images and 'fun facts' (Search Highlights) inside the Start Menu search interface by disabling the 'DynamicSearchBoxEnabled' DWORD.",
        "interactions": "Makes the Start menu search UI completely blank and sterile, exactly like older robust versions of Windows."
    },
    "DisablePhoneLink": {
        "expertDetails": "Uninstalls the 'Microsoft.YourPhone' AppX package. This app constantly runs a background suspended process to listen for Bluetooth beacons from paired phones.",
        "interactions": "Completely breaks the ability to mirror Android notifications, SMS, or calls to your PC."
    },
    "DisableStartMenuSuggestions": {
        "expertDetails": "Disables 'ShowRecommendations' in the Windows 11 Start Menu, pushing the 'Recommended' section down and trying to force it to show solely pinned apps.",
        "interactions": "On Windows 11, this leaves a large blank empty space in the Start Menu unless you also use a third-party tool like StartAllBack to modify the UI."
    },
    "DisableLockScreenAdsSpotlight": {
        "expertDetails": "Switches the lock screen from 'Windows Spotlight' (which downloads high-res images and ads from Bing) to 'Picture' mode, and disables the underlying ContentDeliveryManager tasks.",
        "interactions": "Your lock screen will statically display a single image forever, without rotating or showing tooltip facts."
    },
    "DisableMeetNow": {
        "expertDetails": "Hides the 'Meet Now' (Skype integration) button from the Windows 10 system tray via 'HideSCAMeetNow' registry DWORD.",
        "interactions": "Purely cosmetic UI cleanup."
    },
    "DisableEdgePrelaunch": {
        "expertDetails": "Modifies 'TabPreloader' and 'Prelaunch' keys in Edge policies to prevent Microsoft Edge from silently launching invisible processes on boot to make the browser launch 'faster' when clicked.",
        "interactions": "Saves around 40-60MB of RAM on boot. Edge will take ~0.5s longer to open visually the first time."
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
console.log('Modified', modified, 'tweaks in batch 2.');
