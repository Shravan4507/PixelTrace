import io
import pytest
from fastapi.testclient import TestClient
from PIL import Image, ImageDraw
from backend.app.main import app

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c

def create_synthetic_image(color=(100, 150, 200), mark=False) -> io.BytesIO:
    buf = io.BytesIO()
    img = Image.new("RGB", (120, 120), color=color)
    if mark:
        draw = ImageDraw.Draw(img)
        draw.rectangle([20, 20, 60, 60], fill=(255, 0, 0))
    img.save(buf, format="JPEG", quality=90)
    buf.seek(0)
    return buf

def test_direct_analyze_endpoint(client: TestClient):
    img_buf = create_synthetic_image()
    resp = client.post(
        "/api/v1/analyze",
        files={"file": ("suspect_sample.jpg", img_buf, "image/jpeg")},
        data={"quality": "95", "scale": "15"}
    )
    assert resp.status_code == 200
    data = resp.json()

    assert data["file_info"]["filename"] == "suspect_sample.jpg"
    assert data["file_info"]["format"] == "JPEG"
    assert len(data["hashes"]["sha256"]) == 64
    assert len(data["hashes"]["md5"]) == 32
    assert "metadata" in data
    assert "ela" in data
    assert data["ela"]["quality"] == 95
    assert "pdf_report_url" in data

    # Test downloading the generated PDF report
    pdf_resp = client.get(data["pdf_report_url"])
    assert pdf_resp.status_code == 200
    assert pdf_resp.headers["content-type"] == "application/pdf"
    assert len(pdf_resp.content) > 0

def test_direct_compare_endpoint(client: TestClient):
    img_a = create_synthetic_image(color=(100, 100, 100), mark=False)
    img_b = create_synthetic_image(color=(100, 100, 100), mark=True)

    resp = client.post(
        "/api/v1/compare",
        files={
            "reference_file": ("ref.jpg", img_a, "image/jpeg"),
            "comparison_file": ("cmp.jpg", img_b, "image/jpeg")
        }
    )
    assert resp.status_code == 200
    data = resp.json()

    assert data["is_exact_match"] is False
    assert data["status_label"] == "Binary mismatch detected"
    assert data["dimensions_match"] is True
    assert data["mean_squared_error"] is not None
    assert data["mean_squared_error"] > 0

