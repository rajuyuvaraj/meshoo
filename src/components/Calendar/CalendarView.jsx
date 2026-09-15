import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Package, 
  CreditCard, 
  Banknote, 
  TrendingUp, 
  AlertTriangle,
  Building2
} from 'lucide-react';
import { formatINR } from '../../utils/formatters';

export default function CalendarView({ 
  dailyEntries = [], 
  remittanceEntries = [],
  currentDate, 
  onSelectDate, 
  onOpenWizard 
}) {
  // Calendar month state (defaults to current date's month)
  const [viewDate, setViewDate] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth(); // 0-indexed

  // Format YYYY-MM
  const currentMonthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

  const monthName = viewDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  // Navigate month
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
      if (!map.has(d)) {
        map.set(d, []);
      }
      map.get(d).push(entry);
    });
    return map;
  }, [dailyEntries]);

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

    return {
      totalDeliveries,
      onlinePayments,
      codCash,
      totalDepositAmount,
      totalSettled,
      netVariance,
    };
  }, [dailyEntries, remittanceEntries, currentMonthStr]);

  // Build calendar matrix (Days of Month)
  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const cells = [];
    const todayStr = new Date().toISOString().split('T')[0];

    // Previous month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      cells.push({
        dayNum,
        isOutside: true,
        dateStr: null,
      });
    }

    // Days in current month
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayEntries = entriesByDate.get(dateStr) || [];
      const hasEntries = dayEntries.length > 0;

      let status = 'empty';
      let daySettled = 0;
      let dayVariance = 0;

      if (hasEntries) {
        daySettled = dayEntries.reduce((sum, e) => sum + (Number(e.total_settled) || 0), 0);
        dayVariance = dayEntries.reduce((sum, e) => sum + (Number(e.cash_variance) || 0), 0);

        if (dayVariance === 0) {
          status = 'balanced';
        } else if (dayVariance < 0) {
          status = 'shortage';
        } else {
          status = 'surplus';
        }
      }

      cells.push({
        dayNum: day,
        isOutside: false,
        dateStr,
        isToday: dateStr === todayStr,
        hasEntries,
        agentCount: dayEntries.length,
        status,
        daySettled,
        dayVariance,
      });
    }

    return cells;
  }, [year, month, entriesByDate]);

  return (
    <div className="calendar-view-container">
      {/* Month Aggregates Stats Strip (Including Bank Deposit Amount) */}
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
          <div className="kpi-subtext">UPI / Prepaid / QR</div>
        </div>

        <div className="kpi-card cash">
          <div className="kpi-label">
            <span>COD Cash Collected</span>
            <Banknote size={14} color="#d97706" />
          </div>
          <div className="kpi-value">{formatINR(monthAggregates.codCash)}</div>
          <div className="kpi-subtext">Physical cash tallies</div>
        </div>

        {/* Bank Deposit Amount KPI Card */}
        <div className="kpi-card deposit">
          <div className="kpi-label">
            <span>Bank Cash Deposited</span>
            <Building2 size={14} color="#0d9488" />
          </div>
          <div className="kpi-value" style={{ color: '#0d9488' }}>
            {formatINR(monthAggregates.totalDepositAmount)}
          </div>
          <div className="kpi-subtext">Physical branch deposits</div>
        </div>

        <div className="kpi-card settled">
          <div className="kpi-label">
            <span>Total Settled Revenue</span>
            <TrendingUp size={14} color="#7c3aed" />
          </div>
          <div className="kpi-value">{formatINR(monthAggregates.totalSettled)}</div>
          <div className="kpi-subtext">Online + Actual Cash</div>
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

          {/* Audit Status Legend */}
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

        {/* Days of Week */}
        <div className="calendar-weekdays">
          <span>Sun</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
        </div>

        {/* Calendar Day Cells */}
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
                    </>
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

      {/* Quick Floating "+ Add Entry" Button */}
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
