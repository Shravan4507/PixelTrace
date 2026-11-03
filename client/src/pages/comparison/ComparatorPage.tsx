import React, { useState, useRef } from 'react';
import { api } from '../../services/api';
import {
  GitCompare,
  Upload,
  CheckCircle,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  RotateCcw
} from 'lucide-react';

export const ComparatorPage: React.FC = () => {
  const [refFile, setRefFile] = useState<File | null>(null);
  const [cmpFile, setCmpFile] = useState<File | null>(null);

  const [refPreview, setRefPreview] = useState<string | null>(null);
  const [cmpPreview, setCmpPreview] = useState<string | null>(null);

  const [comparing, setComparing] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [zoomLevel, setZoomLevel] = useState<number>(1);

  const refInputRef = useRef<HTMLInputElement>(null);
  const cmpInputRef = useRef<HTMLInputElement>(null);

  const handleRefSelect = (file: File) => {
    setRefFile(file);
    setRefPreview(URL.createObjectURL(file));
    setResult(null);
  };

  const handleCmpSelect = (file: File) => {
    setCmpFile(file);
    setCmpPreview(URL.createObjectURL(file));
    setResult(null);
  };

  const handleRunComparison = async () => {
    if (!refFile || !cmpFile) return;
    try {
      setComparing(true);
      setError(null);
      const res = await api.compareDirect(refFile, cmpFile);
      setResult(res);
      setZoomLevel(1);
    } catch (err: any) {
      setError(err.message || 'Comparison failed');
    } finally {
      setComparing(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1>IMAGE COMPARATOR</h1>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            DUAL-EVIDENCE CRYPTOGRAPHIC INTEGRITY & RASTER PIXEL DIVERGENCE ANALYSIS
          </div>
        </div>

        {refFile && cmpFile && (
          <button
            className="btn btn-primary"
            onClick={handleRunComparison}
            disabled={comparing}
          >
            <GitCompare size={14} />
            {comparing ? 'COMPARING BITSTREAMS...' : 'RUN FORENSIC COMPARISON'}
          </button>
        )}
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: '20px' }}>{error}</div>}

      {/* Two Dropzones */}
      <div className="grid-2" style={{ marginBottom: '24px' }}>
        {/* Left: Reference Image */}
        <div
          className="panel"
          style={{
            padding: '24px',
            textAlign: 'center',
            cursor: 'pointer',
            border: refFile ? '1px solid #ffffff' : '1px dashed var(--border-color)',
            minHeight: '260px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}
          onClick={() => refInputRef.current?.click()}
        >
          <input
            ref={refInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.tif,.tiff,.bmp,.webp"
            style={{ display: 'none' }}
            onChange={(e) => e.target.files?.[0] && handleRefSelect(e.target.files[0])}
          />
          {refPreview ? (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                REFERENCE (IMAGE A): {refFile?.name}
              </div>
              <img
                src={refPreview}
                alt="Reference"
                style={{ maxHeight: '200px', maxWidth: '100%', objectFit: 'contain', borderRadius: 'var(--radius-strict)', border: '1px solid var(--border-color)' }}
              />
              <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                Click to replace reference image
              </div>
            </div>
          ) : (
            <div>
              <Upload size={32} style={{ margin: '0 auto 10px', color: 'var(--text-secondary)' }} />
              <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>
                DROP REFERENCE / ORIGINAL IMAGE (ITEM A)
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                The authentic ground-truth benchmark file
              </div>
            </div>
          )}
        </div>

        {/* Right: Suspect Image */}
        <div
          className="panel"
          style={{
            padding: '24px',
            textAlign: 'center',
            cursor: 'pointer',
            border: cmpFile ? '1px solid #ffffff' : '1px dashed var(--border-color)',
            minHeight: '260px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}
          onClick={() => cmpInputRef.current?.click()}
        >
          <input
            ref={cmpInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.tif,.tiff,.bmp,.webp"
            style={{ display: 'none' }}
            onChange={(e) => e.target.files?.[0] && handleCmpSelect(e.target.files[0])}
          />
          {cmpPreview ? (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                COMPARISON (IMAGE B): {cmpFile?.name}
              </div>
              <img
                src={cmpPreview}
                alt="Comparison"
                style={{ maxHeight: '200px', maxWidth: '100%', objectFit: 'contain', borderRadius: 'var(--radius-strict)', border: '1px solid var(--border-color)' }}
              />
              <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                Click to replace comparison image
              </div>
            </div>
          ) : (
            <div>
              <Upload size={32} style={{ margin: '0 auto 10px', color: 'var(--text-secondary)' }} />
              <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>
                DROP SUSPECT / MODIFIED IMAGE (ITEM B)
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                The target file under forensic inspection
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Comparison Outcome */}
      {result && (
        <div>
          {/* Status Alert */}
          <div className={`alert ${result.is_exact_match ? 'alert-info' : 'alert-warning'}`} style={{ marginBottom: '20px' }}>
            {result.is_exact_match ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={`badge ${result.is_exact_match ? 'badge-match' : 'badge-mismatch'}`}>
                  {result.status_label}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  EVALUATED VIA STREAMING SHA-256 & MD5
                </span>
              </div>
              <div style={{ marginTop: '6px', fontSize: '12px', lineHeight: '1.5' }}>
                {result.summary}
              </div>
            </div>
          </div>

          {/* Property Comparison Table */}
          <div className="panel" style={{ marginBottom: '20px' }}>
            <div className="panel-header">
              <span className="panel-title">TECHNICAL COMPARISON MATRIX</span>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>PROPERTY</th>
                    <th>REFERENCE (IMAGE A)</th>
                    <th>SUSPECT TARGET (IMAGE B)</th>
                    <th>DIFFERENCE / DIVERGENCE</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ color: 'var(--text-secondary)' }}>FILENAME</td>
                    <td style={{ fontWeight: 700 }}>{result.reference.filename}</td>
                    <td style={{ fontWeight: 700 }}>{result.comparison.filename}</td>
                    <td>-</td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--text-secondary)' }}>CONTAINER FORMAT</td>
                    <td>{result.reference.format}</td>
                    <td>{result.comparison.format}</td>
                    <td>{result.reference.format === result.comparison.format ? 'Identical format' : 'Format divergence'}</td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--text-secondary)' }}>DIMENSIONS</td>
                    <td>{result.reference.dimensions}</td>
                    <td>{result.comparison.dimensions}</td>
                    <td>{result.dimensions_match ? 'Exact dimensional match' : 'Different aspect ratio / dimensions'}</td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--text-secondary)' }}>FILE SIZE</td>
                    <td>{(result.reference.size_bytes / 1024).toFixed(1)} KB ({result.reference.size_bytes.toLocaleString()} bytes)</td>
                    <td>{(result.comparison.size_bytes / 1024).toFixed(1)} KB ({result.comparison.size_bytes.toLocaleString()} bytes)</td>
                    <td>
                      {result.size_difference_bytes === 0 ? '0 bytes delta' : `${result.size_difference_bytes > 0 ? '+' : ''}${(result.size_difference_bytes / 1024).toFixed(1)} KB`}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--text-secondary)' }}>MEAN SQUARED ERROR (MSE)</td>
                    <td colSpan={2} style={{ textAlign: 'center' }}>
                      {result.mean_squared_error !== null ? result.mean_squared_error : 'N/A'}
                    </td>
                    <td>
                      {result.mean_squared_error === 0 ? '0.00 (Zero pixel alteration)' : result.mean_squared_error !== null ? `Raster divergence (${result.mean_squared_error})` : 'Dimensions non-comparable'}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--text-secondary)' }}>SHA-256 HASH</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{result.reference.sha256}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{result.comparison.sha256}</td>
                    <td>{result.is_exact_match ? 'Exact hash match' : 'Hash string divergence'}</td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--text-secondary)' }}>MD5 HASH</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{result.reference.md5}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{result.comparison.md5}</td>
                    <td>{result.reference.md5 === result.comparison.md5 ? 'Exact MD5 match' : 'MD5 divergence'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Side-by-Side Visual Inspection */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">SYNCHRONIZED VISUAL INSPECTION</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setZoomLevel((z) => Math.min(z + 0.25, 3))}>
                  <ZoomIn size={12} />
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setZoomLevel((z) => Math.max(z - 0.25, 0.5))}>
                  <ZoomOut size={12} />
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setZoomLevel(1)}>
                  <RotateCcw size={12} /> RESET ({(zoomLevel * 100).toFixed(0)}%)
                </button>
              </div>
            </div>

            <div style={{
              display: 'flex',
              gap: '16px',
              justifyContent: 'center',
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'top center',
              transition: 'transform 0.1s ease-out'
            }}>
              <div style={{ flex: 1, textAlign: 'center', minWidth: '280px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  REFERENCE (IMAGE A)
                </div>
                <img
                  src={result.reference.preview_url}
                  alt="Reference"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '480px',
                    objectFit: 'contain',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-strict)'
                  }}
                />
              </div>

              <div style={{ flex: 1, textAlign: 'center', minWidth: '280px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  SUSPECT (IMAGE B)
                </div>
                <img
                  src={result.comparison.preview_url}
                  alt="Comparison"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '480px',
                    objectFit: 'contain',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-strict)'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
