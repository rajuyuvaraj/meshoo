import React, { useState } from 'react';
import { Truck, Lock, User, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { isSupabaseConfigured } from '../../services/supabaseClient';

export default function LoginScreen({ onLoginSuccess }) {
  const [username, setUsername] = useState('manager.vns');
  const [password, setPassword] = useState('vns@2026');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onLoginSuccess(username, password);
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoQuickLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await onLoginSuccess('hubmanager.vns', 'admin123');
    } catch (err) {
      setError(err.message);
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
          <h2 className="login-title">Varanasi Hub Portal</h2>
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
            <label className="form-label">Manager Username or Email</label>
            <div className="input-prefix-wrapper">
              <span className="input-prefix"><User size={16} /></span>
              <input
                type="text"
                className="form-input"
                required
                placeholder="e.g. manager.vns or manager@hub.in"
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-prefix-wrapper">
              <span className="input-prefix"><Lock size={16} /></span>
              <input
                type="password"
                className="form-input"
                required
                placeholder="Enter password"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block btn-lg"
            style={{ marginTop: '8px' }}
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

        <div className="demo-login-box">
          <p>
            {isSupabaseConfigured 
              ? '⚡ Supabase Auth active. Enter registered manager credentials.'
              : '🚀 Demo Sandbox Mode active with pre-populated Varanasi Hub data.'
            }
          </p>
          <button
            type="button"
            className="btn btn-secondary btn-block btn-sm"
            onClick={handleDemoQuickLogin}
            disabled={loading}
          >
            <ShieldCheck size={16} color="#4f46e5" />
            <span>1-Click Manager Demo Access</span>
          </button>
        </div>
      </div>
    </div>
  );
}
