import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional
from backend.app.config import settings
from backend.app.core.database import get_db
from backend.app.services.audit_service import AuditService

class CaseService:
    @staticmethod
    def create_case(
        title: str,
        reference_number: str,
        examiner_name: str,
        description: Optional[str] = "",
        notes: Optional[str] = ""
    ) -> dict[str, Any]:
        case_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        
        # Create case dedicated filesystem directories
        case_dir = settings.CASES_DIR / case_id
        (case_dir / "evidence").mkdir(parents=True, exist_ok=True)
        (case_dir / "derived" / "thumbnails").mkdir(parents=True, exist_ok=True)
        (case_dir / "derived" / "ela").mkdir(parents=True, exist_ok=True)
        (case_dir / "reports").mkdir(parents=True, exist_ok=True)

        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO cases (id, title, reference_number, examiner_name, description, status, is_archived, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 'OPEN', 0, ?, ?, ?);
            """, (case_id, title.strip(), reference_number.strip(), examiner_name.strip(), description or "", notes or "", now, now))

        AuditService.log_event(
            event_type="CASE_CREATED",
            case_id=case_id,
            examiner_name=examiner_name,
            details={"title": title, "reference_number": reference_number}
        )

        return CaseService.get_case(case_id)  # type: ignore

    @staticmethod
    def get_case(case_id: str) -> Optional[dict[str, Any]]:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM cases WHERE id = ?;", (case_id,))
            row = cursor.fetchone()
            if not row:
                return None
            
            cursor.execute("SELECT COUNT(*) as cnt FROM evidence WHERE case_id = ?;", (case_id,))
            cnt_row = cursor.fetchone()
            evidence_count = cnt_row["cnt"] if cnt_row else 0

            return {
                "id": row["id"],
                "title": row["title"],
                "reference_number": row["reference_number"],
                "examiner_name": row["examiner_name"],
                "description": row["description"],
                "status": row["status"],
                "is_archived": bool(row["is_archived"]),
                "notes": row["notes"],
                "created_at": row["created_at"],
                "updated_at": row["updated_at"],
                "evidence_count": evidence_count
            }

    @staticmethod
    def list_cases(search: Optional[str] = None, include_archived: bool = True) -> list[dict[str, Any]]:
        query = "SELECT c.*, (SELECT COUNT(*) FROM evidence e WHERE e.case_id = c.id) as evidence_count FROM cases c WHERE 1=1"
        params: list[Any] = []
        
        if not include_archived:
            query += " AND c.is_archived = 0"
        if search:
            query += " AND (c.title LIKE ? OR c.reference_number LIKE ? OR c.examiner_name LIKE ?)"
            term = f"%{search.strip()}%"
            params.extend([term, term, term])
        
        query += " ORDER BY c.created_at DESC"

        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            rows = cursor.fetchall()
            return [
                {
                    "id": r["id"],
                    "title": r["title"],
                    "reference_number": r["reference_number"],
                    "examiner_name": r["examiner_name"],
                    "description": r["description"],
                    "status": r["status"],
                    "is_archived": bool(r["is_archived"]),
                    "notes": r["notes"],
                    "created_at": r["created_at"],
                    "updated_at": r["updated_at"],
                    "evidence_count": r["evidence_count"]
                }
                for r in rows
            ]

    @staticmethod
    def update_case(case_id: str, updates: dict[str, Any], examiner_name: Optional[str] = "SYSTEM") -> Optional[dict[str, Any]]:
        existing = CaseService.get_case(case_id)
        if not existing:
            return None

        fields = []
        params = []
        now = datetime.now(timezone.utc).isoformat()

        for k, v in updates.items():
            if k in ("title", "examiner_name", "description", "notes", "status"):
                fields.append(f"{k} = ?")
                params.append(v)
            elif k == "is_archived":
                fields.append("is_archived = ?")
                params.append(1 if v else 0)

        if not fields:
            return existing

        fields.append("updated_at = ?")
        params.append(now)
        params.append(case_id)

        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(f"UPDATE cases SET {', '.join(fields)} WHERE id = ?;", params)

        AuditService.log_event(
            event_type="CASE_UPDATED",
            case_id=case_id,
            examiner_name=examiner_name,
            details=updates
        )

        return CaseService.get_case(case_id)

    @staticmethod
    def delete_case(case_id: str, examiner_name: Optional[str] = "SYSTEM") -> bool:
        existing = CaseService.get_case(case_id)
        if not existing:
            return False

        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM cases WHERE id = ?;", (case_id,))

        # Remove on-disk directory safely
        case_dir = settings.CASES_DIR / case_id
        if case_dir.exists():
            shutil.rmtree(case_dir, ignore_errors=True)

        AuditService.log_event(
            event_type="CASE_DELETED",
            case_id=case_id,
            examiner_name=examiner_name,
            details={"deleted_reference_number": existing["reference_number"], "title": existing["title"]}
        )
        return True

