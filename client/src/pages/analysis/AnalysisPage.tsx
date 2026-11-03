import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';
import { Evidence, MetadataResult, HashResult, ELAResult, IntegrityVerification } from '../../types';
import {
  ScanEye,
  FileText,
  Key,
  ShieldAlert,
  ShieldCheck,
  Download,
  Copy,
  Check,
  CheckCircle,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sliders,
  AlertTriangle,
  Info
} from 'lucide-react';

export const AnalysisPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialEvidenceId = searchParams.get('evidenceId') || '';

  const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string>(initialEvidenceId);
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null);

  // Active Analysis Tab: 'METADATA' | 'HASHING' | 'ELA'
  const [activeTab, setActiveTab] = useState<'METADATA' | 'HASHING' | 'ELA'>('ELA');

  // Metadata state
  const [metadata, setMetadata] = useState<MetadataResult | null>(null);
  const [loadingMetadata, setLoadingMetadata] = useState(false);

  // Hash state
  const [hashes, setHashes] = useState<HashResult | null>(null);
  const [loadingHashes, setLoadingHashes] = useState(false);
  const [copiedSha, setCopiedSha] = useState(false);
  const [copiedMd5, setCopiedMd5] = useState(false);
  const [integrityStatus, setIntegrityStatus] = useState<IntegrityVerification | null>(null);

  // ELA state
  const [elaQuality, setElaQuality] = useState<number>(95);
  const [elaScale, setElaScale] = useState<number>(15);
  const [elaResult, setElaResult] = useState<ELAResult | null>(null);
  const [runningEla, setRunningEla] = useState(false);
  const [elaZoom, setElaZoom] = useState<number>(1);
  const [elaViewMode, setElaViewMode] = useState<'SIDE_BY_SIDE' | 'ELA_ONLY' | 'ORIGINAL_ONLY'>('SIDE_BY_SIDE');

  useEffect(() => {
    loadEvidenceOptions();
  }, []);

  useEffect(() => {
    if (selectedEvidenceId) {
      const ev = evidenceList.find((e) => e.id === selectedEvidenceId) || null;
      setSelectedEvidence(ev);
      // Reset analysis results for new evidence
      setMetadata(null);
      setHashes(null);
      setElaResult(null);
      setIntegrityStatus(null);
      setElaZoom(1);

      // Load active tab data
      if (activeTab === 'METADATA') loadMetadata(selectedEvidenceId);
      else if (activeTab === 'HASHING') loadHashes(selectedEvidenceId);
    }
  }, [selectedEvidenceId, evidenceList]);

  const loadEvidenceOptions = async () => {
    try {
      const list = await api.getEvidenceList();
      setEvidenceList(list);
      if (!selectedEvidenceId && list.length > 0) {
        setSelectedEvidenceId(list[0].id);
        setSearchParams({ evidenceId: list[0].id });
      }
    } catch (err: any) {
      console.error('Failed to load evidence selector:', err);
    }
  };

  const handleSelectChange = (id: string) => {
    setSelectedEvidenceId(id);
    setSearchParams({ evidenceId: id });
  };

  const loadMetadata = async (id: string) => {
    try {
      setLoadingMetadata(true);
      const res = await api.getMetadata(id);
      setMetadata(res);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingMetadata(false);
    }
  };

  const loadHashes = async (id: string) => {
    try {
      setLoadingHashes(true);
      const res = await api.getHash(id);
      setHashes(res);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingHashes(false);
    }
  };

  const handleVerifyIntegrity = async () => {
    if (!selectedEvidenceId) return;
    try {
      const res = await api.verifyIntegrity(selectedEvidenceId);
      setIntegrityStatus(res);
    } catch (err: any) {
      alert(`Integrity verification failed: ${err.message}`);
    }
  };

  const handleRunEla = async () => {
    if (!selectedEvidenceId) return;
    try {
      setRunningEla(true);
      const res = await api.executeELA(selectedEvidenceId, elaQuality, elaScale);
      setElaResult(res);
    } catch (err: any) {
      alert(`ELA execution failed: ${err.message}`);
    } finally {
      setRunningEla(false);
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

  return (
    <div>
      {/* Header & Target Selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1>FORENSIC ANALYSIS WORKSPACE</h1>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            LOCAL MULTI-METHOD METADATA, CRYPTOGRAPHIC & ERROR LEVEL INVESTIGATION
          </div>
        </div>

        {/* Evidence Selection dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>TARGET EVIDENCE:</span>
          <select
            className="form-control"
            style={{ width: '280px' }}
            value={selectedEvidenceId}
            onChange={(e) => handleSelectChange(e.target.value)}
          >
            {evidenceList.length === 0 ? (
              <option value="">NO EVIDENCE INGESTED</option>
            ) : (
              evidenceList.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.original_filename} ({ev.file_format}, {ev.width}x{ev.height})
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {evidenceList.length === 0 ? (
        <div className="panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          NO EVIDENCE FILES IN THE REPOSITORY. INGEST AN IMAGE INTO A CASE TO PERFORM ANALYSIS.
        </div>
      ) : !selectedEvidence ? (
        <div className="panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          PLEASE SELECT A TARGET EVIDENCE FILE FROM THE DROPDOWN ABOVE.
        </div>
      ) : (
        <div>
          {/* Target Summary Strip */}
          <div className="panel" style={{ marginBottom: '16px', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '13px' }}>{selectedEvidence.original_filename}</span>
              <span className="badge">{selectedEvidence.file_format}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {selectedEvidence.width} x {selectedEvidence.height} px
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {(selectedEvidence.file_size / 1024).toFixed(1)} KB
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
              SHA-256: {selectedEvidence.sha256.slice(0, 24)}...
            </div>
          </div>

          {/* Analysis Workspace Tabs */}
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
              onClick={() => {
                setActiveTab('METADATA');
                if (!metadata) loadMetadata(selectedEvidence.id);
              }}
            >
              <FileText size={13} style={{ display: 'inline', marginRight: '6px' }} />
              EXIF METADATA
            </button>
            <button
              className={`tab-btn ${activeTab === 'HASHING' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('HASHING');
                if (!hashes) loadHashes(selectedEvidence.id);
              }}
            >
              <Key size={13} style={{ display: 'inline', marginRight: '6px' }} />
              CRYPTOGRAPHIC FINGERPRINT
            </button>
          </div>

          {/* TAB 1: ERROR LEVEL ANALYSIS */}
          {activeTab === 'ELA' && (
            <div>
              {/* ELA Non-JPEG Format Warning */}
              {selectedEvidence.file_format.toUpperCase() !== 'JPEG' && (
                <div className="alert alert-warning">
                  <AlertTriangle size={16} />
                  <div>
                    <b>NON-JPEG EVIDENCE CONTAINER DETECTED ({selectedEvidence.file_format}):</b> ELA assesses discrete cosine transform (DCT) quantization error curves. Lossless images (PNG, TIFF, BMP) do not possess historical JPEG compression tables; executing ELA here evaluates artificial JPEG conversion artifacts rather than historical compression anomalies.
                  </div>
                </div>
              )}

              {/* ELA Controls Bar */}
              <div className="panel" style={{ marginBottom: '16px', padding: '14px 16px' }}>
                <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Quality slider */}
                  <div style={{ flex: 1, minWidth: '180px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span className="form-label">RECOMPRESSION QUALITY:</span>
                      <span style={{ fontWeight: 700, fontSize: '12px' }}>{elaQuality}%</span>
                    </div>
                    <input
                      type="range"
                      min={50}
                      max={100}
                      value={elaQuality}
                      onChange={(e) => setElaQuality(Number(e.target.value))}
                      style={{ width: '100%', accentColor: '#ffffff' }}
                    />
                  </div>

                  {/* Scale slider */}
                  <div style={{ flex: 1, minWidth: '180px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span className="form-label">DIFFERENCE AMPLIFICATION:</span>
                      <span style={{ fontWeight: 700, fontSize: '12px' }}>{elaScale}x</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={50}
                      value={elaScale}
                      onChange={(e) => setElaScale(Number(e.target.value))}
                      style={{ width: '100%', accentColor: '#ffffff' }}
                    />
                  </div>

                  {/* Run Button */}
                  <button className="btn btn-primary" onClick={handleRunEla} disabled={runningEla}>
                    <ScanEye size={14} />
                    {runningEla ? 'CALCULATING PIXEL DIFFERENTIAL...' : 'EXECUTE ELA ANALYSIS'}
                  </button>
                </div>
              </div>

              {/* ELA Result Viewport */}
              {elaResult ? (
                <div>
                  {/* Observation Banner */}
                  <div className={`alert ${elaResult.potential_anomaly_detected ? 'alert-warning' : 'alert-info'}`}>
                    <Info size={16} />
                    <div>
                      <b>OBSERVATION:</b> {elaResult.anomaly_reason}
                      <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.85 }}>
                        {elaResult.scientific_disclaimer}
                      </div>
                    </div>
                  </div>

                  {/* Metrics Cards */}
                  <div className="grid-3" style={{ marginBottom: '16px' }}>
                    <div className="panel">
                      <div className="panel-title">MEAN PIXEL ERROR</div>
                      <div style={{ fontSize: '24px', fontWeight: 700, margin: '4px 0' }}>{elaResult.mean_error}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>AVERAGE INTENSITY DIVERGENCE</div>
                    </div>
                    <div className="panel">
                      <div className="panel-title">PEAK ERROR (MAX)</div>
                      <div style={{ fontSize: '24px', fontWeight: 700, margin: '4px 0' }}>{elaResult.max_error} / 255</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>MAXIMUM RESIDUAL AMPLITUDE</div>
                    </div>
                    <div className="panel">
                      <div className="panel-title">ERROR STD DEVIATION</div>
                      <div style={{ fontSize: '24px', fontWeight: 700, margin: '4px 0' }}>{elaResult.error_standard_deviation}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>VARIANCE ACROSS IMAGE REGIONS</div>
                    </div>
                  </div>

                  {/* Interactive Dual Viewer Toolbar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        className={`btn btn-sm ${elaViewMode === 'SIDE_BY_SIDE' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setElaViewMode('SIDE_BY_SIDE')}
                      >
                        SIDE-BY-SIDE
                      </button>
                      <button
                        className={`btn btn-sm ${elaViewMode === 'ELA_ONLY' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setElaViewMode('ELA_ONLY')}
                      >
                        ELA DIFFERENCE MAP
                      </button>
                      <button
                        className={`btn btn-sm ${elaViewMode === 'ORIGINAL_ONLY' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setElaViewMode('ORIGINAL_ONLY')}
                      >
                        ORIGINAL
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => setElaZoom((z) => Math.min(z + 0.25, 3))}>
                        <ZoomIn size={12} />
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => setElaZoom((z) => Math.max(z - 0.25, 0.5))}>
                        <ZoomOut size={12} />
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => setElaZoom(1)}>
                        <RotateCcw size={12} /> RESET ({(elaZoom * 100).toFixed(0)}%)
                      </button>
                      <a href={elaResult.ela_image_url} download={`ela_${selectedEvidence.original_filename}.png`} className="btn btn-secondary btn-sm">
                        <Download size={12} /> EXPORT ELA
                      </a>
                    </div>
                  </div>

                  {/* Visual Render Canvas */}
                  <div className="panel" style={{ overflow: 'hidden', padding: '16px' }}>
                    <div style={{
                      display: 'flex',
                      gap: '16px',
                      justifyContent: 'center',
                      transform: `scale(${elaZoom})`,
                      transformOrigin: 'top center',
                      transition: 'transform 0.1s ease-out'
                    }}>
                      {(elaViewMode === 'SIDE_BY_SIDE' || elaViewMode === 'ORIGINAL_ONLY') && (
                        <div style={{ flex: 1, textAlign: 'center', minWidth: '300px' }}>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                            ORIGINAL DECODED RASTER
                          </div>
                          <img
                            src={selectedEvidence.preview_url}
                            alt="Original Evidence"
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

                      {(elaViewMode === 'SIDE_BY_SIDE' || elaViewMode === 'ELA_ONLY') && (
                        <div style={{ flex: 1, textAlign: 'center', minWidth: '300px' }}>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                            AMPLIFIED ERROR LEVEL ANALYSIS (Q={elaResult.quality}, S={elaResult.scale}x)
                          </div>
                          <img
                            src={elaResult.ela_image_url}
                            alt="ELA Visualization"
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
              ) : (
                <div className="panel" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <ScanEye size={32} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.4 }} />
                  <div>READY TO EXECUTE ERROR LEVEL ANALYSIS</div>
                  <div style={{ fontSize: '11px', marginTop: '6px' }}>
                    Click "EXECUTE ELA ANALYSIS" above to evaluate compression differential at quality factor {elaQuality}%.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: EXIF METADATA */}
          {activeTab === 'METADATA' && (
            <div>
              {loadingMetadata ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  PARSING EXIF DATA CHUNKS...
                </div>
              ) : !metadata ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  NO METADATA EXTRACTED.
                </div>
              ) : (
                <div>
                  {/* Sensitive GPS disclosure alert */}
                  {metadata.gps_info.is_sensitive && (
                    <div className="alert alert-warning">
                      <ShieldAlert size={18} />
                      <div>
                        <b>SENSITIVE GEOGRAPHIC EVIDENCE DISCLOSURE:</b> This image contains embedded GPS coordinates.
                        <div style={{ marginTop: '4px' }}>
                          LATITUDE: <b>{metadata.gps_info.latitude}°</b> &nbsp;|&nbsp; LONGITUDE: <b>{metadata.gps_info.longitude}°</b>
                          {metadata.gps_info.altitude && ` (ALTITUDE: ${metadata.gps_info.altitude}m)`}
                        </div>
                      </div>
                    </div>
                  )}

                  {!metadata.has_exif && (
                    <div className="alert alert-info">
                      <Info size={16} />
                      <div>
                        <b>NO EXIF CONTAINER FOUND:</b> This file does not contain embedded EXIF metadata tags. Metadata may have been stripped during social media upload or intentionally scrubbed.
                      </div>
                    </div>
                  )}

                  {/* Structured Properties Tables */}
                  <div className="grid-2" style={{ marginBottom: '16px' }}>
                    {/* Camera Specs */}
                    <div className="panel">
                      <div className="panel-header">
                        <span className="panel-title">CAMERA HARDWARE & SOFTWARE</span>
                      </div>
                      <table className="data-table">
                        <tbody>
                          <tr>
                            <td style={{ width: '140px', color: 'var(--text-secondary)' }}>CAMERA MAKE</td>
                            <td style={{ fontWeight: 700 }}>{metadata.camera_info.make || 'UNAVAILABLE'}</td>
                          </tr>
                          <tr>
                            <td style={{ color: 'var(--text-secondary)' }}>CAMERA MODEL</td>
                            <td style={{ fontWeight: 700 }}>{metadata.camera_info.model || 'UNAVAILABLE'}</td>
                          </tr>
                          <tr>
                            <td style={{ color: 'var(--text-secondary)' }}>LENS MODEL</td>
                            <td>{metadata.camera_info.lens_model || 'UNAVAILABLE'}</td>
                          </tr>
                          <tr>
                            <td style={{ color: 'var(--text-secondary)' }}>SOFTWARE IDENTIFIER</td>
                            <td>{metadata.camera_info.software || 'NONE DETECTED'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Exposure & Capture */}
                    <div className="panel">
                      <div className="panel-header">
                        <span className="panel-title">CAPTURE & EXPOSURE SETTINGS</span>
                      </div>
                      <table className="data-table">
                        <tbody>
                          <tr>
                            <td style={{ width: '140px', color: 'var(--text-secondary)' }}>DATE ORIGINAL</td>
                            <td>{metadata.capture_info.datetime_original || 'UNAVAILABLE'}</td>
                          </tr>
                          <tr>
                            <td style={{ color: 'var(--text-secondary)' }}>EXPOSURE TIME</td>
                            <td>{metadata.capture_info.exposure_time || 'UNAVAILABLE'}</td>
                          </tr>
                          <tr>
                            <td style={{ color: 'var(--text-secondary)' }}>F-NUMBER</td>
                            <td>{metadata.capture_info.f_number ? `f/${metadata.capture_info.f_number}` : 'UNAVAILABLE'}</td>
                          </tr>
                          <tr>
                            <td style={{ color: 'var(--text-secondary)' }}>ISO SPEED</td>
                            <td>{metadata.capture_info.iso || 'UNAVAILABLE'}</td>
                          </tr>
                          <tr>
                            <td style={{ color: 'var(--text-secondary)' }}>FOCAL LENGTH</td>
                            <td>{metadata.capture_info.focal_length || 'UNAVAILABLE'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Raw Metadata Tag Inspector */}
                  <div className="panel">
                    <div className="panel-header">
                      <span className="panel-title">ALL EXTRACTED RAW EXIF TAGS ({Object.keys(metadata.raw_tags).length})</span>
                    </div>
                    {Object.keys(metadata.raw_tags).length === 0 ? (
                      <div style={{ padding: '20px', color: 'var(--text-muted)', textAlign: 'center' }}>
                        No raw EXIF tags recorded in this file.
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
                            {Object.entries(metadata.raw_tags).map(([key, val]) => (
                              <tr key={key}>
                                <td style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-secondary)' }}>{key}</td>
                                <td style={{ wordBreak: 'break-all', fontSize: '12px' }}>{val}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CRYPTOGRAPHIC FINGERPRINT */}
          {activeTab === 'HASHING' && (
            <div>
              {loadingHashes ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  COMPUTING STREAMING CRYPTOGRAPHIC DIGESTS...
                </div>
              ) : !hashes ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  HASHES UNAVAILABLE.
                </div>
              ) : (
                <div>
                  <div className="panel" style={{ marginBottom: '16px' }}>
                    <div className="panel-header">
                      <span className="panel-title">CRYPTOGRAPHIC INTEGRITY FINGERPRINTS</span>
                      <button className="btn btn-secondary btn-sm" onClick={handleVerifyIntegrity}>
                        <ShieldCheck size={12} /> VERIFY ON-DISK BIT INTEGRITY
                      </button>
                    </div>

                    {/* SHA-256 Box */}
                    <div className="form-group" style={{ marginBottom: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span className="form-label">SHA-256 (STANDARD INTEGRITY ALGORITHM)</span>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => copyToClipboard(hashes.sha256, 'sha')}
                        >
                          {copiedSha ? <Check size={12} /> : <Copy size={12} />}
                          {copiedSha ? 'COPIED' : 'COPY'}
                        </button>
                      </div>
                      <code style={{ padding: '12px', fontSize: '13px', display: 'block', wordBreak: 'break-all', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-strict)' }}>
                        {hashes.sha256}
                      </code>
                    </div>

                    {/* MD5 Box */}
                    <div className="form-group" style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span className="form-label">MD5 (LEGACY COMPATIBILITY ALGORITHM)</span>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => copyToClipboard(hashes.md5, 'md5')}
                        >
                          {copiedMd5 ? <Check size={12} /> : <Copy size={12} />}
                          {copiedMd5 ? 'COPIED' : 'COPY'}
                        </button>
                      </div>
                      <code style={{ padding: '12px', fontSize: '13px', display: 'block', wordBreak: 'break-all', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-strict)' }}>
                        {hashes.md5}
                      </code>
                    </div>

                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Total byte stream inspected: {hashes.byte_count.toLocaleString()} bytes. Processed using non-blocking 64 KB streaming buffers.
                    </div>
                  </div>

                  {/* Integrity Verification Notice */}
                  {integrityStatus && (
                    <div className={`alert ${integrityStatus.is_intact ? 'alert-info' : 'alert-error'}`}>
                      {integrityStatus.is_intact ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                      <div>
                        <b>{integrityStatus.status_label}:</b> {integrityStatus.notes}
                        <div style={{ fontSize: '10px', marginTop: '2px', opacity: 0.8 }}>
                          VERIFIED AT: {integrityStatus.verified_at}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
