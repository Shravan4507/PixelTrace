from fastapi import APIRouter, HTTPException, status
from backend.app.schemas.schemas import ImageCompareRequest, ImageCompareResponse
from backend.app.services.evidence_service import EvidenceService
from backend.app.services.comparison_service import ComparisonService

router = APIRouter(prefix="/comparison", tags=["Comparison Workspace"])

@router.post("/images", response_model=ImageCompareResponse)
def compare_images(payload: ImageCompareRequest):
    ref_ev = EvidenceService.get_evidence(payload.reference_evidence_id)
    if not ref_ev:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Reference evidence '{payload.reference_evidence_id}' not found."
        )

    tgt_ev = EvidenceService.get_evidence(payload.target_evidence_id)
    if not tgt_ev:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Target evidence '{payload.target_evidence_id}' not found."
        )

    try:
        case_id = payload.case_id or ref_ev["case_id"]
        result = ComparisonService.compare_images(
            case_id=case_id,
            reference_evidence=ref_ev,
            target_evidence=tgt_ev
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Comparison failed: {str(e)}")

