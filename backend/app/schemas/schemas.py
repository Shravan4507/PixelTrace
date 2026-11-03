from typing import Optional, Any
from pydantic import BaseModel, Field

# --- Common / Health ---
class HealthResponse(BaseModel):
    status: str
    version: str
    database: str
    offline: bool = True

class DashboardStats(BaseModel):
    total_cases: int
    total_evidence: int
    recent_analyses: list[dict[str, Any]]
    recent_cases: list[dict[str, Any]]
    recent_reports: list[dict[str, Any]]

# --- Case Schemas ---
class CaseCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=150)
    reference_number: str = Field(..., min_length=2, max_length=50)
    examiner_name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = ""
    notes: Optional[str] = ""

class CaseUpdate(BaseModel):
    title: Optional[str] = None
    examiner_name: Optional[str] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    is_archived: Optional[bool] = None

class CaseResponse(BaseModel):
    id: str
    title: str
    reference_number: str
    examiner_name: str
    description: Optional[str]
    status: str
    is_archived: bool
    notes: Optional[str]
    created_at: str
    updated_at: str
    evidence_count: Optional[int] = 0

# --- Evidence Schemas ---
class EvidenceResponse(BaseModel):
    id: str
    case_id: str
    original_filename: str
    stored_filename: str
    file_format: str
    file_size: int
    width: int
    height: int
    color_mode: Optional[str]
    sha256: str
    md5: str
    upload_timestamp: str
    status: str
    preview_url: str

class IntegrityVerificationResponse(BaseModel):
    evidence_id: str
    original_filename: str
    recorded_sha256: str
    computed_sha256: str
    is_intact: bool
    status_label: str
    verified_at: str
    notes: str

# --- Metadata Schemas ---
class GPSInfo(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    altitude: Optional[float] = None
    raw_latitude: Optional[str] = None
    raw_longitude: Optional[str] = None
    is_sensitive: bool = False
    warning: Optional[str] = None

class CameraInfo(BaseModel):
    make: Optional[str] = None
    model: Optional[str] = None
    lens_model: Optional[str] = None
    software: Optional[str] = None

class CaptureInfo(BaseModel):
    datetime_original: Optional[str] = None
    datetime_digitized: Optional[str] = None
    exposure_time: Optional[str] = None
    f_number: Optional[str] = None
    iso: Optional[str] = None
    focal_length: Optional[str] = None
    flash: Optional[str] = None
    orientation: Optional[str] = None

class MetadataResponse(BaseModel):
    evidence_id: str
    has_exif: bool
    image_properties: dict[str, Any]
    camera_info: CameraInfo
    capture_info: CaptureInfo
    gps_info: GPSInfo
    raw_tags: dict[str, str]
    methodology_note: str

# --- Hashing Schemas ---
class HashResponse(BaseModel):
    evidence_id: str
    original_filename: str
    sha256: str
    md5: str
    algorithm_default: str = "SHA-256"
    byte_count: int

class HashCompareRequest(BaseModel):
    reference_evidence_id: str
    target_evidence_id: str
    algorithm: str = "SHA-256"

class HashCompareResponse(BaseModel):
    reference_id: str
    reference_filename: str
    reference_hash: str
    target_id: str
    target_filename: str
    target_hash: str
    algorithm: str
    is_match: bool
    status_label: str
    scientific_note: str

# --- ELA Schemas ---
class ELARequest(BaseModel):
    quality: int = Field(default=95, ge=50, le=100)
    scale: int = Field(default=15, ge=1, le=50)

class ELAResponse(BaseModel):
    analysis_id: str
    evidence_id: str
    original_format: str
    is_jpeg: bool
    format_warning: Optional[str] = None
    quality: int
    scale: int
    ela_image_url: str
    mean_error: float
    max_error: int
    error_standard_deviation: float
    potential_anomaly_detected: bool
    anomaly_reason: str
    scientific_disclaimer: str
    created_at: str

# --- Comparison Schemas ---
class ImageCompareRequest(BaseModel):
    case_id: Optional[str] = None
    reference_evidence_id: str
    target_evidence_id: str

class ImageCompareResponse(BaseModel):
    reference_id: str
    reference_filename: str
    reference_format: str
    reference_size: int
    reference_dimensions: str
    reference_sha256: str
    reference_preview_url: str
    target_id: str
    target_filename: str
    target_format: str
    target_size: int
    target_dimensions: str
    target_sha256: str
    target_preview_url: str
    binary_match: bool
    hash_status_label: str
    dimensions_match: bool
    size_difference_bytes: int
    mean_squared_error: Optional[float] = None
    comparison_summary: str
    scientific_disclaimer: str

# --- Audit & Reports ---
class AuditEventResponse(BaseModel):
    id: str
    case_id: Optional[str]
    evidence_id: Optional[str]
    event_type: str
    timestamp: str
    examiner_name: Optional[str]
    details: dict[str, Any]

class ReportCreateRequest(BaseModel):
    evidence_id: Optional[str] = None
    report_format: str = Field(default="PDF", pattern="^(PDF|JSON)$")
    title: Optional[str] = None
    examiner_name: Optional[str] = None
    include_ela: bool = True
    include_metadata: bool = True
    include_chain_of_custody: bool = True

class ReportResponse(BaseModel):
    id: str
    case_id: str
    evidence_id: Optional[str]
    report_format: str
    title: str
    file_size: int
    examiner_name: str
    generated_at: str
    download_url: str

