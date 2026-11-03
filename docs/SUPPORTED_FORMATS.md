# Supported Image Formats

PixelTrace enforces genuine content validation through magic-byte inspection and structural decoding rather than relying on file extensions.

| Format | Extensions | Magic Header Bytes | Metadata Support | Cryptographic Hashing | ELA Support | Status |
|---|---|---|---|---|---|---|
| **JPEG** | `.jpg`, `.jpeg` | `FF D8 FF` | Full (EXIF, MakerNote) | Supported | Full Standard ELA | Recommended |
| **PNG** | `.png` | `89 50 4E 47 0D 0A 1A 0A` | Text chunks (tEXt, iTXt) | Supported | Experimental (Non-JPEG notice) | Supported |
| **TIFF** | `.tif`, `.tiff` | `49 49 2A 00` (LE) / `4D 4D 00 2A` (BE) | Full (TIFF header tags) | Supported | Experimental (Non-JPEG notice) | Supported |
| **BMP** | `.bmp` | `42 4D` | Bitmap Header | Supported | Experimental (Non-JPEG notice) | Supported |
| **WebP** | `.webp` | `52 49 46 46 ... 57 45 42 50` | EXIF chunk | Supported | Experimental (Non-JPEG notice) | Supported |

### Size & Dimension Limits
- **Maximum File Size**: 50 MB (configurable in `config.py`).
- **Maximum Image Dimensions**: 100,000,000 total pixels (Decompression bomb safeguard).

