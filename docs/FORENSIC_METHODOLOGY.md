# Digital Image Forensics Methodology

## 1. EXIF Metadata Extraction
Exchangeable Image File Format (EXIF) embeds recording parameters directly into image containers (JPEG, TIFF, WebP).
- **Extraction Protocol**: Employs `ExifRead` combined with Pillow `_getexif()` to inspect both standardized tags (TIFF/EXIF standard) and maker notes where available.
- **GPS Coordinates**: Converts Rational GPS values (Degrees, Minutes, Seconds) along with Hemisphere references (`N/S`, `E/W`) into high-precision decimal degrees:
  $$\text{Decimal Degrees} = (\text{Degrees} + \frac{\text{Minutes}}{60} + \frac{\text{Seconds}}{3600}) \times (-1 \text{ if South or West})$$
- **Forensic Caveat**: EXIF metadata can be stripped, forged, or altered with rudimentary tools. Metadata presence or absence must be corroborated by binary and compression analysis.

## 2. Cryptographic Hash Analysis
Cryptographic hashing produces a fixed-size deterministic digest of the raw byte stream of a file.
- **SHA-256 (Default)**: FIPS PUB 180-4 standard delivering 256-bit hash digests. Pre-image and collision resistance makes it suitable for non-repudiation and evidence integrity.
- **MD5 (Optional)**: Legacy 128-bit hash maintained for compatibility with historic forensic records.
- **Chunked Processing**: Byte streams are processed in 64 KB buffers, ensuring constant memory footprints regardless of file size.
- **Interpretation**:
  - `Exact binary match`: Both byte streams are identical.
  - `Binary mismatch detected`: Byte streams differ (caused by recompression, metadata change, format conversion, or visual tampering).

## 3. Error Level Analysis (ELA)
ELA operates on the lossy characteristics of the discrete cosine transform (DCT) used in JPEG compression.
- **Mechanism**:
  1. Original image is decoded into RGB raster space.
  2. The raster is recompressed to a standardized quality factor ($Q = 95$ default).
  3. The decoded original and recompressed image are compared pixel-by-pixel:
     $$\Delta(x, y) = |I_{\text{orig}}(x, y) - I_{\text{recompressed}}(x, y)|$$
  4. The residual difference is amplified by a scaling factor ($S = 15$ default):
     $$E(x, y) = \min(255, \Delta(x, y) \times S)$$
- **Interpretation Guidelines**:
  - Homogeneous textures typically compress with consistent error levels.
  - Regions pasted from images of different quality levels or repeatedly edited often display markedly different error rates.
  - High-frequency edges and contrast boundaries naturally produce higher ELA values without indicating manipulation.
  - ELA is an exploratory technique; it does not constitute deterministic proof of alteration.

