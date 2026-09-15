import React, { useMemo } from 'react';
import { 
  X, 
  Plus, 
  Edit3, 
  Trash2, 
  Calendar as CalendarIcon, 
  Building2,
  User, 
  Lock
} from 'lucide-react';
import { formatINR, formatDate } from '../../utils/formatters';

export default function DateDetailModal({ 
  dateStr, 
  entries = [], 
  deposits = [],
  onClose, 
  onAddAgentEntry, 
  onEditEntry, 
  onDeleteEntry,
  onOpenDepositModal,
  onDeleteDeposit
}) {
  // Aggregate stats for this specific date
  const dayStats = useMemo(() => {
    let totalDelivered = 0;
    let codOrders = 0;
    let onlineReceived = 0;
    let reportedCodCash = 0;
    let actualCashTally = 0;
    let totalSettled = 0;
    let cashVariance = 0;

    entries.forEach(e => {
      totalDelivered += Number(e.total_delivered) || 0;
      codOrders += Number(e.cod_orders) || 0;
      onlineReceived += Number(e.online_received) || 0;
      reportedCodCash += Number(e.reported_cod_cash) || 0;
      actualCashTally += Number(e.actual_cash_tally) || 0;
      totalSettled += Number(e.total_settled) || 0;
      cashVariance += Number(e.cash_variance) || 0;
    });

    const totalDeposited = deposits.reduce((sum, d) => sum + (Number(d.cash_deposited) || 0), 0);
    const dayVaultBalance = actualCashTally - totalDeposited;

    let status = 'empty';
    if (entries.length > 0) {
      if (cashVariance === 0) status = 'balanced';
      else if (cashVariance < 0) status = 'shortage';
      else status = 'surplus';
    }

    return {
      agentCount: entries.length,
      totalDelivered,
      codOrders,
      onlineReceived,
      reportedCodCash,
      actualCashTally,
      totalSettled,
      cashVariance,
      totalDeposited,
      dayVaultBalance,
      status,
    };
  }, [entries, deposits]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card wide" onClick={e => e.stopPropagation()} style={{ maxWidth: '840px' }}>
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: '#eef2ff',
              color: '#4f46e5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CalendarIcon size={18} />
            </div>
            <div>
              <h3 className="modal-title">{formatDate(dateStr, 'long')}</h3>
              <p style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Varanasi Hub Daily Operations & Cash Deposit Summary
              </p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {/* Day KPI Summary Strip */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '10px',
            marginBottom: '18px'
          }}>
            <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>RIDERS SUBMITTED</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>{dayStats.agentCount}</div>
            </div>

            <div style={{ background: '#f0f9ff', padding: '10px 12px', borderRadius: '10px', border: '1px solid #bae6fd' }}>
              <div style={{ fontSize: '0.72rem', color: '#0369a1', fontWeight: 600 }}>DELIVERIES (COD)</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0284c7' }}>
                {dayStats.totalDelivered} <span style={{ fontSize: '0.75rem', color: '#64748b' }}>({dayStats.codOrders} COD)</span>
              </div>
            </div>

            <div style={{ background: '#f5f3ff', padding: '10px 12px', borderRadius: '10px', border: '1px solid #ddd6fe' }}>
              <div style={{ fontSize: '0.72rem', color: '#6d28d9', fontWeight: 600 }}>CASH COLLECTED</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#7c3aed' }}>{formatINR(dayStats.actualCashTally)}</div>
            </div>

            <div style={{ background: '#f0fdfa', padding: '10px 12px', borderRadius: '10px', border: '1px solid #99f6e4' }}>
              <div style={{ fontSize: '0.72rem', color: '#0f766e', fontWeight: 600 }}>BANK DEPOSITED</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0d9488' }}>{formatINR(dayStats.totalDeposited)}</div>
            </div>

            <div style={{ 
              background: dayStats.dayVaultBalance > 0 ? '#fffbeb' : '#ecfdf5',
              padding: '10px 12px', 
              borderRadius: '10px', 
              border: `1px solid ${dayStats.dayVaultBalance > 0 ? '#fde68a' : '#a7f3d0'}`
            }}>
              <div style={{ fontSize: '0.72rem', color: dayStats.dayVaultBalance > 0 ? '#92400e' : '#065f46', fontWeight: 600 }}>
                VAULT IN HAND
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: dayStats.dayVaultBalance > 0 ? '#d97706' : '#10b981' }}>
                {formatINR(dayStats.dayVaultBalance)}
              </div>
            </div>
          </div>

          {/* SECTION 1: RIDER SHIFT ENTRIES */}
          <div style={{ marginBottom: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>
                1. Rider Shift Collections ({entries.length})
              </h4>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => onAddAgentEntry(dateStr)}
              >
                <Plus size={14} />
                <span>+ Add Rider Entry</span>
              </button>
            </div>

            {entries.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '24px 16px',
                background: '#f8fafc',
                borderRadius: '10px',
                border: '1px dashed #cbd5e1'
              }}>
                <User size={28} color="#94a3b8" style={{ margin: '0 auto 6px' }} />
                <p style={{ fontWeight: 600, color: '#475569', fontSize: '0.85rem' }}>No rider shift entries for this date</p>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ marginTop: '8px' }}
                  onClick={() => onAddAgentEntry(dateStr)}
                >
                  <Plus size={14} />
                  <span>Add First Rider Entry</span>
                </button>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ minWidth: '130px' }}>Agent Name & ID</th>
                      <th className="th-group-delivery" style={{ textAlign: 'center' }}>Delivered / COD</th>
                      <th className="th-group-reported" style={{ textAlign: 'right' }}>Online UPI</th>
                      <th className="th-group-reported" style={{ textAlign: 'right' }}>Reported COD</th>
                      <th className="th-group-tally" style={{ textAlign: 'right' }}>Actual Cash</th>
                      <th style={{ textAlign: 'right' }}>Total Settled</th>
                      <th style={{ textAlign: 'right' }}>Variance</th>
                      <th style={{ textAlign: 'center' }}>Audit Status</th>
                      <th style={{ textAlign: 'center', minWidth: '70px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map(entry => {
                      const agentName = entry.agent_name || 'Rider';
                      const loginId = entry.login_account_id || '';
                      const variance = Number(entry.cash_variance) || 0;
                      const auditStatus = entry.audit_status || 'Balanced';

                      return (
                        <tr key={entry.id}>
                          <td>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>{agentName}</div>
                            {loginId && (
                              <div style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>{loginId}</div>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{ fontWeight: 700 }}>{entry.total_delivered}</span>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}> / {entry.cod_orders} COD</span>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>
                            {formatINR(entry.online_received)}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>
                            {formatINR(entry.reported_cod_cash)}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: '#4f46e5' }}>
                            {formatINR(entry.actual_cash_tally)}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>
                            {formatINR(entry.total_settled)}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: variance < 0 ? '#ef4444' : variance > 0 ? '#d97706' : '#10b981' }}>
                            {formatINR(variance)}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`badge badge-${auditStatus.toLowerCase()}`}>
                              {auditStatus}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <button
                                className="btn-icon"
                                style={{ width: 28, height: 28, color: '#4f46e5' }}
                                title="Edit Entry"
                                onClick={() => onEditEntry(entry)}
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                className="btn-icon"
                                style={{ width: 28, height: 28, color: '#ef4444' }}
                                title="Delete Entry"
                                onClick={() => onDeleteEntry(entry.id)}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SECTION 2: BANK PHYSICAL CASH DEPOSITS FOR THIS DATE */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f766e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Building2 size={16} color="#0d9488" />
                <span>2. Bank Cash Deposits for this Date ({deposits.length})</span>
              </h4>
              <button
                className="btn btn-secondary btn-sm"
                style={{ background: '#f0fdfa', borderColor: '#99f6e4', color: '#0f766e' }}
                onClick={() => onOpenDepositModal(dateStr, dayStats.dayVaultBalance)}
              >
                <Plus size={14} />
                <span>+ Record Bank Deposit</span>
              </button>
            </div>

            {deposits.length === 0 ? (
              <div style={{
                padding: '16px',
                background: '#f0fdfa',
                borderRadius: '10px',
                border: '1px dashed #99f6e4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f766e' }}>
                    No bank cash deposit recorded for {formatDate(dateStr, 'short')}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#115e59' }}>
                    Cash in Hand to Deposit: {formatINR(dayStats.actualCashTally)}
                  </div>
                </div>

                <button
                  className="btn btn-primary btn-sm"
                  style={{ background: '#0d9488', borderColor: '#0d9488' }}
                  onClick={() => onOpenDepositModal(dateStr, dayStats.actualCashTally)}
                >
                  <Building2 size={14} />
                  <span>Record Deposit Now</span>
                </button>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Deposit Bank & Branch</th>
                      <th>Challan / Slip No.</th>
                      <th>UTR / CMS Ref No.</th>
                      <th style={{ textAlign: 'right' }}>Cash Deposited</th>
                      <th style={{ textAlign: 'center' }}>Audit Status</th>
                      <th style={{ textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deposits.map(dep => (
                      <tr key={dep.id || dep.entry_date}>
                        <td>
                          <div style={{ fontWeight: 700, color: '#0f172a' }}>{dep.deposit_bank}</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{dep.deposit_branch}</div>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                          {dep.cash_challan_no || 'N/A'}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                          {dep.bank_utr_ref_no || 'N/A'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: '#0d9488', fontSize: '0.95rem' }}>
                          {formatINR(dep.cash_deposited)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="badge badge-balanced">Verified</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="btn-icon"
                            style={{ width: 28, height: 28, color: '#ef4444' }}
                            title="Delete Deposit Record"
                            onClick={() => onDeleteDeposit(dep.id || dep.entry_date)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onAddAgentEntry(dateStr)}
          >
            <Plus size={16} />
            <span>+ Add Another Rider</span>
          </button>
        </div>
      </div>
    </div>
  );
}
