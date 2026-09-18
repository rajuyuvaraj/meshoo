import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calculator, 
  RotateCcw, 
  Copy, 
  Check, 
  Banknote, 
  CreditCard, 
  Coins, 
  Sparkles, 
  Layers,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { formatINR } from '../../utils/formatters';

const STORAGE_KEY = 'vns_manager_denomination_tally';

const DEFAULT_DENOMINATIONS = [
  { value: 500, label: '₹500 Note', type: 'note', color: '#6366f1' },
  { value: 200, label: '₹200 Note', type: 'note', color: '#f59e0b' },
  { value: 100, label: '₹100 Note', type: 'note', color: '#3b82f6' },
  { value: 50, label: '₹50 Note', type: 'note', color: '#10b981' },
  { value: 20, label: '₹20 Note', type: 'note', color: '#ec4899' },
  { value: 10, label: '₹10 Note / Coin', type: 'note', color: '#8b5cf6' },
  { value: 5, label: '₹5 Coin / Note', type: 'coin', color: '#64748b' },
  { value: 2, label: '₹2 Coin', type: 'coin', color: '#64748b' },
  { value: 1, label: '₹1 Coin', type: 'coin', color: '#64748b' },
];

export default function DenominationCalculator({ expectedCollection = 0 }) {
  // Counts state for each denomination
  const [counts, setCounts] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load saved denomination counts', e);
    }
    return {
      500: '',
      200: '',
      100: '',
      50: '',
      20: '',
      10: '',
      5: '',
      2: '',
      1: '',
      online: '',
      targetComparison: '',
    };
  });

  const [copied, setCopied] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState(null);

  // Auto-save whenever counts change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(counts));
      setLastSavedTime(new Date());
    } catch (e) {
      console.warn('Failed to persist denomination counts', e);
    }
  }, [counts]);

  const handleCountChange = (denom, val) => {
    const cleanVal = val === '' ? '' : Math.max(0, parseInt(val, 10) || 0);
    setCounts(prev => ({
      ...prev,
      [denom]: cleanVal,
    }));
  };

  const handleOnlineChange = (val) => {
    const cleanVal = val === '' ? '' : Math.max(0, parseFloat(val) || 0);
    setCounts(prev => ({
      ...prev,
      online: cleanVal,
    }));
  };

  const handleTargetChange = (val) => {
    const cleanVal = val === '' ? '' : Math.max(0, parseFloat(val) || 0);
    setCounts(prev => ({
      ...prev,
      targetComparison: cleanVal,
    }));
  };

  const handleReset = () => {
    if (window.confirm('Clear all denomination counts to zero?')) {
      const emptyState = {
        500: '',
        200: '',
        100: '',
        50: '',
        20: '',
        10: '',
        5: '',
        2: '',
        1: '',
        online: '',
        targetComparison: '',
      };
      setCounts(emptyState);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(emptyState));
      } catch (e) {}
    }
  };

  // Calculations
  const calculations = useMemo(() => {
    let totalPhysicalCash = 0;
    let totalNotesCount = 0;
    let totalCoinsCount = 0;

    const rowDetails = DEFAULT_DENOMINATIONS.map(d => {
      const count = Number(counts[d.value]) || 0;
      const amount = count * d.value;
      totalPhysicalCash += amount;
      if (d.type === 'note') totalNotesCount += count;
      else totalCoinsCount += count;

      return {
        ...d,
        count,
        amount,
      };
    });

    const onlineAmount = Number(counts.online) || 0;
    const grandTotal = totalPhysicalCash + onlineAmount;

    // Comparison benchmark
    const benchmarkTarget = counts.targetComparison !== '' && counts.targetComparison !== undefined
      ? Number(counts.targetComparison) || 0
      : Number(expectedCollection) || 0;

    const pendingDifference = grandTotal - benchmarkTarget;

    return {
      rowDetails,
      totalPhysicalCash,
      totalNotesCount,
      totalCoinsCount,
      onlineAmount,
      grandTotal,
      benchmarkTarget,
      pendingDifference,
    };
  }, [counts, expectedCollection]);

  const handleCopySummary = () => {
    let summary = `*VARANASI HUB - CASH DENOMINATION TALLY*\n`;
    summary += `📅 Date: ${new Date().toLocaleDateString('en-IN')}\n\n`;
    calculations.rowDetails.forEach(r => {
      if (r.count > 0) {
        summary += `₹${r.value} x ${r.count} = ₹${r.amount.toLocaleString('en-IN')}\n`;
      }
    });
    summary += `------------------------------\n`;
    summary += `💵 Total Physical Cash: ₹${calculations.totalPhysicalCash.toLocaleString('en-IN')}\n`;
    if (calculations.onlineAmount > 0) {
      summary += `📱 Online UPI / QR: ₹${calculations.onlineAmount.toLocaleString('en-IN')}\n`;
    }
    summary += `💰 GRAND TOTAL: ₹${calculations.grandTotal.toLocaleString('en-IN')}\n`;
    if (calculations.benchmarkTarget > 0) {
      summary += `🎯 Target Collection: ₹${calculations.benchmarkTarget.toLocaleString('en-IN')}\n`;
      summary += `⚖️ Variance / Pending: ${calculations.pendingDifference >= 0 ? '+' : ''}₹${calculations.pendingDifference.toLocaleString('en-IN')}\n`;
    }

    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '16px',
      border: '1.5px solid #e2e8f0',
      padding: '20px',
      marginTop: '20px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)'
    }}>
      {/* Header Banner */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        paddingBottom: '16px',
        borderBottom: '1px solid #f1f5f9',
        marginBottom: '18px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(217, 119, 6, 0.2)'
          }}>
            <Calculator size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Manager Cash & Denomination Tally Pad
            </h3>
            <p style={{ fontSize: '0.74rem', color: '#64748b', margin: 0 }}>
              Dedicated cash counting calculator • Auto-saved locally • Does not modify shift data
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleCopySummary}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.76rem',
              fontWeight: 700,
              background: copied ? '#ecfdf5' : '#f8fafc',
              borderColor: copied ? '#a7f3d0' : '#cbd5e1',
              color: copied ? '#065f46' : '#334155'
            }}
            title="Copy denomination summary to clipboard"
          >
            {copied ? <Check size={14} color="#059669" /> : <Copy size={14} />}
            <span>{copied ? 'Copied Summary!' : 'Copy Summary'}</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleReset}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.76rem',
              color: '#ef4444',
              borderColor: '#fecaca',
              background: '#fef2f2',
              fontWeight: 600
            }}
            title="Reset all counts to 0"
          >
            <RotateCcw size={13} />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '20px'
      }}>
        {/* Left: Interactive Denomination Table */}
        <div>
          <div style={{
            borderRadius: '12px',
            overflow: 'hidden',
            border: '1.5px solid #cbd5e1',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ background: '#0f172a', color: '#ffffff' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Denomination
                  </th>
                  <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em', width: '110px' }}>
                    Count
                  </th>
                  <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em', width: '120px' }}>
                    Total (₹)
                  </th>
                </tr>
              </thead>
              <tbody>
                {calculations.rowDetails.map((row, idx) => (
                  <tr 
                    key={row.value}
                    style={{ 
                      background: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                      borderBottom: '1px solid #e2e8f0'
                    }}
                  >
                    <td style={{ padding: '8px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 24,
                          height: 24,
                          borderRadius: '6px',
                          background: row.type === 'note' ? '#fef3c7' : '#f1f5f9',
                          color: row.type === 'note' ? '#b45309' : '#475569',
                          fontSize: '0.72rem',
                          fontWeight: 800
                        }}>
                          ₹
                        </span>
                        <span style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.92rem' }}>
                          {row.value}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                          ({row.type === 'note' ? 'Note' : 'Coin'})
                        </span>
                      </div>
                    </td>

                    <td style={{ padding: '6px 12px', textAlign: 'center' }}>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={counts[row.value] ?? ''}
                        onChange={e => handleCountChange(row.value, e.target.value)}
                        style={{
                          width: '100%',
                          textAlign: 'center',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          border: '1.5px solid #cbd5e1',
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          color: '#0f172a',
                          background: counts[row.value] ? '#fffbeb' : '#ffffff',
                          borderColor: counts[row.value] ? '#f59e0b' : '#cbd5e1',
                          outline: 'none'
                        }}
                      />
                    </td>

                    <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 800, color: row.amount > 0 ? '#059669' : '#94a3b8', fontSize: '0.95rem', fontFamily: 'var(--font-heading)' }}>
                      {formatINR(row.amount)}
                    </td>
                  </tr>
                ))}

                {/* Online UPI Amount Input Row */}
                <tr style={{ background: '#f0fdf4', borderTop: '2px solid #86efac', borderBottom: '1px solid #bbf7d0' }}>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: 24,
                        height: 24,
                        borderRadius: '6px',
                        background: '#dcfce7',
                        color: '#15803d',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <CreditCard size={14} />
                      </div>
                      <span style={{ fontWeight: 800, color: '#15803d', fontSize: '0.9rem' }}>
                        Online UPI / QR
                      </span>
                    </div>
                  </td>

                  <td style={{ padding: '6px 12px' }} colSpan={2}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <span style={{ position: 'absolute', left: '10px', color: '#15803d', fontWeight: 800, fontSize: '0.9rem' }}>₹</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0.00"
                        value={counts.online ?? ''}
                        onChange={e => handleOnlineChange(e.target.value)}
                        style={{
                          width: '100%',
                          textAlign: 'right',
                          padding: '6px 12px 6px 26px',
                          borderRadius: '6px',
                          border: '1.5px solid #86efac',
                          fontWeight: 800,
                          fontSize: '0.95rem',
                          color: '#15803d',
                          background: '#ffffff',
                          outline: 'none'
                        }}
                      />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Real-time Summaries & Benchmark Comparison Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Main Totals Card */}
          <div style={{
            background: 'linear-gradient(135deg, #042f2e 0%, #115e59 100%)',
            color: '#ffffff',
            borderRadius: '14px',
            padding: '18px',
            boxShadow: '0 8px 24px rgba(4, 47, 46, 0.2)'
          }}>
            <div style={{ fontSize: '0.72rem', color: '#5eead4', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
              GRAND TOTAL TALLY (CASH + ONLINE)
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#ffffff', fontFamily: 'var(--font-heading)', lineHeight: 1.1, marginBottom: '14px' }}>
              {formatINR(calculations.grandTotal)}
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
              paddingTop: '12px',
              borderTop: '1px solid rgba(255, 255, 255, 0.15)'
            }}>
              <div>
                <div style={{ fontSize: '0.68rem', color: '#ccfbf1', fontWeight: 600 }}>PHYSICAL CASH TALLY</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#5eead4', fontFamily: 'var(--font-heading)' }}>
                  {formatINR(calculations.totalPhysicalCash)}
                </div>
                <div style={{ fontSize: '0.66rem', color: '#99f6e4', marginTop: '2px' }}>
                  {calculations.totalNotesCount} notes • {calculations.totalCoinsCount} coins
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.68rem', color: '#ccfbf1', fontWeight: 600 }}>ONLINE RECEIVED</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#a7f3d0', fontFamily: 'var(--font-heading)' }}>
                  {formatINR(calculations.onlineAmount)}
                </div>
                <div style={{ fontSize: '0.66rem', color: '#99f6e4', marginTop: '2px' }}>
                  Prepaid / QR Payments
                </div>
              </div>
            </div>
          </div>

          {/* Reconciliation & Variance Comparison Card */}
          <div style={{
            background: '#f8fafc',
            border: '1.5px solid #e2e8f0',
            borderRadius: '12px',
            padding: '16px'
          }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <TrendingUp size={15} color="#4f46e5" />
                <span>Reconciliation Comparison (Optional)</span>
              </span>
              <span style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 700 }}>
                ✓ Auto-Saved
              </span>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Benchmark / Target Collection to Reconcile Against (₹)
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={{ position: 'absolute', left: '10px', color: '#64748b', fontWeight: 700, fontSize: '0.85rem' }}>₹</span>
                <input
                  type="number"
                  min="0"
                  placeholder={expectedCollection ? String(expectedCollection) : 'Enter expected total'}
                  value={counts.targetComparison ?? ''}
                  onChange={e => handleTargetChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 24px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    background: '#ffffff',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Difference / Pending Banner */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: '8px',
              background: calculations.pendingDifference === 0 
                ? '#ecfdf5' 
                : calculations.pendingDifference < 0 
                  ? '#fef2f2' 
                  : '#fffbeb',
              border: `1px solid ${
                calculations.pendingDifference === 0 
                  ? '#a7f3d0' 
                  : calculations.pendingDifference < 0 
                    ? '#fecaca' 
                    : '#fde68a'
              }`
            }}>
              <div>
                <div style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: calculations.pendingDifference === 0 
                    ? '#065f46' 
                    : calculations.pendingDifference < 0 
                      ? '#991b1b' 
                      : '#92400e'
                }}>
                  {calculations.pendingDifference === 0 
                    ? 'EXACT MATCH / RECONCILED' 
                    : calculations.pendingDifference < 0 
                      ? 'PENDING / SHORTAGE' 
                      : 'SURPLUS CASH'}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                  Grand Total vs Benchmark
                </div>
              </div>

              <div style={{
                fontSize: '1.15rem',
                fontWeight: 900,
                fontFamily: 'var(--font-heading)',
                color: calculations.pendingDifference === 0 
                  ? '#059669' 
                  : calculations.pendingDifference < 0 
                    ? '#dc2626' 
                    : '#d97706'
              }}>
                {calculations.pendingDifference >= 0 ? '+' : ''}
                {formatINR(calculations.pendingDifference)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
