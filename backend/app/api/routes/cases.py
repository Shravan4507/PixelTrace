from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status
from backend.app.schemas.schemas import CaseCreate, CaseUpdate, CaseResponse
from backend.app.services.case_service import CaseService

router = APIRouter(prefix="/cases", tags=["Cases"])

@router.post("", response_model=CaseResponse, status_code=status.HTTP_201_CREATED)
def create_case(payload: CaseCreate):
    try:
        case = CaseService.create_case(
            title=payload.title,
            reference_number=payload.reference_number,
            examiner_name=payload.examiner_name,
            description=payload.description,
            notes=payload.notes
        )
        return case
    except Exception as e:
        if "UNIQUE constraint failed" in str(e):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Case reference number '{payload.reference_number}' already exists."
            )
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("", response_model=list[CaseResponse])
def list_cases(
    search: Optional[str] = Query(None, description="Search by title or reference number"),
    include_archived: bool = Query(True, description="Whether to include archived cases")
):
    return CaseService.list_cases(search=search, include_archived=include_archived)

@router.get("/{case_id}", response_model=CaseResponse)
def get_case(case_id: str):
    case = CaseService.get_case(case_id)
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Case '{case_id}' not found.")
    return case

@router.patch("/{case_id}", response_model=CaseResponse)
def update_case(case_id: str, payload: CaseUpdate):
    updates = payload.model_dump(exclude_unset=True)
    case = CaseService.update_case(case_id, updates)
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Case '{case_id}' not found.")
    return case

@router.delete("/{case_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_case(case_id: str):
    success = CaseService.delete_case(case_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Case '{case_id}' not found.")
    return None

