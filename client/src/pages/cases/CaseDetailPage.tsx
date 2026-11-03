import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Case, Evidence, AuditEvent, ReportItem } from '../../types';
import {
  Upload,
  FileText,
  ScanEye,
  ArrowLeft
} from 'lucide-react';

export const CaseDetailPage: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEvent[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Generate Report Modal
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportFormat, setReportFormat] = useState<'PDF' | 'JSON'>('PDF');
  const [generatingReport, setGeneratingReport] = useState(false);

  useEffect(() => {
    if (caseId) {
      loadAllCaseData(caseId);
    }
  }, [caseId]);

  const loadAllCaseData = async (id: string) => {
    try {
      setLoading(true);
      const [c, evs, audits, rpts] = await Promise.all([
        api.getCase(id),
        api.getEvidenceList(id),
        api.getAuditLogs(id),
        api.getReports(id)
      ]);
      setCaseData(c);
      setEvidenceList(evs);
      setAuditLogs(audits);
      setReports(rpts);
    } catch (err: any) {
      setError(err.message || 'Failed to load case details');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseId || !uploadFile) return;

    try {
      setUploading(true);
      setUploadError(null);
      await api.uploadEvidence(caseId, uploadFile, caseData?.examiner_name || 'SYSTEM');
      setUploadFile(null);
      // Reset file input
      const fileInput = document.getElementById('evidenceFileInput') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      loadAllCaseData(caseId);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to ingest evidence');
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!caseId) return;
    try {
      setGeneratingReport(true);
      await api.generateReport(caseId, {
        report_format: reportFormat,
        examiner_name: caseData?.examiner_name,
        include_ela: true,
        include_metadata: true,
        include_chain_of_custody: true
      });
      setShowReportModal(false);
      loadAllCaseData(caseId);
    } catch (err: any) {
      alert(`Report generation failed: ${err.message}`);
    } finally {
      setGeneratingReport(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>LOADING CASE DOSSIER...</div>;
  }

  if (error || !caseData) {
    return (
      <div>
        <div className="alert alert-error">{error || 'Case not found.'}</div>
        <Link to="/cases" className="btn btn-secondary"><ArrowLeft size={14} /> BACK TO CASES</Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Link to="/cases" className="btn btn-secondary btn-sm"><ArrowLeft size={12} /> CASES</Link>
            <span className="badge badge-match">{caseData.status}</span>
            {caseData.is_archived && <span className="badge">ARCHIVED</span>}
          </div>
          <h1 style={{ marginBottom: '4px' }}>{caseData.reference_number}: {caseData.title}</h1>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            LEAD EXAMINER: <b>{caseData.examiner_name}</b> &nbsp;|&nbsp; OPENED: {caseData.created_at.slice(0, 19).replace('T', ' ')} UTC
          </div>
        </div>

        <button className="btn btn-primary" onClick={() => setShowReportModal(true)}>
          <FileText size={14} /> GENERATE REPORT
        </button>
      </div>

      {/* Case Overview Panel */}
      <div className="panel" style={{ marginBottom: '24px' }}>
        <div className="panel-title" style={{ marginBottom: '8px' }}>INVESTIGATION SCOPE & NOTES</div>
        <p style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '8px' }}>
          {caseData.description || 'No formal scope description provided.'}
        </p>
        {caseData.notes && (
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
            <b>INTERNAL NOTES:</b> {caseData.notes}
          </div>
        )}
      </div>

      {/* Ingest Evidence Form */}
      <div className="panel" style={{ marginBottom: '24px' }}>
        <div className="panel-header">
          <span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Upload size={14} /> INGEST NEW EVIDENCE ITEM
          </span>
        </div>
        <form onSubmit={handleFileUpload} style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            id="evidenceFileInput"
            type="file"
            accept=".jpg,.jpeg,.png,.tif,.tiff,.bmp,.webp"
            className="form-control"
            style={{ flex: 1, minWidth: '240px' }}
            onChange={(e) => setUploadFile(e.target.files ? e.target.files[0] : null)}
          />
          <button type="submit" className="btn btn-primary" disabled={!uploadFile || uploading}>
            {uploading ? 'INGESTING & VERIFYING HASH...' : 'SEAL & UPLOAD EVIDENCE'}
          </button>
        </form>
        {uploadError && <div className="alert alert-error" style={{ marginTop: '12px' }}>{uploadError}</div>}
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '8px' }}>
          SUPPORTED FORMATS: JPEG, PNG, TIFF, BMP, WEBP. Content is validated via magic bytes and cryptographically fingerprinted with SHA-256 upon reception.
        </div>
      </div>

      {/* Associated Evidence Library */}
      <div className="panel" style={{ marginBottom: '24px' }}>
        <div className="panel-header">
          <span className="panel-title">SEALED EVIDENCE ITEMS ({evidenceList.length})</span>
        </div>

        {evidenceList.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
            NO EVIDENCE ITEMS INGESTED INTO THIS CASE YET.
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>PREVIEW</th>
                  <th>FILENAME</th>
                  <th>FORMAT</th>
                  <th>DIMENSIONS</th>
                  <th>SIZE</th>
                  <th>SHA-256 DIGEST</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {evidenceList.map((ev) => (
                  <tr key={ev.id}>
                    <td style={{ width: '60px' }}>
                      <img
                        src={ev.preview_url}
                        alt={ev.original_filename}
                        style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: 'var(--radius-strict)', border: '1px solid var(--border-color)' }}
                      />
                    </td>
                    <td style={{ fontWeight: 700 }}>{ev.original_filename}</td>
                    <td><span className="badge">{ev.file_format}</span></td>
                    <td>{ev.width} x {ev.height} px</td>
                    <td>{(ev.file_size / 1024).toFixed(1)} KB</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {ev.sha256.slice(0, 16)}...{ev.sha256.slice(-8)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <Link to={`/analysis?evidenceId=${ev.id}`} className="btn btn-secondary btn-sm">
                          <ScanEye size={12} /> ANALYZE
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Case Reports & Audit Split */}
      <div className="grid-2">
        {/* Reports Panel */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">GENERATED FORENSIC REPORTS ({reports.length})</span>
          </div>
          {reports.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
              NO REPORTS GENERATED YET.
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>FORMAT</th>
                    <th>TITLE</th>
                    <th>GENERATED</th>
                    <th>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => (
                    <tr key={r.id}>
                      <td><span className="badge badge-match">{r.report_format}</span></td>
                      <td style={{ fontSize: '11px' }}>{r.title}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>
                        {r.generated_at ? r.generated_at.slice(0, 19).replace('T', ' ') : 'N/A'}
                      </td>
                      <td>
                        <a href={r.download_url} download className="btn btn-secondary btn-sm">
                          DOWNLOAD
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Audit Log Panel */}
        <div className="panel">
          <div className="panel-header">
            <span className="panel-title">CASE CHAIN OF CUSTODY ({auditLogs.length})</span>
          </div>
          {auditLogs.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
              NO AUDIT EVENTS RECORDED.
            </div>
          ) : (
            <div className="table-container" style={{ maxHeight: '280px', overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>TIMESTAMP (UTC)</th>
                    <th>EVENT</th>
                    <th>EXAMINER</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((evt) => (
                    <tr key={evt.id}>
                      <td style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                        {evt.timestamp ? evt.timestamp.slice(0, 19).replace('T', ' ') : 'N/A'}
                      </td>
                      <td style={{ fontSize: '11px', fontWeight: 700 }}>{evt.event_type}</td>
                      <td style={{ fontSize: '11px' }}>{evt.examiner_name || 'SYSTEM'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Generate Report */}
      {showReportModal && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <span className="panel-title">GENERATE INVESTIGATION REPORT</span>
              <button
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
                onClick={() => setShowReportModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '14px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Compiles the complete investigation dossier for Case <b>{caseData.reference_number}</b> including evidence inventory, SHA-256 cryptographic digests, extracted EXIF metadata, Error Level Analysis (ELA) exhibits, and chain of custody logs.
              </p>
              <div className="form-group">
                <label className="form-label">REPORT EXPORT FORMAT</label>
                <div style={{ display: 'flex', gap: '16px', marginTop: '6px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="fmt"
                      checked={reportFormat === 'PDF'}
                      onChange={() => setReportFormat('PDF')}
                    />
                    <span>PDF REPORT (FORMAL PRINTABLE DOSSIER WITH D-DIN TYPOGRAPHY)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="fmt"
                      checked={reportFormat === 'JSON'}
                      onChange={() => setReportFormat('JSON')}
                    />
                    <span>JSON DATA EXPORT (STRUCTURED MACHINE-READABLE)</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowReportModal(false)}>
                CANCEL
              </button>
              <button type="button" className="btn btn-primary" onClick={handleGenerateReport} disabled={generatingReport}>
                {generatingReport ? 'COMPILING REPORT...' : 'GENERATE & RECORD REPORT'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
