import json
from fastapi import APIRouter
from backend.app.core.database import get_db
from backend.app.schemas.schemas import DashboardStats

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats():
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Total cases
        cursor.execute("SELECT COUNT(*) as cnt FROM cases;")
        total_cases = cursor.fetchone()["cnt"]

        # Total evidence
        cursor.execute("SELECT COUNT(*) as cnt FROM evidence;")
        total_evidence = cursor.fetchone()["cnt"]

        # Recent cases
        cursor.execute("""
        SELECT c.*, (SELECT COUNT(*) FROM evidence e WHERE e.case_id = c.id) as evidence_count
        FROM cases c
        ORDER BY c.created_at DESC LIMIT 5;
        """)
        recent_cases = [dict(r) for r in cursor.fetchall()]

        # Recent analyses
        cursor.execute("""
        SELECT a.id, a.case_id, a.evidence_id, a.analysis_type, a.created_at,
               e.original_filename, a.results_json
        FROM analyses a
        LEFT JOIN evidence e ON a.evidence_id = e.id
        ORDER BY a.created_at DESC LIMIT 5;
        """)
        raw_analyses = cursor.fetchall()
        recent_analyses = []
        for r in raw_analyses:
            item = dict(r)
            try:
                item["results"] = json.loads(r["results_json"] or "{}")
            except Exception:
                item["results"] = {}
            recent_analyses.append(item)

        # Recent reports
        cursor.execute("""
        SELECT id, case_id, evidence_id, report_format, title, file_size, examiner_name, generated_at
        FROM reports
        ORDER BY generated_at DESC LIMIT 5;
        """)
        recent_reports = [dict(r) for r in cursor.fetchall()]

    return DashboardStats(
        total_cases=total_cases,
        total_evidence=total_evidence,
        recent_analyses=recent_analyses,
        recent_cases=recent_cases,
        recent_reports=recent_reports
    )

