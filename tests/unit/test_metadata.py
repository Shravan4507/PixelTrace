import tempfile
from pathlib import Path
from PIL import Image
import pytest
from backend.app.services.metadata_service import MetadataService

def test_metadata_extraction_clean_image():
    # Synthetic image with no EXIF tags
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
        img = Image.new("RGB", (120, 80), color=(0, 128, 255))
        img.save(tmp.name, format="JPEG", quality=90)
        tmp_path = Path(tmp.name)

    try:
        meta = MetadataService.extract_metadata(tmp_path)
        assert meta["image_properties"]["format"] == "JPEG"
        assert meta["image_properties"]["width"] == 120
        assert meta["image_properties"]["height"] == 80
        assert meta["gps_info"]["is_sensitive"] is False
        assert "methodology_note" in meta
    finally:
        tmp_path.unlink(missing_ok=True)

def test_gps_coordinate_conversion():
    # Test decimal conversion helper
    # 37 deg, 46 min, 29.88 sec North -> 37.774967
    class MockRatio:
        def __init__(self, num, den):
            self.num = num
            self.den = den

    mock_values = [MockRatio(37, 1), MockRatio(46, 1), MockRatio(2988, 100)]
    class MockGPSField:
        values = mock_values

    degrees = MetadataService._convert_to_degrees(MockGPSField())
    assert degrees is not None
    assert round(degrees, 4) == 37.7750

