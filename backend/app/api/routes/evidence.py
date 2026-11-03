from pathlib import Path
from typing import Optional
from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from backend.app.config import settings
from backend.app.schemas.schemas import EvidenceResponse, IntegrityVerificationResponse
from backend.app.services.evidence_service import EvidenceService
from backend.app.services.ingestion_service import IngestionService
from backend.app.services.validation_service import ValidationError

router = APIRouter(tags=["Evidence"])

@router.post("/cases/{case_id}/evidence", response_model=EvidenceResponse, status_code=status.HTTP_201_CREATED)
async def upload_evidence(
    case_id: str,
    file: UploadFile = File(...),
    examiner_name: str = Form("SYSTEM")
):
    try:
        evidence = IngestionService.ingest_evidence(
            case_id=case_id,
            upload_file=file.file,
            original_filename=file.filename or "uploaded_evidence.bin",
            examiner_name=examiner_name
        )
        return evidence
    except ValidationError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Evidence ingestion error: {str(e)}")

@router.get("/cases/{case_id}/evidence", response_model=list[EvidenceResponse])
def list_case_evidence(case_id: str):
    return EvidenceService.list_evidence(case_id=case_id)

@router.get("/evidence", response_model=list[EvidenceResponse])
def list_all_evidence(
    case_id: Optional[str] = Query(None),
    file_format: Optional[str] = Query(None),
    search: Optional[str] = Query(None)
):
    return EvidenceService.list_evidence(case_id=case_id, file_format=file_format, search=search)

@router.get("/evidence/{evidence_id}", response_model=EvidenceResponse)
def get_evidence(evidence_id: str):
    ev = EvidenceService.get_evidence(evidence_id)
    if not ev:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Evidence '{evidence_id}' not found.")
    return ev

@router.get("/evidence/{evidence_id}/preview")
def get_evidence_preview(evidence_id: str):
    ev = EvidenceService.get_evidence(evidence_id)
    if not ev:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Evidence '{evidence_id}' not found.")
    
    # Check for thumbnail first
    thumb_path = settings.CASES_DIR / ev["case_id"] / "derived" / "thumbnails" / f"{evidence_id}_thumb.png"
    if thumb_path.exists():
        return FileResponse(path=thumb_path, media_type="image/png")
    
    # Fallback to original
    orig_path = Path(ev["file_path"])
    if not orig_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence file missing on disk.")
    
    media_map = {
        "JPEG": "image/jpeg",
        "PNG": "image/png",
        "TIFF": "image/tiff",
        "BMP": "image/bmp",
        "WEBP": "image/webp"
    }
    media_type = media_map.get(ev["file_format"].upper(), "application/octet-stream")
    return FileResponse(path=orig_path, media_type=media_type)

@router.get("/evidence/{evidence_id}/download")
def download_evidence(evidence_id: str):
    ev = EvidenceService.get_evidence(evidence_id)
    if not ev:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Evidence '{evidence_id}' not found.")
    
    orig_path = Path(ev["file_path"])
    if not orig_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence file missing on disk.")
        
    return FileResponse(
        path=orig_path,
        filename=ev["original_filename"],
        media_type="application/octet-stream"
    )

@router.post("/evidence/{evidence_id}/verify-integrity", response_model=IntegrityVerificationResponse)
def verify_integrity(evidence_id: str, examiner_name: str = Query("SYSTEM")):
    try:
        result = EvidenceService.verify_evidence_integrity(evidence_id=evidence_id, examiner_name=examiner_name)
        return result
    except FileNotFoundError as fe:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(fe))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.delete("/evidence/{evidence_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_evidence(evidence_id: str, examiner_name: str = Query("SYSTEM")):
    success = EvidenceService.delete_evidence(evidence_id=evidence_id, examiner_name=examiner_name)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Evidence '{evidence_id}' not found.")
    return None

