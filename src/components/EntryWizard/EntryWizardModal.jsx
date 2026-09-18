import React, { useState, useMemo } from 'react';
import { 
  X, 
  Save, 
  User, 
  Package, 
  CreditCard, 
  Banknote, 
  AlertCircle,
  Hash,
  Sparkles,
  Smartphone,
  Wallet,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { formatINR, getAuditStatus, calculateRiderSalary } from '../../utils/formatters';

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
    hub_location: entryToEdit?.hub_location || 'UT8 HUB',
    total_delivered: entryToEdit?.total_delivered ?? '',
    reported_cod_cash: entryToEdit?.reported_cod_cash ?? '',
    online_received: entryToEdit?.online_received ?? '',
    cash_collected_fe: entryToEdit?.actual_cash_tally ?? entryToEdit?.actual_cash_collected ?? entryToEdit?.cash_collected_fe ?? '',
    salary_paid: Boolean(entryToEdit?.salary_paid),
  });

  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Live calculations
  const reportedCodCash = Number(formData.reported_cod_cash) || 0;
  const onlineReceived = Number(formData.online_received) || 0;
  const cashCollectedByFE = Number(formData.cash_collected_fe) || 0;

  // Total Settled = Online Received + Cash Collected by FE
  const totalSettled = onlineReceived + cashCollectedByFE;

  // Cash Variance = (Online Received + Cash Collected by FE) - Reported COD Cash (App)
  const cashVariance = totalSettled - reportedCodCash;
  const auditStatus = getAuditStatus(cashVariance);

  // Rider Salary Calculation (₹18 per delivered parcel - 1% TDS)
  const salaryCalc = calculateRiderSalary(formData.total_delivered, 18, 1);

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

    setSaving(true);
    try {
      await onSave({
        ...formData,
        agent_name: formData.agent_name.trim(),
        login_account_id: formData.login_account_id.trim(),
        total_delivered: delivered,
        cod_orders: 0,
        reported_cod_cash: reportedCodCash,
        online_received: onlineReceived,
        actual_cash_tally: cashCollectedByFE,
        actual_cash_collected: cashCollectedByFE,
        cash_collected_fe: cashCollectedByFE,
        total_settled: totalSettled,
        cash_variance: cashVariance,
        audit_status: auditStatus,
        salary_paid: Boolean(formData.salary_paid),
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
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '680px' }}>
        {/* Modal Header */}
        <div className="modal-header" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#ffffff' }}>
          <div>
            <h3 className="modal-title" style={{ color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} color="#818cf8" />
              <span>{isEditing ? `Edit Shift Entry — ${entryToEdit.agent_name}` : 'New Rider Shift Reconciliation'}</span>
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              Enter rider shift details, COD app expectation, online payments, and cash collected by FE.
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
                      placeholder="Enter Rider Name (e.g. Rahul Sharma)"
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

            {/* 2. DELIVERY VOLUME (Total Delivered Parcels only) */}
            <div style={{ background: '#f0f9ff', padding: '16px', borderRadius: '12px', border: '1px solid #bae6fd', marginBottom: '18px' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: '#0369a1', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Package size={15} color="#0284c7" />
                <span>2. Delivery Volume</span>
              </h4>

              <div className="form-group" style={{ margin: 0, maxWidth: '280px' }}>
                <label className="form-label">Total Delivered Parcels <span className="required">*</span></label>
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  placeholder="e.g. 45"
                  value={formData.total_delivered}
                  onChange={e => handleNumberChange('total_delivered', e.target.value)}
                />
              </div>
            </div>

            {/* 3. SHIFT COLLECTIONS & CASH HANDOVER (COD Cash App -> Online -> Cash Collected by FE) */}
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '18px' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: '#0f766e', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CreditCard size={15} color="#0d9488" />
                <span>3. Shift Collections & Cash Handover</span>
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                {/* 1. COD Cash (App) */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700, color: '#1e293b' }}>
                    1. COD Cash (App) <span className="required">*</span>
                  </label>
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
                  <small style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                    Expected amount from delivery app
                  </small>
                </div>

                {/* 2. Online UPI Received */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 700, color: '#059669' }}>
                    2. Online UPI Received
                  </label>
                  <div className="input-prefix-wrapper">
                    <span className="input-prefix" style={{ color: '#059669' }}>₹</span>
                    <input
                      type="number"
                      min="0"
                      className="form-input"
                      placeholder="0"
                      value={formData.online_received}
                      onChange={e => handleNumberChange('online_received', e.target.value)}
                    />
                  </div>
                  <small style={{ fontSize: '0.72rem', color: '#059669', marginTop: '4px', display: 'block' }}>
                    UPI / Prepaid QR payments
                  </small>
                </div>

                {/* 3. Cash Collected by FE */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ color: '#4338ca', fontWeight: 700 }}>
                    3. Cash Collected by FE <span className="required">*</span>
                  </label>
                  <div className="input-prefix-wrapper">
                    <span className="input-prefix" style={{ color: '#4338ca', fontWeight: 700 }}>₹</span>
                    <input
                      type="number"
                      min="0"
                      className="form-input"
                      style={{ borderColor: '#a5b4fc', backgroundColor: '#f5f3ff', fontWeight: 700, color: '#312e81' }}
                      placeholder="0"
                      value={formData.cash_collected_fe}
                      onChange={e => handleNumberChange('cash_collected_fe', e.target.value)}
                    />
                  </div>
                  <small style={{ fontSize: '0.72rem', color: '#4338ca', marginTop: '4px', display: 'block', fontWeight: 600 }}>
                    Physical cash handed over by rider
                  </small>
                </div>
              </div>
            </div>

            {/* 4. SETTLEMENT & RECONCILIATION SUMMARY */}
            <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: '#475569', marginBottom: '12px' }}>
                4. Settlement & Reconciliation Summary
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>COD App Target</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e293b' }}>{formatINR(reportedCodCash)}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.72rem', color: '#059669' }}>Online UPI</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#059669' }}>{formatINR(onlineReceived)}</div>
                </div>

                <div style={{ background: '#f5f3ff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ddd6fe' }}>
                  <div style={{ fontSize: '0.72rem', color: '#6d28d9' }}>Cash by FE</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#4f46e5' }}>{formatINR(cashCollectedByFE)}</div>
                </div>

                <div style={{ background: '#eef2ff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #c7d2fe' }}>
                  <div style={{ fontSize: '0.72rem', color: '#4338ca', fontWeight: 700 }}>Total In-Hand (Settled)</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#4338ca' }}>{formatINR(totalSettled)}</div>
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

            {/* 5. RIDER SALARY PAYOUT */}
            <div style={{
              background: '#f8fafc',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '16px',
              marginTop: '16px',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                marginBottom: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: 38,
                    height: 38,
                    borderRadius: '8px',
                    background: formData.salary_paid ? '#ecfdf5' : '#fffbeb',
                    color: formData.salary_paid ? '#059669' : '#d97706',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `1px solid ${formData.salary_paid ? '#a7f3d0' : '#fde68a'}`
                  }}>
                    <Wallet size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>
                      5. Rider Shift Salary Payout
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                      Rate: <strong>₹18</strong> / parcel • <strong>1%</strong> TDS deduction
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, salary_paid: false }))}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: !formData.salary_paid ? '2px solid #f59e0b' : '1px solid #cbd5e1',
                      background: !formData.salary_paid ? '#fef3c7' : '#ffffff',
                      color: !formData.salary_paid ? '#92400e' : '#64748b',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Clock size={15} />
                    <span>Unpaid / Pending</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, salary_paid: true }))}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: formData.salary_paid ? '2px solid #10b981' : '1px solid #cbd5e1',
                      background: formData.salary_paid ? '#d1fae5' : '#ffffff',
                      color: formData.salary_paid ? '#065f46' : '#64748b',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <CheckCircle2 size={15} />
                    <span>✓ Salary Paid</span>
                  </button>
                </div>
              </div>

              {/* Dynamic Calculation Formula Display */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                    Payout Breakdown ({salaryCalc.count} Parcels @ ₹18)
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', marginTop: '3px', fontFamily: 'var(--font-mono)' }}>
                    {salaryCalc.count} × ₹18 = {salaryCalc.grossFormatted} − 1% TDS ({salaryCalc.tdsFormatted})
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700, textTransform: 'uppercase' }}>
                    Total Net Payable
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#047857', fontFamily: 'var(--font-heading)' }}>
                    {salaryCalc.netFormatted}
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
