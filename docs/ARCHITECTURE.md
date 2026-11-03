# PixelTrace Architecture

```
+--------------------------------------------------------------------------+
|                        Frontend (React + Vite + TS)                      |
|                  Monochromatic Forensic Workstation UI                   |
|                      Global D-DIN Typography (WOFF2)                     |
+--------------------------------------------------------------------------+
       |                                                    ^
       | HTTP REST (/api/v1)                                | Preview / Reports
       v                                                    |
+--------------------------------------------------------------------------+
|                         FastAPI Backend (Localhost)                      |
|                                                                          |
|  +-------------------+  +--------------------+  +---------------------+  |
|  | Ingestion Service |  | Validation Service |  |   Hashing Service   |  |
|  | (Safe Filenames,  |  | (Magic Bytes, Size,|  | (SHA-256 / MD5      |  |
|  |  Decompression)   |  |  Decompress Bomb)  |  |  Streaming Chunked) |  |
|  +-------------------+  +--------------------+  +---------------------+  |
|                                                                          |
|  +-------------------+  +--------------------+  +---------------------+  |
|  | Metadata Service  |  |    ELA Service     |  | Comparison Service  |  |
|  | (ExifRead, GPS    |  | (NumPy, Pillow,    |  | (Binary Matching,   |  |
|  |  Decimal Degree)  |  |  Controlled Diff)  |  |  Side-by-Side Diff) |  |
|  +-------------------+  +--------------------+  +---------------------+  |
|                                                                          |
|  +-------------------+  +--------------------+  +---------------------+  |
|  | Case / Evidence   |  | Audit Log Service  |  |   Report Service    |  |
|  | Service           |  | (Chain of Custody) |  | (ReportLab PDF with |  |
|  | (Local SQLite DB) |  |                    |  |  D-DIN, JSON Export)|  |
|  +-------------------+  +--------------------+  +---------------------+  |
+--------------------------------------------------------------------------+
       |                                                    |
       v Filesystem (Write/Read)                            v Database
+--------------------------------------+   +-------------------------------+
| data/                                |   | data/database/pixeltrace.db   |
| ├── cases/{case_id}/                 |   | (SQLite Relational Schema)    |
| │   ├── evidence/ (Immutable Orig)   |   | - cases                       |
| │   ├── derived/                     |   | - evidence                    |
| │   │   ├── thumbnails/              |   | - analyses                    |
| │   │   └── ela/ (Generated ELA)     |   | - comparisons                 |
| │   └── reports/ (PDF / JSON)        |   | - audit_events                |
| └── temporary/ (Intermediate Buffers)|   | - reports                     |
+--------------------------------------+   +-------------------------------+
```

## Security & Operational Boundaries
- **CORS Boundary**: Bound strictly to loopback (`127.0.0.1`). Only explicitly mapped client ports are allowed.
- **Path Traversal Protection**: Filenames are sanitized using cryptographic UUID prefixes and sanitized base names.
- **Evidence Storage Separation**: Original bytes are stored read-only after ingestion. Derived thumbnails and ELA outputs are kept in separate sibling directories.
- **Decompression Bomb Protection**: Pillow's `MAX_IMAGE_PIXELS` is strictly constrained to prevent memory exhaustion attacks.

