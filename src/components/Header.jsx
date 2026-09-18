import React from 'react';
import { Truck, LogOut, Download, Moon, Sun } from 'lucide-react';

export default function Header({ user, onLogout, onExportAll, theme = 'light', onToggleTheme }) {
  const managerDisplayName = user?.name || user?.username || 'Vaibhav';
  const managerInitials = managerDisplayName.substring(0, 2).toUpperCase();
  const isDark = theme === 'dark';

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
              <h1>UT8 HUB</h1>
              <span className="hub-tag">UT8-01</span>
            </div>
            <div className="subtitle">
              <span>Fleet Operations</span>
            </div>
          </div>
        </div>

        {/* Right Section: Export, Dark Mode Toggle, Manager Profile & Sign Out */}
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
              <span className="hide-mobile">Export All (Excel)</span>
            </button>
          )}

          {/* Dark Mode Toggle Button */}
          <button
            type="button"
            className="btn-icon theme-toggle-btn"
            onClick={onToggleTheme}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            style={{
              position: 'relative',
              borderRadius: '8px',
              color: isDark ? '#fbbf24' : '#e2e8f0',
              background: isDark ? 'rgba(251, 191, 36, 0.15)' : 'rgba(255, 255, 255, 0.08)',
              border: `1px solid ${isDark ? 'rgba(251, 191, 36, 0.3)' : 'rgba(255, 255, 255, 0.15)'}`,
              transition: 'all 0.25s ease'
            }}
          >
            {isDark ? (
              <Sun size={18} style={{ transform: 'rotate(0deg)', transition: 'transform 0.3s ease' }} />
            ) : (
              <Moon size={18} style={{ transform: 'rotate(0deg)', transition: 'transform 0.3s ease' }} />
            )}
          </button>

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

