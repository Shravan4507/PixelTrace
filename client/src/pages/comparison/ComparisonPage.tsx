import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Evidence, ImageCompareResult } from '../../types';
import { GitCompare, CheckCircle, AlertTriangle, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

export const ComparisonPage: React.FC = () => {
  const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
  const [refId, setRefId] = useState<string>('');
  const [targetId, setTargetId] = useState<string>('');

  const [comparing, setComparing] = useState(false);
  const [result, setResult] = useState<ImageCompareResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Zoom control
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  useEffect(() => {
    loadEvidenceList();
  }, []);

  const loadEvidenceList = async () => {
    try {
      const list = await api.getEvidenceList();
      setEvidenceList(list);
      if (list.length >= 2) {
        setRefId(list[0].id);
        setTargetId(list[1].id);
      } else if (list.length === 1) {
        setRefId(list[0].id);
        setTargetId(list[0].id);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleRunComparison = async () => {
    if (!refId || !targetId) return;
    try {
      setComparing(true);
      setError(null);
      const res = await api.compareImages(refId, targetId);
      setResult(res);
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
          <h1>IMAGE COMPARISON WORKSPACE</h1>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            DUAL-EVIDENCE CRYPTOGRAPHIC HASH & RASTER DIVERGENCE ANALYSIS
          </div>
        </div>
      </div>

      {evidenceList.length < 2 && (
        <div className="alert alert-warning" style={{ marginBottom: '20px' }}>
          <AlertTriangle size={16} />
          <div>
            <b>INSUFFICIENT EVIDENCE ITEMS:</b> At least 2 evidence files should be ingested into the repository to execute a meaningful comparative investigation.
          </div>
        </div>
      )}

      {/* Selector Control Panel */}
      <div className="panel" style={{ marginBottom: '24px' }}>
        <div className="grid-2" style={{ alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">ASSIGN REFERENCE EVIDENCE (TRUSTED COPY):</label>
            <select
              className="form-control"
              value={refId}
              onChange={(e) => setRefId(e.target.value)}
            >
              {evidenceList.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.original_filename} ({e.file_format}, {e.width}x{e.height})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">ASSIGN COMPARISON / SUSPECT TARGET:</label>
            <select
              className="form-control"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
            >
              {evidenceList.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.original_filename} ({e.file_format}, {e.width}x{e.height})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            className="btn btn-primary"
            onClick={handleRunComparison}
            disabled={!refId || !targetId || comparing}
          >
            <GitCompare size={14} />
            {comparing ? 'EVALUATING BINARY STREAM...' : 'COMPARE EVIDENCE PAIR'}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Comparison Outcome */}
      {result && (
        <div>
          {/* Cryptographic Result Banner */}
          <div className={`alert ${result.binary_match ? 'alert-info' : 'alert-warning'}`} style={{ marginBottom: '20px' }}>
            {result.binary_match ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={`badge ${result.binary_match ? 'badge-match' : 'badge-mismatch'}`}>
                  {result.hash_status_label}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  EVALUATED VIA STREAMING SHA-256
                </span>
              </div>
              <div style={{ marginTop: '6px', fontSize: '12px', lineHeight: '1.5' }}>
                {result.comparison_summary}
              </div>
              <div style={{ marginTop: '4px', fontSize: '11px', opacity: 0.85 }}>
                {result.scientific_disclaimer}
              </div>
            </div>
          </div>

          {/* Properties Comparison Table */}
          <div className="panel" style={{ marginBottom: '20px' }}>
            <div className="panel-header">
              <span className="panel-title">TECHNICAL PROPERTY COMPARISON</span>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>PROPERTY</th>
                    <th>REFERENCE (ITEM A)</th>
                    <th>TARGET (ITEM B)</th>
                    <th>DIVERGENCE</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ color: 'var(--text-secondary)' }}>ORIGINAL FILENAME</td>
                    <td style={{ fontWeight: 700 }}>{result.reference_filename}</td>
                    <td style={{ fontWeight: 700 }}>{result.target_filename}</td>
                    <td>-</td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--text-secondary)' }}>FILE FORMAT</td>
                    <td>{result.reference_format}</td>
                    <td>{result.target_format}</td>
                    <td>{result.reference_format === result.target_format ? 'Identical format' : 'Format mismatch'}</td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--text-secondary)' }}>IMAGE DIMENSIONS</td>
                    <td>{result.reference_dimensions}</td>
                    <td>{result.target_dimensions}</td>
                    <td>{result.dimensions_match ? 'Exact dimensional match' : 'Dimensional difference'}</td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--text-secondary)' }}>FILE SIZE</td>
                    <td>{(result.reference_size / 1024).toFixed(1)} KB ({result.reference_size.toLocaleString()} bytes)</td>
                    <td>{(result.target_size / 1024).toFixed(1)} KB ({result.target_size.toLocaleString()} bytes)</td>
                    <td>
                      {result.size_difference_bytes === 0 ? '0 bytes delta' : `${result.size_difference_bytes > 0 ? '+' : ''}${(result.size_difference_bytes / 1024).toFixed(1)} KB`}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--text-secondary)' }}>MEAN SQUARED ERROR (MSE)</td>
                    <td colSpan={2} style={{ textAlign: 'center' }}>
                      {result.mean_squared_error !== null ? result.mean_squared_error : 'N/A (Dimensions differ)'}
                    </td>
                    <td>{result.mean_squared_error === 0 ? 'Zero pixel deviation' : result.mean_squared_error !== null ? 'Pixel divergence detected' : 'Dimensions non-comparable'}</td>
                  </tr>
                  <tr>
                    <td style={{ color: 'var(--text-secondary)' }}>SHA-256 DIGEST</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{result.reference_sha256}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{result.target_sha256}</td>
                    <td>{result.binary_match ? 'Identical digests' : 'Hash divergence'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Interactive Side-by-Side Visual Workspace */}
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">SIDE-BY-SIDE VISUAL INSPECTION</span>
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
              gap: '20px',
              justifyContent: 'center',
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'top center',
              transition: 'transform 0.1s ease-out'
            }}>
              {/* Left pane: Reference */}
              <div style={{ flex: 1, textAlign: 'center', minWidth: '280px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  REFERENCE EVIDENCE: {result.reference_filename}
                </div>
                <img
                  src={result.reference_preview_url}
                  alt={result.reference_filename}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '480px',
                    objectFit: 'contain',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-strict)'
                  }}
                />
              </div>

              {/* Right pane: Target */}
              <div style={{ flex: 1, textAlign: 'center', minWidth: '280px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  COMPARISON TARGET: {result.target_filename}
                </div>
                <img
                  src={result.target_preview_url}
                  alt={result.target_filename}
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
