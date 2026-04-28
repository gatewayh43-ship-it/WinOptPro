; WinOpt Pro Custom NSIS Installer Script
; Requires NSIS 3.x with NSD (NSIS Dialog Designer) plugin support
; Tauri calls this script during `tauri build`

!include "MUI2.nsh"
!include "WinVer.nsh"
!include "LogicLib.nsh"
!include "x64.nsh"

; ── Application info ─────────────────────────────────────────────────────────
!define APPNAME "WinOpt Pro"
!define APPVERSION "1.0.0"
!define PUBLISHER "[YOUR COMPANY NAME]"
!define WEBSITE "[YOUR WEBSITE URL]"
!define SUPPORT_EMAIL "[SUPPORT EMAIL]"
!define UNINSTALL_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}"
!define INSTALL_REG_KEY "Software\WinOpt Pro"

; Ollama download URLs (AMD64 and ARM64)
!define OLLAMA_URL_AMD64 "https://ollama.com/download/ollama-windows-amd64.exe"
!define OLLAMA_URL_ARM64 "https://ollama.com/download/ollama-windows-arm64.exe"

; ── MUI Settings ─────────────────────────────────────────────────────────────
!define MUI_ABORTWARNING
!define MUI_ICON "..\icons\icon.ico"
!define MUI_UNICON "..\icons\icon.ico"
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_BITMAP "header.bmp"
!define MUI_WELCOMEFINISHPAGE_BITMAP "sidebar.bmp"
!define MUI_FINISHPAGE_RUN "$INSTDIR\${APPNAME}.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Launch ${APPNAME}"

; Variables
Var AI_SELECTED
Var AI_MODEL_SELECTED
Var HW_RAM_GB
Var HW_VRAM_GB
Var HW_GPU_NAME
Var HW_CPU_CORES

; ── Pages ────────────────────────────────────────────────────────────────────
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "..\..\docs\EULA.md"
Page custom PrivacyPolicyPage PrivacyPolicyLeave
!insertmacro MUI_PAGE_DIRECTORY
Page custom ComponentsPage ComponentsLeave
Page custom AISetupPage AISetupLeave
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "English"

; ── Installer initialization ──────────────────────────────────────────────────
Function .onInit
    ; Minimum OS check: Windows 10 required
    ${IfNot} ${AtLeastWin10}
        MessageBox MB_OK|MB_ICONSTOP "WinOpt Pro requires Windows 10 version 1803 or later."
        Quit
    ${EndIf}

    ; 64-bit OS check
    ${IfNot} ${RunningX64}
        MessageBox MB_OK|MB_ICONSTOP "WinOpt Pro requires a 64-bit version of Windows."
        Quit
    ${EndIf}

    StrCpy $AI_SELECTED "0"
    StrCpy $AI_MODEL_SELECTED "qwen2.5:1.5b"
    StrCpy $HW_RAM_GB "0"
    StrCpy $HW_VRAM_GB "0"
    StrCpy $HW_GPU_NAME "Unknown"
    StrCpy $HW_CPU_CORES "4"
FunctionEnd

; ── Privacy Policy Page ───────────────────────────────────────────────────────
Var PrivacyCheckbox
Var PrivacyNextBtn

Function PrivacyPolicyPage
    nsDialogs::Create 1018
    Pop $0

    ${NSD_CreateLabel} 0 0 100% 20u "Privacy Policy"
    ${NSD_CreateLabel} 0 25u 100% 30u "WinOpt Pro stores all data locally on your device. No telemetry or analytics are collected. The AI Assistant (if enabled) runs entirely offline."
    ${NSD_CreateLabel} 0 60u 100% 60u "• All optimization history stored locally$\n• No data sent to external servers$\n• Update checker contacts GitHub only (optional, can be disabled)$\n• AI prompts never leave your device"
    ${NSD_CreateCheckBox} 0 125u 100% 12u "I understand how WinOpt Pro handles my data"
    Pop $PrivacyCheckbox

    GetDlgItem $PrivacyNextBtn $HWNDPARENT 1
    EnableWindow $PrivacyNextBtn 0

    ${NSD_OnClick} $PrivacyCheckbox PrivacyCheckToggle
    nsDialogs::Show
FunctionEnd

Function PrivacyCheckToggle
    ${NSD_GetState} $PrivacyCheckbox $0
    ${If} $0 == ${BST_CHECKED}
        GetDlgItem $PrivacyNextBtn $HWNDPARENT 1
        EnableWindow $PrivacyNextBtn 1
    ${Else}
        GetDlgItem $PrivacyNextBtn $HWNDPARENT 1
        EnableWindow $PrivacyNextBtn 0
    ${EndIf}
FunctionEnd

Function PrivacyPolicyLeave
    ${NSD_GetState} $PrivacyCheckbox $0
    ${If} $0 != ${BST_CHECKED}
        MessageBox MB_OK "You must acknowledge the Privacy Policy to continue."
        Abort
    ${EndIf}
FunctionEnd

; ── Components Page ───────────────────────────────────────────────────────────
Var CompCoreCheck
Var CompDesktopCheck
Var CompStartMenuCheck
Var CompStartupCheck
Var CompAICheck

Function ComponentsPage
    nsDialogs::Create 1018
    Pop $0

    ${NSD_CreateLabel} 0 0 100% 12u "Select components to install:"
    ${NSD_CreateCheckBox} 0 18u 100% 12u "WinOpt Pro Core Application (required)"
    Pop $CompCoreCheck
    ${NSD_Check} $CompCoreCheck
    EnableWindow $CompCoreCheck 0

    ${NSD_CreateCheckBox} 0 35u 100% 12u "Create Desktop Shortcut"
    Pop $CompDesktopCheck
    ${NSD_Check} $CompDesktopCheck

    ${NSD_CreateCheckBox} 0 52u 100% 12u "Create Start Menu Folder"
    Pop $CompStartMenuCheck
    ${NSD_Check} $CompStartMenuCheck

    ${NSD_CreateCheckBox} 0 69u 100% 12u "Launch WinOpt Pro on Windows Startup"
    Pop $CompStartupCheck

    IntCmp $HW_RAM_GB 4 ai_ok ai_disabled ai_ok
    ai_disabled:
        ${NSD_CreateCheckBox} 0 90u 100% 12u "AI Assistant / Ollama (~1.5GB+ download) — Requires 4GB RAM (your PC: $HW_RAM_GB GB)"
        Pop $CompAICheck
        EnableWindow $CompAICheck 0
        Goto ai_done
    ai_ok:
        ${NSD_CreateCheckBox} 0 90u 100% 12u "AI Assistant / Ollama (~1.5GB+ download) — Local AI, runs offline"
        Pop $CompAICheck
    ai_done:

    nsDialogs::Show
FunctionEnd

Function ComponentsLeave
    ${NSD_GetState} $CompAICheck $AI_SELECTED
    ${If} $AI_SELECTED == ${BST_CHECKED}
        StrCpy $AI_SELECTED "1"
    ${Else}
        StrCpy $AI_SELECTED "0"
    ${EndIf}
FunctionEnd

; ── Hardware Detection ────────────────────────────────────────────────────────
Function DetectHardware
    nsExec::ExecToStack /TIMEOUT=5000 'powershell -ExecutionPolicy Bypass -File "$EXEDIR\winopt-hardware-check.ps1"'
    Pop $1
    Pop $2

    ${If} $1 == 0
        ${StrLoc} $3 $2 "|" ">"
        StrCpy $HW_RAM_GB $2 $3
    ${Else}
        StrCpy $HW_RAM_GB "0"
        StrCpy $HW_VRAM_GB "0"
        StrCpy $HW_GPU_NAME "Unknown (detection failed)"
    ${EndIf}
FunctionEnd

; ── AI Model Setup Page ───────────────────────────────────────────────────────
Var AIModelLabel
Var AIModelRadio_05b
Var AIModelRadio_15b
Var AIModelRadio_1b
Var AIModelRadio_3b
Var AIModelRadio_7b
Var AIModelRadio_14b
Var AIWarnLabel

Function AISetupPage
    ${If} $AI_SELECTED != "1"
        Abort
    ${EndIf}

    Call DetectHardware

    nsDialogs::Create 1018
    Pop $0

    ${NSD_CreateLabel} 0 0 100% 24u "Select an AI model. Models are downloaded after installation.$\nYour PC: RAM: $HW_RAM_GB GB  |  GPU: $HW_GPU_NAME  |  VRAM: $HW_VRAM_GB GB"
    Pop $AIModelLabel

    ${NSD_CreateRadioButton} 0 30u 100% 10u "Qwen 2.5 0.5B  (~400MB)  [Any PC — 2GB RAM minimum]"
    Pop $AIModelRadio_05b
    IntCmp $HW_RAM_GB 2 r05_ok r05_dis r05_ok
    r05_dis: EnableWindow $AIModelRadio_05b 0
    r05_ok:

    ${NSD_CreateRadioButton} 0 44u 100% 10u "Qwen 2.5 1.5B  (~1GB)  [Low End — 4GB RAM minimum]  <- Recommended"
    Pop $AIModelRadio_15b
    IntCmp $HW_RAM_GB 4 r15_ok r15_dis r15_ok
    r15_dis: EnableWindow $AIModelRadio_15b 0
    r15_ok:

    ${NSD_CreateRadioButton} 0 58u 100% 10u "Llama 3.2 1B  (~1.3GB)  [Low End — 4GB RAM minimum]"
    Pop $AIModelRadio_1b
    IntCmp $HW_RAM_GB 4 r1b_ok r1b_dis r1b_ok
    r1b_dis: EnableWindow $AIModelRadio_1b 0
    r1b_ok:

    ${NSD_CreateRadioButton} 0 72u 100% 10u "Qwen 2.5 3B  (~2GB)  [Mid Range — 6GB RAM or 4GB VRAM]"
    Pop $AIModelRadio_3b
    IntCmp $HW_RAM_GB 6 r3b_ok r3b_vram r3b_ok
    r3b_vram: IntCmp $HW_VRAM_GB 4 r3b_ok r3b_dis r3b_ok
    r3b_dis: EnableWindow $AIModelRadio_3b 0
    r3b_ok:

    ${NSD_CreateRadioButton} 0 86u 100% 10u "Qwen 2.5 7B  (~4.5GB)  [Mid Range — 8GB RAM or 6GB VRAM]"
    Pop $AIModelRadio_7b
    IntCmp $HW_RAM_GB 8 r7b_ok r7b_vram r7b_ok
    r7b_vram: IntCmp $HW_VRAM_GB 6 r7b_ok r7b_dis r7b_ok
    r7b_dis: EnableWindow $AIModelRadio_7b 0
    r7b_ok:

    ${NSD_CreateRadioButton} 0 100u 100% 10u "Qwen 2.5 14B  (~9GB)  [High End — 16GB RAM or 8GB VRAM]"
    Pop $AIModelRadio_14b
    IntCmp $HW_RAM_GB 16 r14b_ok r14b_vram r14b_ok
    r14b_vram: IntCmp $HW_VRAM_GB 8 r14b_ok r14b_dis r14b_ok
    r14b_dis: EnableWindow $AIModelRadio_14b 0
    r14b_ok:

    IntCmp $HW_RAM_GB 16 sel14 chk8 sel14
    chk8: IntCmp $HW_RAM_GB 8 sel7 chk6 sel7
    chk6: IntCmp $HW_RAM_GB 6 sel3 chk4 sel3
    chk4: IntCmp $HW_RAM_GB 4 sel15 selany selany
    sel14: ${NSD_Check} $AIModelRadio_14b  Goto seldone
    sel7:  ${NSD_Check} $AIModelRadio_7b   Goto seldone
    sel3:  ${NSD_Check} $AIModelRadio_3b   Goto seldone
    sel15: ${NSD_Check} $AIModelRadio_15b  Goto seldone
    selany: ${NSD_Check} $AIModelRadio_05b
    seldone:

    ${If} $HW_RAM_GB == "0"
        ${NSD_CreateLabel} 0 116u 100% 16u "Hardware detection failed. All models shown — select based on your PC specs."
        Pop $AIWarnLabel
    ${EndIf}

    ${NSD_CreateLabel} 0 135u 100% 12u 'Click "Skip" to set up AI later in Settings.'

    nsDialogs::Show
FunctionEnd

Function AISetupLeave
    ${NSD_GetState} $AIModelRadio_14b $0
    ${If} $0 == ${BST_CHECKED}
        StrCpy $AI_MODEL_SELECTED "qwen2.5:14b"
        Goto ai_model_done
    ${EndIf}
    ${NSD_GetState} $AIModelRadio_7b $0
    ${If} $0 == ${BST_CHECKED}
        StrCpy $AI_MODEL_SELECTED "qwen2.5:7b"
        Goto ai_model_done
    ${EndIf}
    ${NSD_GetState} $AIModelRadio_3b $0
    ${If} $0 == ${BST_CHECKED}
        StrCpy $AI_MODEL_SELECTED "qwen2.5:3b"
        Goto ai_model_done
    ${EndIf}
    ${NSD_GetState} $AIModelRadio_1b $0
    ${If} $0 == ${BST_CHECKED}
        StrCpy $AI_MODEL_SELECTED "llama3.2:1b"
        Goto ai_model_done
    ${EndIf}
    ${NSD_GetState} $AIModelRadio_05b $0
    ${If} $0 == ${BST_CHECKED}
        StrCpy $AI_MODEL_SELECTED "qwen2.5:0.5b"
        Goto ai_model_done
    ${EndIf}
    StrCpy $AI_MODEL_SELECTED "qwen2.5:1.5b"
    ai_model_done:
FunctionEnd

; ── Main install section ───────────────────────────────────────────────────────
Section "WinOpt Pro Core" SecCore
    SectionIn RO

    SetOutPath "$INSTDIR"
    File /r "${EXEDIR}\*.*"

    WriteRegStr HKLM "${UNINSTALL_KEY}" "DisplayName" "${APPNAME}"
    WriteRegStr HKLM "${UNINSTALL_KEY}" "DisplayVersion" "${APPVERSION}"
    WriteRegStr HKLM "${UNINSTALL_KEY}" "Publisher" "${PUBLISHER}"
    WriteRegStr HKLM "${UNINSTALL_KEY}" "URLInfoAbout" "${WEBSITE}"
    WriteRegStr HKLM "${UNINSTALL_KEY}" "URLUpdateInfo" "${WEBSITE}"
    WriteRegStr HKLM "${UNINSTALL_KEY}" "UninstallString" '"$INSTDIR\Uninstall.exe"'
    WriteRegStr HKLM "${UNINSTALL_KEY}" "DisplayIcon" "$INSTDIR\${APPNAME}.exe"
    WriteRegDWORD HKLM "${UNINSTALL_KEY}" "NoModify" 1
    WriteRegDWORD HKLM "${UNINSTALL_KEY}" "NoRepair" 1

    WriteRegStr HKCR ".winopt" "" "WinOptBackup"
    WriteRegStr HKCR "WinOptBackup" "" "WinOpt Pro Backup File"
    WriteRegStr HKCR "WinOptBackup\DefaultIcon" "" "$INSTDIR\${APPNAME}.exe,0"
    WriteRegStr HKCR "WinOptBackup\shell\open\command" "" '"$INSTDIR\${APPNAME}.exe" "%1"'

    ${If} $AI_SELECTED == "1"
        WriteRegStr HKCU "${INSTALL_REG_KEY}" "SelectedAIModel" "$AI_MODEL_SELECTED"
    ${EndIf}

    WriteUninstaller "$INSTDIR\Uninstall.exe"
SectionEnd

Section "Desktop Shortcut"
    ${NSD_GetState} $CompDesktopCheck $0
    ${If} $0 == ${BST_CHECKED}
        CreateShortcut "$DESKTOP\${APPNAME}.lnk" "$INSTDIR\${APPNAME}.exe"
    ${EndIf}
SectionEnd

Section "Start Menu"
    ${NSD_GetState} $CompStartMenuCheck $0
    ${If} $0 == ${BST_CHECKED}
        CreateDirectory "$SMPROGRAMS\${APPNAME}"
        CreateShortcut "$SMPROGRAMS\${APPNAME}\${APPNAME}.lnk" "$INSTDIR\${APPNAME}.exe"
        CreateShortcut "$SMPROGRAMS\${APPNAME}\Uninstall.lnk" "$INSTDIR\Uninstall.exe"
    ${EndIf}
SectionEnd

Section "Ollama AI Download" SecAI
    ${If} $AI_SELECTED != "1"
        Goto ai_skip
    ${EndIf}

    IfFileExists "$LOCALAPPDATA\Programs\Ollama\ollama.exe" ollama_exists ollama_download

    ollama_exists:
        DetailPrint "Ollama detected — using existing installation"
        Goto ai_skip

    ollama_download:
        DetailPrint "Downloading Ollama..."
        GetTempFileName $0
        StrCpy $0 "$0.exe"

        ${If} ${IsNativeAMD64}
            NSISdl::download "${OLLAMA_URL_AMD64}" "$0"
        ${Else}
            NSISdl::download "${OLLAMA_URL_ARM64}" "$0"
        ${EndIf}
        Pop $1

        ${If} $1 != "success"
            MessageBox MB_OK|MB_ICONEXCLAMATION "Ollama download failed: $1$\nYou can install Ollama manually from https://ollama.com and set up AI in Settings."
            Goto ai_skip
        ${EndIf}

        DetailPrint "Installing Ollama silently..."
        ExecWait '"$0" /S'
        Delete "$0"

    ai_skip:
SectionEnd

; ── Uninstaller ────────────────────────────────────────────────────────────────
Section "Uninstall"
    RMDir /r "$INSTDIR"
    Delete "$DESKTOP\${APPNAME}.lnk"
    RMDir /r "$SMPROGRAMS\${APPNAME}"

    DeleteRegKey HKLM "${UNINSTALL_KEY}"
    DeleteRegKey HKCU "${INSTALL_REG_KEY}"
    DeleteRegKey HKCR ".winopt"
    DeleteRegKey HKCR "WinOptBackup"
SectionEnd
