import React from 'react';
import { Truck, LogOut, Download } from 'lucide-react';

export default function Header({ user, onLogout, onExportAll }) {
  const managerDisplayName = user?.name || user?.username || 'Vaibhav';
  const managerInitials = managerDisplayName.substring(0, 2).toUpperCase();

  return (
    <header className="hub-header">
      <div className="header-inner">
        {/* Brand & Hub Title */}
        <div className="brand-section">
          <div className="brand-logo-badge">
            <Truck size={22} />
          </div>
          <div className="brand-text">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1>Varanasi Hub</h1>
              <span className="hub-tag">VNS-01</span>
            </div>
            <div className="subtitle">
              <span>Fleet Operations</span>
            </div>
          </div>
        </div>

        {/* Right Section: Manager Profile & Sign Out */}
        <div className="header-actions">
          {onExportAll && (
            <button
              type="button"
              className="btn btn-sm"
              style={{
                background: '#059669',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.78rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
              }}
              onClick={onExportAll}
              title="Download Excel Sheet for All Dates"
            >
              <Download size={14} />
              <span>Export All (Excel)</span>
            </button>
          )}

          <div className="manager-badge" title={`Signed in as ${managerDisplayName}`}>
            <div className="avatar-initials">{managerInitials}</div>
            <span style={{ fontWeight: 600 }}>{managerDisplayName}</span>
          </div>

          <button
            className="btn-icon"
            title="Sign Out"
            onClick={onLogout}
            style={{ borderRadius: '8px' }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
