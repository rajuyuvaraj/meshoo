import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calculator, 
  RotateCcw, 
  Copy, 
  Check, 
  Save,
  Banknote, 
  CreditCard, 
  Coins, 
  Sparkles,
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';
import { formatINR } from '../../utils/formatters';
import { dataService } from '../../services/dataService';

const DEFAULT_COUNTS = {
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
  totalCollection: '',
};

const DEFAULT_DENOMINATIONS = [
  { value: 500, label: '₹500 Note', type: 'note', color: '#6366f1' },
  { value: 200, label: '₹200 Note', type: 'note', color: '#f59e0b' },
  { value: 100, label: '₹100 Note', type: 'note', color: '#3b82f6' },
  { value: 50, label: '₹50 Note', type: 'note', color: '#10b981' },
  { value: 20, label: '₹20 Note / Coin', type: 'note', color: '#ec4899' },
  { value: 10, label: '₹10 Note / Coin', type: 'note', color: '#8b5cf6' },
  { value: 5, label: '₹5 Coin / Note', type: 'coin', color: '#64748b' },
  { value: 2, label: '₹2 Coin', type: 'coin', color: '#64748b' },
  { value: 1, label: '₹1 Coin', type: 'coin', color: '#64748b' },
];

export default function DenominationCalculator() {
  const [hydrated, setHydrated] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');
  // Counts state for each denomination, online amount & total collection
  const [counts, setCounts] = useState(() => {
    try {
      return { ...DEFAULT_COUNTS };
    } catch (e) {
      console.warn('Failed to initialize denomination counts', e);
    }
    return { ...DEFAULT_COUNTS };
  });

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadCounts() {
      try {
        const saved = await dataService.getDenominationTally();
        if (mounted && saved) {
          setCounts(prev => ({ ...prev, ...DEFAULT_COUNTS, ...saved }));
        }
      } catch (err) {
        console.warn('Failed to load synced denomination tally', err);
      } finally {
        if (mounted) {
          setHydrated(true);
        }
      }
    }

    loadCounts();

    return () => {
      mounted = false;
    };
  }, []);

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

  const handleCollectionChange = (val) => {
    const cleanVal = val === '' ? '' : Math.max(0, parseFloat(val) || 0);
    setCounts(prev => ({
      ...prev,
      totalCollection: cleanVal,
    }));
  };

  const handleReset = () => {
    if (window.confirm('Clear all denomination counts and calculations?')) {
      setCounts({ ...DEFAULT_COUNTS });
      setSaveStatus('dirty');
    }
  };

  const handleSave = async () => {
    if (!hydrated) return;
    setSaveStatus('saving');
    try {
      await dataService.saveDenominationTally(counts);
      setSaveStatus('saved');
      window.setTimeout(() => setSaveStatus(current => (current === 'saved' ? 'idle' : current)), 2500);
    } catch (err) {
      console.warn('Failed to save denomination tally', err);
      setSaveStatus('error');
      window.setTimeout(() => setSaveStatus(current => (current === 'error' ? 'idle' : current)), 3000);
    }
  };

  // Live Calculations (Matching Manager Excel Worksheet)
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
    const totalCash = totalPhysicalCash + onlineAmount; // Physical Notes + Online UPI
    const totalCollection = Number(counts.totalCollection) || 0;
    
    // Difference / Pending: Total Cash vs Total Collection
    const pendingDifference = totalCollection > 0 ? (totalCash - totalCollection) : 0;

    return {
      rowDetails,
      totalPhysicalCash,
      totalNotesCount,
      totalCoinsCount,
      onlineAmount,
      totalCash,
      totalCollection,
      pendingDifference,
    };
  }, [counts]);

  const handleCopySummary = () => {
    let summary = `*UT8 HUB - CASH & ONLINE DENOMINATION TALLY*\n`;
    summary += `📅 Date: ${new Date().toLocaleDateString('en-IN')}\n\n`;
    calculations.rowDetails.forEach(r => {
      if (r.count > 0) {
        summary += `₹${r.value} x ${r.count} = ₹${r.amount.toLocaleString('en-IN')}\n`;
      }
    });
    summary += `------------------------------\n`;
    summary += `💵 Total Physical Cash: ₹${calculations.totalPhysicalCash.toLocaleString('en-IN')} (${calculations.totalNotesCount} notes)\n`;
    if (calculations.onlineAmount > 0) {
      summary += `📱 Online UPI / QR: ₹${calculations.onlineAmount.toLocaleString('en-IN')}\n`;
    }
    summary += `💰 TOTAL CASH & ONLINE: ₹${calculations.totalCash.toLocaleString('en-IN')}\n`;
    if (calculations.totalCollection > 0) {
      summary += `📋 Total Collection Target: ₹${calculations.totalCollection.toLocaleString('en-IN')}\n`;
      summary += `⚖️ Difference / Pending: ${calculations.pendingDifference >= 0 ? '+' : ''}₹${calculations.pendingDifference.toLocaleString('en-IN')}\n`;
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
              Manager Cash & Denomination Tally Pad (SpiceMoney Sheet)
            </h3>
            <p style={{ fontSize: '0.74rem', color: '#64748b', margin: 0 }}>
              Real-time calculation of notes, coins, online UPI, total cash & pending • Save to sync across devices
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleSave}
            disabled={!hydrated || saveStatus === 'saving'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.76rem',
              fontWeight: 700,
              background: saveStatus === 'saved' ? '#ecfdf5' : '#eff6ff',
              borderColor: saveStatus === 'saved' ? '#a7f3d0' : '#bfdbfe',
              color: saveStatus === 'saved' ? '#065f46' : '#1d4ed8',
              opacity: !hydrated || saveStatus === 'saving' ? 0.7 : 1
            }}
            title="Save tally to sync across devices"
          >
            {saveStatus === 'saving' ? <Sparkles size={14} /> : saveStatus === 'saved' ? <Check size={14} color="#059669" /> : <Save size={14} />}
            <span>
              {saveStatus === 'saving'
                ? 'Saving...'
                : saveStatus === 'saved'
                  ? 'Saved'
                  : saveStatus === 'error'
                    ? 'Save Failed'
                    : 'Save'}
            </span>
          </button>

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
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: '20px'
      }}>
        {/* Left: Interactive Denomination & Online Table (Matching Excel Sheet) */}
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

                {/* Subtotal Physical Notes & Coins */}
                <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1', borderBottom: '1px solid #cbd5e1' }}>
                  <td style={{ padding: '8px 14px', fontWeight: 700, color: '#475569', fontSize: '0.78rem' }}>
                    PHYSICAL NOTES TOTAL
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#64748b', fontSize: '0.78rem' }}>
                    {calculations.totalNotesCount} notes
                  </td>
                  <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 800, color: '#0284c7', fontSize: '0.95rem', fontFamily: 'var(--font-heading)' }}>
                    {formatINR(calculations.totalPhysicalCash)}
                  </td>
                </tr>

                {/* Row: ONLINE (UPI / SpiceMoney) Input */}
                <tr style={{ background: '#f0fdf4', borderBottom: '1.5px solid #86efac' }}>
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
                      <span style={{ fontWeight: 800, color: '#15803d', fontSize: '0.88rem' }}>
                        ONLINE (UPI / SPICE)
                      </span>
                    </div>
                  </td>

                  <td style={{ padding: '6px 12px' }}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <span style={{ position: 'absolute', left: '6px', color: '#15803d', fontWeight: 800, fontSize: '0.82rem' }}>₹</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0"
                        value={counts.online ?? ''}
                        onChange={e => handleOnlineChange(e.target.value)}
                        style={{
                          width: '100%',
                          textAlign: 'center',
                          padding: '6px 6px 6px 16px',
                          borderRadius: '6px',
                          border: '1.5px solid #86efac',
                          fontWeight: 800,
                          fontSize: '0.9rem',
                          color: '#15803d',
                          background: '#ffffff',
                          outline: 'none'
                        }}
                      />
                    </div>
                  </td>

                  <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: 800, color: '#15803d', fontSize: '0.95rem', fontFamily: 'var(--font-heading)' }}>
                    {formatINR(calculations.onlineAmount)}
                  </td>
                </tr>

                {/* Row: TOTAL CASH (Notes + Online) */}
                <tr style={{ background: '#0284c7', color: '#ffffff', borderTop: '2px solid #0369a1' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 800, fontSize: '0.88rem', letterSpacing: '0.02em' }} colSpan={2}>
                    TOTAL CASH (PHYSICAL + ONLINE)
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 900, color: '#ffffff', fontSize: '1.1rem', fontFamily: 'var(--font-heading)' }}>
                    {formatINR(calculations.totalCash)}
                  </td>
                </tr>

                {/* Row: TOTAL COLLATION / COLLECTION Input */}
                <tr style={{ background: '#f1f5f9', borderTop: '1px solid #cbd5e1' }}>
                  <td style={{ padding: '8px 14px', fontWeight: 700, color: '#334155', fontSize: '0.82rem' }}>
                    TOTAL COLLECTION
                  </td>
                  <td style={{ padding: '6px 12px' }} colSpan={2}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <span style={{ position: 'absolute', left: '10px', color: '#475569', fontWeight: 700, fontSize: '0.85rem' }}>₹</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="Enter expected collection (e.g. 6833)"
                        value={counts.totalCollection ?? ''}
                        onChange={e => handleCollectionChange(e.target.value)}
                        style={{
                          width: '100%',
                          textAlign: 'right',
                          padding: '6px 12px 6px 24px',
                          borderRadius: '6px',
                          border: '1.5px solid #cbd5e1',
                          fontWeight: 800,
                          fontSize: '0.9rem',
                          color: '#0f172a',
                          background: '#ffffff',
                          outline: 'none'
                        }}
                      />
                    </div>
                  </td>
                </tr>

                {/* Row: PENDING / DIFFERENCE */}
                <tr style={{ 
                  background: counts.totalCollection 
                    ? (calculations.pendingDifference >= 0 ? '#ecfdf5' : '#fef2f2') 
                    : '#f8fafc',
                  borderTop: '1.5px solid #cbd5e1'
                }}>
                  <td style={{ 
                    padding: '10px 14px', 
                    fontWeight: 800, 
                    fontSize: '0.86rem',
                    color: counts.totalCollection 
                      ? (calculations.pendingDifference >= 0 ? '#065f46' : '#991b1b') 
                      : '#475569'
                  }}>
                    PENDING / BALANCE
                  </td>
                  <td style={{ 
                    padding: '10px 12px', 
                    fontSize: '0.74rem', 
                    fontWeight: 700,
                    textAlign: 'center',
                    color: counts.totalCollection 
                      ? (calculations.pendingDifference >= 0 ? '#059669' : '#dc2626') 
                      : '#94a3b8'
                  }}>
                    {counts.totalCollection ? (calculations.pendingDifference >= 0 ? 'Surplus' : 'Shortage') : 'Enter Collection'}
                  </td>
                  <td style={{ 
                    padding: '10px 14px', 
                    textAlign: 'right', 
                    fontWeight: 900, 
                    fontSize: '1.05rem', 
                    fontFamily: 'var(--font-heading)',
                    color: counts.totalCollection 
                      ? (calculations.pendingDifference >= 0 ? '#059669' : '#dc2626') 
                      : '#94a3b8'
                  }}>
                    {counts.totalCollection ? (
                      `${calculations.pendingDifference >= 0 ? '+' : ''}${formatINR(calculations.pendingDifference)}`
                    ) : '₹0'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Executive Summary & Overview Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Main Totals Card */}
          <div style={{
            background: 'linear-gradient(135deg, #042f2e 0%, #115e59 100%)',
            color: '#ffffff',
            borderRadius: '14px',
            padding: '20px',
            boxShadow: '0 8px 24px rgba(4, 47, 46, 0.2)'
          }}>
            <div style={{ fontSize: '0.72rem', color: '#5eead4', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
              TOTAL CASH & ONLINE (GRAND TOTAL)
            </div>
            <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#ffffff', fontFamily: 'var(--font-heading)', lineHeight: 1.1, marginBottom: '16px' }}>
              {formatINR(calculations.totalCash)}
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              paddingTop: '14px',
              borderTop: '1px solid rgba(255, 255, 255, 0.15)'
            }}>
              <div>
                <div style={{ fontSize: '0.68rem', color: '#ccfbf1', fontWeight: 600 }}>PHYSICAL CASH TALLY</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#5eead4', fontFamily: 'var(--font-heading)' }}>
                  {formatINR(calculations.totalPhysicalCash)}
                </div>
                <div style={{ fontSize: '0.66rem', color: '#99f6e4', marginTop: '2px' }}>
                  {calculations.totalNotesCount} notes • {calculations.totalCoinsCount} coins
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.68rem', color: '#ccfbf1', fontWeight: 600 }}>ONLINE RECEIVED</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#a7f3d0', fontFamily: 'var(--font-heading)' }}>
                  {formatINR(calculations.onlineAmount)}
                </div>
                <div style={{ fontSize: '0.66rem', color: '#99f6e4', marginTop: '2px' }}>
                  UPI / QR Payments
                </div>
              </div>
            </div>
          </div>

          {/* Reconciliation Status Card */}
          {counts.totalCollection !== '' && counts.totalCollection !== undefined && (
            <div style={{
              background: calculations.pendingDifference >= 0 ? '#ecfdf5' : '#fef2f2',
              border: `1.5px solid ${calculations.pendingDifference >= 0 ? '#a7f3d0' : '#fecaca'}`,
              borderRadius: '12px',
              padding: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  color: calculations.pendingDifference >= 0 ? '#065f46' : '#991b1b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}>
                  {calculations.pendingDifference === 0 
                    ? '✓ EXACT RECONCILIATION MATCH' 
                    : calculations.pendingDifference > 0 
                      ? '✓ SURPLUS CASH' 
                      : '⚠️ SHORTAGE / PENDING'}
                </span>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                  Target: {formatINR(calculations.totalCollection)}
                </span>
              </div>

              <div style={{
                fontSize: '1.4rem',
                fontWeight: 900,
                fontFamily: 'var(--font-heading)',
                color: calculations.pendingDifference >= 0 ? '#059669' : '#dc2626'
              }}>
                {calculations.pendingDifference >= 0 ? '+' : ''}{formatINR(calculations.pendingDifference)}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
                Total Cash ({formatINR(calculations.totalCash)}) − Total Collection ({formatINR(calculations.totalCollection)})
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
