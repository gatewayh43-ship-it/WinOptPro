# Legal Pre-Release Checklist — WinOpt Pro

Use this checklist before any public release. Items marked **BLOCKER** must be resolved before distribution.

---

## EULA Metadata

- [x] Publisher set to `WinOpt Pro Team`
- [x] Effective date set to `April 27, 2026`
- [x] Contact set to `support@winoptpro.app`
- [x] Website set to `https://github.com/ronxldwilson/WinOpt`
- [x] Values are consistently configured across local release documents.
- [ ] Owner-only: confirm these values match the actual legal publishing entity before public distribution.

---

## Privacy Policy Metadata

- [x] Effective date set to `April 27, 2026`
- [x] Contact set to `support@winoptpro.app`
- [x] Website set to `https://github.com/ronxldwilson/WinOpt`
- [x] Values are consistently configured across local release documents.
- [ ] Owner-only: confirm these values match the actual legal publishing entity before public distribution.

---

## LICENSE File

- [x] Copyright holder set to `WinOpt Pro Team`
- [x] Confirm the copyright year is set to `2026` for this release.

---

## Microsoft Store — Partner Center

- [ ] Register at **https://partner.microsoft.com/** (one-time developer account fee: **$19 USD** for individuals, $99 USD for companies)
- [ ] Complete identity verification (may require government ID for individual accounts)
- [ ] Note your **Publisher CN** (e.g., `CN=Your Name, O=Your Company, ...`) — this is required in `src-tauri/tauri.conf.json` under the MSIX bundle publisher field
- [ ] Update `tauri.conf.json` `bundle > windows > certificateThumbprint` or `publisherName` with your Store publisher identity
- [ ] Submit the app for Store certification (allow 1–3 business days for review)
- [ ] Ensure your Privacy Policy is hosted at a permanent public URL before Store submission — Microsoft requires this during the submission process

---

## Tauri Updater Keypair

- [x] Generate the signing keypair for Tauri's built-in updater
- [ ] Store the **private key** securely in GitHub Actions Secrets as `TAURI_SIGNING_PRIVATE_KEY`
- [ ] Store the **private key password** (if set) as `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
- [x] Add the **public key** to `tauri.conf.json` under `plugins > updater > pubkey`
- [ ] Never commit the private key to the repository

---

## Post-Release Checklist

Complete these items after your first public release:

- [ ] **Host Privacy Policy at a permanent URL** — required for Microsoft Store, GDPR, and CCPA compliance
- [ ] **Host EULA at a permanent URL** — recommended for Microsoft Store and legal defensibility
- [ ] **Set up a support email inbox** and confirm it is monitored
- [ ] **Review and update the Privacy Policy** whenever you add new features that change data handling (e.g., adding cloud sync, analytics, or new third-party services)
- [ ] **Review and update the EULA** for any major new distribution channels or licensing model changes
- [ ] If distributing in the EU: verify GDPR compliance, confirm no personal data flows to non-adequate countries, and consider whether a Data Processing Agreement (DPA) is needed with any sub-processors
- [ ] If distributing in California: confirm CCPA "Do Not Sell" disclosures are current (Section 9 of Privacy Policy)

---

## Notes

- This checklist is provided for informational purposes and does not constitute legal advice. Consult a qualified attorney for GDPR compliance or any jurisdiction-specific requirements.
