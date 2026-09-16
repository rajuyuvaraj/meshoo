import React, { useState, useMemo } from 'react';
import { X, Building2, Save, AlertCircle, Calendar as CalendarIcon, CheckCircle2 } from 'lucide-react';
import { formatINR, formatDate } from '../../utils/formatters';

export default function RecordDepositModal({
  initialDate,
  depositToEdit = null,
  suggestedAmount = 0,
  dailyEntries = [],
  remittanceEntries = [],
  onClose,
  onSave
}) {
  const [selectedDate, setSelectedDate] = useState(() => {
    return depositToEdit?.entry_date || initialDate || new Date().toISOString().split('T')[0];
  });

  // Dynamically calculate shift collections and prior deposits for the chosen date
  const dateCollections = useMemo(() => {
    const dayEntries = dailyEntries.filter(e => e.entry_date === selectedDate);
    const dayDeposits = remittanceEntries.filter(r => r.entry_date === selectedDate && (!depositToEdit?.id || (r.id !== depositToEdit.id && r.entry_date !== depositToEdit.entry_date)));

    let online = 0;
    let cash = 0;
    let totalSettled = 0;
    let totalDelivered = 0;

    dayEntries.forEach(e => {
      online += Number(e.online_received) || 0;
      cash += Number(e.actual_cash_tally) || 0;
      totalSettled += Number(e.total_settled) || 0;
      totalDelivered += Number(e.total_delivered) || 0;
    });

    const alreadyDeposited = dayDeposits.reduce((sum, d) => sum + (Number(d.cash_deposited) || 0), 0);
    const pendingToDeposit = Math.max(0, totalSettled - alreadyDeposited);

    return {
      riderCount: dayEntries.length,
      totalDelivered,
      online,
      cash,
      totalSettled,
      alreadyDeposited,
      pendingToDeposit,
    };
  }, [dailyEntries, remittanceEntries, selectedDate, depositToEdit]);

  // Amount deposited form value
  const [amountDeposited, setAmountDeposited] = useState(() => {
    if (depositToEdit?.cash_deposited != null) {
      return depositToEdit.cash_deposited;
    }
    if (suggestedAmount > 0) {
      return suggestedAmount;
    }
    // Calculate initial pending for initialDate
    const initialDayEntries = dailyEntries.filter(e => e.entry_date === (initialDate || new Date().toISOString().split('T')[0]));
    const initialTotal = initialDayEntries.reduce((sum, e) => sum + (Number(e.total_settled) || 0), 0);
    return initialTotal > 0 ? initialTotal : '';
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // When date changes, update date & auto-match deposit amount to total collected for that date
  const handleDateChange = (newDate) => {
    setSelectedDate(newDate);

    const dayEntries = dailyEntries.filter(e => e.entry_date === newDate);
    const dayDeposits = remittanceEntries.filter(r => r.entry_date === newDate && (!depositToEdit?.id || (r.id !== depositToEdit.id && r.entry_date !== depositToEdit.entry_date)));

    let totalSettled = 0;
    dayEntries.forEach(e => {
      totalSettled += Number(e.total_settled) || 0;
    });

    const alreadyDeposited = dayDeposits.reduce((sum, d) => sum + (Number(d.cash_deposited) || 0), 0);
    const pending = Math.max(0, totalSettled - alreadyDeposited);

    setAmountDeposited(pending > 0 ? pending : (totalSettled > 0 ? totalSettled : ''));
  };

  const handleMatchCollected = () => {
    const target = dateCollections.pendingToDeposit > 0 ? dateCollections.pendingToDeposit : dateCollections.totalSettled;
    setAmountDeposited(target);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const amount = Number(amountDeposited) || 0;
    if (amount <= 0) {
      setError('Please enter a valid deposit amount greater than ₹0.');
      return;
    }
    if (!selectedDate) {
      setError('Please select a deposit date.');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        id: depositToEdit?.id || null,
        entry_date: selectedDate,
        cash_deposited: amount,
        deposit_bank: 'Bank Deposit',
        deposit_branch: '',
        cash_challan_no: '',
        bank_utr_ref_no: '',
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
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        {/* Modal Header */}
        <div className="modal-header" style={{ background: 'linear-gradient(135deg, #042f2e 0%, #115e59 100%)', color: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#5eead4'
            }}>
              <Building2 size={20} />
            </div>
            <div>
              <h3 className="modal-title" style={{ color: '#ffffff' }}>
                {depositToEdit ? 'Edit Bank Deposit' : 'Record Hub Bank Deposit'}
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#ccfbf1' }}>
                Record collections deposited to bank
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

            {/* Date Selection */}
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ fontWeight: 700, color: '#1e293b' }}>
                1. Deposit Date <span className="required">*</span>
              </label>
              <div className="input-prefix-wrapper">
                <span className="input-prefix"><CalendarIcon size={16} color="#0f766e" /></span>
                <input
                  type="date"
                  className="form-input"
                  required
                  style={{ fontWeight: 600, fontSize: '0.95rem' }}
                  value={selectedDate}
                  onChange={e => handleDateChange(e.target.value)}
                />
              </div>
              <small style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                Selected shift: <strong>{formatDate(selectedDate, 'long')}</strong>
              </small>
            </div>

            {/* Cash Collected / In-Hand Display Card */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '14px 16px',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                  2. Cash Collected (In-Hand)
                </span>
                <span className="badge badge-balanced" style={{ fontSize: '0.7rem' }}>
                  {dateCollections.riderCount} {dateCollections.riderCount === 1 ? 'Rider' : 'Riders'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
                <div style={{
                  fontSize: '1.4rem',
                  fontWeight: 800,
                  color: '#0f766e',
                  fontFamily: 'var(--font-heading)'
                }}>
                  {formatINR(dateCollections.totalSettled)}
                </div>

                <button
                  type="button"
                  onClick={handleMatchCollected}
                  style={{
                    border: '1px solid #99f6e4',
                    background: '#f0fdfa',
                    color: '#0f766e',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                  title="Click to copy exact cash collected amount to deposit"
                >
                  ⚡ Match Amount
                </button>
              </div>

              <div style={{
                fontSize: '0.74rem',
                color: '#64748b',
                marginTop: '6px',
                paddingTop: '6px',
                borderTop: '1px dashed #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <span>Online: <strong>{formatINR(dateCollections.online)}</strong></span>
                <span>•</span>
                <span>Cash by FE: <strong>{formatINR(dateCollections.cash)}</strong></span>
                {dateCollections.alreadyDeposited > 0 && (
                  <>
                    <span>•</span>
                    <span style={{ color: '#0d9488' }}>Prior Deposited: {formatINR(dateCollections.alreadyDeposited)}</span>
                  </>
                )}
              </div>
            </div>

            {/* Amount Deposited Input */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontWeight: 700, color: '#0f766e' }}>
                3. Amount Deposited (₹) <span className="required">*</span>
              </label>
              <div className="input-prefix-wrapper">
                <span className="input-prefix" style={{ color: '#0d9488', fontWeight: 800, fontSize: '1.1rem' }}>₹</span>
                <input
                  type="number"
                  min="1"
                  className="form-input"
                  required
                  style={{
                    fontWeight: 800,
                    fontSize: '1.25rem',
                    color: '#0d9488',
                    borderColor: '#99f6e4',
                    backgroundColor: '#f0fdfa'
                  }}
                  placeholder="0"
                  value={amountDeposited}
                  onChange={e => setAmountDeposited(e.target.value)}
                />
              </div>
              <small style={{ fontSize: '0.72rem', color: '#0f766e', marginTop: '4px', display: 'block', fontWeight: 600 }}>
                {Number(amountDeposited) === dateCollections.totalSettled ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#059669' }}>
                    <CheckCircle2 size={13} /> Matches total cash collected for {formatDate(selectedDate, 'short')}
                  </span>
                ) : (
                  <span>Amount to be deposited and deducted from vault in hand</span>
                )}
              </small>
            </div>
          </div>

          {/* Modal Footer */}
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
