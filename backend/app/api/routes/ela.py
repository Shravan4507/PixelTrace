import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import FileResponse
from backend.app.config import settings
from backend.app.core.database import get_db
from backend.app.schemas.schemas import ELARequest, ELAResponse
from backend.app.services.evidence_service import EvidenceService
from backend.app.services.ela_service import ELAService
from backend.app.services.audit_service import AuditService

router = APIRouter(tags=["Error Level Analysis"])

@router.post("/evidence/{evidence_id}/ela", response_model=ELAResponse)
def execute_ela(evidence_id: str, payload: ELARequest = ELARequest()):
    evidence = EvidenceService.get_evidence(evidence_id)
    if not evidence:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Evidence '{evidence_id}' not found.")

    file_path = Path(evidence["file_path"])
    if not file_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence file missing on disk.")

    case_id = evidence["case_id"]
    ela_dir = settings.CASES_DIR / case_id / "derived" / "ela"

    try:
        ela_result = ELAService.perform_ela(
            evidence_file_path=file_path,
            output_dir=ela_dir,
            quality=payload.quality,
            scale=payload.scale
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"ELA execution failed: {str(e)}")

    now_iso = datetime.now(timezone.utc).isoformat()
    analysis_id = ela_result["analysis_id"]

    # Store analysis record in SQLite
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO analyses (
            id, case_id, evidence_id, analysis_type, parameters_json, results_json, artifact_path, created_at
        ) VALUES (?, ?, ?, 'ELA', ?, ?, ?, ?);
        """, (
            analysis_id,
            case_id,
            evidence_id,
            json.dumps({"quality": payload.quality, "scale": payload.scale}),
            json.dumps(ela_result),
            ela_result["artifact_path"],
            now_iso
        ))

    AuditService.log_event(
        event_type="ELA_PERFORMED",
        case_id=case_id,
        evidence_id=evidence_id,
        details={
            "analysis_id": analysis_id,
            "quality": payload.quality,
            "scale": payload.scale,
            "mean_error": ela_result["mean_error"],
            "max_error": ela_result["max_error"],
            "potential_anomaly": ela_result["potential_anomaly_detected"]
        }
    )

    return ELAResponse(
        analysis_id=analysis_id,
        evidence_id=evidence_id,
        original_format=ela_result["original_format"],
        is_jpeg=ela_result["is_jpeg"],
        format_warning=ela_result["format_warning"],
        quality=ela_result["quality"],
        scale=ela_result["scale"],
        ela_image_url=f"/api/v1/analysis/{analysis_id}/ela",
        mean_error=ela_result["mean_error"],
        max_error=ela_result["max_error"],
        error_standard_deviation=ela_result["error_standard_deviation"],
        potential_anomaly_detected=ela_result["potential_anomaly_detected"],
        anomaly_reason=ela_result["anomaly_reason"],
        scientific_disclaimer=ela_result["scientific_disclaimer"],
        created_at=now_iso
    )

@router.get("/analysis/{analysis_id}/ela")
def get_ela_artifact(analysis_id: str):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT artifact_path FROM analyses WHERE id = ? AND analysis_type = 'ELA';", (analysis_id,))
        row = cursor.fetchone()

    if not row or not row["artifact_path"]:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"ELA artifact for analysis '{analysis_id}' not found.")

    artifact_path = Path(row["artifact_path"])
    if not artifact_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ELA image file missing on disk.")

    return FileResponse(path=artifact_path, media_type="image/png")

