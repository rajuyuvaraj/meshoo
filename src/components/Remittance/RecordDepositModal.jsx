import React, { useState } from 'react';
import { X, Building2, Save, AlertCircle, Banknote, FileText } from 'lucide-react';
import { formatINR } from '../../utils/formatters';

export default function RecordDepositModal({
  initialDate,
  depositToEdit = null,
  suggestedAmount = 0,
  onClose,
  onSave
}) {
  const [formData, setFormData] = useState({
    id: depositToEdit?.id || null,
    entry_date: depositToEdit?.entry_date || initialDate || new Date().toISOString().split('T')[0],
    deposit_bank: depositToEdit?.deposit_bank || 'State Bank of India',
    deposit_branch: depositToEdit?.deposit_branch || 'Varanasi Main Branch (Cantt)',
    cash_challan_no: depositToEdit?.cash_challan_no || '',
    bank_utr_ref_no: depositToEdit?.bank_utr_ref_no || '',
    cash_deposited: depositToEdit?.cash_deposited ?? (suggestedAmount > 0 ? suggestedAmount : ''),
    notes: depositToEdit?.notes || '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const amount = Number(formData.cash_deposited) || 0;
    if (amount <= 0) {
      setError('Please enter a valid deposit amount greater than ₹0.');
      return;
    }
    if (!formData.entry_date) {
      setError('Please select a deposit date.');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        ...formData,
        cash_deposited: amount,
        hub_location: 'Varanasi Hub',
        area_manager_name: 'Rajesh Kumar (AM)',
        manager_approval_status: 'Approved & Reconciled',
        remittance_audit_status: 'Verified • Bank Confirmed',
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to record bank deposit.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '540px' }}>
        <div className="modal-header" style={{ background: 'linear-gradient(135deg, #042f2e 0%, #115e59 100%)', color: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={20} color="#5eead4" />
            <div>
              <h3 className="modal-title" style={{ color: '#ffffff' }}>
                {depositToEdit ? 'Edit Bank Deposit Record' : 'Record Hub Bank Deposit'}
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#ccfbf1' }}>
                Record physical cash handed over to bank branch
              </p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} style={{ color: '#ccfbf1' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: '20px' }}>
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

            {/* Suggested Cash in Hand Banner */}
            {suggestedAmount > 0 && !depositToEdit && (
              <div style={{
                background: '#f0fdfa',
                border: '1px solid #99f6e4',
                padding: '10px 14px',
                borderRadius: '8px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <span style={{ fontSize: '0.82rem', color: '#0f766e' }}>Available Cash in Vault:</span>
                <span style={{ fontWeight: 700, color: '#0d9488', fontSize: '1rem' }}>
                  {formatINR(suggestedAmount)}
                </span>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Deposit Date <span className="required">*</span></label>
                <input
                  type="date"
                  className="form-input"
                  required
                  value={formData.entry_date}
                  onChange={e => setFormData({ ...formData, entry_date: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Amount Deposited (₹) <span className="required">*</span></label>
                <div className="input-prefix-wrapper">
                  <span className="input-prefix">₹</span>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    required
                    style={{ fontWeight: 700, fontSize: '1.05rem', color: '#0d9488' }}
                    placeholder="e.g. 50000"
                    value={formData.cash_deposited}
                    onChange={e => setFormData({ ...formData, cash_deposited: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Deposit Bank & Branch</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Bank Name (e.g. State Bank of India)"
                  value={formData.deposit_bank}
                  onChange={e => setFormData({ ...formData, deposit_bank: e.target.value })}
                />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Branch Name (e.g. Varanasi Cantt)"
                  value={formData.deposit_branch}
                  onChange={e => setFormData({ ...formData, deposit_branch: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Cash Challan / Slip No.</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. SBI-VNS-5421"
                  value={formData.cash_challan_no}
                  onChange={e => setFormData({ ...formData, cash_challan_no: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Bank UTR / CMS Ref No.</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. SBIN00481928"
                  value={formData.bank_utr_ref_no}
                  onChange={e => setFormData({ ...formData, bank_utr_ref_no: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ background: '#0d9488', borderColor: '#0d9488' }}
              disabled={saving}
            >
              <Save size={16} />
              <span>{saving ? 'Saving Deposit...' : 'Confirm & Save Bank Deposit'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
