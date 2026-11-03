import {
  Case,
  Evidence,
  IntegrityVerification,
  MetadataResult,
  HashResult,
  HashCompareResult,
  ELAResult,
  ImageCompareResult,
  AuditEvent,
  ReportItem,
  DashboardStats
} from '../types';

const API_BASE = '/api/v1';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errMsg = `Request failed with status ${res.status}`;
    try {
      const data = await res.json();
      if (data.detail) errMsg = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
      else if (data.message) errMsg = data.message;
    } catch {
      // Keep status string
    }
    throw new Error(errMsg);
  }
  if (res.status === 204) {
    return {} as T;
  }
  return res.json();
}

export const api = {
  // Instant Forensic Scan (Zero friction drag & drop)
  async quickScan(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/quick-scan`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse<any>(res);
  },

  // Dashboard
  async getDashboardStats(): Promise<DashboardStats> {
    const res = await fetch(`${API_BASE}/dashboard/stats`);
    return handleResponse<DashboardStats>(res);
  },

  // Cases
  async getCases(search?: string, includeArchived = true): Promise<Case[]> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    params.append('include_archived', String(includeArchived));
    const res = await fetch(`${API_BASE}/cases?${params.toString()}`);
    return handleResponse<Case[]>(res);
  },

  async getCase(id: string): Promise<Case> {
    const res = await fetch(`${API_BASE}/cases/${id}`);
    return handleResponse<Case>(res);
  },

  async createCase(data: {
    title: string;
    reference_number: string;
    examiner_name: string;
    description?: string;
    notes?: string;
  }): Promise<Case> {
    const res = await fetch(`${API_BASE}/cases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Case>(res);
  },

  async updateCase(id: string, updates: Partial<Case>): Promise<Case> {
    const res = await fetch(`${API_BASE}/cases/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return handleResponse<Case>(res);
  },

  async deleteCase(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/cases/${id}`, {
      method: 'DELETE',
    });
    return handleResponse<void>(res);
  },

  // Evidence
  async uploadEvidence(caseId: string, file: File, examinerName = 'SYSTEM'): Promise<Evidence> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('examiner_name', examinerName);
    const res = await fetch(`${API_BASE}/cases/${caseId}/evidence`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse<Evidence>(res);
  },

  async getEvidenceList(caseId?: string, format?: string, search?: string): Promise<Evidence[]> {
    const params = new URLSearchParams();
    if (caseId) params.append('case_id', caseId);
    if (format) params.append('file_format', format);
    if (search) params.append('search', search);
    const res = await fetch(`${API_BASE}/evidence?${params.toString()}`);
    return handleResponse<Evidence[]>(res);
  },

  async getEvidence(id: string): Promise<Evidence> {
    const res = await fetch(`${API_BASE}/evidence/${id}`);
    return handleResponse<Evidence>(res);
  },

  async verifyIntegrity(evidenceId: string, examinerName = 'SYSTEM'): Promise<IntegrityVerification> {
    const res = await fetch(`${API_BASE}/evidence/${evidenceId}/verify-integrity?examiner_name=${encodeURIComponent(examinerName)}`, {
      method: 'POST',
    });
    return handleResponse<IntegrityVerification>(res);
  },

  async deleteEvidence(evidenceId: string, examinerName = 'SYSTEM'): Promise<void> {
    const res = await fetch(`${API_BASE}/evidence/${evidenceId}?examiner_name=${encodeURIComponent(examinerName)}`, {
      method: 'DELETE',
    });
    return handleResponse<void>(res);
  },

  // Forensic Analysis
  async getMetadata(evidenceId: string): Promise<MetadataResult> {
    const res = await fetch(`${API_BASE}/evidence/${evidenceId}/metadata`, {
      method: 'POST',
    });
    return handleResponse<MetadataResult>(res);
  },

  async getHash(evidenceId: string): Promise<HashResult> {
    const res = await fetch(`${API_BASE}/evidence/${evidenceId}/hash`, {
      method: 'POST',
    });
    return handleResponse<HashResult>(res);
  },

  async compareHashes(refId: string, targetId: string, algorithm = 'SHA-256'): Promise<HashCompareResult> {
    const res = await fetch(`${API_BASE}/comparison/hash`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reference_evidence_id: refId,
        target_evidence_id: targetId,
        algorithm,
      }),
    });
    return handleResponse<HashCompareResult>(res);
  },

  async executeELA(evidenceId: string, quality = 95, scale = 15): Promise<ELAResult> {
    const res = await fetch(`${API_BASE}/evidence/${evidenceId}/ela`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quality, scale }),
    });
    return handleResponse<ELAResult>(res);
  },

  async compareImages(refId: string, targetId: string, caseId?: string): Promise<ImageCompareResult> {
    const res = await fetch(`${API_BASE}/comparison/images`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reference_evidence_id: refId,
        target_evidence_id: targetId,
        case_id: caseId,
      }),
    });
    return handleResponse<ImageCompareResult>(res);
  },

  // Reports
  async generateReport(caseId: string, options: {
    evidence_id?: string;
    report_format: 'PDF' | 'JSON';
    title?: string;
    examiner_name?: string;
    include_ela?: boolean;
    include_metadata?: boolean;
    include_chain_of_custody?: boolean;
  }): Promise<ReportItem> {
    const res = await fetch(`${API_BASE}/cases/${caseId}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });
    return handleResponse<ReportItem>(res);
  },

  async getReports(caseId?: string): Promise<ReportItem[]> {
    const params = new URLSearchParams();
    if (caseId) params.append('case_id', caseId);
    const res = await fetch(`${API_BASE}/reports?${params.toString()}`);
    return handleResponse<ReportItem[]>(res);
  },

  // Audit Logs
  async getAuditLogs(caseId?: string, evidenceId?: string): Promise<AuditEvent[]> {
    const params = new URLSearchParams();
    if (caseId) params.append('case_id', caseId);
    if (evidenceId) params.append('evidence_id', evidenceId);
    const res = await fetch(`${API_BASE}/audit-log?${params.toString()}`);
    return handleResponse<AuditEvent[]>(res);
  },
};

