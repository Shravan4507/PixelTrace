import uuid
from pathlib import Path
from fastapi import APIRouter, File, HTTPException, UploadFile, status
from backend.app.config import settings
from backend.app.core.database import get_db
from backend.app.services.case_service import CaseService
from backend.app.services.evidence_service import EvidenceService
from backend.app.services.ingestion_service import IngestionService
from backend.app.services.metadata_service import MetadataService
from backend.app.services.ela_service import ELAService
from backend.app.services.report_service import ReportService
from backend.app.services.validation_service import ValidationError

router = APIRouter(prefix="/quick-scan", tags=["Instant Forensic Scan"])

def _get_or_create_quick_case() -> str:
    """Finds or creates a standard local quick-scan investigation container."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM cases WHERE reference_number = 'QUICK-SCAN';")
        row = cursor.fetchone()
        if row:
            return row["id"]

    new_case = CaseService.create_case(
        title="Instant Forensic Scans",
        reference_number="QUICK-SCAN",
        examiner_name="PixelTrace Forensic Analyst",
        description="Automated instant forensic intake container for drag-and-drop operations.",
        notes="Managed automatically by PixelTrace Instant Scan Engine."
    )
    return new_case["id"]

@router.post("", status_code=status.HTTP_201_CREATED)
async def perform_quick_scan(file: UploadFile = File(...)):
    """
    Zero-friction forensic endpoint:
    Accepts any image, ingests, hashes, extracts metadata, executes ELA,
    and returns complete forensic analysis in a single unified response.
    """
    case_id = _get_or_create_quick_case()
    original_filename = file.filename or "suspect_image.jpg"

    try:
        # 1. Ingest & Hash
        evidence = IngestionService.ingest_evidence(
            case_id=case_id,
            upload_file=file.file,
            original_filename=original_filename,
            examiner_name="PixelTrace Analyst"
        )
        evidence_id = evidence["id"]
        ev_path = Path(evidence["file_path"])

        # 2. Extract Metadata
        metadata = MetadataService.extract_metadata(ev_path)

        # 3. Execute Error Level Analysis (ELA)
        ela_dir = settings.CASES_DIR / case_id / "derived" / "ela"
        ela_result = ELAService.perform_ela(
            evidence_file_path=ev_path,
            output_dir=ela_dir,
            quality=95,
            scale=15
        )

        # 4. Pre-generate formal PDF Report
        report = ReportService.generate_report(
            case_id=case_id,
            evidence_id=evidence_id,
            report_format="PDF",
            title=f"Forensic Dossier - {original_filename}",
            examiner_name="PixelTrace Analyst",
            include_ela=True,
            include_metadata=True,
            include_chain_of_custody=True
        )

        return {
            "evidence": evidence,
            "metadata": metadata,
            "ela": {
                "analysis_id": ela_result["analysis_id"],
                "quality": ela_result["quality"],
                "scale": ela_result["scale"],
                "ela_image_url": f"/api/v1/analysis/{ela_result['analysis_id']}/ela",
                "mean_error": ela_result["mean_error"],
                "max_error": ela_result["max_error"],
                "error_standard_deviation": ela_result["error_standard_deviation"],
                "potential_anomaly_detected": ela_result["potential_anomaly_detected"],
                "anomaly_reason": ela_result["anomaly_reason"],
                "format_warning": ela_result.get("format_warning"),
                "scientific_disclaimer": ela_result["scientific_disclaimer"]
            },
            "report": report
        }

    except ValidationError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Instant scan error: {str(e)}")
