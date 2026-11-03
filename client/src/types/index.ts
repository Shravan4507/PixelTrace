export interface Case {
  id: string;
  title: string;
  reference_number: string;
  examiner_name: string;
  description?: string;
  status: string;
  is_archived: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  evidence_count?: number;
}

export interface Evidence {
  id: string;
  case_id: string;
  original_filename: string;
  stored_filename: string;
  file_format: string;
  file_size: number;
  width: number;
  height: number;
  color_mode?: string;
  sha256: string;
  md5: string;
  upload_timestamp: string;
  status: string;
  preview_url: string;
}

export interface IntegrityVerification {
  evidence_id: string;
  original_filename: string;
  recorded_sha256: string;
  computed_sha256: string;
  is_intact: boolean;
  status_label: string;
  verified_at: string;
  notes: string;
}

export interface GPSInfo {
  latitude?: number | null;
  longitude?: number | null;
  altitude?: number | null;
  raw_latitude?: string | null;
  raw_longitude?: string | null;
  is_sensitive: boolean;
  warning?: string | null;
}

export interface CameraInfo {
  make?: string | null;
  model?: string | null;
  lens_model?: string | null;
  software?: string | null;
}

export interface CaptureInfo {
  datetime_original?: string | null;
  datetime_digitized?: string | null;
  exposure_time?: string | null;
  f_number?: string | null;
  iso?: string | null;
  focal_length?: string | null;
  flash?: string | null;
  orientation?: string | null;
}

export interface MetadataResult {
  evidence_id: string;
  has_exif: boolean;
  image_properties: {
    format: string;
    width: number;
    height: number;
    color_mode: string;
    file_size_bytes: number;
    dpi?: number[];
  };
  camera_info: CameraInfo;
  capture_info: CaptureInfo;
  gps_info: GPSInfo;
  raw_tags: Record<string, string>;
  methodology_note: string;
}

export interface HashResult {
  evidence_id: string;
  original_filename: string;
  sha256: string;
  md5: string;
  algorithm_default: string;
  byte_count: number;
}

export interface HashCompareResult {
  reference_id: string;
  reference_filename: string;
  reference_hash: string;
  target_id: string;
  target_filename: string;
  target_hash: string;
  algorithm: string;
  is_match: boolean;
  status_label: string;
  scientific_note: string;
}

export interface ELAResult {
  analysis_id: string;
  evidence_id: string;
  original_format: string;
  is_jpeg: boolean;
  format_warning?: string | null;
  quality: number;
  scale: number;
  ela_image_url: string;
  mean_error: number;
  max_error: number;
  error_standard_deviation: number;
  potential_anomaly_detected: boolean;
  anomaly_reason: string;
  scientific_disclaimer: string;
  created_at: string;
}

export interface ImageCompareResult {
  reference_id: string;
  reference_filename: string;
  reference_format: string;
  reference_size: number;
  reference_dimensions: string;
  reference_sha256: string;
  reference_preview_url: string;
  target_id: string;
  target_filename: string;
  target_format: string;
  target_size: number;
  target_dimensions: string;
  target_sha256: string;
  target_preview_url: string;
  binary_match: boolean;
  hash_status_label: string;
  dimensions_match: boolean;
  size_difference_bytes: number;
  mean_squared_error?: number | null;
  comparison_summary: string;
  scientific_disclaimer: string;
}

export interface AuditEvent {
  id: string;
  case_id?: string | null;
  evidence_id?: string | null;
  event_type: string;
  timestamp: string;
  examiner_name?: string | null;
  details: Record<string, any>;
}

export interface ReportItem {
  id: string;
  case_id: string;
  evidence_id?: string | null;
  report_format: string;
  title: string;
  file_size: number;
  examiner_name: string;
  generated_at: string;
  download_url: string;
}

export interface DashboardStats {
  total_cases: int;
  total_evidence: int;
  recent_analyses: any[];
  recent_cases: any[];
  recent_reports: any[];
}
type int = number;

