import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, BinaryIO
from PIL import Image

from backend.app.config import settings
from backend.app.core.database import get_db
from backend.app.services.audit_service import AuditService
from backend.app.services.hashing_service import HashingService
from backend.app.services.validation_service import ValidationService, ValidationError

class IngestionService:
    @classmethod
    def ingest_evidence(
        cls,
        case_id: str,
        upload_file: BinaryIO,
        original_filename: str,
        examiner_name: str = "SYSTEM"
    ) -> dict[str, Any]:
        """
        Securely ingests, validates, hashes, and stores an evidence image file.
        """
        # 1. Verify case exists
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM cases WHERE id = ?;", (case_id,))
            if not cursor.fetchone():
                raise ValueError(f"Target case ID '{case_id}' does not exist.")

        evidence_id = str(uuid.uuid4())
        sanitized_filename = ValidationService.sanitize_filename(original_filename)
        now_iso = datetime.now(timezone.utc).isoformat()

        # Temporary staging path
        temp_file_path = settings.TEMP_DIR / f"temp_{evidence_id}_{sanitized_filename}"

        try:
            # Stream upload into temporary buffer
            with open(temp_file_path, "wb") as buffer:
                shutil.copyfileobj(upload_file, buffer)

            # 2. Validation: magic bytes, dimensions, file size, corruption check
            detected_format, width, height, mode = ValidationService.validate_image_file(
                temp_file_path, original_filename
            )

            # 3. Cryptographic Hashing
            sha256_digest, md5_digest, file_size = HashingService.calculate_hashes(temp_file_path)

            # 4. Permanent Evidence Path
            case_evidence_dir = settings.CASES_DIR / case_id / "evidence"
            case_evidence_dir.mkdir(parents=True, exist_ok=True)
            stored_filename = f"{evidence_id}_{sanitized_filename}"
            permanent_file_path = case_evidence_dir / stored_filename

            # Move from temp to permanent storage
            shutil.copy2(temp_file_path, permanent_file_path)

            # 5. Verify stored copy digest matches original
            is_intact, stored_sha256 = HashingService.verify_integrity(permanent_file_path, sha256_digest)
            if not is_intact:
                permanent_file_path.unlink(missing_ok=True)
                raise RuntimeError(
                    f"Evidence storage integrity failure! Stored hash {stored_sha256} does not match initial ingest hash {sha256_digest}."
                )

            # 6. Generate lightweight UI thumbnail in derived directory
            thumb_dir = settings.CASES_DIR / case_id / "derived" / "thumbnails"
            thumb_dir.mkdir(parents=True, exist_ok=True)
            thumb_path = thumb_dir / f"{evidence_id}_thumb.png"

            try:
                with Image.open(permanent_file_path) as img:
                    img_thumb = img.convert("RGB")
                    img_thumb.thumbnail((400, 400))
                    img_thumb.save(thumb_path, format="PNG")
            except Exception:
                # If thumbnail generation fails, fallback to direct preview
                pass

            # 7. Record into SQLite database
            with get_db() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                INSERT INTO evidence (
                    id, case_id, original_filename, stored_filename,
                    file_format, file_size, width, height, color_mode,
                    sha256, md5, upload_timestamp, status, file_path
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'STORED', ?);
                """, (
                    evidence_id, case_id, original_filename, stored_filename,
                    detected_format, file_size, width, height, mode,
                    sha256_digest, md5_digest, now_iso, str(permanent_file_path)
                ))

            # 8. Record Chain of Custody Audit Events
            AuditService.log_event(
                event_type="EVIDENCE_IMPORTED",
                case_id=case_id,
                evidence_id=evidence_id,
                examiner_name=examiner_name,
                details={
                    "original_filename": original_filename,
                    "stored_filename": stored_filename,
                    "file_format": detected_format,
                    "file_size_bytes": file_size,
                    "dimensions": f"{width}x{height}",
                    "sha256": sha256_digest,
                    "md5": md5_digest
                }
            )

            AuditService.log_event(
                event_type="INITIAL_HASH_VERIFIED",
                case_id=case_id,
                evidence_id=evidence_id,
                examiner_name=examiner_name,
                details={
                    "algorithm": "SHA-256",
                    "digest": sha256_digest,
                    "status": "Verified Match"
                }
            )

            return {
                "id": evidence_id,
                "case_id": case_id,
                "original_filename": original_filename,
                "stored_filename": stored_filename,
                "file_format": detected_format,
                "file_size": file_size,
                "width": width,
                "height": height,
                "color_mode": mode,
                "sha256": sha256_digest,
                "md5": md5_digest,
                "upload_timestamp": now_iso,
                "status": "STORED",
                "file_path": str(permanent_file_path),
                "preview_url": f"/api/v1/evidence/{evidence_id}/preview"
            }

        finally:
            # Clean up temp file
            if temp_file_path.exists():
                temp_file_path.unlink(missing_ok=True)

