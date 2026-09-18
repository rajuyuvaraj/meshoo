import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  Plus, 
  Package, 
  CreditCard, 
  Banknote, 
  TrendingUp, 
  AlertTriangle,
  Building2,
  Lock,
  ArrowDownRight,
  ArrowUpRight,
  Calendar as CalendarIcon,
  Trash2,
  Edit3,
  User,
  Download
} from 'lucide-react';
import { formatINR, formatDate } from '../../utils/formatters';
import { exportAllDatesExcel } from '../../utils/excelExport';
import DenominationCalculator from '../Remittance/DenominationCalculator';

export default function CalendarView({ 
  dailyEntries = [], 
  remittanceEntries = [],
  currentDate, 
  onSelectDate, 
  onOpenWizard,
  onOpenDepositModal,
  onDeleteDailyEntry,
  onDeleteDeposit
}) {
  // Calendar month state
  const [viewDate, setViewDate] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const currentMonthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthName = viewDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  // Group entries by date
  const entriesByDate = useMemo(() => {
    const map = new Map();
    dailyEntries.forEach(entry => {
      const d = entry.entry_date;
      if (!map.has(d)) map.set(d, []);
      map.get(d).push(entry);
    });
    return map;
  }, [dailyEntries]);

  // Group remittances by date
  const depositsByDate = useMemo(() => {
    const map = new Map();
    remittanceEntries.forEach(rem => {
      const d = rem.entry_date;
      if (!map.has(d)) map.set(d, []);
      map.get(d).push(rem);
    });
    return map;
  }, [remittanceEntries]);

  // Aggregate stats for the currently viewed month
  const monthAggregates = useMemo(() => {
    let totalDeliveries = 0;
    let onlinePayments = 0;
    let codCash = 0;
    let totalSettled = 0;
    let netVariance = 0;
    let totalDepositAmount = 0;

    dailyEntries.forEach(e => {
      if (e.entry_date && e.entry_date.startsWith(currentMonthStr)) {
        totalDeliveries += Number(e.total_delivered) || 0;
        onlinePayments += Number(e.online_received) || 0;
        codCash += Number(e.actual_cash_tally) || 0;
        totalSettled += Number(e.total_settled) || 0;
        netVariance += Number(e.cash_variance) || 0;
      }
    });

    remittanceEntries.forEach(r => {
      if (r.entry_date && r.entry_date.startsWith(currentMonthStr)) {
        totalDepositAmount += Number(r.cash_deposited) || 0;
      }
    });

    // Vault cash is Physical COD Cash collected by FEs minus Bank Physical Cash Deposited
    const cashInVault = Math.max(0, codCash - totalDepositAmount);

    return {
      totalDeliveries,
      onlinePayments,
      codCash,
      totalDepositAmount,
      cashInVault,
      totalSettled,
      netVariance,
    };
  }, [dailyEntries, remittanceEntries, currentMonthStr]);

  // Today's collections for quick calculator target preset
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySettled = useMemo(() => {
    const todayEntries = entriesByDate.get(todayStr) || [];
    return todayEntries.reduce((sum, e) => sum + (Number(e.total_settled) || 0), 0);
  }, [entriesByDate, todayStr]);

  const todayCash = useMemo(() => {
    const todayEntries = entriesByDate.get(todayStr) || [];
    return todayEntries.reduce((sum, e) => sum + (Number(e.actual_cash_tally) || 0), 0);
  }, [entriesByDate, todayStr]);

  // Build calendar matrix
  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const cells = [];
    const todayStr = new Date().toISOString().split('T')[0];

    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      cells.push({ dayNum, isOutside: true, dateStr: null });
    }

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayEntries = entriesByDate.get(dateStr) || [];
      const dayDeposits = depositsByDate.get(dateStr) || [];
      const hasEntries = dayEntries.length > 0;
      const hasDeposits = dayDeposits.length > 0;

      let status = 'empty';
      let daySettled = 0;
      let dayVariance = 0;
      let dayDeposited = 0;

      if (hasEntries) {
        daySettled = dayEntries.reduce((sum, e) => sum + (Number(e.total_settled) || 0), 0);
        dayVariance = dayEntries.reduce((sum, e) => sum + (Number(e.cash_variance) || 0), 0);

        if (dayVariance === 0) status = 'balanced';
        else if (dayVariance < 0) status = 'shortage';
        else status = 'surplus';
      }

      if (hasDeposits) {
        dayDeposited = dayDeposits.reduce((sum, d) => sum + (Number(d.cash_deposited) || 0), 0);
      }

      cells.push({
        dayNum: day,
        isOutside: false,
        dateStr,
        isToday: dateStr === todayStr,
        hasEntries,
        hasDeposits,
        agentCount: dayEntries.length,
        status,
        daySettled,
        dayVariance,
        dayDeposited,
      });
    }

    return cells;
  }, [year, month, entriesByDate, depositsByDate]);

  // Activity feed dropdown open state
  const [isFeedOpen, setIsFeedOpen] = useState(false);

  // Combined recent activity feed (Shift Collections + Bank Deposits)
  const combinedActivityFeed = useMemo(() => {
    const list = [];
    dailyEntries.forEach(entry => {
      list.push({
        id: entry.id,
        type: 'collection',
        date: entry.entry_date,
        title: entry.agent_name,
        subtitle: `${entry.total_delivered} Parcels • ${entry.login_account_id || 'LOG-VNS'}`,
        amount: Number(entry.actual_cash_tally) || 0,
        online: Number(entry.online_received) || 0,
        variance: Number(entry.cash_variance) || 0,
        status: entry.audit_status || 'Balanced',
        raw: entry,
      });
    });

    remittanceEntries.forEach(dep => {
      list.push({
        id: dep.id || dep.entry_date,
        type: 'deposit',
        date: dep.entry_date,
        title: 'Bank Deposit',
        subtitle: `Recorded for ${formatDate(dep.entry_date, 'medium')}`,
        amount: Number(dep.cash_deposited) || 0,
        raw: dep,
      });
    });

    return list.sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 8);
  }, [dailyEntries, remittanceEntries]);

  return (
    <div className="calendar-view-container">
      {/* Top Comprehensive KPI Summary Strip */}
      <div className="kpi-grid">
        <div className="kpi-card delivery">
          <div className="kpi-label">
            <span>Total Deliveries</span>
            <Package size={14} color="#0284c7" />
          </div>
          <div className="kpi-value">{monthAggregates.totalDeliveries.toLocaleString('en-IN')}</div>
          <div className="kpi-subtext">Parcels closed this month</div>
        </div>

        <div className="kpi-card online">
          <div className="kpi-label">
            <span>Online Payments</span>
            <CreditCard size={14} color="#059669" />
          </div>
          <div className="kpi-value">{formatINR(monthAggregates.onlinePayments)}</div>
          <div className="kpi-subtext">UPI / Prepaid / QR (Direct Bank)</div>
        </div>

        <div 
          className="kpi-card cash" 
          style={{ cursor: 'pointer' }}
          onClick={() => onOpenDepositModal('collections', monthAggregates.totalSettled)}
          title="Click to view all collections"
        >
          <div className="kpi-label">
            <span>Total Collections</span>
            <Banknote size={14} color="#d97706" />
          </div>
          <div className="kpi-value">{formatINR(monthAggregates.totalSettled)}</div>
          <div className="kpi-subtext">Cash ({formatINR(monthAggregates.codCash)}) + Online ({formatINR(monthAggregates.onlinePayments)})</div>
        </div>

        <div 
          className="kpi-card deposit" 
          style={{ cursor: 'pointer' }}
          onClick={() => onOpenDepositModal('deposits', monthAggregates.cashInVault)}
          title="Click to view all bank deposit transactions & record deposit"
        >
          <div className="kpi-label">
            <span>Bank Deposited</span>
            <Building2 size={14} color="#0d9488" />
          </div>
          <div className="kpi-value" style={{ color: '#0d9488' }}>
            {formatINR(monthAggregates.totalDepositAmount)}
          </div>
          <div className="kpi-subtext">Physical cash deposited to bank</div>
        </div>

        <div 
          className={`kpi-card ${monthAggregates.cashInVault > 0 ? 'cash' : 'balanced'}`} 
          style={{ cursor: 'pointer' }}
          onClick={() => onOpenDepositModal('deposits', monthAggregates.cashInVault)}
          title="Click to record deposit for pending vault cash"
        >
          <div className="kpi-label">
            <span>Net In-Hand / Vault</span>
            <Lock size={14} color={monthAggregates.cashInVault > 0 ? '#d97706' : '#10b981'} />
          </div>
          <div className="kpi-value" style={{ color: monthAggregates.cashInVault > 0 ? '#b45309' : '#059669' }}>
            {formatINR(monthAggregates.cashInVault)}
          </div>
          <div className="kpi-subtext">
            {monthAggregates.cashInVault > 0 ? `Cash (${formatINR(monthAggregates.codCash)}) − Deposited (${formatINR(monthAggregates.totalDepositAmount)})` : 'Fully deposited to bank'}
          </div>
        </div>

        <div className={`kpi-card ${monthAggregates.netVariance < 0 ? 'variance' : 'balanced'}`}>
          <div className="kpi-label">
            <span>Net Cash Variance</span>
            <AlertTriangle size={14} color={monthAggregates.netVariance < 0 ? '#ef4444' : '#10b981'} />
          </div>
          <div className={`kpi-value ${monthAggregates.netVariance < 0 ? 'negative' : 'positive'}`}>
            {formatINR(monthAggregates.netVariance)}
          </div>
          <div className="kpi-subtext">
            {monthAggregates.netVariance === 0 ? 'Fully Reconciled' : monthAggregates.netVariance < 0 ? 'Net Shortage' : 'Net Surplus'}
          </div>
        </div>
      </div>

      {/* Quick Actions Header Bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
            Daily Hub Operations & Reconciliation
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{
              background: '#ecfdf5',
              borderColor: '#a7f3d0',
              color: '#065f46',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onClick={() => exportAllDatesExcel(dailyEntries, remittanceEntries)}
            title="Download full multi-sheet Excel workbook for all dates"
          >
            <Download size={16} color="#059669" />
            <span>Export All (Excel)</span>
          </button>

          <button
            className="btn btn-secondary"
            style={{ background: '#f0fdfa', borderColor: '#99f6e4', color: '#0f766e' }}
            onClick={() => onOpenDepositModal(currentDate || new Date().toISOString().split('T')[0], monthAggregates.cashInVault)}
          >
            <Building2 size={16} color="#0d9488" />
            <span>+ Record Bank Deposit</span>
          </button>

          <button
            className="btn btn-primary"
            onClick={() => onOpenWizard(currentDate || new Date().toISOString().split('T')[0])}
          >
            <Plus size={16} />
            <span>+ Add Rider Shift Entry</span>
          </button>
        </div>
      </div>

      {/* Main Calendar Panel */}
      <div className="calendar-panel">
        <div className="calendar-header">
          <div className="month-navigator">
            <button className="nav-btn" onClick={handlePrevMonth} title="Previous Month">
              <ChevronLeft size={18} />
            </button>
            <h2 className="month-title">{monthName}</h2>
            <button className="nav-btn" onClick={handleNextMonth} title="Next Month">
              <ChevronRight size={18} />
            </button>
            <button className="btn-today" onClick={handleToday}>
              Today
            </button>
          </div>

          <div className="legend-bar">
            <div className="legend-item">
              <span className="legend-dot balanced"></span>
              <span>Balanced (₹0)</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot shortage"></span>
              <span>Shortage (-₹)</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot surplus"></span>
              <span>Surplus (+₹)</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot empty"></span>
              <span>No Data</span>
            </div>
          </div>
        </div>

        <div className="calendar-weekdays">
          <span>Sun</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
        </div>

        <div className="calendar-grid">
          {calendarCells.map((cell, idx) => {
            if (cell.isOutside) {
              return <div key={`outside-${idx}`} className="date-cell outside-month"></div>;
            }

            return (
              <div
                key={cell.dateStr}
                className={`date-cell status-${cell.status} ${cell.isToday ? 'is-today' : ''}`}
                onClick={() => onSelectDate(cell.dateStr)}
              >
                <div className="date-cell-header">
                  <span className="date-num">{cell.dayNum}</span>
                  {cell.hasEntries && (
                    <span className="agent-count-badge" title={`${cell.agentCount} Rider Entries`}>
                      {cell.agentCount} {cell.agentCount === 1 ? 'Rider' : 'Riders'}
                    </span>
                  )}
                </div>

                <div className="date-cell-body">
                  {cell.hasEntries ? (
                    <>
                      <div className="date-settled-val" title={`Total Settled: ${formatINR(cell.daySettled)}`}>
                        {formatINR(cell.daySettled)}
                      </div>
                      <div className={`date-status-pill ${cell.status}`}>
                        {cell.status === 'balanced' && 'Balanced'}
                        {cell.status === 'shortage' && `Short ${formatINR(cell.dayVariance)}`}
                        {cell.status === 'surplus' && `+${formatINR(cell.dayVariance)}`}
                      </div>
                      {cell.hasDeposits && (
                        <div style={{ fontSize: '0.62rem', color: '#0d9488', fontWeight: 700, marginTop: '2px' }}>
                          🏦 {formatINR(cell.dayDeposited)}
                        </div>
                      )}
                    </>
                  ) : cell.hasDeposits ? (
                    <div style={{ fontSize: '0.68rem', color: '#0d9488', fontWeight: 700, marginTop: '6px' }}>
                      🏦 Deposit {formatINR(cell.dayDeposited)}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontStyle: 'italic', marginTop: '6px' }}>
                      No entries
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Unified Activity & Deposit Ledger Feed (Collapsible Accordion / Dropdown) */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1.5px solid #e2e8f0',
        overflow: 'hidden',
        marginTop: '20px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
      }}>
        {/* Accordion Header / Dropdown Toggle Button */}
        <button
          type="button"
          onClick={() => setIsFeedOpen(!isFeedOpen)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            background: isFeedOpen ? '#f8fafc' : '#ffffff',
            border: 'none',
            borderBottom: isFeedOpen ? '1px solid #e2e8f0' : 'none',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: '10px',
              background: '#eef2ff',
              color: '#4f46e5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CalendarIcon size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Recent Collections & Bank Deposit Activity Feed
                </h3>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  background: '#e2e8f0',
                  color: '#475569',
                  padding: '2px 8px',
                  borderRadius: '12px'
                }}>
                  {combinedActivityFeed.length} {combinedActivityFeed.length === 1 ? 'Activity' : 'Activities'}
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0 0' }}>
                Live audit trail of rider cash handovers and bank branch deposits • Click to {isFeedOpen ? 'collapse' : 'view details'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ textAlign: 'right', display: 'none', smDisplay: 'block' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Vault Balance</div>
              <div style={{ fontWeight: 800, color: monthAggregates.cashInVault > 0 ? '#b45309' : '#059669', fontSize: '0.95rem' }}>
                {formatINR(monthAggregates.cashInVault)}
              </div>
            </div>

            <div style={{
              width: 32,
              height: 32,
              borderRadius: '8px',
              background: isFeedOpen ? '#e2e8f0' : '#f1f5f9',
              color: '#334155',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform 0.2s ease'
            }}>
              {isFeedOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>
          </div>
        </button>

        {/* Accordion Content */}
        {isFeedOpen && (
          <div style={{ padding: '16px 20px', background: '#ffffff' }}>
            {combinedActivityFeed.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: '0.85rem' }}>
                No shift collections or deposit activity recorded yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {combinedActivityFeed.map(item => {
                  const isDeposit = item.type === 'deposit';

                  return (
                    <div
                      key={`${item.type}-${item.id}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        background: isDeposit ? '#f0fdfa' : '#f8fafc',
                        border: `1px solid ${isDeposit ? '#99f6e4' : '#e2e8f0'}`,
                        transition: 'all 0.15s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: 36,
                          height: 36,
                          borderRadius: '8px',
                          background: isDeposit ? '#ccfbf1' : '#eef2ff',
                          color: isDeposit ? '#0d9488' : '#4f46e5',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {isDeposit ? <Building2 size={18} /> : <User size={18} />}
                        </div>

                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                            {item.title}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                            {formatDate(item.date, 'short')} • {item.subtitle}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{
                          fontFamily: 'var(--font-heading)',
                          fontWeight: 800,
                          fontSize: '1rem',
                          color: isDeposit ? '#0d9488' : '#312e81',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          gap: '4px'
                        }}>
                          {isDeposit ? (
                            <>
                              <ArrowDownRight size={15} color="#0d9488" />
                              <span>- {formatINR(item.amount)}</span>
                            </>
                          ) : (
                            <>
                              <ArrowUpRight size={15} color="#4f46e5" />
                              <span>+ {formatINR(item.amount)}</span>
                            </>
                          )}
                        </div>

                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          {isDeposit ? 'Bank Deposit Handover' : `Total Settled: ${formatINR(item.raw?.total_settled || item.amount)}`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Manager Cash & Denomination Tally Pad (Always accessible right below dropdown) */}
      <DenominationCalculator 
        todayTarget={todaySettled || todayCash}
        monthTarget={monthAggregates.totalSettled}
        vaultBalance={monthAggregates.cashInVault}
      />

      {/* Floating Action Button */}
      <button
        className="fab-add"
        onClick={() => onOpenWizard(currentDate || new Date().toISOString().split('T')[0])}
      >
        <Plus size={18} />
        <span>+ Add Rider Entry</span>
      </button>
    </div>
  );
}
