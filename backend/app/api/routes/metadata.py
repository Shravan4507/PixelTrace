from pathlib import Path
from fastapi import APIRouter, HTTPException, status
from backend.app.schemas.schemas import MetadataResponse
from backend.app.services.evidence_service import EvidenceService
from backend.app.services.metadata_service import MetadataService
from backend.app.services.audit_service import AuditService

router = APIRouter(tags=["Metadata"])

def _process_metadata(evidence_id: str) -> MetadataResponse:
    evidence = EvidenceService.get_evidence(evidence_id)
    if not evidence:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Evidence '{evidence_id}' not found.")

    file_path = Path(evidence["file_path"])
    if not file_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence file missing on disk.")

    metadata = MetadataService.extract_metadata(file_path)

    AuditService.log_event(
        event_type="METADATA_EXTRACTED",
        case_id=evidence["case_id"],
        evidence_id=evidence_id,
        details={
            "has_exif": metadata["has_exif"],
            "camera_make": metadata["camera_info"].get("make"),
            "camera_model": metadata["camera_info"].get("model"),
            "has_gps": metadata["gps_info"].get("latitude") is not None
        }
    )

    return MetadataResponse(
        evidence_id=evidence_id,
        has_exif=metadata["has_exif"],
        image_properties=metadata["image_properties"],
        camera_info=metadata["camera_info"],
        capture_info=metadata["capture_info"],
        gps_info=metadata["gps_info"],
        raw_tags=metadata["raw_tags"],
        methodology_note=metadata["methodology_note"]
    )

@router.post("/evidence/{evidence_id}/metadata", response_model=MetadataResponse)
def extract_metadata_post(evidence_id: str):
    return _process_metadata(evidence_id)

@router.get("/evidence/{evidence_id}/metadata", response_model=MetadataResponse)
def extract_metadata_get(evidence_id: str):
    return _process_metadata(evidence_id)

