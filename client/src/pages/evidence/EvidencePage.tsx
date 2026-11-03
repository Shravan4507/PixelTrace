import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';
import { Evidence, Case, IntegrityVerification } from '../../types';
import {
  Search,
  ScanEye,
  ShieldCheck,
  Trash2
} from 'lucide-react';

export const EvidencePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const caseIdFilter = searchParams.get('caseId') || '';

  const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedCase, setSelectedCase] = useState(caseIdFilter);
  const [selectedFormat, setSelectedFormat] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Integrity Check Modal
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [integrityResult, setIntegrityResult] = useState<IntegrityVerification | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadEvidence();
  }, [selectedCase, selectedFormat]);

  const loadInitialData = async () => {
    try {
      const caseList = await api.getCases();
      setCases(caseList);
    } catch {
      // Continue even if cases fail
    }
    loadEvidence();
  };

  const loadEvidence = async () => {
    try {
      setLoading(true);
      const data = await api.getEvidenceList(
        selectedCase || undefined,
        selectedFormat || undefined,
        searchTerm || undefined
      );
      setEvidenceList(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load evidence');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadEvidence();
  };

  const handleVerifyIntegrity = async (evidenceId: string) => {
    try {
      setVerifyingId(evidenceId);
      const res = await api.verifyIntegrity(evidenceId);
      setIntegrityResult(res);
    } catch (err: any) {
      alert(`Integrity check failed: ${err.message}`);
    } finally {
      setVerifyingId(null);
    }
  };

  const handleDeleteEvidence = async (evidenceId: string, filename: string) => {
    if (!window.confirm(`Permanently remove evidence item '${filename}' from the system?`)) return;
    try {
      await api.deleteEvidence(evidenceId);
      loadEvidence();
    } catch (err: any) {
      alert(`Error deleting evidence: ${err.message}`);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1>EVIDENCE REPOSITORY</h1>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            SEALED EVIDENCE INVENTORY & INDEPENDENT BIT-LEVEL INTEGRITY VERIFICATION
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="panel" style={{ marginBottom: '24px', padding: '14px 16px' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 2, minWidth: '220px' }}>
            <input
              type="text"
              className="form-control"
              placeholder="SEARCH BY ORIGINAL FILENAME OR SHA-256 HASH..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ flex: 1, minWidth: '180px' }}>
            <select
              className="form-control"
              value={selectedCase}
              onChange={(e) => setSelectedCase(e.target.value)}
            >
              <option value="">ALL CASES</option>
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.reference_number}: {c.title}
                </option>
              ))}
            </select>
          </div>

          <div style={{ width: '140px' }}>
            <select
              className="form-control"
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
            >
              <option value="">ALL FORMATS</option>
              <option value="JPEG">JPEG</option>
              <option value="PNG">PNG</option>
              <option value="TIFF">TIFF</option>
              <option value="BMP">BMP</option>
              <option value="WEBP">WEBP</option>
            </select>
          </div>

          <button type="submit" className="btn btn-secondary">
            <Search size={14} /> FILTER
          </button>
        </form>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Evidence Table */}
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">SEALED EVIDENCE FILES ({evidenceList.length})</span>
        </div>

        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            RETRIEVING EVIDENCE METRICS...
          </div>
        ) : evidenceList.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            NO EVIDENCE ITEMS FOUND MATCHING SELECTION.
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>PREVIEW</th>
                  <th>ORIGINAL FILENAME</th>
                  <th>FORMAT</th>
                  <th>DIMENSIONS</th>
                  <th>FILE SIZE</th>
                  <th>SHA-256 INTEGRITY DIGEST</th>
                  <th>INGESTED (UTC)</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {evidenceList.map((ev) => (
                  <tr key={ev.id}>
                    <td style={{ width: '56px' }}>
                      <img
                        src={ev.preview_url}
                        alt={ev.original_filename}
                        style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: 'var(--radius-strict)', border: '1px solid var(--border-color)' }}
                      />
                    </td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{ev.original_filename}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>ID: {ev.id.slice(0, 13)}...</div>
                    </td>
                    <td><span className="badge">{ev.file_format}</span></td>
                    <td>{ev.width} x {ev.height} px</td>
                    <td>{(ev.file_size / 1024).toFixed(1)} KB</td>
                    <td>
                      <code style={{ fontSize: '11px', color: '#ffffff' }}>
                        {ev.sha256.slice(0, 16)}...{ev.sha256.slice(-8)}
                      </code>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                      {ev.upload_timestamp ? ev.upload_timestamp.slice(0, 19).replace('T', ' ') : 'N/A'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <Link
                          to={`/analysis?evidenceId=${ev.id}`}
                          className="btn btn-secondary btn-sm"
                          title="Open in Forensic Analysis Workspace"
                        >
                          <ScanEye size={12} /> ANALYZE
                        </Link>
                        <button
                          className="btn btn-secondary btn-sm"
                          title="Verify On-Disk Cryptographic Integrity"
                          onClick={() => handleVerifyIntegrity(ev.id)}
                          disabled={verifyingId === ev.id}
                        >
                          <ShieldCheck size={12} />
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          title="Delete Evidence"
                          onClick={() => handleDeleteEvidence(ev.id, ev.original_filename)}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Integrity Verification Result */}
      {integrityResult && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={16} /> EVIDENCE INTEGRITY AUDIT VERIFICATION
              </span>
              <button
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
                onClick={() => setIntegrityResult(null)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '16px' }}>
                <span className={`badge ${integrityResult.is_intact ? 'badge-match' : 'badge-mismatch'}`} style={{ fontSize: '12px', padding: '4px 10px' }}>
                  {integrityResult.status_label}
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">EVIDENCE FILENAME</label>
                <div style={{ fontSize: '13px', fontWeight: 700 }}>{integrityResult.original_filename}</div>
              </div>

              <div className="form-group">
                <label className="form-label">ORIGINAL INGESTION SHA-256 HASH</label>
                <code style={{ padding: '6px', fontSize: '11px', display: 'block', wordBreak: 'break-all' }}>
                  {integrityResult.recorded_sha256}
                </code>
              </div>

              <div className="form-group">
                <label className="form-label">RECOMPUTED PHYSICAL ON-DISK SHA-256 HASH</label>
                <code style={{ padding: '6px', fontSize: '11px', display: 'block', wordBreak: 'break-all' }}>
                  {integrityResult.computed_sha256}
                </code>
              </div>

              <div className="alert alert-info" style={{ marginTop: '12px' }}>
                {integrityResult.notes}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-primary" onClick={() => setIntegrityResult(null)}>
                DISMISS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
