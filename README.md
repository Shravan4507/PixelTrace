# PixelTrace

[![PixelTrace CI](https://github.com/Shravan4507/PixelTrace/actions/workflows/ci.yml/badge.svg)](https://github.com/Shravan4507/PixelTrace/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-white.svg)](LICENSE)
[![Python: 3.11+](https://img.shields.io/badge/Python-3.11%2B-black.svg)](https://www.python.org/)
[![React: 18](https://img.shields.io/badge/React-18-black.svg)](https://react.dev/)
[![Airgap: 100% Local](https://img.shields.io/badge/Offline-Airgapped-black.svg)](#security--privacy)

**PixelTrace** is a locally operated, scientific digital image forensics and evidence analysis workstation. Designed with zero cloud reliance, PixelTrace allows investigators, journalists, and researchers to verify image authenticity, extract deep EXIF metadata, perform Error Level Analysis (ELA), conduct dual-evidence cryptographic comparisons, log chain-of-custody audit records, and export formal investigation reports in PDF and JSON formats.

---

## Highlights

- **Instant Forensic Drag & Drop**: Drop any image on the home screen for instant analysis—computes hashes, parses EXIF metadata, renders the ELA map, and prepares an official PDF report in under two seconds.
- **One-Click Windows Launcher (`start.bat`)**: Automatically verifies Python and Node.js environments, installs missing libraries, launches the single-port server on `127.0.0.1:8000`, and opens your default browser.
- **Standalone `.exe` Support**: Package into a portable Windows executable using PyInstaller for zero-dependency deployment via GitHub Releases.
- **Pure Monochromatic Workstation UI**: High-contrast `#000000` aesthetic adhering to strict forensic workstation standards—no drop shadows, 4px border radius, and global D-DIN typography.
- **100% Local & Airgapped**: Operates strictly on `127.0.0.1`. No telemetry, no external APIs, and no internet access required.
- **Scientific Language & Disclosures**: Surfaces empirical observations (`Exact binary match`, `Binary mismatch detected`, `Potential compression anomaly observed`) without asserting unverified authenticity claims.

---

## Forensic Analysis Pipeline

1. **EXIF Metadata Inspection**
   - Camera hardware (make, model, lens).
   - Exposure duration, F-number, ISO speed, focal length.
   - GPS coordinate conversion to high-precision decimal degrees with sensitive location alerts.
   - Editing software signatures (e.g. Photoshop, GIMP).

2. **Cryptographic Hash Verification**
   - 64 KB chunked streaming SHA-256 and MD5 digests.
   - Detects the cryptographic avalanche effect (single-pixel alteration alters digest).
   - Live on-disk evidence verification against recorded ingestion baselines.

3. **Error Level Analysis (ELA)**
   - Controlled JPEG recompression across customizable quality levels (default 95%).
   - Pixel differential calculation amplified by configurable scale factors (default 15x).
   - Statistical anomaly metrics: mean pixel error, peak residual, and regional variance standard deviation.
   - Non-JPEG format notices to prevent misinterpretation of lossless containers.

4. **Dual-Evidence Comparative Workspace**
   - Side-by-side visual viewer with synchronized zoom controls.
   - Mean Squared Error (MSE) pixel divergence calculation.
   - File size delta and cryptographic match determination.

5. **Formal Report Generation**
   - Print-ready PDF reports rendered via ReportLab with embedded D-DIN typography.
   - Structured JSON data exports for automated workflows.

---

## Quick Start (Windows)

### Option 1: Official Windows Installer (`PixelTrace-Setup.exe` - Recommended)
Download `PixelTrace-Setup.exe` from [GitHub Releases](https://github.com/Shravan4507/PixelTrace/releases).
- Standard Windows Installation Wizard.
- Installs to `%LocalAppData%\Programs\PixelTrace` (no administrator privileges or UAC prompts required).
- Creates a **Desktop Shortcut** with custom forensic icon.
- Adds **PixelTrace** to the Windows Start Menu & registers in Windows "Installed apps" for clean removal.
- Launches as a dedicated standalone desktop app window (no browser tabs or URL bars).

### Option 2: Standalone Portable Binary (`PixelTrace.exe`)
Download `PixelTrace.exe` directly from [GitHub Releases](https://github.com/Shravan4507/PixelTrace/releases).
Single-file portable executable with zero installation needed.

### Option 3: One-Click Source Launcher (`start.bat`)
If you cloned the source code, double-click:
```cmd
start.bat
```
`start.bat` will self-heal missing dependencies, build the web client if needed, launch the server, and open `http://127.0.0.1:8000`.

### Option 3: Manual Terminal Execution
```powershell
# 1. Install backend dependencies
python -m pip install -r backend/requirements.txt

# 2. Start the workstation (Serves both API and Web UI on port 8000)
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```
Open your browser at `http://127.0.0.1:8000`.

---

## Developer Hot-Reload Mode

For active frontend/backend development:
```cmd
start-dev.bat
```
- Backend (FastAPI with reload): `http://127.0.0.1:8000`
- Frontend (Vite with HMR): `http://127.0.0.1:5173`

---

## Running Automated Tests

Run the full 14-test suite:
```powershell
python -m pytest tests -v
```

---

## Building a Standalone Windows `.exe`

To generate a standalone portable executable for GitHub Releases:
```cmd
scripts\build_exe.bat
```
The compiled application will be generated in `dist/PixelTrace/`.

---

## Repository Structure

```text
PixelTrace/
├── start.bat                   # One-click Windows application launcher
├── start-dev.bat               # Dual hot-reload development launcher
├── LICENSE                     # MIT Open Source License
├── CONTRIBUTING.md             # Contribution guidelines
├── CODE_OF_CONDUCT.md          # Community code of conduct
├── .github/workflows/ci.yml    # Automated GitHub Actions test pipeline
│
├── client/                     # React 18 + Vite + TypeScript frontend
│   ├── src/                    # Monochromatic UI with D-DIN typography
│   └── public/fonts/           # D-DIN webfont assets (WOFF2/TTF)
│
├── backend/                    # Python 3.12 FastAPI forensic engine
│   ├── app/                    # Modular routes, core DB, forensic services
│   └── launcher.py             # Standalone executable launcher entry point
│
├── data/                       # Local SQLite database & evidence repository
├── tests/                      # Automated unit and integration test suite
├── docs/                       # Technical architecture & methodology documentation
└── scripts/                    # Standalone PyInstaller build scripts
```

---

## Security & Privacy

PixelTrace is engineered for sensitive digital evidence:
- **Loopback Binding**: Constrained strictly to `127.0.0.1`.
- **Read-Only Evidence**: Uploaded originals are preserved and sealed with SHA-256 integrity verification.
- **Decompression Bomb Protection**: Constrained PIL decompression limits prevent memory exhaustion exploits.
- **Path Traversal Protection**: Filenames are cryptographically sanitized upon ingestion.

---

## License

This project is licensed under the [MIT License](LICENSE).
The bundled D-DIN font family is licensed under the [SIL Open Font License 1.1](client/public/fonts/OFL-1.1.txt).
