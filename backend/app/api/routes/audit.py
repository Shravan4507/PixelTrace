from typing import Optional
from fastapi import APIRouter, Query
from backend.app.schemas.schemas import AuditEventResponse
from backend.app.services.audit_service import AuditService

router = APIRouter(tags=["Audit & Chain of Custody"])

@router.get("/cases/{case_id}/audit-log", response_model=list[AuditEventResponse])
def get_case_audit_log(case_id: str, limit: int = Query(100, ge=1, le=500)):
    return AuditService.get_events(case_id=case_id, limit=limit)

@router.get("/audit-log", response_model=list[AuditEventResponse])
def get_all_audit_logs(
    case_id: Optional[str] = Query(None),
    evidence_id: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500)
):
    return AuditService.get_events(case_id=case_id, evidence_id=evidence_id, limit=limit)

