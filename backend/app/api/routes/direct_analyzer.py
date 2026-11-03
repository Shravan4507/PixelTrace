import json
import shutil
import uuid
from pathlib import Path
from typing import Optional
import numpy as np
from PIL import Image
from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse

from backend.app.config import settings
from backend.app.services.hashing_service import HashingService
from backend.app.services.validation_service import ValidationService, ValidationError
from backend.app.services.metadata_service import MetadataService
from backend.app.services.ela_service import ELAService
from backend.app.services.direct_report_service import DirectReportService

router = APIRouter(tags=["Forensic Analyzer"])

ARTIFACTS_DIR = settings.DATA_DIR / "temporary" / "artifacts"
ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

@router.post("/analyze", status_code=status.HTTP_200_OK)
async def analyze_image(
    file: UploadFile = File(...),
    quality: int = Form(95),
    scale: int = Form(15),
    examiner_name: str = Form("Forensic Examiner")
):
    """
    Direct zero-friction image analysis:
    Upload an image and instantly receive EXIF metadata, cryptographic hashes,
    Error Level Analysis (ELA), and an exportable PDF report.
    """
    session_id = str(uuid.uuid4())
    original_filename = file.filename or "suspect_image.jpg"
    sanitized_name = ValidationService.sanitize_filename(original_filename)
    
    temp_target = ARTIFACTS_DIR / f"{session_id}_{sanitized_name}"
    
    try:
        # Stream file to local artifact directory
        with open(temp_target, "wb") as f:
            shutil.copyfileobj(file.file, f)

        # 1. Validation
        detected_format, width, height, mode = ValidationService.validate_image_file(temp_target, original_filename)
        file_size = temp_target.stat().st_size

        # 2. Cryptographic Hashes
        sha256_hash, md5_hash, _ = HashingService.calculate_hashes(temp_target)

        # 3. Metadata Extraction
        metadata = MetadataService.extract_metadata(temp_target)

        # 4. Preview generation
        preview_path = ARTIFACTS_DIR / f"{session_id}_preview.png"
        with Image.open(temp_target) as img:
            rgb_preview = img.convert("RGB")
            rgb_preview.thumbnail((1200, 1200))
            rgb_preview.save(preview_path, format="PNG")

        # 5. Error Level Analysis (ELA)
        ela_dir = ARTIFACTS_DIR / f"{session_id}_ela"
        ela_res = ELAService.perform_ela(
            evidence_file_path=temp_target,
            output_dir=ela_dir,
            quality=quality,
            scale=scale
        )

        # Move/link ELA output to public artifact path
        ela_artifact_name = f"{session_id}_ela.png"
        ela_public_path = ARTIFACTS_DIR / ela_artifact_name
        shutil.copy2(ela_res["artifact_path"], ela_public_path)

        # 6. Generate Formal PDF Report
        pdf_path = DirectReportService.generate_pdf(
            filename=original_filename,
            file_size=file_size,
            format_name=detected_format,
            dimensions=f"{width} x {height} px",
            sha256_hash=sha256_hash,
            md5_hash=md5_hash,
            metadata=metadata,
            ela_data=ela_res,
            ela_image_path=str(ela_public_path),
            examiner_name=examiner_name
        )

        return {
            "session_id": session_id,
            "file_info": {
                "filename": original_filename,
                "file_size": file_size,
                "width": width,
                "height": height,
                "dimensions": f"{width} x {height} px",
                "format": detected_format,
                "color_mode": mode,
                "preview_url": f"/api/v1/artifacts/{session_id}_preview.png"
            },
            "hashes": {
                "sha256": sha256_hash,
                "md5": md5_hash
            },
            "metadata": metadata,
            "ela": {
                "quality": quality,
                "scale": scale,
                "mean_error": ela_res["mean_error"],
                "max_error": ela_res["max_error"],
                "error_standard_deviation": ela_res["error_standard_deviation"],
                "potential_anomaly_detected": ela_res["potential_anomaly_detected"],
                "anomaly_reason": ela_res["anomaly_reason"],
                "format_warning": ela_res.get("format_warning"),
                "scientific_disclaimer": ela_res["scientific_disclaimer"],
                "ela_image_url": f"/api/v1/artifacts/{ela_artifact_name}"
            },
            "pdf_report_url": f"/api/v1/artifacts/{pdf_path.name}"
        }

    except ValidationError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Forensic analysis failed: {str(e)}")

@router.post("/compare", status_code=status.HTTP_200_OK)
async def compare_two_images(
    reference_file: UploadFile = File(...),
    comparison_file: UploadFile = File(...)
):
    """
    Direct dual-image comparison:
    Upload Reference and Comparison image to evaluate cryptographic matching,
    dimensional variance, and pixel divergence (MSE).
    """
    session_id = str(uuid.uuid4())
    ref_name = ValidationService.sanitize_filename(reference_file.filename or "reference.jpg")
    cmp_name = ValidationService.sanitize_filename(comparison_file.filename or "suspect.jpg")

    ref_path = ARTIFACTS_DIR / f"{session_id}_ref_{ref_name}"
    cmp_path = ARTIFACTS_DIR / f"{session_id}_cmp_{cmp_name}"

    try:
        with open(ref_path, "wb") as f:
            shutil.copyfileobj(reference_file.file, f)
        with open(cmp_path, "wb") as f:
            shutil.copyfileobj(comparison_file.file, f)

        ref_fmt, ref_w, ref_h, _ = ValidationService.validate_image_file(ref_path, reference_file.filename or "ref")
        cmp_fmt, cmp_w, cmp_h, _ = ValidationService.validate_image_file(cmp_path, comparison_file.filename or "cmp")

        ref_sha256, ref_md5, ref_size = HashingService.calculate_hashes(ref_path)
        cmp_sha256, cmp_md5, cmp_size = HashingService.calculate_hashes(cmp_path)

        is_exact_match = HashingService.compare_hashes(ref_sha256, cmp_sha256)
        status_label = "Exact binary match" if is_exact_match else "Binary mismatch detected"

        # Generate previews
        ref_prev = ARTIFACTS_DIR / f"{session_id}_ref_prev.png"
        cmp_prev = ARTIFACTS_DIR / f"{session_id}_cmp_prev.png"

        with Image.open(ref_path) as r_img:
            r_img.convert("RGB").save(ref_prev, format="PNG")
        with Image.open(cmp_path) as c_img:
            c_img.convert("RGB").save(cmp_prev, format="PNG")

        # Mean Squared Error calculation
        mse = None
        dimensions_match = (ref_w == cmp_w and ref_h == cmp_h)
        if dimensions_match:
            try:
                with Image.open(ref_path) as r_img, Image.open(cmp_path) as c_img:
                    r_arr = np.array(r_img.convert("RGB"), dtype=np.float32)
                    c_arr = np.array(c_img.convert("RGB"), dtype=np.float32)
                    mse = round(float(np.mean((r_arr - c_arr) ** 2)), 4)
            except Exception:
                mse = None

        if is_exact_match:
            summary = "Both files are bit-for-bit identical across their entire binary streams."
        elif dimensions_match and mse == 0.0:
            summary = "Pixel rasters are visually identical; binary divergence arises from compression metadata or container headers."
        elif dimensions_match and mse is not None and mse > 0.0:
            summary = f"Binary mismatch detected. Image raster values diverge with a Mean Squared Error of {mse:.2f}."
        else:
            summary = f"Binary mismatch with differing dimensions ({ref_w}x{ref_h} vs {cmp_w}x{cmp_h})."

        return {
            "reference": {
                "filename": reference_file.filename,
                "format": ref_fmt,
                "size_bytes": ref_size,
                "dimensions": f"{ref_w} x {ref_h} px",
                "sha256": ref_sha256,
                "md5": ref_md5,
                "preview_url": f"/api/v1/artifacts/{session_id}_ref_prev.png"
            },
            "comparison": {
                "filename": comparison_file.filename,
                "format": cmp_fmt,
                "size_bytes": cmp_size,
                "dimensions": f"{cmp_w} x {cmp_h} px",
                "sha256": cmp_sha256,
                "md5": cmp_md5,
                "preview_url": f"/api/v1/artifacts/{session_id}_cmp_prev.png"
            },
            "is_exact_match": is_exact_match,
            "status_label": status_label,
            "dimensions_match": dimensions_match,
            "size_difference_bytes": cmp_size - ref_size,
            "mean_squared_error": mse,
            "summary": summary
        }

    except ValidationError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Comparison failed: {str(e)}")

@router.get("/artifacts/{filename}")
def get_artifact(filename: str):
    """Serves forensic artifacts (previews, ELA maps, PDF reports) securely."""
    # Prevent path traversal
    safe_name = Path(filename).name
    file_path = ARTIFACTS_DIR / safe_name
    if not file_path.exists():
        # Check in data/reports
        file_path = settings.DATA_DIR / "reports" / safe_name
        if not file_path.exists():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Artifact file not found.")

    if safe_name.endswith(".pdf"):
        media_type = "application/pdf"
    elif safe_name.endswith(".png"):
        media_type = "image/png"
    elif safe_name.endswith(".jpg") or safe_name.endswith(".jpeg"):
        media_type = "image/jpeg"
    else:
        media_type = "application/octet-stream"

    return FileResponse(file_path, media_type=media_type)
