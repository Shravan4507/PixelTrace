import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { ReportItem, Case } from '../../types';
import { Download, Plus } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Generate Report Modal
  const [showModal, setShowModal] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [reportFormat, setReportFormat] = useState<'PDF' | 'JSON'>('PDF');
  const [customTitle, setCustomTitle] = useState('');
  const [examinerName, setExaminerName] = useState('Shrvan');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rpts, cs] = await Promise.all([api.getReports(), api.getCases()]);
      setReports(rpts);
      setCases(cs);
      if (cs.length > 0) setSelectedCaseId(cs[0].id);
    } catch (err: any) {
      setError(err.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseId) return;

    try {
      setGenerating(true);
      await api.generateReport(selectedCaseId, {
        report_format: reportFormat,
        title: customTitle.trim() || undefined,
        examiner_name: examinerName.trim() || undefined,
        include_ela: true,
        include_metadata: true,
        include_chain_of_custody: true,
      });
      setShowModal(false);
      setCustomTitle('');
      loadData();
    } catch (err: any) {
      alert(`Report compilation failed: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1>FORENSIC INVESTIGATION REPORTS</h1>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            PRINTABLE D-DIN TYPOGRAPHY PDF DOSSIERS & MACHINE-READABLE JSON EXPORTS
          </div>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => setShowModal(true)}
          disabled={cases.length === 0}
        >
          <Plus size={14} /> GENERATE NEW REPORT
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">ARCHIVED INVESTIGATION REPORTS ({reports.length})</span>
        </div>

        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            QUERYING REPORT ARCHIVES...
          </div>
        ) : reports.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            NO FORENSIC REPORTS GENERATED YET.
            {cases.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <button className="btn btn-secondary" onClick={() => setShowModal(true)}>
                  <Plus size={14} /> COMPILE FIRST REPORT
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>FORMAT</th>
                  <th>REPORT TITLE</th>
                  <th>EXAMINER</th>
                  <th>FILE SIZE</th>
                  <th>GENERATED AT (UTC)</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <span className={`badge ${r.report_format === 'PDF' ? 'badge-match' : ''}`}>
                        {r.report_format}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700 }}>{r.title}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{r.examiner_name}</td>
                    <td>{(r.file_size / 1024).toFixed(1)} KB</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                      {r.generated_at ? r.generated_at.slice(0, 19).replace('T', ' ') : 'N/A'}
                    </td>
                    <td>
                      <a href={r.download_url} download className="btn btn-secondary btn-sm">
                        <Download size={12} /> DOWNLOAD
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Generate Report */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <span className="panel-title">GENERATE INVESTIGATION REPORT</span>
              <button
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateReport}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">SELECT INVESTIGATION CASE *</label>
                  <select
                    className="form-control"
                    required
                    value={selectedCaseId}
                    onChange={(e) => setSelectedCaseId(e.target.value)}
                  >
                    {cases.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.reference_number}: {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">REPORT FORMAT *</label>
                  <div style={{ display: 'flex', gap: '20px', marginTop: '6px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="reportFormat"
                        checked={reportFormat === 'PDF'}
                        onChange={() => setReportFormat('PDF')}
                      />
                      <span>PDF REPORT (PRINTABLE DOCUMENT WITH D-DIN)</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="reportFormat"
                        checked={reportFormat === 'JSON'}
                        onChange={() => setReportFormat('JSON')}
                      />
                      <span>JSON EXPORT (MACHINE READABLE)</span>
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">REPORT TITLE (OPTIONAL)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Leave empty to use automatic case title"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">SIGNING EXAMINER NAME *</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    value={examinerName}
                    onChange={(e) => setExaminerName(e.target.value)}
                  />
                </div>

                <div className="alert alert-info" style={{ fontSize: '11px', marginTop: '12px' }}>
                  The report will automatically incorporate: full evidence item directory, SHA-256 and MD5 cryptographic integrity digests, complete EXIF camera & capture tables, Error Level Analysis (ELA) exhibits with recompression differentials, chain of custody logs, and standard scientific limitation disclosures.
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  CANCEL
                </button>
                <button type="submit" className="btn btn-primary" disabled={generating}>
                  {generating ? 'COMPILING REPORT...' : 'GENERATE & RECORD'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
