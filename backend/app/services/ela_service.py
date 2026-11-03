import io
import uuid
from pathlib import Path
from typing import Any
import numpy as np
from PIL import Image
from backend.app.config import settings
from backend.app.core.logging import logger

class ELAService:
    @classmethod
    def perform_ela(
        cls,
        evidence_file_path: Path,
        output_dir: Path,
        quality: int = 95,
        scale: int = 15
    ) -> dict[str, Any]:
        """
        Executes Error Level Analysis on the target image.
        Outputs an amplified pixel difference artifact and computes statistical error metrics.
        """
        if not evidence_file_path.exists():
            raise FileNotFoundError(f"Evidence file not found: {evidence_file_path}")

        quality = max(50, min(100, int(quality)))
        scale = max(1, min(50, int(scale)))
        
        output_dir.mkdir(parents=True, exist_ok=True)
        analysis_id = str(uuid.uuid4())
        artifact_filename = f"{analysis_id}_ela.png"
        artifact_path = output_dir / artifact_filename

        # 1. Load original image as RGB
        with Image.open(evidence_file_path) as orig_img:
            original_format = orig_img.format or "UNKNOWN"
            is_jpeg = (original_format.upper() in ("JPEG", "JPG"))
            
            # Convert to RGB to ensure uniform 3-channel evaluation
            orig_rgb = orig_img.convert("RGB")
            orig_array = np.array(orig_rgb, dtype=np.int16)

        # 2. Recompress working copy in memory at specified JPEG quality
        buffer = io.BytesIO()
        orig_rgb.save(buffer, format="JPEG", quality=quality)
        buffer.seek(0)

        # 3. Decode recompressed image
        with Image.open(buffer) as recompressed_img:
            recompressed_rgb = recompressed_img.convert("RGB")
            recompressed_array = np.array(recompressed_rgb, dtype=np.int16)

        # 4. Compute absolute difference per pixel channel
        diff_array = np.abs(orig_array - recompressed_array)

        # 5. Amplify pixel difference for visualization
        amplified_array = np.clip(diff_array * scale, 0, 255).astype(np.uint8)

        # 6. Save separate ELA artifact image
        ela_image = Image.fromarray(amplified_array, mode="RGB")
        ela_image.save(artifact_path, format="PNG")
        logger.info(f"Generated ELA artifact: {artifact_path}")

        # 7. Calculate empirical statistical metrics
        mean_err = float(np.mean(diff_array))
        max_err = int(np.max(diff_array))
        std_err = float(np.std(diff_array))

        # Objective scientific anomaly evaluation
        format_warning = None
        if not is_jpeg:
            format_warning = (
                f"Original file is formatted as {original_format}. ELA is intended for JPEG compression analysis. "
                "Non-JPEG images do not possess historical JPEG quantization tables; this analysis represents an "
                "experimental recompression artifact rather than standard JPEG compression analysis."
            )

        # Empirical observation (evidence-based terminology)
        potential_anomaly = False
        anomaly_reason = "No notable ELA anomaly observed."
        
        if is_jpeg:
            # Significant standard deviation or extreme peak differences indicate localized variance
            if std_err > 4.5 or (max_err > 35 and mean_err < 5.0):
                potential_anomaly = True
                anomaly_reason = (
                    "Potential compression anomaly observed: Notable variance in error levels across image regions. "
                    "Further forensic examination recommended."
                )
            else:
                anomaly_reason = "Relatively consistent compression error levels observed across image surfaces."
        else:
            anomaly_reason = "Lossless or converted image: Error levels reflect baseline JPEG conversion differential."

        return {
            "analysis_id": analysis_id,
            "original_format": original_format,
            "is_jpeg": is_jpeg,
            "format_warning": format_warning,
            "quality": quality,
            "scale": scale,
            "artifact_path": str(artifact_path),
            "artifact_filename": artifact_filename,
            "mean_error": round(mean_err, 3),
            "max_error": max_err,
            "error_standard_deviation": round(std_err, 3),
            "potential_anomaly_detected": potential_anomaly,
            "anomaly_reason": anomaly_reason,
            "scientific_disclaimer": (
                "Error Level Analysis highlights compression inconsistencies. It does not conclusively establish "
                "whether an image has been manipulated. Naturally varying textures, high contrast edges, and multiple "
                "prior recompressions impact local error levels."
            )
        }

