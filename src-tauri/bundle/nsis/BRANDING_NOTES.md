# NSIS Installer Branding

Before release, create these image files in this directory:

- `header.bmp` — 150×57 pixels, BMP format — shown in the header bar of installer pages
- `sidebar.bmp` — 164×314 pixels, BMP format — shown on Welcome and Finish pages

Replace the placeholder filenames in `installer.nsi` if final filenames differ.
Tauri falls back to generic NSIS branding if these files are absent.
