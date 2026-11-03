import React, { useState, useRef } from 'react';
import { api } from '../../services/api';
import {
  Upload,
  Download,
  Copy,
  Check,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sliders,
  FileText,
  Key,
  Info,
  ShieldAlert,
  AlertTriangle,
  RotateCw
} from 'lucide-react';

export const AnalyzerPage: React.FC = () => {
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisData, setAnalysisData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ELA parameters
  const [quality, setQuality] = useState<number>(95);
  const [scale, setScale] = useState<number>(15);
  const [activeTab, setActiveTab] = useState<'ELA' | 'METADATA' | 'HASHING'>('ELA');
  const [viewMode, setViewMode] = useState<'SIDE_BY_SIDE' | 'ELA_ONLY' | 'ORIGINAL_ONLY'>('SIDE_BY_SIDE');
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Copy states
  const [copiedSha, setCopiedSha] = useState(false);
  const [copiedMd5, setCopiedMd5] = useState(false);

  // Drag & drop state
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File, q = quality, s = scale) => {
    try {
      setAnalyzing(true);
      setError(null);
      setCurrentFile(file);
      const res = await api.analyzeImage(file, q, s);
      setAnalysisData(res);
      setZoomLevel(1);
    } catch (err: any) {
      setError(err.message || 'Analysis failed. Please verify the image file.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleReanalyze = () => {
    if (currentFile) {
      processFile(currentFile, quality, scale);
    }
  };

  const copyToClipboard = (text: string, type: 'sha' | 'md5') => {
    navigator.clipboard.writeText(text);
    if (type === 'sha') {
      setCopiedSha(true);
      setTimeout(() => setCopiedSha(false), 2000);
    } else {
      setCopiedMd5(true);
      setTimeout(() => setCopiedMd5(false), 2000);
    }
  };

  const exportJSON = () => {
    if (!analysisData) return;
    const blob = new Blob([JSON.stringify(analysisData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pixeltrace_${analysisData.file_info.filename}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1>IMAGE FORENSIC ANALYZER</h1>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            LOCAL MULTI-METHOD METADATA, CRYPTOGRAPHIC DIGEST & ERROR LEVEL ANALYSIS
          </div>
        </div>

        {analysisData && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <a
              href={analysisData.pdf_report_url}
              download
              className="btn btn-primary"
            >
              <Download size={14} /> DOWNLOAD PDF REPORT
            </a>
            <button className="btn btn-secondary" onClick={exportJSON}>
              EXPORT JSON
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setAnalysisData(null);
                setCurrentFile(null);
              }}
            >
              NEW IMAGE
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '20px' }}>
          <AlertTriangle size={16} />
          <div>{error}</div>
        </div>
      )}

      {/* DROPZONE: Displayed when no image loaded */}
      {!analysisData && (
        <div
          className="panel"
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          style={{
            padding: '80px 24px',
            textAlign: 'center',
            cursor: 'pointer',
            border: dragActive ? '2px dashed #ffffff' : '1px dashed var(--border-color)',
            backgroundColor: dragActive ? '#111111' : 'var(--bg-panel)',
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.tif,.tiff,.bmp,.webp"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <Upload size={48} style={{ margin: '0 auto 16px', display: 'block', color: dragActive ? '#ffffff' : 'var(--text-secondary)' }} />
          <h2 style={{ fontSize: '18px', marginBottom: '8px', letterSpacing: '0.05em' }}>
            DRAG & DROP IMAGE TO ANALYZE
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', maxWidth: '540px', margin: '0 auto 20px' }}>
            Instantly extracts embedded EXIF camera metadata, computes cryptographic SHA-256 and MD5 fingerprints, evaluates JPEG Error Level Analysis (ELA), and compiles a formal PDF report.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
          >
            SELECT IMAGE FROM COMPUTER
          </button>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '20px' }}>
            SUPPORTED: JPEG &bull; PNG &bull; TIFF &bull; BMP &bull; WEBP (Processed 100% locally on your machine)
          </div>
        </div>
      )}

      {/* ANALYZING STATE */}
      {analyzing && (
        <div className="panel" style={{ padding: '60px', textAlign: 'center', margin: '20px 0' }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>
            RUNNING MULTI-LAYER FORENSIC PIPELINE...
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Parsing raw EXIF tags &bull; Streaming 64 KB cryptographic hashes &bull; Generating JPEG recompression differential map
          </div>
        </div>
      )}

      {/* ANALYSIS DASHBOARD VIEW */}
      {analysisData && !analyzing && (
        <div>
          {/* File Properties Strip */}
          <div className="panel" style={{ marginBottom: '16px', padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '14px' }}>{analysisData.file_info.filename}</span>
              <span className="badge badge-match">{analysisData.file_info.format}</span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{analysisData.file_info.dimensions}</span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{(analysisData.file_info.file_size / 1024).toFixed(1)} KB</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
              SHA-256: {analysisData.hashes.sha256.slice(0, 24)}...
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="tab-container">
            <button
              className={`tab-btn ${activeTab === 'ELA' ? 'active' : ''}`}
              onClick={() => setActiveTab('ELA')}
            >
              <Sliders size={13} style={{ display: 'inline', marginRight: '6px' }} />
              ERROR LEVEL ANALYSIS (ELA)
            </button>
            <button
              className={`tab-btn ${activeTab === 'METADATA' ? 'active' : ''}`}
              onClick={() => setActiveTab('METADATA')}
            >
              <FileText size={13} style={{ display: 'inline', marginRight: '6px' }} />
              EXIF METADATA
            </button>
            <button
              className={`tab-btn ${activeTab === 'HASHING' ? 'active' : ''}`}
              onClick={() => setActiveTab('HASHING')}
            >
              <Key size={13} style={{ display: 'inline', marginRight: '6px' }} />
              CRYPTOGRAPHIC FINGERPRINTS
            </button>
          </div>

          {/* TAB 1: ERROR LEVEL ANALYSIS */}
          {activeTab === 'ELA' && (
            <div>
              {analysisData.file_info.format.toUpperCase() !== 'JPEG' && (
                <div className="alert alert-warning">
                  <AlertTriangle size={16} />
                  <div>
                    <b>NON-JPEG FORMAT NOTICE ({analysisData.file_info.format}):</b> ELA assesses lossy JPEG compression history. Lossless images do not have previous quantization tables; this analysis evaluates an experimental JPEG conversion differential.
                  </div>
                </div>
              )}

              {/* Sliders & Parameters Toolbar */}
              <div className="panel" style={{ marginBottom: '16px', padding: '14px 18px' }}>
                <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '180px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span className="form-label">RECOMPRESSION QUALITY:</span>
                      <span style={{ fontWeight: 700, fontSize: '12px' }}>{quality}%</span>
                    </div>
                    <input
                      type="range"
                      min={50}
                      max={100}
                      value={quality}
                      onChange={(e) => setQuality(Number(e.target.value))}
                      style={{ width: '100%', accentColor: '#ffffff' }}
                    />
                  </div>

                  <div style={{ flex: 1, minWidth: '180px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span className="form-label">DIFFERENCE AMPLIFICATION:</span>
                      <span style={{ fontWeight: 700, fontSize: '12px' }}>{scale}x</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={50}
                      value={scale}
                      onChange={(e) => setScale(Number(e.target.value))}
                      style={{ width: '100%', accentColor: '#ffffff' }}
                    />
                  </div>

                  <button className="btn btn-secondary" onClick={handleReanalyze}>
                    <RotateCw size={13} /> RE-CALCULATE ELA
                  </button>
                </div>
              </div>

              {/* Observation Notice */}
              <div className={`alert ${analysisData.ela.potential_anomaly_detected ? 'alert-warning' : 'alert-info'}`}>
                <Info size={16} />
                <div>
                  <b>OBSERVATION:</b> {analysisData.ela.anomaly_reason}
                  <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.85 }}>
                    {analysisData.ela.scientific_disclaimer}
                  </div>
                </div>
              </div>

              {/* Metric Counters */}
              <div className="grid-3" style={{ marginBottom: '16px' }}>
                <div className="panel">
                  <div className="panel-title">MEAN PIXEL ERROR</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, margin: '4px 0' }}>{analysisData.ela.mean_error}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>AVERAGE PIXEL INTENSITY DELTA</div>
                </div>
                <div className="panel">
                  <div className="panel-title">PEAK RESIDUAL (MAX)</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, margin: '4px 0' }}>{analysisData.ela.max_error} / 255</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>MAXIMUM ERROR AMPLITUDE</div>
                </div>
                <div className="panel">
                  <div className="panel-title">ERROR STD DEVIATION</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, margin: '4px 0' }}>{analysisData.ela.error_standard_deviation}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>VARIANCE ACROSS IMAGE SURFACE</div>
                </div>
              </div>

              {/* Dual Viewer Controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    className={`btn btn-sm ${viewMode === 'SIDE_BY_SIDE' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setViewMode('SIDE_BY_SIDE')}
                  >
                    SIDE-BY-SIDE
                  </button>
                  <button
                    className={`btn btn-sm ${viewMode === 'ELA_ONLY' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setViewMode('ELA_ONLY')}
                  >
                    ELA MAP ONLY
                  </button>
                  <button
                    className={`btn btn-sm ${viewMode === 'ORIGINAL_ONLY' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setViewMode('ORIGINAL_ONLY')}
                  >
                    ORIGINAL ONLY
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setZoomLevel((z) => Math.min(z + 0.25, 3))}>
                    <ZoomIn size={12} />
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setZoomLevel((z) => Math.max(z - 0.25, 0.5))}>
                    <ZoomOut size={12} />
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setZoomLevel(1)}>
                    <RotateCcw size={12} /> RESET ({(zoomLevel * 100).toFixed(0)}%)
                  </button>
                  <a href={analysisData.ela.ela_image_url} download={`ela_${analysisData.file_info.filename}.png`} className="btn btn-secondary btn-sm">
                    <Download size={12} /> DOWNLOAD ELA PNG
                  </a>
                </div>
              </div>

              {/* Visual Render Canvas */}
              <div className="panel" style={{ overflow: 'hidden', padding: '16px' }}>
                <div style={{
                  display: 'flex',
                  gap: '16px',
                  justifyContent: 'center',
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: 'top center',
                  transition: 'transform 0.1s ease-out'
                }}>
                  {(viewMode === 'SIDE_BY_SIDE' || viewMode === 'ORIGINAL_ONLY') && (
                    <div style={{ flex: 1, textAlign: 'center', minWidth: '300px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                        ORIGINAL IMAGE
                      </div>
                      <img
                        src={analysisData.file_info.preview_url}
                        alt="Original"
                        style={{
                          maxWidth: '100%',
                          maxHeight: '520px',
                          objectFit: 'contain',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-strict)'
                        }}
                      />
                    </div>
                  )}

                  {(viewMode === 'SIDE_BY_SIDE' || viewMode === 'ELA_ONLY') && (
                    <div style={{ flex: 1, textAlign: 'center', minWidth: '300px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                        AMPLIFIED ELA RESIDUAL MAP (Q={quality}%, Scale={scale}x)
                      </div>
                      <img
                        src={analysisData.ela.ela_image_url}
                        alt="ELA Map"
                        style={{
                          maxWidth: '100%',
                          maxHeight: '520px',
                          objectFit: 'contain',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-strict)'
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: EXIF METADATA */}
          {activeTab === 'METADATA' && (
            <div>
              {analysisData.metadata.gps_info.is_sensitive && (
                <div className="alert alert-warning">
                  <ShieldAlert size={18} />
                  <div>
                    <b>SENSITIVE LOCATION DETECTED:</b> This photo contains embedded GPS location tags.
                    <div style={{ marginTop: '4px' }}>
                      LATITUDE: <b>{analysisData.metadata.gps_info.latitude}°</b> &nbsp;|&nbsp; LONGITUDE: <b>{analysisData.metadata.gps_info.longitude}°</b>
                      {analysisData.metadata.gps_info.altitude && ` (ALTITUDE: ${analysisData.metadata.gps_info.altitude}m)`}
                    </div>
                  </div>
                </div>
              )}

              {!analysisData.metadata.has_exif && (
                <div className="alert alert-info">
                  <Info size={16} />
                  <div>
                    <b>NO EXIF TAGS FOUND:</b> This file does not contain embedded camera metadata. Social media apps routinely scrub EXIF data for user privacy.
                  </div>
                </div>
              )}

              <div className="grid-2" style={{ marginBottom: '16px' }}>
                {/* Camera Hardware */}
                <div className="panel">
                  <div className="panel-header">
                    <span className="panel-title">CAMERA HARDWARE & SOFTWARE</span>
                  </div>
                  <table className="data-table">
                    <tbody>
                      <tr>
                        <td style={{ width: '140px', color: 'var(--text-secondary)' }}>CAMERA MAKE</td>
                        <td style={{ fontWeight: 700 }}>{analysisData.metadata.camera_info.make || 'UNAVAILABLE'}</td>
                      </tr>
                      <tr>
                        <td style={{ color: 'var(--text-secondary)' }}>CAMERA MODEL</td>
                        <td style={{ fontWeight: 700 }}>{analysisData.metadata.camera_info.model || 'UNAVAILABLE'}</td>
                      </tr>
                      <tr>
                        <td style={{ color: 'var(--text-secondary)' }}>LENS MODEL</td>
                        <td>{analysisData.metadata.camera_info.lens_model || 'UNAVAILABLE'}</td>
                      </tr>
                      <tr>
                        <td style={{ color: 'var(--text-secondary)' }}>SOFTWARE IDENTIFIER</td>
                        <td>{analysisData.metadata.camera_info.software || 'NONE DETECTED'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Exposure Details */}
                <div className="panel">
                  <div className="panel-header">
                    <span className="panel-title">CAPTURE & EXPOSURE SETTINGS</span>
                  </div>
                  <table className="data-table">
                    <tbody>
                      <tr>
                        <td style={{ width: '140px', color: 'var(--text-secondary)' }}>ORIGINAL DATE</td>
                        <td>{analysisData.metadata.capture_info.datetime_original || 'UNAVAILABLE'}</td>
                      </tr>
                      <tr>
                        <td style={{ color: 'var(--text-secondary)' }}>EXPOSURE TIME</td>
                        <td>{analysisData.metadata.capture_info.exposure_time || 'UNAVAILABLE'}</td>
                      </tr>
                      <tr>
                        <td style={{ color: 'var(--text-secondary)' }}>F-NUMBER</td>
                        <td>{analysisData.metadata.capture_info.f_number ? `f/${analysisData.metadata.capture_info.f_number}` : 'UNAVAILABLE'}</td>
                      </tr>
                      <tr>
                        <td style={{ color: 'var(--text-secondary)' }}>ISO SPEED</td>
                        <td>{analysisData.metadata.capture_info.iso || 'UNAVAILABLE'}</td>
                      </tr>
                      <tr>
                        <td style={{ color: 'var(--text-secondary)' }}>FOCAL LENGTH</td>
                        <td>{analysisData.metadata.capture_info.focal_length || 'UNAVAILABLE'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Raw EXIF Tags Browser */}
              <div className="panel">
                <div className="panel-header">
                  <span className="panel-title">RAW EXIF TAG INSPECTOR ({Object.keys(analysisData.metadata.raw_tags).length} TAGS)</span>
                </div>
                {Object.keys(analysisData.metadata.raw_tags).length === 0 ? (
                  <div style={{ padding: '20px', color: 'var(--text-muted)', textAlign: 'center' }}>
                    No raw EXIF tags present in this image header.
                  </div>
                ) : (
                  <div className="table-container" style={{ maxHeight: '360px', overflowY: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th style={{ width: '280px' }}>TAG NAME</th>
                          <th>RECORDED VALUE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(analysisData.metadata.raw_tags).map(([key, val]) => (
                          <tr key={key}>
                            <td style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-secondary)' }}>{key}</td>
                            <td style={{ wordBreak: 'break-all', fontSize: '12px' }}>{String(val)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: CRYPTOGRAPHIC FINGERPRINT */}
          {activeTab === 'HASHING' && (
            <div className="panel">
              <div className="panel-header">
                <span className="panel-title">CRYPTOGRAPHIC DATA INTEGRITY FINGERPRINTS</span>
              </div>

              {/* SHA-256 Box */}
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span className="form-label">SHA-256 (STANDARD CRYPTOGRAPHIC ALGORITHM)</span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => copyToClipboard(analysisData.hashes.sha256, 'sha')}
                  >
                    {copiedSha ? <Check size={12} /> : <Copy size={12} />}
                    {copiedSha ? 'COPIED' : 'COPY'}
                  </button>
                </div>
                <code style={{ padding: '12px', fontSize: '13px', display: 'block', wordBreak: 'break-all', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-strict)' }}>
                  {analysisData.hashes.sha256}
                </code>
              </div>

              {/* MD5 Box */}
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span className="form-label">MD5 (ACADEMIC REPORT COMPATIBILITY ALGORITHM)</span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => copyToClipboard(analysisData.hashes.md5, 'md5')}
                  >
                    {copiedMd5 ? <Check size={12} /> : <Copy size={12} />}
                    {copiedMd5 ? 'COPIED' : 'COPY'}
                  </button>
                </div>
                <code style={{ padding: '12px', fontSize: '13px', display: 'block', wordBreak: 'break-all', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-strict)' }}>
                  {analysisData.hashes.md5}
                </code>
              </div>

              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.6', marginTop: '14px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                <b>The Avalanche Effect:</b> Any alteration to the original photo—even a single modified pixel—causes the entire cryptographic digest to alter completely. A matching hash confirms 100% bitstream identity.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

