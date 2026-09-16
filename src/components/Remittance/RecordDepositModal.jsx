import React, { useState, useMemo } from 'react';
import { 
  X, 
  Building2, 
  Save, 
  AlertCircle, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  Trash2,
  Banknote,
  CreditCard,
  Plus
} from 'lucide-react';
import { formatINR, formatDate } from '../../utils/formatters';

export default function RecordDepositModal({
  initialTab = 'deposits',
  initialDate,
  depositToEdit = null,
  suggestedAmount = 0,
  dailyEntries = [],
  remittanceEntries = [],
  onClose,
  onSave,
  onDeleteDeposit
}) {
  const [activeTab, setActiveTab] = useState(initialTab || 'deposits'); // 'deposits' | 'collections'

  // Form state for creating a new bank deposit
  const [depositDate, setDepositDate] = useState(() => {
    return depositToEdit?.entry_date || initialDate || new Date().toISOString().split('T')[0];
  });

  // Calculate totals across all records
  const aggregates = useMemo(() => {
    let totalOnline = 0;
    let totalCash = 0;
    let totalInHand = 0;

    dailyEntries.forEach(e => {
      totalOnline += Number(e.online_received) || 0;
      totalCash += Number(e.actual_cash_tally) || 0;
      totalInHand += Number(e.total_settled) || 0;
    });

    const totalDeposited = remittanceEntries.reduce((sum, r) => sum + (Number(r.cash_deposited) || 0), 0);
    const pendingVault = Math.max(0, totalInHand - totalDeposited);

    return {
      totalOnline,
      totalCash,
      totalInHand,
      totalDeposited,
      pendingVault,
    };
  }, [dailyEntries, remittanceEntries]);

  // Amount deposited form input
  const [depositAmount, setDepositAmount] = useState(() => {
    if (depositToEdit?.cash_deposited != null) {
      return depositToEdit.cash_deposited;
    }
    if (suggestedAmount > 0) {
      return suggestedAmount;
    }
    return aggregates.pendingVault > 0 ? aggregates.pendingVault : (aggregates.totalInHand > 0 ? aggregates.totalInHand : '');
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Sorted list of all deposits (newest first)
  const sortedDeposits = useMemo(() => {
    return [...remittanceEntries].sort((a, b) => (a.entry_date < b.entry_date ? 1 : -1));
  }, [remittanceEntries]);

  // Sorted list of all collections (newest first)
  const sortedCollections = useMemo(() => {
    return [...dailyEntries].sort((a, b) => (a.entry_date < b.entry_date ? 1 : -1));
  }, [dailyEntries]);

  const handleSubmitDeposit = async (e) => {
    e.preventDefault();
    setError('');

    const amount = Number(depositAmount) || 0;
    if (amount <= 0) {
      setError('Please enter a valid deposit amount greater than ₹0.');
      return;
    }
    if (!depositDate) {
      setError('Please select a deposit date.');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        id: depositToEdit?.id || null,
        entry_date: depositDate,
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
      // Clear amount after saving or close
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to record bank deposit.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card wide" onClick={e => e.stopPropagation()} style={{ maxWidth: '720px' }}>
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
                Bank Deposits & In-Hand Transactions
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#ccfbf1' }}>
                All deposit transactions and shift in-hand cash records
              </p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} style={{ color: '#ccfbf1' }}>
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #e2e8f0',
          background: '#f8fafc',
          padding: '0 16px'
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('deposits')}
            style={{
              padding: '12px 18px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'deposits' ? '3px solid #0d9488' : '3px solid transparent',
              color: activeTab === 'deposits' ? '#0d9488' : '#64748b',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Building2 size={16} />
            <span>Bank Deposits ({remittanceEntries.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('collections')}
            style={{
              padding: '12px 18px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'collections' ? '3px solid #7c3aed' : '3px solid transparent',
              color: activeTab === 'collections' ? '#7c3aed' : '#64748b',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Banknote size={16} />
            <span>All In-Hand Cash ({dailyEntries.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ padding: '20px', maxHeight: 'calc(80vh - 140px)', overflowY: 'auto' }}>
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

          {/* TAB 1: ALL BANK DEPOSITS */}
          {activeTab === 'deposits' && (
            <div>
              {/* Top KPI Cards for Deposits */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
                marginBottom: '18px'
              }}>
                <div style={{ background: '#f0fdfa', padding: '12px 14px', borderRadius: '10px', border: '1px solid #99f6e4' }}>
                  <div style={{ fontSize: '0.72rem', color: '#0f766e', fontWeight: 600 }}>TOTAL BANK DEPOSITED</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0d9488', fontFamily: 'var(--font-heading)' }}>
                    {formatINR(aggregates.totalDeposited)}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#0f766e' }}>{sortedDeposits.length} Deposit Transactions</div>
                </div>

                <div style={{ background: '#f5f3ff', padding: '12px 14px', borderRadius: '10px', border: '1px solid #ddd6fe' }}>
                  <div style={{ fontSize: '0.72rem', color: '#6d28d9', fontWeight: 600 }}>TOTAL IN-HAND COLLECTIONS</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#7c3aed', fontFamily: 'var(--font-heading)' }}>
                    {formatINR(aggregates.totalInHand)}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#6d28d9' }}>Online + Physical Cash</div>
                </div>

                <div style={{ background: aggregates.pendingVault > 0 ? '#fffbeb' : '#ecfdf5', padding: '12px 14px', borderRadius: '10px', border: `1px solid ${aggregates.pendingVault > 0 ? '#fde68a' : '#a7f3d0'}` }}>
                  <div style={{ fontSize: '0.72rem', color: aggregates.pendingVault > 0 ? '#92400e' : '#065f46', fontWeight: 600 }}>NET PENDING IN VAULT</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: aggregates.pendingVault > 0 ? '#d97706' : '#10b981', fontFamily: 'var(--font-heading)' }}>
                    {formatINR(aggregates.pendingVault)}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: aggregates.pendingVault > 0 ? '#92400e' : '#065f46' }}>
                    {aggregates.pendingVault > 0 ? 'Pending bank deposit' : 'Fully deposited'}
                  </div>
                </div>
              </div>

              {/* Quick Record New Deposit Form Card */}
              <div style={{
                background: '#ffffff',
                border: '1.5px solid #99f6e4',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
              }}>
                <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f766e', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Plus size={16} />
                  <span>Record New Bank Deposit</span>
                </div>

                <form onSubmit={handleSubmitDeposit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '12px', alignItems: 'flex-end' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>Deposit Date <span className="required">*</span></label>
                    <input
                      type="date"
                      className="form-input"
                      required
                      value={depositDate}
                      onChange={e => setDepositDate(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>Amount Deposited (₹) <span className="required">*</span></label>
                    <div className="input-prefix-wrapper">
                      <span className="input-prefix" style={{ color: '#0d9488', fontWeight: 800 }}>₹</span>
                      <input
                        type="number"
                        min="1"
                        className="form-input"
                        required
                        style={{ fontWeight: 800, color: '#0d9488', fontSize: '1.1rem' }}
                        placeholder="0"
                        value={depositAmount}
                        onChange={e => setDepositAmount(e.target.value)}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ background: '#0d9488', borderColor: '#0d9488', height: '42px', padding: '0 16px', fontWeight: 700 }}
                    disabled={saving}
                  >
                    <Save size={16} />
                    <span>{saving ? 'Saving...' : 'Save Deposit'}</span>
                  </button>
                </form>
              </div>

              {/* All Deposit Transactions List Table */}
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  All Bank Deposit Transactions ({sortedDeposits.length})
                </div>

                {sortedDeposits.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1', color: '#94a3b8' }}>
                    No bank deposit transactions recorded yet.
                  </div>
                ) : (
                  <div className="table-container" style={{ border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th style={{ width: '40px' }}>#</th>
                          <th>Deposit Date</th>
                          <th style={{ textAlign: 'right' }}>Amount Deposited</th>
                          <th style={{ textAlign: 'center' }}>Status</th>
                          {onDeleteDeposit && <th style={{ textAlign: 'center', width: '60px' }}>Action</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {sortedDeposits.map((dep, idx) => (
                          <tr key={dep.id || dep.entry_date || idx}>
                            <td style={{ color: '#64748b', fontSize: '0.8rem' }}>{idx + 1}</td>
                            <td>
                              <div style={{ fontWeight: 700, color: '#0f172a' }}>{formatDate(dep.entry_date, 'medium')}</div>
                              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Hub Bank Remittance</div>
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 800, color: '#0d9488', fontSize: '1.05rem', fontFamily: 'var(--font-heading)' }}>
                              {formatINR(dep.cash_deposited)}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span className="badge badge-balanced">Verified</span>
                            </td>
                            {onDeleteDeposit && (
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  type="button"
                                  className="btn-icon"
                                  style={{
                                    color: '#ef4444',
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '6px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer'
                                  }}
                                  title="Delete deposit transaction"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteDeposit(dep.id, dep.entry_date);
                                  }}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ALL IN-HAND COLLECTIONS */}
          {activeTab === 'collections' && (
            <div>
              {/* Top KPI Cards for Collections */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
                marginBottom: '18px'
              }}>
                <div style={{ background: '#f5f3ff', padding: '12px 14px', borderRadius: '10px', border: '1px solid #ddd6fe' }}>
                  <div style={{ fontSize: '0.72rem', color: '#6d28d9', fontWeight: 600 }}>TOTAL IN-HAND COLLECTIONS</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#7c3aed', fontFamily: 'var(--font-heading)' }}>
                    {formatINR(aggregates.totalInHand)}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#6d28d9' }}>{sortedCollections.length} Shift Transactions</div>
                </div>

                <div style={{ background: '#f0fdf4', padding: '12px 14px', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: 600 }}>ONLINE UPI PAYMENTS</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#059669', fontFamily: 'var(--font-heading)' }}>
                    {formatINR(aggregates.totalOnline)}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#15803d' }}>Prepaid / QR</div>
                </div>

                <div style={{ background: '#fffbeb', padding: '12px 14px', borderRadius: '10px', border: '1px solid #fde68a' }}>
                  <div style={{ fontSize: '0.72rem', color: '#92400e', fontWeight: 600 }}>PHYSICAL CASH (FE)</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#d97706', fontFamily: 'var(--font-heading)' }}>
                    {formatINR(aggregates.totalCash)}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#92400e' }}>Collected by Delivery Persons</div>
                </div>
              </div>

              {/* All In-Hand Shift Collections Table */}
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  All Shift In-Hand Collection Transactions ({sortedCollections.length})
                </div>

                {sortedCollections.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1', color: '#94a3b8' }}>
                    No shift collection transactions recorded yet.
                  </div>
                ) : (
                  <div className="table-container" style={{ border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th style={{ width: '40px' }}>#</th>
                          <th>Date</th>
                          <th>Rider Name</th>
                          <th style={{ textAlign: 'right' }}>Cash by FE</th>
                          <th style={{ textAlign: 'right' }}>Online UPI</th>
                          <th style={{ textAlign: 'right' }}>Total In-Hand</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedCollections.map((entry, idx) => (
                          <tr key={entry.id || idx}>
                            <td style={{ color: '#64748b', fontSize: '0.8rem' }}>{idx + 1}</td>
                            <td>
                              <div style={{ fontWeight: 700, color: '#0f172a' }}>{formatDate(entry.entry_date, 'short')}</div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 600, color: '#1e293b' }}>{entry.agent_name || 'Rider'}</div>
                              {entry.login_account_id && (
                                <div style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>{entry.login_account_id}</div>
                              )}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 600, color: '#4f46e5' }}>
                              {formatINR(entry.actual_cash_tally)}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 600, color: '#059669' }}>
                              {formatINR(entry.online_received)}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 800, color: '#0f172a', fontSize: '1rem', fontFamily: 'var(--font-heading)' }}>
                              {formatINR(entry.total_settled)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
