import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderLock,
  Image as ImageIcon,
  ScanEye,
  GitCompare,
  FileText,
  ShieldCheck,
  Server
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/cases', label: 'Cases', icon: FolderLock },
    { to: '/evidence', label: 'Evidence Library', icon: ImageIcon },
    { to: '/analysis', label: 'Forensic Analysis', icon: ScanEye },
    { to: '/comparison', label: 'Image Comparison', icon: GitCompare },
    { to: '/reports', label: 'Reports', icon: FileText },
    { to: '/settings', label: 'Audit & Custody', icon: ShieldCheck },
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
        padding: '20px 16px',
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
            fontSize: '14px',
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
          marginTop: '4px',
          letterSpacing: '0.05em'
        }}>
          DIGITAL IMAGE FORENSICS // 1.0.0
        </div>
      </div>

      {/* Navigation List */}
      <nav style={{ flex: 1, padding: '12px 8px' }}>
        <ul style={{ listStyle: 'none' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.to} style={{ marginBottom: '4px' }}>
                <NavLink
                  to={item.to}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
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

      {/* Localhost Security Indicator Footer */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--border-color)',
        backgroundColor: '#0a0a0a'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
          <Server size={12} color="#ffffff" />
          <span style={{ fontSize: '10px', fontWeight: 700, color: '#ffffff', letterSpacing: '0.05em' }}>
            LOCAL OFFLINE NODE
          </span>
        </div>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
          127.0.0.1:8000 // STRICT AIRGAP
        </div>
      </div>
    </aside>
  );
};

