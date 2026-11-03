import json
import uuid
from datetime import datetime, timezone
from typing import Optional, Any
from backend.app.core.database import get_db

class AuditService:
    @staticmethod
    def log_event(
        event_type: str,
        case_id: Optional[str] = None,
        evidence_id: Optional[str] = None,
        examiner_name: Optional[str] = "SYSTEM",
        details: Optional[dict[str, Any]] = None
    ) -> str:
        event_id = str(uuid.uuid4())
        timestamp = datetime.now(timezone.utc).isoformat()
        details_json = json.dumps(details or {}, ensure_ascii=False)
        
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO audit_events (id, case_id, evidence_id, event_type, timestamp, examiner_name, details_json)
            VALUES (?, ?, ?, ?, ?, ?, ?);
            """, (event_id, case_id, evidence_id, event_type, timestamp, examiner_name, details_json))
        
        return event_id

    @staticmethod
    def get_events(case_id: Optional[str] = None, evidence_id: Optional[str] = None, limit: int = 100) -> list[dict[str, Any]]:
        query = "SELECT * FROM audit_events WHERE 1=1"
        params: list[Any] = []
        if case_id:
            query += " AND case_id = ?"
            params.append(case_id)
        if evidence_id:
            query += " AND evidence_id = ?"
            params.append(evidence_id)
        query += " ORDER BY timestamp DESC LIMIT ?"
        params.append(limit)
        
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            rows = cursor.fetchall()
            events = []
            for row in rows:
                events.append({
                    "id": row["id"],
                    "case_id": row["case_id"],
                    "evidence_id": row["evidence_id"],
                    "event_type": row["event_type"],
                    "timestamp": row["timestamp"],
                    "examiner_name": row["examiner_name"],
                    "details": json.loads(row["details_json"] or "{}")
                })
            return events

