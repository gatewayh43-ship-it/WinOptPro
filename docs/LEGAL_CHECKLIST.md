# Legal Pre-Release Checklist — WinOpt Pro

Use this checklist before any public release. Items marked **BLOCKER** must be resolved before distribution.

---

## BLOCKER: EAR / ENC Export Compliance Filing

> **This is a legal obligation under U.S. law. Do not skip.**

WinOpt Pro incorporates AES-256-GCM encryption and is therefore classified under the U.S. Export Administration Regulations (EAR) as **ECCN 5E002** ("technology for the development or production of encryption commodities or software").

To distribute this software publicly (GitHub, Microsoft Store, direct download) under **License Exception ENC** (15 CFR §740.17(b)(1) — mass-market encryption software), you are **legally required** to complete the following before your first public release:

### Required Filings

- [ ] **Self-Classification Report to BIS**
  File at the Simplified Network Application Process Redesign (SNAPR) portal:
  **https://snapr.bis.doc.gov/**
  - Select "SNAP-R" > "Submit Classification Request" > choose "License Exception ENC"
  - Report your product name, version, encryption specifications (AES-256-GCM), and distribution channels
  - This filing must be renewed **annually**

- [ ] **Notification to NSA**
  Send a copy of your ENC self-classification notification to:
  **enc@nsa.gov**
  - Include product name, version, encryption algorithm and key length, and intended distribution
  - This is required simultaneously with the BIS filing

- [ ] **Confirm License Exception ENC eligibility**
  ENC exception (b)(1) covers mass-market software with encryption ≤ 56 bits OR software that meets the "publicly available" criteria. For AES-256, you must confirm your product qualifies as mass-market or meets an alternate applicable exception. Consult a U.S. export control attorney if uncertain.

- [ ] **Document your EAR compliance** — keep records of all filings for at least 5 years (EAR recordkeeping requirement)

**Reference:** 15 CFR Part 740.17 (License Exception ENC), Bureau of Industry and Security: https://www.bis.doc.gov/index.php/policy-guidance/encryption

---

## EULA Placeholders to Fill

Replace all of the following literal placeholder strings in `docs/EULA.md` before publishing:

- [ ] `[AUTHOR_NAME]` — Your full legal name (individual) or authorized signatory name
- [ ] `[COMPANY_NAME]` — Your registered business/entity name, or "N/A" if sole individual
- [ ] `[DATE]` — Effective date of the EULA (e.g., "March 22, 2026")
- [ ] `[GOVERNING_LAW_JURISDICTION]` — The state/country whose law governs disputes (e.g., "the State of California, United States")
- [ ] `[CONTACT_EMAIL]` — Your support/legal contact email address
- [ ] `[WEBSITE_URL]` — Your public website URL (e.g., "https://winoptpro.com")

After filling placeholders, do a final search for any remaining `[` characters in the document to confirm none were missed.

---

## Privacy Policy Placeholders to Fill

Replace all of the following literal placeholder strings in `docs/PRIVACY_POLICY.md` before publishing:

- [ ] `[DATE]` — Effective date of the Privacy Policy (e.g., "March 22, 2026")
- [ ] `[CONTACT_EMAIL]` — Privacy contact email (may be the same as EULA contact)
- [ ] `[WEBSITE_URL]` — Public URL where the policy will be permanently hosted

After filling placeholders, do a final search for any remaining `[` characters in the document to confirm none were missed.

---

## LICENSE File

- [ ] Replace `[AUTHOR NAME]` in `LICENSE` with your full legal name or entity name
- [ ] Confirm the copyright year (currently `2026`) is correct

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

- [ ] Generate the signing keypair for Tauri's built-in updater:
  ```bash
  npx tauri signer generate -w ~/.tauri/winopt-pro.key
  ```
- [ ] Store the **private key** (`.key` file) securely in GitHub Actions Secrets as `TAURI_PRIVATE_KEY`
- [ ] Store the **private key password** (if set) as `TAURI_KEY_PASSWORD`
- [ ] Add the **public key** to `tauri.conf.json` under `plugins > updater > pubkey`
- [ ] Never commit the private key to the repository

---

## Post-Release Checklist

Complete these items after your first public release:

- [ ] **Host Privacy Policy at a permanent URL** (e.g., `[WEBSITE_URL]/privacy`) — required for Microsoft Store, GDPR, and CCPA compliance
- [ ] **Host EULA at a permanent URL** (e.g., `[WEBSITE_URL]/eula`) — recommended for Microsoft Store and legal defensibility
- [ ] **Set up a support email inbox** at `[CONTACT_EMAIL]` and confirm it is monitored
- [ ] **Schedule annual ENC filing renewal** with BIS (SNAPR portal) — set a calendar reminder for the same month next year
- [ ] **Re-file ENC notification** with enc@nsa.gov if you release a new major version with changed encryption features
- [ ] **Review and update the Privacy Policy** whenever you add new features that change data handling (e.g., adding cloud sync, analytics, or new third-party services)
- [ ] **Review and update the EULA** for any major new distribution channels or licensing model changes
- [ ] If distributing in the EU: verify GDPR compliance, confirm no personal data flows to non-adequate countries, and consider whether a Data Processing Agreement (DPA) is needed with any sub-processors
- [ ] If distributing in California: confirm CCPA "Do Not Sell" disclosures are current (Section 9 of Privacy Policy)

---

## Notes

- This checklist is provided for informational purposes and does not constitute legal advice. Consult a qualified attorney for export control compliance, GDPR compliance, or any jurisdiction-specific requirements.
- The EAR filing obligation applies regardless of whether the encryption source code is open-source or the software is free. Public availability does not exempt you from the annual self-classification requirement.
