import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';

// Lazy-loaded routes for optimal workstation performance
const DashboardPage = lazy(() =>
  import('./pages/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage }))
);
const CasesPage = lazy(() =>
  import('./pages/cases/CasesPage').then((m) => ({ default: m.CasesPage }))
);
const CaseDetailPage = lazy(() =>
  import('./pages/cases/CaseDetailPage').then((m) => ({ default: m.CaseDetailPage }))
);
const EvidencePage = lazy(() =>
  import('./pages/evidence/EvidencePage').then((m) => ({ default: m.EvidencePage }))
);
const AnalysisPage = lazy(() =>
  import('./pages/analysis/AnalysisPage').then((m) => ({ default: m.AnalysisPage }))
);
const ComparisonPage = lazy(() =>
  import('./pages/comparison/ComparisonPage').then((m) => ({ default: m.ComparisonPage }))
);
const ReportsPage = lazy(() =>
  import('./pages/reports/ReportsPage').then((m) => ({ default: m.ReportsPage }))
);
const SettingsPage = lazy(() =>
  import('./pages/settings/SettingsPage').then((m) => ({ default: m.SettingsPage }))
);

const PageLoader: React.FC = () => (
  <div style={{ padding: '60px', textAlign: 'center', color: '#888888', letterSpacing: '0.08em', fontSize: '12px' }}>
    LOADING FORENSIC MODULE...
  </div>
);

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route
            index
            element={
              <Suspense fallback={<PageLoader />}>
                <DashboardPage />
              </Suspense>
            }
          />
          <Route
            path="cases"
            element={
              <Suspense fallback={<PageLoader />}>
                <CasesPage />
              </Suspense>
            }
          />
          <Route
            path="cases/:caseId"
            element={
              <Suspense fallback={<PageLoader />}>
                <CaseDetailPage />
              </Suspense>
            }
          />
          <Route
            path="evidence"
            element={
              <Suspense fallback={<PageLoader />}>
                <EvidencePage />
              </Suspense>
            }
          />
          <Route
            path="analysis"
            element={
              <Suspense fallback={<PageLoader />}>
                <AnalysisPage />
              </Suspense>
            }
          />
          <Route
            path="comparison"
            element={
              <Suspense fallback={<PageLoader />}>
                <ComparisonPage />
              </Suspense>
            }
          />
          <Route
            path="reports"
            element={
              <Suspense fallback={<PageLoader />}>
                <ReportsPage />
              </Suspense>
            }
          />
          <Route
            path="settings"
            element={
              <Suspense fallback={<PageLoader />}>
                <SettingsPage />
              </Suspense>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;

