import uuid
from pathlib import Path
from typing import Any, Optional
import numpy as np
from PIL import Image
from backend.app.core.database import get_db
from backend.app.services.hashing_service import HashingService
from backend.app.services.audit_service import AuditService

class ComparisonService:
    @classmethod
    def compare_images(
        cls,
        case_id: Optional[str],
        reference_evidence: dict[str, Any],
        target_evidence: dict[str, Any],
        examiner_name: Optional[str] = "SYSTEM"
    ) -> dict[str, Any]:
        """
        Conducts forensic cryptographic and visual comparison between reference and target evidence.
        """
        ref_path = Path(reference_evidence["file_path"])
        tgt_path = Path(target_evidence["file_path"])

        if not ref_path.exists() or not tgt_path.exists():
            raise FileNotFoundError("One or both evidence files could not be located on disk.")

        # 1. Cryptographic comparison
        ref_sha256 = reference_evidence.get("sha256") or HashingService.calculate_sha256(ref_path)
        tgt_sha256 = target_evidence.get("sha256") or HashingService.calculate_sha256(tgt_path)
        
        is_exact_match = HashingService.compare_hashes(ref_sha256, tgt_sha256)
        hash_status_label = "Exact binary match" if is_exact_match else "Binary mismatch detected"

        # 2. Structural & property comparison
        ref_size = ref_path.stat().st_size
        tgt_size = tgt_path.stat().st_size
        size_diff = tgt_size - ref_size

        ref_width = reference_evidence.get("width", 0)
        ref_height = reference_evidence.get("height", 0)
        tgt_width = target_evidence.get("width", 0)
        tgt_height = target_evidence.get("height", 0)

        dimensions_match = (ref_width == tgt_width and ref_height == tgt_height)

        # 3. Visual MSE calculation (if dimensions match)
        mse: Optional[float] = None
        if dimensions_match:
            try:
                with Image.open(ref_path) as r_img, Image.open(tgt_path) as t_img:
                    r_arr = np.array(r_img.convert("RGB"), dtype=np.float32)
                    t_arr = np.array(t_img.convert("RGB"), dtype=np.float32)
                    mse = float(np.mean((r_arr - t_arr) ** 2))
            except Exception:
                mse = None

        # Summary observation
        if is_exact_match:
            summary = "Files are bit-for-bit identical across their entire binary stream."
        elif dimensions_match and mse is not None and mse == 0.0:
            summary = "Pixel raster values are visually identical; binary mismatch reflects metadata or compression header variations."
        elif dimensions_match and mse is not None and mse > 0.0:
            summary = f"Binary mismatch detected. Image raster values diverge with a Mean Squared Error of {mse:.2f}."
        else:
            summary = (
                f"Binary mismatch detected with dimension divergence ({ref_width}x{ref_height} vs {tgt_width}x{tgt_height}). "
                "Different aspect ratios or cropping detected."
            )

        comparison_id = str(uuid.uuid4())
        
        # Record comparison into database
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO comparisons (
                id, case_id, reference_evidence_id, target_evidence_id,
                algorithm, is_match, reference_hash, target_hash,
                comparison_details_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'));
            """, (
                comparison_id,
                case_id,
                reference_evidence["id"],
                target_evidence["id"],
                "SHA-256",
                1 if is_exact_match else 0,
                ref_sha256,
                tgt_sha256,
                str({"mse": mse, "size_diff": size_diff, "summary": summary})
            ))

        # Log audit event
        AuditService.log_event(
            event_type="HASH_COMPARISON_PERFORMED",
            case_id=case_id,
            evidence_id=reference_evidence["id"],
            examiner_name=examiner_name,
            details={
                "comparison_id": comparison_id,
                "reference_evidence_id": reference_evidence["id"],
                "target_evidence_id": target_evidence["id"],
                "is_match": is_exact_match,
                "hash_status_label": hash_status_label,
                "algorithm": "SHA-256"
            }
        )

        return {
            "reference_id": reference_evidence["id"],
            "reference_filename": reference_evidence["original_filename"],
            "reference_format": reference_evidence["file_format"],
            "reference_size": ref_size,
            "reference_dimensions": f"{ref_width}x{ref_height}",
            "reference_sha256": ref_sha256,
            "reference_preview_url": f"/api/v1/evidence/{reference_evidence['id']}/preview",
            "target_id": target_evidence["id"],
            "target_filename": target_evidence["original_filename"],
            "target_format": target_evidence["file_format"],
            "target_size": tgt_size,
            "target_dimensions": f"{tgt_width}x{tgt_height}",
            "target_sha256": tgt_sha256,
            "target_preview_url": f"/api/v1/evidence/{target_evidence['id']}/preview",
            "binary_match": is_exact_match,
            "hash_status_label": hash_status_label,
            "dimensions_match": dimensions_match,
            "size_difference_bytes": size_diff,
            "mean_squared_error": round(mse, 4) if mse is not None else None,
            "comparison_summary": summary,
            "scientific_disclaimer": (
                "The examiner explicitly assigns reference status. An exact binary match confirms identical "
                "file bytes but does not independently prove authenticity. A binary mismatch indicates divergence "
                "which may stem from benign re-encoding or intentional manipulation."
            )
        }

