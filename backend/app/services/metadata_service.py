import re
from pathlib import Path
from typing import Any, Optional
import exifread
from PIL import Image, ExifTags
from backend.app.core.logging import logger

class MetadataService:
    @staticmethod
    def _convert_to_degrees(value) -> Optional[float]:
        """
        Helper function to convert GPS coordinates stored in EXIF to decimal degrees.
        Handles both ExifRead Ratio objects and tuples of fractions.
        """
        try:
            if hasattr(value, "values"):
                vals = value.values
            else:
                vals = value

            if len(vals) < 3:
                return None

            def to_float(val):
                if hasattr(val, "num") and hasattr(val, "den"):
                    return float(val.num) / float(val.den) if val.den != 0 else 0.0
                if isinstance(val, tuple) and len(val) == 2:
                    return float(val[0]) / float(val[1]) if val[1] != 0 else 0.0
                return float(val)

            d = to_float(vals[0])
            m = to_float(vals[1])
            s = to_float(vals[2])

            return d + (m / 60.0) + (s / 3600.0)
        except Exception as e:
            logger.warning(f"Error converting GPS coordinate: {e}")
            return None

    @classmethod
    def extract_metadata(cls, file_path: Path) -> dict[str, Any]:
        """
        Comprehensive forensic metadata extraction from the target image file.
        Returns a structured dictionary with basic info, camera, capture, GPS, and raw tags.
        """
        if not file_path.exists():
            raise FileNotFoundError(f"Target evidence not found: {file_path}")

        # Basic image properties via Pillow
        image_properties: dict[str, Any] = {
            "file_size_bytes": file_path.stat().st_size,
            "format": "UNKNOWN",
            "width": 0,
            "height": 0,
            "color_mode": "UNKNOWN"
        }

        try:
            with Image.open(file_path) as img:
                image_properties["format"] = img.format or "UNKNOWN"
                image_properties["width"] = img.width
                image_properties["height"] = img.height
                image_properties["color_mode"] = img.mode
                if hasattr(img, "info"):
                    # Check for ICC profile, DPI, etc.
                    if "dpi" in img.info:
                        image_properties["dpi"] = [round(v, 2) for v in img.info["dpi"]]
        except Exception as e:
            logger.warning(f"Failed to read basic image properties: {e}")

        camera_info: dict[str, Optional[str]] = {
            "make": None,
            "model": None,
            "lens_model": None,
            "software": None
        }

        capture_info: dict[str, Optional[str]] = {
            "datetime_original": None,
            "datetime_digitized": None,
            "exposure_time": None,
            "f_number": None,
            "iso": None,
            "focal_length": None,
            "flash": None,
            "orientation": None
        }

        gps_info: dict[str, Any] = {
            "latitude": None,
            "longitude": None,
            "altitude": None,
            "raw_latitude": None,
            "raw_longitude": None,
            "is_sensitive": False,
            "warning": None
        }

        raw_tags: dict[str, str] = {}
        has_exif = False

        # 1. Extraction using ExifRead
        try:
            with open(file_path, "rb") as f:
                tags = exifread.process_file(f, details=True)

            if tags:
                has_exif = True
                for tag_name, tag_val in tags.items():
                    if tag_name not in ("JPEGThumbnail", "TIFFThumbnail"):
                        # Format readable string
                        raw_tags[tag_name] = str(tag_val)

                # Camera
                if "Image Make" in tags:
                    camera_info["make"] = str(tags["Image Make"]).strip()
                if "Image Model" in tags:
                    camera_info["model"] = str(tags["Image Model"]).strip()
                if "EXIF LensModel" in tags:
                    camera_info["lens_model"] = str(tags["EXIF LensModel"]).strip()
                if "Image Software" in tags:
                    camera_info["software"] = str(tags["Image Software"]).strip()

                # Capture
                if "EXIF DateTimeOriginal" in tags:
                    capture_info["datetime_original"] = str(tags["EXIF DateTimeOriginal"]).strip()
                if "EXIF DateTimeDigitized" in tags:
                    capture_info["datetime_digitized"] = str(tags["EXIF DateTimeDigitized"]).strip()
                if "EXIF ExposureTime" in tags:
                    capture_info["exposure_time"] = str(tags["EXIF ExposureTime"]).strip()
                if "EXIF FNumber" in tags:
                    capture_info["f_number"] = str(tags["EXIF FNumber"]).strip()
                if "EXIF ISOSpeedRatings" in tags:
                    capture_info["iso"] = str(tags["EXIF ISOSpeedRatings"]).strip()
                if "EXIF FocalLength" in tags:
                    capture_info["focal_length"] = str(tags["EXIF FocalLength"]).strip()
                if "EXIF Flash" in tags:
                    capture_info["flash"] = str(tags["EXIF Flash"]).strip()
                if "Image Orientation" in tags:
                    capture_info["orientation"] = str(tags["Image Orientation"]).strip()

                # GPS Coordinates
                if "GPS GPSLatitude" in tags and "GPS GPSLatitudeRef" in tags:
                    lat_deg = cls._convert_to_degrees(tags["GPS GPSLatitude"])
                    lat_ref = str(tags["GPS GPSLatitudeRef"]).strip().upper()
                    if lat_deg is not None:
                        if lat_ref == "S":
                            lat_deg = -lat_deg
                        gps_info["latitude"] = round(lat_deg, 6)
                        gps_info["raw_latitude"] = f"{tags['GPS GPSLatitude']} {lat_ref}"

                if "GPS GPSLongitude" in tags and "GPS GPSLongitudeRef" in tags:
                    lon_deg = cls._convert_to_degrees(tags["GPS GPSLongitude"])
                    lon_ref = str(tags["GPS GPSLongitudeRef"]).strip().upper()
                    if lon_deg is not None:
                        if lon_ref == "W":
                            lon_deg = -lon_deg
                        gps_info["longitude"] = round(lon_deg, 6)
                        gps_info["raw_longitude"] = f"{tags['GPS GPSLongitude']} {lon_ref}"

                if "GPS GPSAltitude" in tags:
                    try:
                        alt_val = tags["GPS GPSAltitude"].values[0]
                        alt = float(alt_val.num) / float(alt_val.den) if hasattr(alt_val, "den") and alt_val.den != 0 else float(alt_val)
                        gps_info["altitude"] = round(alt, 2)
                    except Exception:
                        pass
        except Exception as e:
            logger.warning(f"ExifRead parsing failed: {e}")

        # 2. Supplementary extraction via Pillow _getexif if ExifRead missed anything
        try:
            with Image.open(file_path) as img:
                exif = img.getexif()
                if exif:
                    has_exif = True
                    for tag_id, value in exif.items():
                        tag_name = ExifTags.TAGS.get(tag_id, str(tag_id))
                        if tag_name not in raw_tags:
                            raw_tags[f"Pillow:{tag_name}"] = str(value)

                        # Fill any missing camera or capture values
                        if tag_name == "Make" and not camera_info["make"]:
                            camera_info["make"] = str(value).strip()
                        if tag_name == "Model" and not camera_info["model"]:
                            camera_info["model"] = str(value).strip()
                        if tag_name == "Software" and not camera_info["software"]:
                            camera_info["software"] = str(value).strip()
                        if tag_name == "DateTimeOriginal" and not capture_info["datetime_original"]:
                            capture_info["datetime_original"] = str(value).strip()
        except Exception as e:
            logger.warning(f"Pillow getexif parsing fallback notice: {e}")

        # Check for sensitive GPS location data
        if gps_info["latitude"] is not None and gps_info["longitude"] is not None:
            gps_info["is_sensitive"] = True
            gps_info["warning"] = "SENSITIVE EVIDENCE: Image contains embedded geographic coordinates revealing capture location."

        return {
            "has_exif": has_exif,
            "image_properties": image_properties,
            "camera_info": camera_info,
            "capture_info": capture_info,
            "gps_info": gps_info,
            "raw_tags": raw_tags,
            "methodology_note": "EXIF metadata can be easily stripped, forged, or altered. It does not constitute independently verified proof of image origin."
        }

