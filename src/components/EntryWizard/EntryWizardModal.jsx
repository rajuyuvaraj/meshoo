import React, { useState, useMemo } from 'react';
import { 
  X, 
  Save, 
  User, 
  Package, 
  CreditCard, 
  Banknote, 
  CheckCircle2, 
  AlertCircle,
  Hash,
  Sparkles
} from 'lucide-react';
import { formatINR, calculateCashTally, getAuditStatus, DENOMINATIONS } from '../../utils/formatters';

export default function EntryWizardModal({
  initialDate,
  entryToEdit = null,
  knownAgents = [],
  onClose,
  onSave
}) {
  // Form state
  const [formData, setFormData] = useState({
    id: entryToEdit?.id || null,
    agent_name: entryToEdit?.agent_name || '',
    login_account_id: entryToEdit?.login_account_id || '',
    entry_date: entryToEdit?.entry_date || initialDate || new Date().toISOString().split('T')[0],
    hub_location: entryToEdit?.hub_location || 'Varanasi Hub',
    total_delivered: entryToEdit?.total_delivered ?? '',
    cod_orders: entryToEdit?.cod_orders ?? '',
    online_received: entryToEdit?.online_received ?? '',
    reported_cod_cash: entryToEdit?.reported_cod_cash ?? '',
    note_500: entryToEdit?.note_500 ?? 0,
    note_200: entryToEdit?.note_200 ?? 0,
    note_100: entryToEdit?.note_100 ?? 0,
    note_50: entryToEdit?.note_50 ?? 0,
    note_20: entryToEdit?.note_20 ?? 0,
    note_10: entryToEdit?.note_10 ?? 0,
    coin_1: entryToEdit?.coin_1 ?? 0,
  });

  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Live calculations
  const actualCashTally = useMemo(() => calculateCashTally(formData), [formData]);
  const onlineReceived = Number(formData.online_received) || 0;
  const reportedCodCash = Number(formData.reported_cod_cash) || 0;
  const totalSettled = onlineReceived + actualCashTally;
  const cashVariance = actualCashTally - reportedCodCash;
  const auditStatus = getAuditStatus(cashVariance);

  // When manager types an agent name, auto-suggest login id if matched
  const handleAgentNameChange = (nameVal) => {
    setFormData(prev => {
      const match = knownAgents.find(a => a.name.toLowerCase() === nameVal.toLowerCase());
      return {
        ...prev,
        agent_name: nameVal,
        login_account_id: match && !prev.login_account_id ? match.login_account_id : prev.login_account_id,
      };
    });
  };

  const handleTextChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNumberChange = (field, value) => {
    const num = value === '' ? '' : Math.max(0, parseInt(value, 10) || 0);
    setFormData(prev => ({ ...prev, [field]: num }));
  };

  const handleDenomChange = (denomKey, delta) => {
    setFormData(prev => {
      const current = Number(prev[denomKey]) || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [denomKey]: next };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    if (!formData.agent_name.trim()) {
      setValidationError('Please enter the Delivery Agent (Rider) Name.');
      return;
    }
    if (!formData.entry_date) {
      setValidationError('Please select a shift date.');
      return;
    }

    const delivered = Number(formData.total_delivered) || 0;
    const cod = Number(formData.cod_orders) || 0;
    if (cod > delivered && delivered > 0) {
      setValidationError('COD Orders cannot exceed Total Delivered orders.');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        ...formData,
        agent_name: formData.agent_name.trim(),
        login_account_id: formData.login_account_id.trim(),
        total_delivered: delivered,
        cod_orders: cod,
        online_received: onlineReceived,
        reported_cod_cash: reportedCodCash,
        actual_cash_tally: actualCashTally,
        total_settled: totalSettled,
        cash_variance: cashVariance,
        audit_status: auditStatus,
      });
      onClose();
    } catch (err) {
      setValidationError(err.message || 'Failed to save entry.');
    } finally {
      setSaving(false);
    }
  };

  const isEditing = Boolean(entryToEdit?.id);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card wide" onClick={e => e.stopPropagation()} style={{ maxWidth: '820px' }}>
        {/* Modal Header */}
        <div className="modal-header" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#ffffff' }}>
          <div>
            <h3 className="modal-title" style={{ color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} color="#818cf8" />
              <span>{isEditing ? `Edit Shift Entry — ${entryToEdit.agent_name}` : 'New Rider Shift Reconciliation'}</span>
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              Single-flow entry: enter rider shift data, count physical cash notes, and instantly reconcile.
            </p>
          </div>
          <button className="btn-icon" onClick={onClose} style={{ color: '#94a3b8' }}>
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="modal-body" style={{ maxHeight: 'calc(88vh - 140px)', overflowY: 'auto', padding: '20px' }}>
            {/* Validation Error Banner */}
            {validationError && (
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
                <span>{validationError}</span>
              </div>
            )}

            {/* 1. AGENT & SHIFT DETAILS */}
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '18px' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: '#475569', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={15} color="#4f46e5" />
                <span>1. Agent & Shift Details</span>
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Delivery Agent (Rider) <span className="required">*</span></label>
                  <div className="input-prefix-wrapper">
                    <span className="input-prefix"><User size={15} /></span>
                    <input
                      type="text"
                      list="agent-suggestions"
                      className="form-input"
                      required
                      placeholder="Type Rider Name (e.g. Rahul Sharma)"
                      value={formData.agent_name}
                      onChange={e => handleAgentNameChange(e.target.value)}
                    />
                  </div>
                  <datalist id="agent-suggestions">
                    {knownAgents.map((ag, i) => (
                      <option key={i} value={ag.name}>{ag.login_account_id ? `${ag.name} (${ag.login_account_id})` : ag.name}</option>
                    ))}
                  </datalist>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Login Account ID</label>
                  <div className="input-prefix-wrapper">
                    <span className="input-prefix"><Hash size={15} /></span>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. LOG-VNS-101"
                      value={formData.login_account_id}
                      onChange={e => handleTextChange('login_account_id', e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Shift Date <span className="required">*</span></label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.entry_date}
                    onChange={e => handleTextChange('entry_date', e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Hub Location</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.hub_location}
                    onChange={e => handleTextChange('hub_location', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* 2. DELIVERY VOLUME & REPORTED COLLECTIONS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '18px' }}>
              {/* Delivery Volume */}
              <div style={{ background: '#f0f9ff', padding: '16px', borderRadius: '12px', border: '1px solid #bae6fd' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: '#0369a1', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Package size={15} color="#0284c7" />
                  <span>2. Delivery Volume</span>
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Total Delivered <span className="required">*</span></label>
                    <input
                      type="number"
                      min="0"
                      className="form-input"
                      placeholder="0"
                      value={formData.total_delivered}
                      onChange={e => handleNumberChange('total_delivered', e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">COD Orders <span className="required">*</span></label>
                    <input
                      type="number"
                      min="0"
                      className="form-input"
                      placeholder="0"
                      value={formData.cod_orders}
                      onChange={e => handleNumberChange('cod_orders', e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#0369a1' }}>
                  Prepaid: <strong>{Math.max(0, (Number(formData.total_delivered) || 0) - (Number(formData.cod_orders) || 0))}</strong> parcels
                </div>
              </div>

              {/* Reported Collections */}
              <div style={{ background: '#ccfbf1', padding: '16px', borderRadius: '12px', border: '1px solid #99f6e4' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: '#0f766e', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CreditCard size={15} color="#0d9488" />
                  <span>3. Reported Collections</span>
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Online UPI Received</label>
                    <div className="input-prefix-wrapper">
                      <span className="input-prefix">₹</span>
                      <input
                        type="number"
                        min="0"
                        className="form-input"
                        placeholder="0"
                        value={formData.online_received}
                        onChange={e => handleNumberChange('online_received', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Reported COD Cash <span className="required">*</span></label>
                    <div className="input-prefix-wrapper">
                      <span className="input-prefix">₹</span>
                      <input
                        type="number"
                        min="0"
                        className="form-input"
                        placeholder="0"
                        value={formData.reported_cod_cash}
                        onChange={e => handleNumberChange('reported_cod_cash', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#0f766e' }}>
                  Reported App Cash to Reconcile: <strong>{formatINR(reportedCodCash)}</strong>
                </div>
              </div>
            </div>

            {/* 3. PHYSICAL CASH DENOMINATION TALLY */}
            <div style={{ background: '#f5f3ff', padding: '16px', borderRadius: '12px', border: '1px solid #ddd6fe', marginBottom: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: '#6d28d9', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Banknote size={15} color="#7c3aed" />
                  <span>4. Physical Cash Denomination Tally</span>
                </h4>
                <span style={{ fontSize: '0.78rem', color: '#6d28d9', fontWeight: 600 }}>
                  Live Count Multipliers
                </span>
              </div>

              <div className="tally-container" style={{ background: '#ffffff' }}>
                {DENOMINATIONS.map(denom => {
                  const count = Number(formData[denom.key]) || 0;
                  const subtotal = count * denom.value;

                  return (
                    <div key={denom.key} className="tally-row">
                      <div className="denom-tag" style={{ borderColor: denom.color, color: denom.color }}>
                        {denom.tag}
                      </div>

                      <div className="counter-controls">
                        <button
                          type="button"
                          className="counter-btn"
                          onClick={() => handleDenomChange(denom.key, -1)}
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="0"
                          className="counter-input"
                          value={count === 0 ? '' : count}
                          placeholder="0"
                          onChange={e => handleNumberChange(denom.key, e.target.value)}
                        />
                        <button
                          type="button"
                          className="counter-btn"
                          onClick={() => handleDenomChange(denom.key, 1)}
                        >
                          +
                        </button>
                      </div>

                      <div className="denom-subtotal">
                        {formatINR(subtotal)}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Live Actual Cash Banner */}
              <div className="live-tally-banner" style={{ marginTop: '12px', background: 'linear-gradient(135deg, #312e81 0%, #1e1b4b 100%)' }}>
                <div>
                  <div className="live-tally-label">ACTUAL PHYSICAL CASH COUNT</div>
                  <div style={{ fontSize: '0.72rem', color: '#c7d2fe' }}>
                    Calculated live from currency note and coin counts
                  </div>
                </div>
                <div className="live-tally-val">
                  {formatINR(actualCashTally)}
                </div>
              </div>
            </div>

            {/* 4. REAL-TIME RECONCILIATION SUMMARY */}
            <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: '#475569', marginBottom: '12px' }}>
                5. Live Settlement & Audit Reconciliation
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginBottom: '12px' }}>
                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Online Received</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#059669' }}>{formatINR(onlineReceived)}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Actual Cash Counted</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#4f46e5' }}>{formatINR(actualCashTally)}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Total Settled Revenue</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>{formatINR(totalSettled)}</div>
                </div>

                <div style={{ 
                  background: cashVariance < 0 ? '#fef2f2' : cashVariance > 0 ? '#fffbeb' : '#ecfdf5',
                  padding: '10px 12px', 
                  borderRadius: '8px', 
                  border: `1px solid ${cashVariance < 0 ? '#fecaca' : cashVariance > 0 ? '#fde68a' : '#a7f3d0'}`
                }}>
                  <div style={{ 
                    fontSize: '0.72rem', 
                    color: cashVariance < 0 ? '#991b1b' : cashVariance > 0 ? '#92400e' : '#065f46',
                    fontWeight: 600
                  }}>
                    Variance ({auditStatus})
                  </div>
                  <div style={{ 
                    fontSize: '1.05rem', 
                    fontWeight: 700, 
                    color: cashVariance < 0 ? '#ef4444' : cashVariance > 0 ? '#d97706' : '#10b981'
                  }}>
                    {formatINR(cashVariance)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              style={{ marginRight: 'auto' }}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={saving}
            >
              <Save size={18} />
              <span>{saving ? 'Saving...' : (isEditing ? 'Save Changes & Update' : 'Save & Reconcile Shift Entry')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
