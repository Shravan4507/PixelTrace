# Scientific and Forensic Limitations

Forensic examiners using PixelTrace must be cognizant of the following methodological constraints:

1. **Non-Determinism of Image Authenticity**
   - No single forensic algorithm can deterministically declare an image authentic or forged.
   - PixelTrace surfaces observable empirical anomalies; human expert analysis and corroborating evidence are indispensable.

2. **Cryptographic Hashing Limits**
   - A matching cryptographic hash verifies binary identity between two files with near-absolute certainty (SHA-256).
   - A matching hash **does not** establish that the contents are genuine or unmanipulated prior to file creation.
   - A mismatching hash proves byte divergence, which can be caused by benign activities (metadata stripping, re-saving, color-profile updates) as well as malicious editing.

3. **Error Level Analysis (ELA) Limits**
   - ELA evaluates the rate of lossy degradation upon recompression.
   - Natural high-contrast transitions (e.g., sharp black-to-white borders, high-frequency patterns like grass or tree foliage) produce higher error differentials regardless of whether they have been modified.
   - Uniform low-contrast regions (e.g., smooth skies) exhibit very low error differentials.
   - An image saved repeatedly at 100% quality may yield near-zero error across all regions, masking modifications.
   - Applying ELA to lossless formats (PNG, BMP, TIFF) produces artifacts of JPEG compression on originally non-JPEG data; such tests are experimental and require explicit disclosure.

4. **EXIF Metadata Fallibility**
   - EXIF fields are easily modified, added, or stripped using standard command-line tools without changing image pixel data.
   - Missing metadata is commonplace due to modern social media and messaging platforms stripping EXIF for user privacy.
   - The existence of editing software tags (e.g., "Adobe Photoshop") demonstrates software interaction, but does not identify the nature or extent of visual alterations.

5. **Local Environment Constraints**
   - Chain-of-custody timestamps rely on the local workstation system clock.
   - PixelTrace operates entirely offline; no external digital timestamping authorities (TSA) or hardware security modules (HSM) are bound to the database.

