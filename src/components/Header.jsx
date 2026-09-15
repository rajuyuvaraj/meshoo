import React, { useState } from 'react';
import { Truck, LogOut, RefreshCw, Database, Calendar as CalendarIcon, ShieldCheck, UploadCloud } from 'lucide-react';
import { isSupabaseConfigured, updateSupabaseConfig } from '../services/supabaseClient';

export default function Header({ user, onLogout, activeTab, onTabChange, onResetDemoData, onOpenBulkUpload }) {
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [supabaseUrl, setSupabaseUrl] = useState(localStorage.getItem('vns_supabase_url') || '');
  const [supabaseKey, setSupabaseKey] = useState(localStorage.getItem('vns_supabase_key') || '');

  const handleSaveConfig = (e) => {
    e.preventDefault();
    updateSupabaseConfig(supabaseUrl.trim(), supabaseKey.trim());
    setShowConfigModal(false);
  };

  const handleClearConfig = () => {
    updateSupabaseConfig('', '');
    setShowConfigModal(false);
  };

  return (
    <header className="hub-header">
      <div className="header-inner">
        {/* Brand & Hub Info */}
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
              <span>Ops & Bank Remittance Tracker</span>
              <span>•</span>
              <span style={{ color: isSupabaseConfigured ? '#34d399' : '#fbbf24', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <Database size={11} /> {isSupabaseConfigured ? 'Supabase Live' : 'Demo Storage'}
              </span>
            </div>
          </div>
        </div>

        {/* Desktop Navigation Tabs (Calendar & Remittance) */}
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

        {/* Header Right Actions */}
        <div className="header-actions">
          {/* Quick Bulk Upload Trigger */}
          <button
            className="btn btn-secondary btn-sm"
            style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.15)' }}
            title="Upload CSV Shift Entries"
            onClick={onOpenBulkUpload}
          >
            <UploadCloud size={15} />
            <span style={{ display: 'none', md: 'inline' }}>Upload CSV</span>
          </button>

          <button
            className="btn-icon"
            title="Configure Supabase Database"
            onClick={() => setShowConfigModal(true)}
          >
            <Database size={16} />
          </button>

          <button
            className="btn-icon"
            title="Reset Mock Data"
            onClick={onResetDemoData}
          >
            <RefreshCw size={16} />
          </button>

          <div className="manager-badge" title={`Signed in as ${user?.email || 'Hub Manager'}`}>
            <div className="avatar-initials">HM</div>
            <span style={{ display: 'none', md: 'inline' }}>{user?.username || 'Manager'}</span>
          </div>

          <button
            className="btn-icon"
            title="Sign Out"
            onClick={onLogout}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* Supabase Connection Dialog */}
      {showConfigModal && (
        <div className="modal-overlay" onClick={() => setShowConfigModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Supabase Database Connection</h3>
              <button className="btn-icon" onClick={() => setShowConfigModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveConfig}>
              <div className="modal-body">
                <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '14px' }}>
                  Connect your live Supabase project to sync daily shift reconciliations and bank remittances to Postgres.
                </p>

                <div className="form-group">
                  <label className="form-label">Supabase Project URL</label>
                  <input
                    type="url"
                    className="form-input"
                    placeholder="https://xyzcompany.supabase.co"
                    value={supabaseUrl}
                    onChange={e => setSupabaseUrl(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Supabase Anon Public API Key</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={supabaseKey}
                    onChange={e => setSupabaseKey(e.target.value)}
                  />
                </div>

                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.78rem', color: '#475569' }}>
                  💡 SQL Schema is saved in <code style={{ fontWeight: 600 }}>supabase/schema.sql</code>. Execute it in your Supabase SQL Editor.
                </div>
              </div>
              <div className="modal-footer">
                {isSupabaseConfigured && (
                  <button type="button" className="btn btn-danger btn-sm" onClick={handleClearConfig} style={{ marginRight: 'auto' }}>
                    Disconnect & Use Demo Mode
                  </button>
                )}
                <button type="button" className="btn btn-secondary" onClick={() => setShowConfigModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save & Connect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
