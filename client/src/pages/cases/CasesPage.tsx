import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Case } from '../../types';
import { Plus, Search, Archive, Trash2, FolderOpen, AlertTriangle } from 'lucide-react';

export const CasesPage: React.FC = () => {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [includeArchived, setIncludeArchived] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Case Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [refNum, setRefNum] = useState('');
  const [examiner, setExaminer] = useState('Shrvan');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [creating, setCreating] = useState(false);

  // Delete confirmation modal state
  const [caseToDelete, setCaseToDelete] = useState<Case | null>(null);

  useEffect(() => {
    loadCases();
  }, [includeArchived]);

  const loadCases = async (searchTerm?: string) => {
    try {
      setLoading(true);
      const data = await api.getCases(searchTerm !== undefined ? searchTerm : search, includeArchived);
      setCases(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load cases');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadCases(search);
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !refNum.trim() || !examiner.trim()) return;

    try {
      setCreating(true);
      await api.createCase({
        title: title.trim(),
        reference_number: refNum.trim(),
        examiner_name: examiner.trim(),
        description: description.trim(),
        notes: notes.trim(),
      });
      setShowCreateModal(false);
      setTitle('');
      setRefNum('');
      setDescription('');
      setNotes('');
      loadCases();
    } catch (err: any) {
      alert(`Error creating case: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleToggleArchive = async (c: Case) => {
    try {
      await api.updateCase(c.id, { is_archived: !c.is_archived });
      loadCases();
    } catch (err: any) {
      alert(`Error updating archive status: ${err.message}`);
    }
  };

  const confirmDeleteCase = async () => {
    if (!caseToDelete) return;
    try {
      await api.deleteCase(caseToDelete.id);
      setCaseToDelete(null);
      loadCases();
    } catch (err: any) {
      alert(`Error deleting case: ${err.message}`);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1>INVESTIGATION CASES</h1>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            DIGITAL EVIDENCE DOSSIERS & CHAIN OF CUSTODY
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <Plus size={14} /> NEW INVESTIGATION CASE
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="panel" style={{ marginBottom: '24px', padding: '12px 16px' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type="text"
              className="form-control"
              placeholder="SEARCH BY CASE REFERENCE, TITLE OR EXAMINER..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-secondary">
            <Search size={14} /> SEARCH
          </button>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
            />
            SHOW ARCHIVED
          </label>
        </form>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Cases Table */}
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">REGISTERED CASES ({cases.length})</span>
        </div>

        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            QUERYING CASE DATABASE...
          </div>
        ) : cases.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            NO INVESTIGATION CASES FOUND.
            <div style={{ marginTop: '12px' }}>
              <button className="btn btn-secondary" onClick={() => setShowCreateModal(true)}>
                <Plus size={14} /> CREATE FIRST CASE
              </button>
            </div>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>STATUS</th>
                  <th>CASE REF</th>
                  <th>CASE TITLE</th>
                  <th>EXAMINER</th>
                  <th>EVIDENCE COUNT</th>
                  <th>DATE CREATED</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => (
                  <tr key={c.id}>
                    <td>
                      {c.is_archived ? (
                        <span className="badge">ARCHIVED</span>
                      ) : (
                        <span className="badge badge-match">{c.status}</span>
                      )}
                    </td>
                    <td style={{ fontWeight: 700 }}>{c.reference_number}</td>
                    <td>{c.title}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{c.examiner_name}</td>
                    <td>{c.evidence_count || 0}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                      {c.created_at ? c.created_at.slice(0, 10) : 'N/A'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <Link to={`/cases/${c.id}`} className="btn btn-secondary btn-sm">
                          <FolderOpen size={12} /> OPEN
                        </Link>
                        <button
                          className="btn btn-secondary btn-sm"
                          title={c.is_archived ? 'Unarchive Case' : 'Archive Case'}
                          onClick={() => handleToggleArchive(c)}
                        >
                          <Archive size={12} />
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          title="Delete Case"
                          onClick={() => setCaseToDelete(c)}
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

      {/* Modal: Create Case */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <span className="panel-title">OPEN NEW INVESTIGATION CASE</span>
              <button
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '16px' }}
                onClick={() => setShowCreateModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateCase}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">CASE TITLE *</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="e.g. Project Aurora Image Authenticity Review"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">CASE REFERENCE NUMBER *</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="e.g. CAS-2026-001"
                    value={refNum}
                    onChange={(e) => setRefNum(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">PRIMARY EXAMINER NAME *</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="e.g. Lead Examiner"
                    value={examiner}
                    onChange={(e) => setExaminer(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">INVESTIGATION DESCRIPTION</label>
                  <textarea
                    rows={3}
                    className="form-control"
                    placeholder="Scope, context, and investigation directives..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">PRELIMINARY NOTES</label>
                  <textarea
                    rows={2}
                    className="form-control"
                    placeholder="Optional chain of custody notes or intake notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  CANCEL
                </button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? 'CREATING...' : 'ESTABLISH CASE'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Confirmation */}
      {caseToDelete && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <span className="panel-title" style={{ color: 'var(--color-error)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={16} /> PERMANENT CASE REMOVAL
              </span>
              <button
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
                onClick={() => setCaseToDelete(null)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '12px' }}>
                Are you sure you want to permanently delete investigation case <b>{caseToDelete.reference_number}</b> ({caseToDelete.title})?
              </p>
              <div className="alert alert-error" style={{ fontSize: '11px' }}>
                WARNING: Deleting this case will also purge all sealed evidence files, derived ELA artifacts, thumbnails, and generated reports from local storage.
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setCaseToDelete(null)}>
                CANCEL
              </button>
              <button type="button" className="btn btn-danger" onClick={confirmDeleteCase}>
                CONFIRM DELETION
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

