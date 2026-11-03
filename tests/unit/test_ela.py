import tempfile
from pathlib import Path
from PIL import Image, ImageDraw
import pytest
from backend.app.services.ela_service import ELAService

def test_ela_jpeg_execution():
    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_dir_path = Path(tmp_dir)
        evidence_path = tmp_dir_path / "test_evidence.jpg"
        output_dir = tmp_dir_path / "ela_output"

        # Generate synthetic JPEG image with distinct patterns
        img = Image.new("RGB", (200, 200), color=(240, 240, 240))
        draw = ImageDraw.Draw(img)
        draw.rectangle([20, 20, 80, 80], fill=(20, 20, 200))
        draw.line([0, 0, 200, 200], fill=(255, 0, 0), width=3)
        img.save(evidence_path, format="JPEG", quality=90)

        # Execute ELA
        result = ELAService.perform_ela(
            evidence_file_path=evidence_path,
            output_dir=output_dir,
            quality=95,
            scale=15
        )

        assert result["is_jpeg"] is True
        assert result["quality"] == 95
        assert result["scale"] == 15
        assert result["mean_error"] >= 0.0
        assert result["max_error"] >= 0
        assert Path(result["artifact_path"]).exists()

        # Verify generated artifact is a valid image
        with Image.open(result["artifact_path"]) as ela_img:
            assert ela_img.size == (200, 200)

def test_ela_non_jpeg_notice():
    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_dir_path = Path(tmp_dir)
        png_path = tmp_dir_path / "test_lossless.png"
        output_dir = tmp_dir_path / "ela_output"

        img = Image.new("RGB", (100, 100), color=(100, 150, 200))
        img.save(png_path, format="PNG")

        result = ELAService.perform_ela(
            evidence_file_path=png_path,
            output_dir=output_dir,
            quality=95,
            scale=15
        )

        assert result["is_jpeg"] is False
        assert result["format_warning"] is not None
        assert "experimental recompression artifact" in result["format_warning"].lower()

