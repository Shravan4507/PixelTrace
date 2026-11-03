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

def create_synthetic_jpeg(color=(100, 150, 200), shape=False) -> io.BytesIO:
    buf = io.BytesIO()
    img = Image.new("RGB", (180, 140), color=color)
    if shape:
        draw = ImageDraw.Draw(img)
        draw.rectangle([30, 30, 90, 90], fill=(255, 0, 0))
    img.save(buf, format="JPEG", quality=92)
    buf.seek(0)
    return buf

def test_complete_forensic_investigation_lifecycle(client: TestClient):
    # 1. Health check
    health_resp = client.get("/api/v1/health")
    assert health_resp.status_code == 200
    assert health_resp.json()["status"] == "HEALTHY"
    assert health_resp.json()["offline_operation"] is True

    # 2. Create Investigation Case
    case_payload = {
        "title": "Operation Apex Forensic Investigation",
        "reference_number": "CAS-2026-E2E-99",
        "examiner_name": "Senior Forensic Specialist",
        "description": "Comprehensive digital forensics evaluation for automated verification suite.",
        "notes": "Verified local custody record."
    }
    case_resp = client.post("/api/v1/cases", json=case_payload)
    assert case_resp.status_code == 201
    case_data = case_resp.json()
    case_id = case_data["id"]
    assert case_data["reference_number"] == "CAS-2026-E2E-99"

    try:
        # 3. Ingest Reference Evidence (Item A)
        img_a_bytes = create_synthetic_jpeg(color=(80, 120, 160), shape=False)
        upload_a_resp = client.post(
            f"/api/v1/cases/{case_id}/evidence",
            files={"file": ("reference_source.jpg", img_a_bytes, "image/jpeg")},
            data={"examiner_name": "Senior Forensic Specialist"}
        )
        assert upload_a_resp.status_code == 201
        ev_a = upload_a_resp.json()
        ev_a_id = ev_a["id"]
        assert ev_a["file_format"] == "JPEG"
        assert len(ev_a["sha256"]) == 64

        # 4. Ingest Target Evidence (Item B - Slightly different pixel content)
        img_b_bytes = create_synthetic_jpeg(color=(80, 120, 160), shape=True)
        upload_b_resp = client.post(
            f"/api/v1/cases/{case_id}/evidence",
            files={"file": ("suspect_modified.jpg", img_b_bytes, "image/jpeg")},
            data={"examiner_name": "Senior Forensic Specialist"}
        )
        assert upload_b_resp.status_code == 201
        ev_b = upload_b_resp.json()
        ev_b_id = ev_b["id"]
        assert ev_b["sha256"] != ev_a["sha256"]

        # 5. Extract Metadata
        meta_resp = client.post(f"/api/v1/evidence/{ev_a_id}/metadata")
        assert meta_resp.status_code == 200
        meta_data = meta_resp.json()
        assert meta_data["image_properties"]["format"] == "JPEG"
        assert "methodology_note" in meta_data

        # 6. Retrieve Cryptographic Hashes
        hash_resp = client.post(f"/api/v1/evidence/{ev_a_id}/hash")
        assert hash_resp.status_code == 200
        hash_data = hash_resp.json()
        assert hash_data["sha256"] == ev_a["sha256"]

        # 7. Execute Error Level Analysis (ELA)
        ela_payload = {"quality": 95, "scale": 15}
        ela_resp = client.post(f"/api/v1/evidence/{ev_a_id}/ela", json=ela_payload)
        assert ela_resp.status_code == 200
        ela_data = ela_resp.json()
        assert ela_data["quality"] == 95
        assert ela_data["mean_error"] >= 0.0
        analysis_id = ela_data["analysis_id"]

        # 8. Retrieve ELA Artifact Image
        ela_img_resp = client.get(f"/api/v1/analysis/{analysis_id}/ela")
        assert ela_img_resp.status_code == 200
        assert ela_img_resp.headers["content-type"] == "image/png"
        assert len(ela_img_resp.content) > 0

        # 9. Cryptographic Hash Comparison
        hash_comp_resp = client.post(
            "/api/v1/comparison/hash",
            json={"reference_evidence_id": ev_a_id, "target_evidence_id": ev_b_id, "algorithm": "SHA-256"}
        )
        assert hash_comp_resp.status_code == 200
        hash_comp = hash_comp_resp.json()
        assert hash_comp["is_match"] is False
        assert hash_comp["status_label"] == "Binary mismatch detected"

        # 10. Image Workspace Dual Comparison
        img_comp_resp = client.post(
            "/api/v1/comparison/images",
            json={"reference_evidence_id": ev_a_id, "target_evidence_id": ev_b_id}
        )
        assert img_comp_resp.status_code == 200
        img_comp = img_comp_resp.json()
        assert img_comp["binary_match"] is False
        assert img_comp["dimensions_match"] is True
        assert img_comp["mean_squared_error"] is not None
        assert img_comp["mean_squared_error"] > 0

        # 11. On-Disk Evidence Integrity Verification
        integ_resp = client.post(f"/api/v1/evidence/{ev_a_id}/verify-integrity")
        assert integ_resp.status_code == 200
        integ_data = integ_resp.json()
        assert integ_data["is_intact"] is True
        assert "PASSED" in integ_data["status_label"] or "Exact binary match" in integ_data["status_label"]

        # 12. Generate PDF Forensic Report
        pdf_rep_resp = client.post(
            f"/api/v1/cases/{case_id}/reports",
            json={
                "report_format": "PDF",
                "title": "Comprehensive E2E Forensic Dossier",
                "examiner_name": "Senior Forensic Specialist",
                "include_ela": True,
                "include_metadata": True,
                "include_chain_of_custody": True
            }
        )
        assert pdf_rep_resp.status_code == 201
        pdf_report = pdf_rep_resp.json()
        pdf_report_id = pdf_report["id"]
        assert pdf_report["file_size"] > 0

        # 13. Download PDF Report
        pdf_dl_resp = client.get(f"/api/v1/reports/{pdf_report_id}/download")
        assert pdf_dl_resp.status_code == 200
        assert pdf_dl_resp.headers["content-type"] == "application/pdf"
        assert len(pdf_dl_resp.content) > 0

        # 14. Generate JSON Forensic Report
        json_rep_resp = client.post(
            f"/api/v1/cases/{case_id}/reports",
            json={
                "report_format": "JSON",
                "title": "JSON Machine-Readable Dossier",
                "examiner_name": "Senior Forensic Specialist"
            }
        )
        assert json_rep_resp.status_code == 201
        json_report = json_rep_resp.json()
        assert json_report["file_size"] > 0

        # 15. Check Chain of Custody Audit Log
        audit_resp = client.get(f"/api/v1/cases/{case_id}/audit-log")
        assert audit_resp.status_code == 200
        logs = audit_resp.json()
        event_types = [entry["event_type"] for entry in logs]
        assert "CASE_CREATED" in event_types
        assert "EVIDENCE_IMPORTED" in event_types
        assert "INITIAL_HASH_VERIFIED" in event_types
        assert "METADATA_EXTRACTED" in event_types
        assert "ELA_PERFORMED" in event_types
        assert "REPORT_GENERATED" in event_types

    finally:
        # Cleanup: Delete case and attached storage
        del_resp = client.delete(f"/api/v1/cases/{case_id}")
        assert del_resp.status_code == 204

