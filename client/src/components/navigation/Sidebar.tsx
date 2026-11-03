import React from 'react';
import { NavLink } from 'react-router-dom';
import { ScanEye, GitCompare, BookOpen, Server } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const navItems = [
    { to: '/', label: 'Image Analyzer', icon: ScanEye },
    { to: '/compare', label: 'Image Comparator', icon: GitCompare },
    { to: '/methodology', label: 'Methodology & Guide', icon: BookOpen },
  ];

  return (
    <aside style={{
      width: '240px',
      minWidth: '240px',
      backgroundColor: '#000000',
      borderRight: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'sticky',
      top: 0
    }}>
      {/* Branding Header */}
      <div style={{
        padding: '24px 18px',
        borderBottom: '1px solid var(--border-color)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '12px',
            height: '12px',
            backgroundColor: '#ffffff',
            borderRadius: 'var(--radius-strict)'
          }} />
          <h1 style={{
            fontSize: '15px',
            margin: 0,
            letterSpacing: '0.1em',
            fontWeight: 700
          }}>
            PIXELTRACE
          </h1>
        </div>
        <div style={{
          fontSize: '10px',
          color: 'var(--text-secondary)',
          marginTop: '6px',
          letterSpacing: '0.05em'
        }}>
          DIGITAL IMAGE FORENSICS // v1.0
        </div>
      </div>

      {/* Navigation List */}
      <nav style={{ flex: 1, padding: '16px 10px' }}>
        <ul style={{ listStyle: 'none' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.to} style={{ marginBottom: '6px' }}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    fontSize: '12px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    textDecoration: 'none',
                    borderRadius: 'var(--radius-strict)',
                    backgroundColor: isActive ? '#ffffff' : 'transparent',
                    color: isActive ? '#000000' : 'var(--text-secondary)',
                    border: '1px solid',
                    borderColor: isActive ? '#ffffff' : 'transparent'
                  })}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Local Airgap Footer */}
      <div style={{
        padding: '16px 18px',
        borderTop: '1px solid var(--border-color)',
        backgroundColor: '#0a0a0a'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
          <Server size={12} color="#ffffff" />
          <span style={{ fontSize: '10px', fontWeight: 700, color: '#ffffff', letterSpacing: '0.05em' }}>
            LOCAL AIRGAP MODE
          </span>
        </div>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
          127.0.0.1:8000 // OFFLINE
        </div>
      </div>
    </aside>
  );
};
