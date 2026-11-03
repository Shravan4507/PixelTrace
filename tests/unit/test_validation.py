import io
import tempfile
from pathlib import Path
from PIL import Image
import pytest
from backend.app.services.validation_service import ValidationService, ValidationError

def test_filename_sanitization():
    # Test path traversal injection
    unsafe_1 = "../../../etc/passwd.jpg"
    sanitized_1 = ValidationService.sanitize_filename(unsafe_1)
    assert ".." not in sanitized_1
    assert "/" not in sanitized_1
    assert "\\" not in sanitized_1
    assert sanitized_1.endswith(".jpg")

    # Test dangerous shell characters
    unsafe_2 = "malicious;rm -rf;`whoami`.png"
    sanitized_2 = ValidationService.sanitize_filename(unsafe_2)
    assert ";" not in sanitized_2
    assert "`" not in sanitized_2
    assert " " not in sanitized_2
    assert sanitized_2.endswith(".png")

def test_magic_bytes_detection():
    jpeg_bytes = b"\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x00"
    png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"
    tiff_le = b"II*\x00\x08\x00\x00\x00\x00\x00\x00\x00"
    bmp_bytes = b"BM\x36\x00\x00\x00\x00\x00\x00\x00\x36\x00"
    webp_bytes = b"RIFF\x18\x00\x00\x00WEBPVP8 \x0c\x00"

    assert ValidationService.detect_format_by_magic_bytes(jpeg_bytes) == "JPEG"
    assert ValidationService.detect_format_by_magic_bytes(png_bytes) == "PNG"
    assert ValidationService.detect_format_by_magic_bytes(tiff_le) == "TIFF"
    assert ValidationService.detect_format_by_magic_bytes(bmp_bytes) == "BMP"
    assert ValidationService.detect_format_by_magic_bytes(webp_bytes) == "WEBP"

    with pytest.raises(ValidationError):
        ValidationService.detect_format_by_magic_bytes(b"INVALID_MAGIC_HEADER_BYTES")

def test_corrupt_image_rejection():
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
        # Faked header but corrupted payload
        tmp.write(b"\xFF\xD8\xFF\xE0" + b"\x00" * 50)
        tmp_path = Path(tmp.name)

    try:
        with pytest.raises(ValidationError) as exc_info:
            ValidationService.validate_image_file(tmp_path, "corrupt.jpg")
        assert "integrity verification failed" in str(exc_info.value).lower()
    finally:
        tmp_path.unlink(missing_ok=True)

def test_valid_synthetic_image():
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
        img = Image.new("RGB", (100, 100), color=(255, 0, 0))
        img.save(tmp.name, format="PNG")
        tmp_path = Path(tmp.name)

    try:
        detected_fmt, width, height, mode = ValidationService.validate_image_file(tmp_path, "test.png")
        assert detected_fmt == "PNG"
        assert width == 100
        assert height == 100
        assert mode == "RGB"
    finally:
        tmp_path.unlink(missing_ok=True)

