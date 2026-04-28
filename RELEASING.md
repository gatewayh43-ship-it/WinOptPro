# Releasing WinOpt Pro

Use this checklist for every public release.

## One-Time Setup

1. Confirm the publisher metadata in `src-tauri/Cargo.toml`, `LICENSE`, `docs/EULA.md`, and `docs/PRIVACY_POLICY.md`.
2. Move the local updater private key from `.secrets/tauri-updater.key` into GitHub Actions secret `TAURI_SIGNING_PRIVATE_KEY`.
3. If you rotate the updater key, update `plugins.updater.pubkey` in `src-tauri/tauri.conf.json`.
4. Configure Windows Authenticode signing for the release environment before distributing installers.
5. Confirm the release endpoint in `src-tauri/tauri.conf.json` points at the repository that will publish `latest.json`.

## Pre-Tag Checks

```bash
npm ci
npm test
npm run build
cd src-tauri
cargo test
cargo check
cd ..
npx tauri build --no-bundle
```

## Release

1. Update versions in `package.json`, `src-tauri/Cargo.toml`, and `src-tauri/tauri.conf.json`.
2. Update `CHANGELOG.md`.
3. Include a release note for unsigned early builds: this is an early build, and Windows may show SmartScreen or publisher warnings until Authenticode signing is configured.
4. Commit the release changes.
5. Tag with `vX.Y.Z`.
6. Push the tag to trigger `.github/workflows/release.yml`.

## Post-Release Verification

1. Download the generated installer from GitHub Releases.
2. For unsigned early builds, confirm Windows shows the expected unsigned-publisher warning and document it in the release notes.
3. Verify `latest.json` is attached to the release.
4. Install the previous version and confirm the updater sees and installs the new version.
