import React, { useState } from 'react';
import { Truck, Lock, User, ArrowRight, AlertCircle, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { isSupabaseConfigured } from '../../services/supabaseClient';

export default function LoginScreen({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onLoginSuccess(username, password);
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your username and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo-wrap">
          <div className="login-icon">
            <Truck size={28} />
          </div>
          <h2 className="login-title">UT8 HUB Portal</h2>
          <p className="login-subtitle">Fleet Operations & Bank Remittance Tracker</p>
        </div>

        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Manager Username</label>
            <div className="input-prefix-wrapper">
              <span className="input-prefix"><User size={16} /></span>
              <input
                type="text"
                className="form-input"
                required
                autoComplete="username"
                placeholder="Enter Manager Username"
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Secure Password</label>
            <div className="input-prefix-wrapper" style={{ position: 'relative' }}>
              <span className="input-prefix"><Lock size={16} /></span>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                required
                autoComplete="current-password"
                placeholder="Enter Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 2
                }}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block btn-lg"
            style={{ marginTop: '10px' }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : (
              <>
                <span>Sign In to Hub Console</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.76rem', color: '#64748b' }}>
            <ShieldCheck size={14} color="#10b981" />
            <span>256-Bit Encrypted & Salted Cryptographic Authentication</span>
          </div>
          {isSupabaseConfigured && (
            <p style={{ fontSize: '0.72rem', color: '#059669', marginTop: '4px' }}>
              ⚡ Supabase Postgres RLS Security Active
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
