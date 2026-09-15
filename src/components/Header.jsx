import React from 'react';
import { Truck, LogOut, Calendar as CalendarIcon, ShieldCheck } from 'lucide-react';

export default function Header({ user, onLogout, activeTab, onTabChange }) {
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
              <span>Fleet Operations & Bank Remittance</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs (Calendar & Remittance) */}
        <nav className="desktop-nav">
          <button
            className={`desktop-nav-item ${activeTab === 'calendar' ? 'active' : ''}`}
            onClick={() => onTabChange('calendar')}
          >
            <CalendarIcon size={16} />
            <span>Calendar Reconciliation</span>
          </button>
          <button
            className={`desktop-nav-item ${activeTab === 'remittance' ? 'active' : ''}`}
            onClick={() => onTabChange('remittance')}
          >
            <ShieldCheck size={16} />
            <span>Bank Remittance</span>
          </button>
        </nav>

        {/* Right Section: Manager Profile & Sign Out */}
        <div className="header-actions">
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
