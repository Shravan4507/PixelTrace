import io
import pytest
from fastapi.testclient import TestClient
from PIL import Image, ImageDraw
from backend.app.main import app
from backend.app.core.database import init_db

@pytest.fixture(scope="module")
def client():
    init_db()
    with TestClient(app) as c:
        yield c

def test_instant_quick_scan_endpoint(client: TestClient):
    # Create test JPEG in-memory
    buf = io.BytesIO()
    img = Image.new("RGB", (150, 150), color=(120, 180, 240))
    draw = ImageDraw.Draw(img)
    draw.ellipse([30, 30, 80, 80], fill=(200, 50, 50))
    img.save(buf, format="JPEG", quality=90)
    buf.seek(0)

    # Call quick-scan endpoint
    resp = client.post(
        "/api/v1/quick-scan",
        files={"file": ("test_instant_photo.jpg", buf, "image/jpeg")}
    )

    assert resp.status_code == 201
    data = resp.json()

    # Verify evidence
    assert data["evidence"]["file_format"] == "JPEG"
    assert len(data["evidence"]["sha256"]) == 64
    assert len(data["evidence"]["md5"]) == 32

    # Verify metadata
    assert "image_properties" in data["metadata"]
    assert data["metadata"]["image_properties"]["width"] == 150

    # Verify ELA
    assert "ela" in data
    assert data["ela"]["quality"] == 95
    assert data["ela"]["mean_error"] >= 0.0

    # Verify pre-generated PDF report
    assert "report" in data
    assert data["report"]["report_format"] == "PDF"
    assert data["report"]["file_size"] > 0

