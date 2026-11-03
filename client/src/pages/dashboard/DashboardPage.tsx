import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { DashboardStats } from '../../types';
import {
  FolderLock,
  Image as ImageIcon,
  FileText,
  ShieldCheck,
  Upload,
  ScanEye,
  Download,
  AlertTriangle,
  Info,
  Copy,
  Check,
  CheckCircle,
  X
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quick Instant Scan state
  const [dragActive, setDragActive] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [copiedSha, setCopiedSha] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to local forensic database.');
    } finally {
      setLoading(false);
    }
  };

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
      runQuickScan(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      runQuickScan(e.target.files[0]);
    }
  };

  const runQuickScan = async (file: File) => {
    try {
      setScanning(true);
      setScanError(null);
      setScanResult(null);
      const res = await api.quickScan(file);
      setScanResult(res);
      fetchStats();
    } catch (err: any) {
      setScanError(err.message || 'Quick scan failed');
    } finally {
      setScanning(false);
    }
  };

  const copySha = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSha(true);
    setTimeout(() => setCopiedSha(false), 2000);
  };

  if (loading && !stats) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
        INITIALIZING FORENSIC METRICS...
      </div>
    );
  }

  return (
    <div>
      {/* Page Title & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1>INVESTIGATION DASHBOARD</h1>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            LOCAL FORENSIC WORKSTATION & INSTANT ANALYSIS ENGINE
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link to="/cases" className="btn btn-secondary">
            <FolderLock size={14} /> CASES
          </Link>
          <Link to="/comparison" className="btn btn-secondary">
            <ScanEye size={14} /> COMPARE
          </Link>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* INSTANT FORENSIC DRAG & DROP ZONE (Zero Friction) */}
      <div
        className="panel"
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        style={{
          marginBottom: '24px',
          border: dragActive ? '2px dashed #ffffff' : '1px dashed var(--border-color)',
          backgroundColor: dragActive ? '#111111' : 'var(--bg-panel)',
          padding: '24px',
          textAlign: 'center',
          cursor: 'pointer'
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
        <Upload size={32} style={{ margin: '0 auto 10px', display: 'block', color: dragActive ? '#ffffff' : 'var(--text-secondary)' }} />
        <div style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.05em' }}>
          DRAG & DROP ANY IMAGE FOR INSTANT FORENSIC ANALYSIS
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Automatically extracts EXIF metadata, calculates SHA-256 digests, computes Error Level Analysis (ELA), and compiles a downloadable PDF report in seconds.
        </div>
        <div style={{ marginTop: '12px' }}>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
          >
            SELECT IMAGE FILE
          </button>
        </div>
      </div>

      {/* Scanning Indicator */}
      {scanning && (
        <div className="panel" style={{ padding: '24px', textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff', marginBottom: '6px' }}>
            EXECUTING MULTI-LAYER FORENSIC PIPELINE...
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            [1/3] Parsing EXIF directory &nbsp;&bull;&nbsp; [2/3] Streaming SHA-256 byte digest &nbsp;&bull;&nbsp; [3/3] Generating ELA differential map
          </div>
        </div>
      )}

      {scanError && (
        <div className="alert alert-error" style={{ marginBottom: '24px' }}>
          <AlertTriangle size={16} />
          <div>{scanError}</div>
        </div>
      )}

      {/* INSTANT FORENSIC DOSSIER RESULT */}
      {scanResult && (
        <div className="panel" style={{ marginBottom: '24px', border: '1px solid #ffffff' }}>
          <div className="panel-header" style={{ borderBottomColor: '#333333' }}>
            <span className="panel-title" style={{ color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle size={14} color="#ffffff" /> INSTANT FORENSIC DOSSIER: {scanResult.evidence.original_filename}
            </span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <a
                href={scanResult.report.download_url}
                download
                className="btn btn-primary btn-sm"
              >
                <Download size={12} /> DOWNLOAD PDF REPORT
              </a>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setScanResult(null)}
              >
                <X size={12} />
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid-3" style={{ marginBottom: '16px' }}>
            <div className="panel" style={{ backgroundColor: '#000000' }}>
              <div className="panel-title">CONTAINER SPECS</div>
              <div style={{ fontSize: '16px', fontWeight: 700, marginTop: '4px' }}>
                {scanResult.evidence.file_format} &bull; {scanResult.evidence.width}x{scanResult.evidence.height} px
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                {(scanResult.evidence.file_size / 1024).toFixed(1)} KB
              </div>
            </div>

            <div className="panel" style={{ backgroundColor: '#000000' }}>
              <div className="panel-title">COMPRESSION OBSERVATION</div>
              <div style={{ fontSize: '12px', fontWeight: 700, marginTop: '6px', color: scanResult.ela.potential_anomaly_detected ? '#f59e0b' : '#ffffff' }}>
                {scanResult.ela.potential_anomaly_detected ? 'POTENTIAL ANOMALY OBSERVED' : 'UNIFORM ERROR LEVELS'}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Mean error: {scanResult.ela.mean_error} &bull; Std Dev: {scanResult.ela.error_standard_deviation}
              </div>
            </div>

            <div className="panel" style={{ backgroundColor: '#000000' }}>
              <div className="panel-title">CAMERA IDENTIFIER</div>
              <div style={{ fontSize: '13px', fontWeight: 700, marginTop: '4px' }}>
                {scanResult.metadata.camera_info.make ? `${scanResult.metadata.camera_info.make} ${scanResult.metadata.camera_info.model || ''}` : 'NO EXIF CAMERA TAG'}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                {scanResult.metadata.camera_info.software || 'No editing software stamp'}
              </div>
            </div>
          </div>

          {/* Dual Visual Preview (Original vs ELA) */}
          <div className="grid-2" style={{ marginBottom: '16px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                ORIGINAL UPLOADED RASTER
              </div>
              <img
                src={scanResult.evidence.preview_url}
                alt="Original"
                style={{
                  maxWidth: '100%',
                  maxHeight: '340px',
                  objectFit: 'contain',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-strict)'
                }}
              />
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                AMPLIFIED ELA COMPRESSION MAP (Q=95, Scale=15x)
              </div>
              <img
                src={scanResult.ela.ela_image_url}
                alt="ELA"
                style={{
                  maxWidth: '100%',
                  maxHeight: '340px',
                  objectFit: 'contain',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-strict)'
                }}
              />
            </div>
          </div>

          {/* Cryptographic Hash Strip */}
          <div style={{ backgroundColor: '#111111', padding: '10px 14px', borderRadius: '4px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge badge-match">SHA-256</span>
              <code style={{ fontSize: '11px' }}>{scanResult.evidence.sha256}</code>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => copySha(scanResult.evidence.sha256)}
            >
              {copiedSha ? <Check size={12} /> : <Copy size={12} />}
              {copiedSha ? 'COPIED' : 'COPY HASH'}
            </button>
          </div>

          {/* GPS Warning if sensitive */}
          {scanResult.metadata.gps_info.is_sensitive && (
            <div className="alert alert-warning" style={{ marginTop: '12px', marginBottom: 0 }}>
              <Info size={16} />
              <div>
                <b>GPS COORDINATES DETECTED:</b> Latitude: {scanResult.metadata.gps_info.latitude}°, Longitude: {scanResult.metadata.gps_info.longitude}°
              </div>
            </div>
          )}
        </div>
      )}

      {/* Top Stat Counters */}
      <div className="grid-3" style={{ marginBottom: '24px' }}>
        <div className="panel">
          <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FolderLock size={14} /> ACTIVE CASES
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, margin: '8px 0', color: '#ffffff' }}>
            {stats?.total_cases || 0}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            LOCALLY MANAGED INVESTIGATIONS
          </div>
        </div>

        <div className="panel">
          <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ImageIcon size={14} /> SEALED EVIDENCE FILES
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, margin: '8px 0', color: '#ffffff' }}>
            {stats?.total_evidence || 0}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            CRYPTOGRAPHICALLY HASHED & STORED
          </div>
        </div>

        <div className="panel">
          <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileText size={14} /> GENERATED REPORTS
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, margin: '8px 0', color: '#ffffff' }}>
            {stats?.recent_reports?.length || 0}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            EXPORTABLE PDF & JSON ARTIFACTS
          </div>
        </div>
      </div>

      {/* Recent Investigations Split */}
      <div className="grid-2" style={{ marginBottom: '24px' }}>
        {/* Recent Cases */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">RECENT INVESTIGATION CASES</span>
            <Link to="/cases" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>VIEW ALL</Link>
          </div>
          {(!stats?.recent_cases || stats.recent_cases.length === 0) ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
              NO INVESTIGATION CASES RECORDED.
              <div style={{ marginTop: '8px' }}>
                <Link to="/cases" className="btn btn-secondary btn-sm">CREATE CASE</Link>
              </div>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>REF</th>
                    <th>TITLE</th>
                    <th>EXAMINER</th>
                    <th>EVIDENCE</th>
                    <th>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent_cases.map((c) => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 700 }}>{c.reference_number}</td>
                      <td>{c.title}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{c.examiner_name}</td>
                      <td>{c.evidence_count || 0}</td>
                      <td>
                        <Link to={`/cases/${c.id}`} className="btn btn-secondary btn-sm">
                          OPEN
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Analyses */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">RECENT FORENSIC ANALYSES</span>
            <Link to="/analysis" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>OPEN LAB</Link>
          </div>
          {(!stats?.recent_analyses || stats.recent_analyses.length === 0) ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
              NO FORENSIC ANALYSES EXECUTED YET.
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>TYPE</th>
                    <th>TARGET</th>
                    <th>TIMESTAMP</th>
                    <th>OBSERVATION</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent_analyses.map((a) => (
                    <tr key={a.id}>
                      <td><span className="badge">{a.analysis_type}</span></td>
                      <td style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.original_filename || a.evidence_id.slice(0, 8)}
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                        {a.created_at ? a.created_at.slice(0, 19).replace('T', ' ') : 'N/A'}
                      </td>
                      <td style={{ fontSize: '11px' }}>
                        {a.results?.anomaly_reason ? a.results.anomaly_reason.slice(0, 36) + '...' : 'Analysis Recorded'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Open Source Scientific Standards Footer */}
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={14} /> OPEN SOURCE FORENSIC SPECIFICATION & METHODOLOGY
          </span>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
          PixelTrace implements non-destructive digital image examinations completely locally.
          All evidence is fingerprinted with streaming SHA-256 digests upon reception. Error Level Analysis (ELA) isolates JPEG recompression differences across DCT quantization matrices.
          Per international forensic science standards, technical findings provide empirical evidence to assist human examiners rather than asserting automated absolute authenticity claims.
        </div>
      </div>
    </div>
  );
};
