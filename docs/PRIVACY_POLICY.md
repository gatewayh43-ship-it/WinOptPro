# Privacy Policy

**WinOpt Pro**
**Last Updated:** [DATE]
**Contact:** [CONTACT_EMAIL]
**Website:** [WEBSITE_URL]

---

## Summary

WinOpt Pro is built on a privacy-first principle: **all data stays on your machine.** We do not operate any servers, cloud infrastructure, or telemetry pipelines. We do not collect, transmit, sell, or share your personal information. This policy explains in detail what data is created locally, how it is stored, and what limited network activity occurs (such as checking for updates).

---

## 1. Information We Collect

### What We Store Locally

WinOpt Pro stores the following data **exclusively on your local device**:

| Data Type | Location | Purpose |
|---|---|---|
| System configuration snapshots | Encrypted local SQLite database | Record of system state before and after optimization |
| Optimization history and audit log | Encrypted local SQLite database (AES-256-GCM) | Allows you to review and revert past changes |
| App settings and preferences | Browser localStorage (within Tauri WebView) | Persists your UI preferences across sessions |
| Scheduled task configuration | Local SQLite database | Stores any maintenance tasks you configure |

### What We Do NOT Collect

WinOpt Pro does **not** collect, transmit, or store any of the following:

- Your name, email address, or any personally identifiable information
- Keystrokes, clipboard contents, or browsing history
- Usage analytics, crash telemetry, or error reports sent to any remote server
- Hardware identifiers transmitted externally (a local hardware ID is derived only for encryption key derivation and never leaves your device)
- Financial information or payment details (payment is processed by GitHub Sponsors or Microsoft; we never see your payment details)
- Location data

---

## 2. Local AI Assistant (Ollama)

WinOpt Pro includes an optional AI Assistant feature powered by **Ollama**, a locally-running AI model runtime.

- **All AI processing is local.** When you interact with the AI Assistant, your prompts and the model's responses are processed entirely on your device by the Ollama runtime. No prompt text, response text, or context is transmitted to any external AI service, cloud API, or third-party server.
- **Model downloads.** If you choose to download an AI model via the AI Assistant setup, Ollama will connect to its model registry to retrieve the model files. This connection is initiated by you explicitly and may expose your IP address to Ollama's infrastructure. Once downloaded, the model runs entirely offline.
- **No external AI provider.** WinOpt Pro does not use OpenAI, Anthropic, Google, Microsoft Azure AI, or any other external AI service.

---

## 3. Update Checker

WinOpt Pro includes an optional automatic update checker.

- **When enabled**, the application periodically contacts the GitHub Releases API at `https://api.github.com/repos/` to check whether a newer version of WinOpt Pro is available. This request may expose your IP address to GitHub, Inc. and is subject to GitHub's Privacy Policy (https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement).
- **No personal data is sent** in this request. Only the version number of your installed application is compared against the latest published release.
- **You can disable the update checker** at any time in WinOpt Pro Settings > Updates. When disabled, no network requests related to updates are made.

---

## 4. Third-Party Services

WinOpt Pro's interactions with third-party services are limited to:

| Service | Purpose | When It Occurs | Their Privacy Policy |
|---|---|---|---|
| GitHub, Inc. | Version update check | Only when Update Checker is enabled and running | https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement |
| Ollama | Local AI model download | Only when you explicitly initiate a model download | https://ollama.com/privacy |

We have no relationship with any advertising networks, analytics providers, data brokers, or tracking services. No such third parties receive any data about your use of WinOpt Pro.

---

## 5. Data Storage and Security

### Local Encryption

Sensitive data stored in WinOpt Pro's local SQLite database — including the optimization audit log, executed command records, and associated output — is encrypted at the field level using **AES-256-GCM** symmetric encryption. The encryption key is derived from your machine's unique hardware identifier (Windows `MachineGuid`) using SHA-256 and never leaves your device.

### No Cloud Sync

WinOpt Pro does not sync any data to cloud storage services. There is no WinOpt Pro account, no cloud backup of your data, and no remote access to your optimization history.

### Data Location

All application data is stored within the standard Tauri application data directory on your Windows machine (typically `%APPDATA%\com.winopt.pro\` or similar). You have full filesystem access to this directory.

---

## 6. User Rights

You have full control over all data WinOpt Pro stores on your device:

- **Access and Export:** Use **Settings > Backup & Restore > Export All Data** to receive a complete JSON export of all locally stored application data, including your optimization history, settings, and scheduled tasks.
- **Deletion:** Use **Settings > Backup & Restore > Clear All App Data** to permanently delete all locally stored application data. This action is irreversible.
- **Portability:** Exported data is provided in standard JSON format, which can be read with any text editor or parsed programmatically.

Because WinOpt Pro stores no data on any server, there is no remote data to request deletion of from us.

---

## 7. Data Retention

WinOpt Pro retains locally stored data indefinitely until you choose to delete it. There is no automatic expiration or deletion of your optimization history, settings, or audit log. You control your data entirely.

---

## 8. Your Rights Under GDPR (European Economic Area, UK, and Switzerland)

If you are located in the European Economic Area (EEA), the United Kingdom, or Switzerland, you may have the following rights under the General Data Protection Regulation (GDPR) or equivalent legislation:

- **Right of Access:** You have the right to request confirmation of whether we process personal data about you and, if so, to receive a copy of that data. Because all WinOpt Pro data is stored locally on your device, you can access it directly at any time via the Export feature described in Section 6.
- **Right to Rectification:** You have the right to have inaccurate personal data corrected.
- **Right to Erasure ("Right to be Forgotten"):** You have the right to request deletion of your personal data. Use the Clear All App Data feature (Section 6) to exercise this right locally.
- **Right to Data Portability:** You have the right to receive your data in a structured, commonly used, machine-readable format (JSON export, Section 6).
- **Right to Object:** You have the right to object to processing of your personal data.
- **Right to Lodge a Complaint:** You have the right to lodge a complaint with your local supervisory authority if you believe your data protection rights have been violated.

To exercise any of these rights or with any GDPR-related inquiry, contact us at [CONTACT_EMAIL].

Because WinOpt Pro does not transmit personal data to any servers, our role as a "data controller" under GDPR is minimal and limited to data stored locally on your machine, over which you retain full control.

---

## 9. CCPA — Do Not Sell or Share My Personal Information

This section applies to residents of California under the California Consumer Privacy Act (CCPA), as amended by the California Privacy Rights Act (CPRA).

**WinOpt Pro does not sell, share, rent, trade, disclose, or otherwise make available your personal information to any third party for commercial purposes, monetary consideration, or any other valuable consideration.** This includes:

- We do not sell your personal information (as defined under CCPA §1798.140).
- We do not share your personal information for cross-context behavioral advertising.
- We do not rent or trade your personal information to data brokers or marketing companies.

As a California resident, you have the following rights under CCPA (§1798.100 et seq.):

- **Right to Know:** You have the right to know what personal information we have collected, the sources of that information, the purposes for collection, and any third parties with whom it is shared. Given that WinOpt Pro stores all data locally on your device, you can view all of it directly through the Export feature.
- **Right to Delete:** You have the right to request deletion of personal information we hold. Use the Clear All App Data feature, or contact [CONTACT_EMAIL].
- **Right to Correct:** You have the right to request correction of inaccurate personal information.
- **Right to Opt-Out of Sale or Sharing:** Because we do not sell or share personal information, there is nothing to opt out of. If this practice ever changes, we will update this policy and provide a clear opt-out mechanism before any such change takes effect.
- **Right to Non-Discrimination:** We will not discriminate against you for exercising your CCPA rights.

To submit a CCPA request or for any privacy-related inquiries, contact us at [CONTACT_EMAIL].

---

## 10. Children's Privacy

WinOpt Pro is not directed at or intended for use by children under the age of 13. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe that a child under 13 has used WinOpt Pro, please contact us at [CONTACT_EMAIL] and we will take appropriate steps. Because WinOpt Pro stores no personal data on our servers, any data created by a minor exists only on the local device.

---

## 11. Changes to This Privacy Policy

We may update this Privacy Policy from time to time to reflect changes in the Software's features or applicable law. When material changes are made, we will notify you via:

- An in-app notification in the next Software update; and/or
- A notice posted on [WEBSITE_URL].

The "Last Updated" date at the top of this policy will reflect the date of the most recent revision. Your continued use of WinOpt Pro after a policy update constitutes your acknowledgment of the updated policy.

---

## 12. Contact

For any privacy-related questions, data requests, or concerns, please contact:

**Email:** [CONTACT_EMAIL]
**Website:** [WEBSITE_URL]

We aim to respond to all privacy inquiries within 30 days.
