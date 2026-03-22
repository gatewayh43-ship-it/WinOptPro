# Steam Distribution — Setup Guide (v1.1.0)

Steam integration is planned for v1.1.0. This document describes the steps.

## Registration
1. Register at https://partner.steamgames.com ($100 one-time app fee)
2. Create your app listing and obtain an App ID
3. Replace the placeholder in `steam_appid.txt` with your real App ID

## SDK Integration (v1.1.0 sprint)
Add `steamworks-rs` crate to Cargo.toml:
- GitHub: https://github.com/nickel-lang/steamworks-rs
- Call `steamworks::Client::init()` at startup
- Handle `SteamAPI_Init()` failure gracefully (non-Steam launches should still work)

## Depot Configuration
- Set up a depot in Steamworks for the Windows x64 build
- Upload `src-tauri/target/release/WinOpt Pro.exe` and dependencies
- Configure launch options pointing to the exe

## DRM
- Steamworks provides optional DRM via SteamStub
- For an optimizer app, light or no DRM is recommended
