import re
from pathlib import Path
from typing import Tuple
from PIL import Image
from backend.app.config import settings

# Enforce Decompression Bomb protection
Image.MAX_IMAGE_PIXELS = settings.MAX_IMAGE_PIXELS

class ValidationError(Exception):
    """Custom exception for forensic file validation errors."""
    pass

class ValidationService:
    # Magic bytes signatures
    SIGNATURES = {
        "JPEG": [b"\xFF\xD8\xFF"],
        "PNG": [b"\x89PNG\r\n\x1a\n"],
        "TIFF": [b"II*\x00", b"MM\x00*"],
        "BMP": [b"BM"],
        "WEBP": [b"RIFF"]  # further checked for WEBP marker at offset 8
    }

    @classmethod
    def sanitize_filename(cls, filename: str) -> str:
        """
        Sanitizes input filename to prevent directory traversal and filesystem exploits.
        """
        base_name = Path(filename).name
        # Allow alphanumeric, dashes, underscores, dots
        sanitized = re.sub(r"[^a-zA-Z0-9_\-\.]", "_", base_name)
        # Prevent hidden files or double dots
        sanitized = re.sub(r"\.{2,}", ".", sanitized)
        if sanitized.startswith("."):
            sanitized = "evidence" + sanitized
        if not sanitized:
            sanitized = "unnamed_evidence.bin"
        return sanitized

    @classmethod
    def detect_format_by_magic_bytes(cls, file_bytes: bytes) -> str:
        """
        Detects image container type from leading header bytes.
        """
        if len(file_bytes) < 12:
            raise ValidationError("File header is too short to be a valid image container.")

        if file_bytes.startswith(b"\xFF\xD8\xFF"):
            return "JPEG"
        if file_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
            return "PNG"
        if file_bytes.startswith(b"II*\x00") or file_bytes.startswith(b"MM\x00*"):
            return "TIFF"
        if file_bytes.startswith(b"BM"):
            return "BMP"
        if file_bytes.startswith(b"RIFF") and file_bytes[8:12] == b"WEBP":
            return "WEBP"

        raise ValidationError("Unsupported or unrecognizable image file header (magic bytes).")

    @classmethod
    def validate_image_file(cls, file_path: Path, original_filename: str) -> Tuple[str, int, int, str]:
        """
        Performs deep verification of the image file on disk.
        Returns: (detected_format, width, height, mode)
        """
        if not file_path.exists():
            raise ValidationError(f"File does not exist: {file_path}")

        file_size = file_path.stat().st_size
        if file_size == 0:
            raise ValidationError("Uploaded file is empty (0 bytes).")
        if file_size > settings.MAX_FILE_SIZE_BYTES:
            raise ValidationError(
                f"File size ({file_size / (1024*1024):.2f} MB) exceeds maximum allowed limit ({settings.MAX_FILE_SIZE_BYTES / (1024*1024):.0f} MB)."
            )

        # Inspect header bytes
        with open(file_path, "rb") as f:
            header_sample = f.read(32)
        detected_format = cls.detect_format_by_magic_bytes(header_sample)

        # Deep PIL verification
        try:
            with Image.open(file_path) as img:
                img.verify()
        except Exception as e:
            raise ValidationError(f"Image integrity verification failed. File is corrupt or malformed: {str(e)}")

        # Re-open to read dimensions and mode (verify closes the image object)
        try:
            with Image.open(file_path) as img:
                width, height = img.size
                mode = img.mode

                total_pixels = width * height
                if total_pixels > settings.MAX_IMAGE_PIXELS:
                    raise ValidationError(
                        f"Image dimensions ({width}x{height} = {total_pixels:,} pixels) exceed safety threshold ({settings.MAX_IMAGE_PIXELS:,} pixels)."
                    )

                return detected_format, width, height, mode
        except Exception as e:
            raise ValidationError(f"Unable to read image dimensions: {str(e)}")

