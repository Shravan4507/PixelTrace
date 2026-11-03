# PixelTrace: Project Overview

## 1. Executive Summary
**PixelTrace** is a locally operated, scientifically grounded Digital Image Forensics and Evidence Analysis platform. It equips forensic examiners, investigative journalists, cybersecurity responders, and legal professionals with robust tools to inspect digital images, extract forensic metadata, generate and compare cryptographic fingerprints, conduct Error Level Analysis (ELA), and produce formal forensic reports.

## 2. Core Philosophy
- **Local Isolation**: All evidence handling, metadata parsing, hashing, difference calculation, and report generation execute entirely on local hardware (`127.0.0.1`). No cloud backends, remote AI models, or third-party tracking services are engaged.
- **Evidence Integrity**: Evidence files are immutable upon ingestion. Cryptographic hashes (SHA-256 and MD5) are recorded immediately. Any derived products (such as ELA visualization layers or preview thumbnails) are isolated into dedicated artifact directories.
- **Scientific Rigor**: Analysis findings use strictly neutral, empirical terminology (e.g., `Exact binary match`, `Binary mismatch detected`, `Compression anomaly observed`, `Further forensic examination recommended`). The system intentionally rejects absolute claims of "authenticity" or "falsification."
- **Strict Monochromatic Interface**: High-contrast, distraction-free environment adhering to digital forensic workstation standards (black background `#000000`, white foreground `#FFFFFF`, D-DIN global typography, fixed 4px border radius, no decorative animations or shadows).

## 3. High-Level Capabilities
1. **Case Management**: Organize evidence items under distinct forensic investigation records with investigator assignment, audit logs, and notes.
2. **Evidence Ingestion & Verification**: Validate image magic bytes, enforce pixel and file-size constraints, isolate files in tamper-evident filesystem layouts, and verify SHA-256 hash preservation.
3. **EXIF Metadata Engine**: Comprehensive inspection of EXIF tags, GPS coordinate transformation to decimal degrees with sensitive location warnings, camera hardware signatures, and editing software stamps.
4. **Cryptographic Fingerprinting**: Full-file streaming SHA-256 and MD5 digest generation, verification against stored ingestion baselines, and dual-evidence cryptographic comparison.
5. **Error Level Analysis (ELA)**: Controlled JPEG recompression at customizable quality levels (default 95) with pixel difference amplification (default 15x) using NumPy and Pillow, accompanied by explicit non-JPEG methodology notices.
6. **Comparison Workspace**: Dual-pane visual and cryptographic comparison tool to inspect differences between suspect and reference imagery.
7. **Chain of Custody & Audit Logging**: Automatic recording of all forensic operations, parameter choices, and integrity verification milestones.
8. **Automated Forensic Reporting**: Downloadable formal PDF reports (rendered with embedded D-DIN fonts via ReportLab) and comprehensive JSON data exports.

