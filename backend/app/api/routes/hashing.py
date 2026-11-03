from pathlib import Path
from fastapi import APIRouter, HTTPException, status
from backend.app.schemas.schemas import HashResponse, HashCompareRequest, HashCompareResponse
from backend.app.services.evidence_service import EvidenceService
from backend.app.services.hashing_service import HashingService
from backend.app.services.audit_service import AuditService

router = APIRouter(tags=["Hashing"])

@router.post("/evidence/{evidence_id}/hash", response_model=HashResponse)
def get_evidence_hash_post(evidence_id: str):
    return _get_evidence_hash(evidence_id)

@router.get("/evidence/{evidence_id}/hash", response_model=HashResponse)
def get_evidence_hash_get(evidence_id: str):
    return _get_evidence_hash(evidence_id)

def _get_evidence_hash(evidence_id: str) -> HashResponse:
    evidence = EvidenceService.get_evidence(evidence_id)
    if not evidence:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Evidence '{evidence_id}' not found.")

    file_path = Path(evidence["file_path"])
    if not file_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence file missing on disk.")

    sha256, md5, byte_count = HashingService.calculate_hashes(file_path)

    AuditService.log_event(
        event_type="HASH_GENERATED",
        case_id=evidence["case_id"],
        evidence_id=evidence_id,
        details={"sha256": sha256, "md5": md5, "byte_count": byte_count}
    )

    return HashResponse(
        evidence_id=evidence_id,
        original_filename=evidence["original_filename"],
        sha256=sha256,
        md5=md5,
        algorithm_default="SHA-256",
        byte_count=byte_count
    )

@router.post("/comparison/hash", response_model=HashCompareResponse)
def compare_hashes(payload: HashCompareRequest):
    ref_ev = EvidenceService.get_evidence(payload.reference_evidence_id)
    if not ref_ev:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Reference evidence '{payload.reference_evidence_id}' not found.")

    tgt_ev = EvidenceService.get_evidence(payload.target_evidence_id)
    if not tgt_ev:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Target evidence '{payload.target_evidence_id}' not found.")

    ref_hash = ref_ev["sha256"] if payload.algorithm.upper() == "SHA-256" else ref_ev["md5"]
    tgt_hash = tgt_ev["sha256"] if payload.algorithm.upper() == "SHA-256" else tgt_ev["md5"]

    is_match = HashingService.compare_hashes(ref_hash, tgt_hash)
    status_label = "Exact binary match" if is_match else "Binary mismatch detected"

    note = (
        "Exact binary match confirms the two files have identical byte streams under the evaluated algorithm."
        if is_match else
        "Binary mismatch detected: The files differ in their underlying bytes. This may reflect re-encoding, editing, or different origin."
    )

    AuditService.log_event(
        event_type="HASH_COMPARISON_PERFORMED",
        case_id=ref_ev["case_id"],
        evidence_id=ref_ev["id"],
        details={
            "reference_id": ref_ev["id"],
            "target_id": tgt_ev["id"],
            "algorithm": payload.algorithm.upper(),
            "status": status_label,
            "is_match": is_match
        }
    )

    return HashCompareResponse(
        reference_id=ref_ev["id"],
        reference_filename=ref_ev["original_filename"],
        reference_hash=ref_hash,
        target_id=tgt_ev["id"],
        target_filename=tgt_ev["original_filename"],
        target_hash=tgt_hash,
        algorithm=payload.algorithm.upper(),
        is_match=is_match,
        status_label=status_label,
        scientific_note=note
    )

