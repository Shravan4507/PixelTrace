import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../navigation/Sidebar';

export const AppLayout: React.FC = () => {
  return (
    <div className="app-layout" style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#000000' }}>
      <Sidebar />
      <main style={{
        flex: 1,
        minWidth: 0,
        backgroundColor: '#000000',
        padding: '24px',
        overflowY: 'auto',
        height: '100vh'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

