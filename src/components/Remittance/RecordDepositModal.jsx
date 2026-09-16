import React, { useState, useMemo } from 'react';
import { 
  X, 
  Building2, 
  Save, 
  AlertCircle, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  Banknote, 
  CreditCard, 
  ArrowRight,
  TrendingUp
} from 'lucide-react';
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

  // Calculate distinct daily breakdown aggregates across all active dates
  const dailyLedger = useMemo(() => {
    const map = new Map();

    dailyEntries.forEach(entry => {
      const d = entry.entry_date;
      if (!d) return;
      if (!map.has(d)) {
        map.set(d, {
          date: d,
          riderCount: 0,
          delivered: 0,
          online: 0,
          cash: 0,
          totalSettled: 0,
          deposited: 0,
        });
      }
      const item = map.get(d);
      item.riderCount += 1;
      item.delivered += Number(entry.total_delivered) || 0;
      item.online += Number(entry.online_received) || 0;
      item.cash += Number(entry.actual_cash_tally) || 0;
      item.totalSettled += Number(entry.total_settled) || 0;
    });

    remittanceEntries.forEach(dep => {
      const d = dep.entry_date;
      if (!d) return;
      if (!map.has(d)) {
        map.set(d, {
          date: d,
          riderCount: 0,
          delivered: 0,
          online: 0,
          cash: 0,
          totalSettled: 0,
          deposited: 0,
        });
      }
      const item = map.get(d);
      item.deposited += Number(dep.cash_deposited) || 0;
    });

    return Array.from(map.values())
      .map(row => ({
        ...row,
        vaultInHand: Math.max(0, row.totalSettled - row.deposited),
      }))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [dailyEntries, remittanceEntries]);

  // Dynamically calculate shift collections and prior deposits for the currently chosen date
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

  const handleMatchCollected = (targetDate = null, amountToMatch = null) => {
    if (targetDate && targetDate !== selectedDate) {
      handleDateChange(targetDate);
      if (amountToMatch != null) {
        setAmountDeposited(amountToMatch);
      }
    } else {
      const target = dateCollections.pendingToDeposit > 0 ? dateCollections.pendingToDeposit : dateCollections.totalSettled;
      setAmountDeposited(target);
    }
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
      <div className="modal-card wide" onClick={e => e.stopPropagation()} style={{ maxWidth: '780px' }}>
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
                {depositToEdit ? 'Edit Bank Deposit Record' : 'Hub Bank Deposit & Collections Breakdown'}
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#ccfbf1' }}>
                Record physical cash handed over to bank & review daily in-hand collections (Online + Cash)
              </p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} style={{ color: '#ccfbf1' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: '20px', maxHeight: 'calc(85vh - 130px)', overflowY: 'auto' }}>
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

            {/* SECTION 1: SELECTED DATE & 4-COLUMN IN-HAND BREAKDOWN */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '18px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>
                    1. Select Deposit Date:
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    required
                    style={{ width: 'auto', padding: '6px 12px', fontWeight: 700, fontSize: '0.9rem', borderColor: '#0d9488' }}
                    value={selectedDate}
                    onChange={e => handleDateChange(e.target.value)}
                  />
                </div>

                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Shift: <strong>{formatDate(selectedDate, 'long')}</strong>
                </div>
              </div>

              {/* 4-Metric Grid: Date, Cash, Online, Total In-Hand */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '10px',
                marginBottom: '14px'
              }}>
                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>DATE</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>{formatDate(selectedDate, 'short')}</div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{dateCollections.riderCount} Riders</div>
                </div>

                <div style={{ background: '#f5f3ff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ddd6fe' }}>
                  <div style={{ fontSize: '0.7rem', color: '#6d28d9', fontWeight: 600 }}>💵 CASH BY FE</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#4f46e5' }}>{formatINR(dateCollections.cash)}</div>
                  <div style={{ fontSize: '0.68rem', color: '#6d28d9' }}>Physical Cash</div>
                </div>

                <div style={{ background: '#f0fdf4', padding: '10px 12px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: '0.7rem', color: '#15803d', fontWeight: 600 }}>📱 ONLINE UPI</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#059669' }}>{formatINR(dateCollections.online)}</div>
                  <div style={{ fontSize: '0.68rem', color: '#15803d' }}>Prepaid / QR</div>
                </div>

                <div style={{ background: '#f0fdfa', padding: '10px 12px', borderRadius: '8px', border: '1px solid #99f6e4' }}>
                  <div style={{ fontSize: '0.7rem', color: '#0f766e', fontWeight: 700 }}>💳 TOTAL IN HAND</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0d9488', fontFamily: 'var(--font-heading)' }}>
                    {formatINR(dateCollections.totalSettled)}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#0f766e', fontWeight: 600 }}>Online + Cash</div>
                </div>
              </div>

              {/* Deposit Input Field */}
              <div style={{
                background: '#f0fdfa',
                border: '1.5px solid #99f6e4',
                borderRadius: '10px',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div style={{ flex: 1, minWidth: '220px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f766e', display: 'block', marginBottom: '4px' }}>
                    2. Amount to Deposit into Bank (₹) <span className="required">*</span>
                  </label>
                  <div className="input-prefix-wrapper" style={{ margin: 0 }}>
                    <span className="input-prefix" style={{ color: '#0d9488', fontWeight: 800, fontSize: '1.15rem' }}>₹</span>
                    <input
                      type="number"
                      min="1"
                      className="form-input"
                      required
                      style={{
                        fontWeight: 800,
                        fontSize: '1.25rem',
                        color: '#0d9488',
                        borderColor: '#5eead4',
                        backgroundColor: '#ffffff'
                      }}
                      placeholder="0"
                      value={amountDeposited}
                      onChange={e => setAmountDeposited(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => handleMatchCollected()}
                    style={{
                      border: '1px solid #0d9488',
                      background: '#0d9488',
                      color: '#ffffff',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title="Copy full In-Hand amount to deposit"
                  >
                    <span>⚡ Match Total ({formatINR(dateCollections.pendingToDeposit || dateCollections.totalSettled)})</span>
                  </button>

                  <div style={{ fontSize: '0.7rem', color: '#0f766e', fontWeight: 600 }}>
                    {Number(amountDeposited) === (dateCollections.pendingToDeposit || dateCollections.totalSettled) ? (
                      <span style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <CheckCircle2 size={12} /> Exact match with in-hand collections
                      </span>
                    ) : (
                      <span>Custom deposit amount</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: ALL DATES COLLECTIONS & BANK DEPOSIT LEDGER */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Daily Hub Collections & Bank Deposits Ledger
                </h4>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  Click "Select Date" to deposit for that date
                </span>
              </div>

              {dailyLedger.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '18px', background: '#f8fafc', borderRadius: '8px', color: '#94a3b8', fontSize: '0.8rem' }}>
                  No shift entries recorded yet.
                </div>
              ) : (
                <div className="table-container" style={{ border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th style={{ textAlign: 'right' }}>Cash (FE)</th>
                        <th style={{ textAlign: 'right' }}>Online UPI</th>
                        <th style={{ textAlign: 'right' }}>Total In-Hand</th>
                        <th style={{ textAlign: 'right' }}>Bank Deposited</th>
                        <th style={{ textAlign: 'right' }}>Vault in Hand</th>
                        <th style={{ textAlign: 'center' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyLedger.map(row => {
                        const isSelected = row.date === selectedDate;
                        const isFullyDeposited = row.deposited >= row.totalSettled && row.totalSettled > 0;

                        return (
                          <tr
                            key={row.date}
                            style={{
                              backgroundColor: isSelected ? '#f0fdfa' : 'transparent',
                              fontWeight: isSelected ? 700 : 'normal'
                            }}
                          >
                            <td>
                              <div style={{ fontWeight: 700, color: isSelected ? '#0d9488' : '#0f172a' }}>
                                {formatDate(row.date, 'short')}
                              </div>
                              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                                {row.riderCount} Riders • {row.delivered} Parcels
                              </div>
                            </td>

                            <td style={{ textAlign: 'right', color: '#4f46e5', fontWeight: 600 }}>
                              {formatINR(row.cash)}
                            </td>

                            <td style={{ textAlign: 'right', color: '#059669', fontWeight: 600 }}>
                              {formatINR(row.online)}
                            </td>

                            <td style={{ textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                              {formatINR(row.totalSettled)}
                            </td>

                            <td style={{ textAlign: 'right', fontWeight: 700, color: '#0d9488' }}>
                              {formatINR(row.deposited)}
                            </td>

                            <td style={{ textAlign: 'right', fontWeight: 700, color: row.vaultInHand > 0 ? '#b45309' : '#059669' }}>
                              {formatINR(row.vaultInHand)}
                            </td>

                            <td style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => handleMatchCollected(row.date, row.vaultInHand > 0 ? row.vaultInHand : row.totalSettled)}
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  border: isSelected ? '1px solid #0d9488' : '1px solid #cbd5e1',
                                  background: isSelected ? '#0d9488' : '#ffffff',
                                  color: isSelected ? '#ffffff' : '#334155'
                                }}
                              >
                                {isSelected ? '✓ Selected' : 'Select Date'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="modal-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '0.78rem', color: '#0f766e', fontWeight: 600 }}>
              Recording deposit of <strong>{formatINR(amountDeposited || 0)}</strong> for <strong>{formatDate(selectedDate, 'short')}</strong>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
          </div>
        </form>
      </div>
    </div>
  );
}
