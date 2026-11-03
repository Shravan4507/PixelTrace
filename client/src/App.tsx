import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';

// Direct, focused forensic pages
const AnalyzerPage = lazy(() =>
  import('./pages/analysis/AnalyzerPage').then((m) => ({ default: m.AnalyzerPage }))
);
const ComparatorPage = lazy(() =>
  import('./pages/comparison/ComparatorPage').then((m) => ({ default: m.ComparatorPage }))
);
const MethodologyPage = lazy(() =>
  import('./pages/settings/MethodologyPage').then((m) => ({ default: m.MethodologyPage }))
);

const PageLoader: React.FC = () => (
  <div style={{ padding: '60px', textAlign: 'center', color: '#888888', letterSpacing: '0.08em', fontSize: '12px' }}>
    LOADING FORENSIC WORKSPACE...
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
                <AnalyzerPage />
              </Suspense>
            }
          />
          <Route
            path="compare"
            element={
              <Suspense fallback={<PageLoader />}>
                <ComparatorPage />
              </Suspense>
            }
          />
          <Route
            path="methodology"
            element={
              <Suspense fallback={<PageLoader />}>
                <MethodologyPage />
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
