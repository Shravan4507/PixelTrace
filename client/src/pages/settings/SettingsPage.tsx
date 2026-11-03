import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { AuditEvent } from '../../types';
import { ShieldCheck, Server, Database, Type, FileCode } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [auditLogs, setAuditLogs] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      const data = await api.getAuditLogs(undefined, undefined);
      setAuditLogs(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1>SYSTEM AUDIT & CHAIN OF CUSTODY</h1>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          LOCAL REPOSITORY CONFIGURATION & FORENSIC LOG AUDIT
        </div>
      </div>

      {/* Local Node Infrastructure Card */}
      <div className="panel" style={{ marginBottom: '24px' }}>
        <div className="panel-header">
          <span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Server size={14} /> LOCAL WORKSTATION NODE CONFIGURATION
          </span>
          <span className="badge badge-match">LOCAL AIRGAP MODE</span>
        </div>

        <div className="grid-3">
          <div style={{ borderRight: '1px solid var(--border-color)', paddingRight: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <Database size={13} color="var(--text-secondary)" />
              <span className="form-label">STORAGE ENGINE</span>
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700 }}>SQLite 3 (Local Relational)</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Path: <code>data/database/pixeltrace.db</code>
            </div>
          </div>

          <div style={{ borderRight: '1px solid var(--border-color)', paddingRight: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <Type size={13} color="var(--text-secondary)" />
              <span className="form-label">GLOBAL TYPOGRAPHY</span>
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700 }}>D-DIN (OFL 1.1 Licensed)</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Active in UI (WOFF2) & PDF Reports (TTF)
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <FileCode size={13} color="var(--text-secondary)" />
              <span className="form-label">NETWORK ISOLATION</span>
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700 }}>127.0.0.1 (Loopback Only)</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              No cloud connections or external APIs
            </div>
          </div>
        </div>
      </div>

      {/* Global Chain of Custody Table */}
      <div className="panel" style={{ marginBottom: '24px' }}>
        <div className="panel-header">
          <span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={14} /> IMMUTABLE CHAIN OF CUSTODY AUDIT LOGS ({auditLogs.length})
          </span>
          <button className="btn btn-secondary btn-sm" onClick={loadAuditLogs}>
            REFRESH LOGS
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            LOADING CUSTODY AUDIT EVENTS...
          </div>
        ) : auditLogs.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
            NO AUDIT EVENTS LOGGED YET.
          </div>
        ) : (
          <div className="table-container" style={{ maxHeight: '420px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>TIMESTAMP (UTC)</th>
                  <th>EVENT CLASSIFICATION</th>
                  <th>EXAMINER</th>
                  <th>CASE REF / ID</th>
                  <th>RECORDED TECHNICAL DETAILS</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((evt) => (
                  <tr key={evt.id}>
                    <td style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {evt.timestamp ? evt.timestamp.slice(0, 19).replace('T', ' ') : 'N/A'}
                    </td>
                    <td>
                      <span className="badge badge-match">{evt.event_type}</span>
                    </td>
                    <td style={{ fontWeight: 700 }}>{evt.examiner_name || 'SYSTEM'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>
                      {evt.case_id ? evt.case_id.slice(0, 8) + '...' : 'GLOBAL'}
                    </td>
                    <td style={{ fontSize: '11px', maxWidth: '380px', wordBreak: 'break-word', color: 'var(--text-secondary)' }}>
                      {JSON.stringify(evt.details)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Scientific Limitations & Standards Disclosure */}
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">FORENSIC SCIENCE METHODOLOGICAL LIMITATIONS</span>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
          <p>
            <b>1. Cryptographic Fingerprints:</b> SHA-256 digests verify that two bitstreams are identical byte-for-byte. A cryptographic match establishes binary equality but cannot verify the historical authenticity or provenance of the reference file.
          </p>
          <p>
            <b>2. Error Level Analysis (ELA):</b> ELA visualizes compression differentials resulting from lossy discrete cosine transform (DCT) quantization. Highly textured regions, saturated contrast borders, and legitimate multi-generation JPEG saves introduce variance. ELA findings are exploratory technical indicators, not standalone proof of manipulation.
          </p>
          <p>
            <b>3. EXIF Metadata:</b> Metadata tags can be fabricated, modified, or removed with standard utilities. Absence or presence of metadata must be corroborated by binary and compression inspection.
          </p>
        </div>
      </div>
    </div>
  );
};
