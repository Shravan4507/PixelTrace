from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import FileResponse
from backend.app.schemas.schemas import ReportCreateRequest, ReportResponse
from backend.app.services.report_service import ReportService

router = APIRouter(tags=["Forensic Reports"])

@router.post("/cases/{case_id}/reports", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
def generate_report(case_id: str, payload: ReportCreateRequest):
    try:
        report = ReportService.generate_report(
            case_id=case_id,
            evidence_id=payload.evidence_id,
            report_format=payload.report_format,
            title=payload.title,
            examiner_name=payload.examiner_name,
            include_ela=payload.include_ela,
            include_metadata=payload.include_metadata,
            include_chain_of_custody=payload.include_chain_of_custody
        )
        return report
    except FileNotFoundError as fe:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(fe))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Report generation error: {str(e)}")

@router.get("/cases/{case_id}/reports", response_model=list[ReportResponse])
def list_case_reports(case_id: str):
    return ReportService.list_reports(case_id=case_id)

@router.get("/reports", response_model=list[ReportResponse])
def list_all_reports(case_id: Optional[str] = Query(None)):
    return ReportService.list_reports(case_id=case_id)

@router.get("/reports/{report_id}/download")
def download_report(report_id: str):
    report = ReportService.get_report(report_id)
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Report '{report_id}' not found.")

    report_path = Path(report["file_path"])
    if not report_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report file missing on disk.")

    media_type = "application/pdf" if report["report_format"] == "PDF" else "application/json"
    filename = report_path.name

    return FileResponse(
        path=report_path,
        filename=filename,
        media_type=media_type
    )

