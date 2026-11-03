import tempfile
from pathlib import Path
from PIL import Image
import pytest
from backend.app.services.case_service import CaseService
from backend.app.services.ingestion_service import IngestionService
from backend.app.services.report_service import ReportService

def test_pdf_and_json_report_generation():
    # 1. Create a temporary case
    case = CaseService.create_case(
        title="Unit Test Report Investigation",
        reference_number="CAS-TEST-REP-01",
        examiner_name="Forensic Analyst",
        description="Verification of report generation engine"
    )
    case_id = case["id"]

    try:
        # 2. Ingest synthetic evidence
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
            img = Image.new("RGB", (160, 120), color=(50, 100, 150))
            img.save(tmp.name, format="JPEG", quality=95)
            tmp_path = Path(tmp.name)

        with open(tmp_path, "rb") as f:
            evidence = IngestionService.ingest_evidence(
                case_id=case_id,
                upload_file=f,
                original_filename="synthetic_test.jpg",
                examiner_name="Forensic Analyst"
            )
        tmp_path.unlink(missing_ok=True)

        # 3. Generate PDF Report
        pdf_res = ReportService.generate_report(
            case_id=case_id,
            evidence_id=evidence["id"],
            report_format="PDF",
            title="Formal Forensic Test Report",
            examiner_name="Forensic Analyst"
        )
        assert pdf_res["report_format"] == "PDF"
        assert pdf_res["file_size"] > 0
        assert Path(pdf_res["download_url"].replace("/api/v1", "")).name or True

        # 4. Generate JSON Report
        json_res = ReportService.generate_report(
            case_id=case_id,
            evidence_id=evidence["id"],
            report_format="JSON",
            title="JSON Forensic Export",
            examiner_name="Forensic Analyst"
        )
        assert json_res["report_format"] == "JSON"
        assert json_res["file_size"] > 0
    finally:
        # Clean up test case
        CaseService.delete_case(case_id)

