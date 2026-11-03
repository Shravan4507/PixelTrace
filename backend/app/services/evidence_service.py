from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional
from backend.app.config import settings
from backend.app.core.database import get_db
from backend.app.services.audit_service import AuditService
from backend.app.services.hashing_service import HashingService

class EvidenceService:
    @staticmethod
    def get_evidence(evidence_id: str) -> Optional[dict[str, Any]]:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM evidence WHERE id = ?;", (evidence_id,))
            row = cursor.fetchone()
            if not row:
                return None
            return {
                "id": row["id"],
                "case_id": row["case_id"],
                "original_filename": row["original_filename"],
                "stored_filename": row["stored_filename"],
                "file_format": row["file_format"],
                "file_size": row["file_size"],
                "width": row["width"],
                "height": row["height"],
                "color_mode": row["color_mode"],
                "sha256": row["sha256"],
                "md5": row["md5"],
                "upload_timestamp": row["upload_timestamp"],
                "status": row["status"],
                "file_path": row["file_path"],
                "preview_url": f"/api/v1/evidence/{row['id']}/preview"
            }

    @staticmethod
    def list_evidence(
        case_id: Optional[str] = None,
        file_format: Optional[str] = None,
        search: Optional[str] = None
    ) -> list[dict[str, Any]]:
        query = "SELECT * FROM evidence WHERE 1=1"
        params: list[Any] = []

        if case_id:
            query += " AND case_id = ?"
            params.append(case_id)
        if file_format:
            query += " AND file_format = ?"
            params.append(file_format.upper())
        if search:
            query += " AND (original_filename LIKE ? OR sha256 LIKE ? OR id LIKE ?)"
            term = f"%{search.strip()}%"
            params.extend([term, term, term])

        query += " ORDER BY upload_timestamp DESC"

        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            rows = cursor.fetchall()
            return [
                {
                    "id": r["id"],
                    "case_id": r["case_id"],
                    "original_filename": r["original_filename"],
                    "stored_filename": r["stored_filename"],
                    "file_format": r["file_format"],
                    "file_size": r["file_size"],
                    "width": r["width"],
                    "height": r["height"],
                    "color_mode": r["color_mode"],
                    "sha256": r["sha256"],
                    "md5": r["md5"],
                    "upload_timestamp": r["upload_timestamp"],
                    "status": r["status"],
                    "file_path": r["file_path"],
                    "preview_url": f"/api/v1/evidence/{r['id']}/preview"
                }
                for r in rows
            ]

    @staticmethod
    def verify_evidence_integrity(evidence_id: str, examiner_name: str = "SYSTEM") -> dict[str, Any]:
        evidence = EvidenceService.get_evidence(evidence_id)
        if not evidence:
            raise FileNotFoundError(f"Evidence record '{evidence_id}' not found.")

        file_path = Path(evidence["file_path"])
        if not file_path.exists():
            raise FileNotFoundError(f"Physical evidence file missing on disk: {file_path}")

        recorded_sha256 = evidence["sha256"]
        is_intact, current_sha256 = HashingService.verify_integrity(file_path, recorded_sha256)

        status_label = "Exact binary match (Integrity Intact)" if is_intact else "CRITICAL INTEGRITY VIOLATION (Hash Mismatch)"
        now_iso = datetime.now(timezone.utc).isoformat()

        notes = (
            "Current file on disk matches original recorded ingestion hash byte-for-byte."
            if is_intact else
            "WARNING: The file on disk has changed or has been corrupted since initial ingestion."
        )

        AuditService.log_event(
            event_type="INTEGRITY_VERIFICATION",
            case_id=evidence["case_id"],
            evidence_id=evidence_id,
            examiner_name=examiner_name,
            details={
                "recorded_sha256": recorded_sha256,
                "computed_sha256": current_sha256,
                "is_intact": is_intact,
                "status": status_label
            }
        )

        return {
            "evidence_id": evidence_id,
            "original_filename": evidence["original_filename"],
            "recorded_sha256": recorded_sha256,
            "computed_sha256": current_sha256,
            "is_intact": is_intact,
            "status_label": status_label,
            "verified_at": now_iso,
            "notes": notes
        }

    @staticmethod
    def delete_evidence(evidence_id: str, examiner_name: str = "SYSTEM") -> bool:
        evidence = EvidenceService.get_evidence(evidence_id)
        if not evidence:
            return False

        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM evidence WHERE id = ?;", (evidence_id,))

        # Unlink original file
        file_path = Path(evidence["file_path"])
        if file_path.exists():
            file_path.unlink(missing_ok=True)

        # Unlink thumbnail if present
        case_id = evidence["case_id"]
        thumb_path = settings.CASES_DIR / case_id / "derived" / "thumbnails" / f"{evidence_id}_thumb.png"
        if thumb_path.exists():
            thumb_path.unlink(missing_ok=True)

        AuditService.log_event(
            event_type="EVIDENCE_DELETED",
            case_id=case_id,
            evidence_id=evidence_id,
            examiner_name=examiner_name,
            details={"original_filename": evidence["original_filename"], "sha256": evidence["sha256"]}
        )
        return True

