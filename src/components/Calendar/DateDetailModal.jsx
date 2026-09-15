import React, { useMemo } from 'react';
import { 
  X, 
  Plus, 
  Edit3, 
  Trash2, 
  Calendar as CalendarIcon, 
  User, 
  ArrowRight
} from 'lucide-react';
import { formatINR, formatDate } from '../../utils/formatters';

export default function DateDetailModal({ 
  dateStr, 
  entries = [], 
  onClose, 
  onAddAgentEntry, 
  onEditEntry, 
  onDeleteEntry,
  onGoToRemittance 
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
      status,
    };
  }, [entries]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card wide" onClick={e => e.stopPropagation()}>
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
                Varanasi Hub Daily Shift Reconciliation
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
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>{dayStats.agentCount}</div>
            </div>

            <div style={{ background: '#f0f9ff', padding: '10px 12px', borderRadius: '10px', border: '1px solid #bae6fd' }}>
              <div style={{ fontSize: '0.72rem', color: '#0369a1', fontWeight: 600 }}>DELIVERIES (COD)</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0284c7' }}>
                {dayStats.totalDelivered} <span style={{ fontSize: '0.8rem', color: '#64748b' }}>({dayStats.codOrders} COD)</span>
              </div>
            </div>

            <div style={{ background: '#f5f3ff', padding: '10px 12px', borderRadius: '10px', border: '1px solid #ddd6fe' }}>
              <div style={{ fontSize: '0.72rem', color: '#6d28d9', fontWeight: 600 }}>TOTAL SETTLED</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#7c3aed' }}>{formatINR(dayStats.totalSettled)}</div>
            </div>

            <div style={{ 
              background: dayStats.cashVariance < 0 ? '#fef2f2' : dayStats.cashVariance > 0 ? '#fffbeb' : '#ecfdf5',
              padding: '10px 12px', 
              borderRadius: '10px', 
              border: `1px solid ${dayStats.cashVariance < 0 ? '#fecaca' : dayStats.cashVariance > 0 ? '#fde68a' : '#a7f3d0'}`
            }}>
              <div style={{ 
                fontSize: '0.72rem', 
                color: dayStats.cashVariance < 0 ? '#991b1b' : dayStats.cashVariance > 0 ? '#92400e' : '#065f46', 
                fontWeight: 600 
              }}>
                NET CASH VARIANCE
              </div>
              <div style={{ 
                fontSize: '1.2rem', 
                fontWeight: 700, 
                color: dayStats.cashVariance < 0 ? '#ef4444' : dayStats.cashVariance > 0 ? '#d97706' : '#10b981' 
              }}>
                {formatINR(dayStats.cashVariance)}
              </div>
            </div>
          </div>

          {/* Action Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#1e293b' }}>
              Rider Reconciliation Entries ({entries.length})
            </h4>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => onAddAgentEntry(dateStr)}
            >
              <Plus size={14} />
              <span>+ Add Rider Entry</span>
            </button>
          </div>

          {/* Entries Table */}
          {entries.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '36px 16px',
              background: '#f8fafc',
              borderRadius: '12px',
              border: '1px dashed #cbd5e1'
            }}>
              <User size={32} color="#94a3b8" style={{ margin: '0 auto 8px' }} />
              <p style={{ fontWeight: 600, color: '#475569' }}>No rider shift entries for this date</p>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '14px' }}>
                Record the first agent shift collection and cash tally.
              </p>
              <button
                className="btn btn-primary"
                onClick={() => onAddAgentEntry(dateStr)}
              >
                <Plus size={16} />
                <span>Add Rider Entry for {formatDate(dateStr, 'short')}</span>
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
                    <th style={{ textAlign: 'center', minWidth: '80px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(entry => {
                    const agentName = entry.agent_name || entry.agent?.name || 'Rider';
                    const loginId = entry.login_account_id || entry.agent?.login_account_id || '';
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

          {/* Quick Bank Remittance Link for this Date */}
          {entries.length > 0 && (
            <div style={{
              marginTop: '18px',
              padding: '12px 16px',
              background: '#fffbeb',
              borderRadius: '10px',
              border: '1px solid #fde68a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#92400e' }}>
                  Ready to Remit Collections to Bank?
                </div>
                <div style={{ fontSize: '0.75rem', color: '#b45309' }}>
                  Hub shift collections for {formatDate(dateStr, 'short')}: Total Settled {formatINR(dayStats.totalSettled)}
                </div>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  onClose();
                  onGoToRemittance(dateStr);
                }}
              >
                <span>Open Remittance</span>
                <ArrowRight size={14} />
              </button>
            </div>
          )}
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
            <span>+ Add Rider Entry</span>
          </button>
        </div>
      </div>
    </div>
  );
}
