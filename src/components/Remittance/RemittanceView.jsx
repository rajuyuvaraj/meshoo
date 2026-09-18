import React, { useState, useMemo, useEffect } from 'react';
import { 
  Building2, 
  CreditCard, 
  Banknote, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Calendar as CalendarIcon, 
  Save, 
  Percent, 
  Lock,
  ArrowRight
} from 'lucide-react';
import { formatINR, formatDate } from '../../utils/formatters';

export default function RemittanceView({
  dailyEntries = [],
  remittanceEntries = [],
  initialSelectedDate,
  onSaveRemittance
}) {
  const [selectedDate, setSelectedDate] = useState(() => {
    return initialSelectedDate || new Date().toISOString().split('T')[0];
  });

  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Find existing remittance record for selected date
  const currentRecord = useMemo(() => {
    return remittanceEntries.find(r => r.entry_date === selectedDate) || null;
  }, [remittanceEntries, selectedDate]);

  // Aggregate collections from daily rider entries for this selected date
  const hubShiftCollections = useMemo(() => {
    const dayEntries = dailyEntries.filter(e => e.entry_date === selectedDate);
    
    let onlineReceived = 0;
    let actualCodCash = 0;
    let totalRevenue = 0;
    let totalDelivered = 0;

    dayEntries.forEach(e => {
      onlineReceived += Number(e.online_received) || 0;
      actualCodCash += Number(e.actual_cash_tally) || 0;
      totalRevenue += Number(e.total_settled) || 0;
      totalDelivered += Number(e.total_delivered) || 0;
    });

    return {
      riderCount: dayEntries.length,
      totalDelivered,
      onlineReceived,
      actualCodCash,
      totalRevenue,
    };
  }, [dailyEntries, selectedDate]);

  // Remittance form state
  const [formState, setFormState] = useState({
    deposit_bank: 'State Bank of India',
    deposit_branch: 'Varanasi Main Branch (Cantt)',
    cash_challan_no: '',
    cash_deposited: 0,
    bank_utr_ref_no: '',
    online_remitted: 0,
    area_manager_name: 'Rajesh Kumar (AM)',
    manager_approval_status: 'Approved & Reconciled',
    signoff_date: selectedDate,
    remittance_audit_status: 'Verified • Bank Confirmed',
  });

  // Load existing data or auto-fill when date or currentRecord changes
  useEffect(() => {
    if (currentRecord) {
      setFormState({
        deposit_bank: currentRecord.deposit_bank || 'State Bank of India',
        deposit_branch: currentRecord.deposit_branch || 'Varanasi Main Branch (Cantt)',
        cash_challan_no: currentRecord.cash_challan_no || '',
        cash_deposited: currentRecord.cash_deposited ?? hubShiftCollections.actualCodCash,
        bank_utr_ref_no: currentRecord.bank_utr_ref_no || '',
        online_remitted: currentRecord.online_remitted ?? hubShiftCollections.onlineReceived,
        area_manager_name: currentRecord.area_manager_name || 'Rajesh Kumar (AM)',
        manager_approval_status: currentRecord.manager_approval_status || 'Approved & Reconciled',
        signoff_date: currentRecord.signoff_date || selectedDate,
        remittance_audit_status: currentRecord.remittance_audit_status || 'Verified • Bank Confirmed',
      });
    } else {
      // Auto-prefill from shift collections
      setFormState({
        deposit_bank: 'State Bank of India',
        deposit_branch: 'Varanasi Main Branch (Cantt)',
        cash_challan_no: `SBI-VNS-${selectedDate.replace(/-/g, '')}`,
        cash_deposited: hubShiftCollections.actualCodCash,
        bank_utr_ref_no: '',
        online_remitted: hubShiftCollections.onlineReceived,
        area_manager_name: 'Rajesh Kumar (AM)',
        manager_approval_status: 'Approved & Reconciled',
        signoff_date: selectedDate,
        remittance_audit_status: 'Verified • Bank Confirmed',
      });
    }
  }, [selectedDate, currentRecord, hubShiftCollections]);

  // Derived KPI calculations
  const totalCollections = hubShiftCollections.totalRevenue;
  const cashDeposited = Number(formState.cash_deposited) || 0;
  const onlineRemitted = Number(formState.online_remitted) || 0;
  const totalRemitted = cashDeposited + onlineRemitted;
  const cashHeldInVault = hubShiftCollections.actualCodCash - cashDeposited;
  const remittanceRate = totalCollections > 0 ? Math.min(100, (totalRemitted / totalCollections) * 100) : 0;

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMessage('');
    try {
      await onSaveRemittance({
        entry_date: selectedDate,
        hub_location: 'UT8 HUB',
        ...formState,
        cash_deposited: cashDeposited,
        online_remitted: onlineRemitted,
      });
      setSuccessMessage('Hub Bank Remittance successfully saved & reconciled.');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      alert(err.message || 'Failed to save remittance');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="remittance-container">
      {/* Date Header & Selector */}
      <div style={{
        background: '#ffffff',
        padding: '16px 20px',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        marginBottom: '20px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '14px'
      }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
            Hub Bank Remittance & AM Reconciliation
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Consolidated daily shift deposits and online area manager settlement for UT8 HUB
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Select Date:</label>
          <input
            type="date"
            className="form-input"
            style={{ width: 'auto', padding: '7px 12px', fontWeight: 600 }}
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
          />
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="kpi-grid" style={{ marginBottom: '24px' }}>
        <div className="kpi-card settled">
          <div className="kpi-label">
            <span>Total Hub Collections</span>
            <Building2 size={14} color="#7c3aed" />
          </div>
          <div className="kpi-value">{formatINR(totalCollections)}</div>
          <div className="kpi-subtext">{hubShiftCollections.riderCount} Riders Settled</div>
        </div>

        <div className="kpi-card cash">
          <div className="kpi-label">
            <span>Bank Cash Deposited</span>
            <Banknote size={14} color="#d97706" />
          </div>
          <div className="kpi-value">{formatINR(cashDeposited)}</div>
          <div className="kpi-subtext">Physical branch deposit</div>
        </div>

        <div className="kpi-card online">
          <div className="kpi-label">
            <span>Online Remitted (AM)</span>
            <CreditCard size={14} color="#059669" />
          </div>
          <div className="kpi-value">{formatINR(onlineRemitted)}</div>
          <div className="kpi-subtext">CMS / NetBanking transfer</div>
        </div>

        <div className="kpi-card delivery">
          <div className="kpi-label">
            <span>Total Remitted to AM</span>
            <ShieldCheck size={14} color="#0284c7" />
          </div>
          <div className="kpi-value">{formatINR(totalRemitted)}</div>
          <div className="kpi-subtext">Deposit + Online Remitted</div>
        </div>

        <div className={`kpi-card ${cashHeldInVault > 0 ? 'variance' : 'balanced'}`}>
          <div className="kpi-label">
            <span>Cash in Vault / Held</span>
            <Lock size={14} color={cashHeldInVault > 0 ? '#ef4444' : '#10b981'} />
          </div>
          <div className={`kpi-value ${cashHeldInVault > 0 ? 'negative' : 'positive'}`}>
            {formatINR(cashHeldInVault)}
          </div>
          <div className="kpi-subtext">
            Rate: {remittanceRate.toFixed(1)}% Remitted
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div style={{
          background: '#ecfdf5',
          border: '1px solid #a7f3d0',
          color: '#065f46',
          padding: '12px 16px',
          borderRadius: '10px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontWeight: 600
        }}>
          <CheckCircle2 size={18} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Daily Remittance Form */}
      <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: '28px' }}>
        <div style={{ padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
              Daily Remittance Record — {formatDate(selectedDate, 'long')}
            </h3>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
              Hub Location: UT8 HUB (UT8-01)
            </span>
          </div>

          <span className={`badge ${currentRecord ? 'badge-balanced' : 'badge-inactive'}`}>
            {currentRecord ? 'Saved & Reconciled' : 'Draft / New Record'}
          </span>
        </div>

        <form onSubmit={handleSave} style={{ padding: '20px' }}>
          {/* Section 1: Auto-Pulled Shift Collections */}
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '10px', letterSpacing: '0.04em' }}>
              1. Shift Collections (Auto-Aggregated from {hubShiftCollections.riderCount} Rider Entries)
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Actual COD Cash Counted</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#d97706' }}>
                  {formatINR(hubShiftCollections.actualCodCash)}
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Online Received (UPI/QR)</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#059669' }}>
                  {formatINR(hubShiftCollections.onlineReceived)}
                </div>
              </div>

              <div style={{ background: '#eef2ff', padding: '12px', borderRadius: '8px', border: '1px solid #c7d2fe' }}>
                <div style={{ fontSize: '0.75rem', color: '#4338ca', fontWeight: 600 }}>Total Hub Shift Revenue</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#4338ca' }}>
                  {formatINR(hubShiftCollections.totalRevenue)}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Bank Physical Cash Deposit */}
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '10px', letterSpacing: '0.04em' }}>
              2. Bank Physical Cash Deposit (Branch Slip)
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Deposit Bank</label>
                <input
                  type="text"
                  className="form-input"
                  value={formState.deposit_bank}
                  onChange={e => setFormState({ ...formState, deposit_bank: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Deposit Branch</label>
                <input
                  type="text"
                  className="form-input"
                  value={formState.deposit_branch}
                  onChange={e => setFormState({ ...formState, deposit_branch: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Cash Challan / Slip No.</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. SBI-VNS-2026-0915"
                  value={formState.cash_challan_no}
                  onChange={e => setFormState({ ...formState, cash_challan_no: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Cash Deposited in Bank (₹)</label>
                <div className="input-prefix-wrapper">
                  <span className="input-prefix">₹</span>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    value={formState.cash_deposited || ''}
                    onChange={e => setFormState({ ...formState, cash_deposited: Number(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Online Transfer to AM */}
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '10px', letterSpacing: '0.04em' }}>
              3. Online Remittance to Area Manager
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Bank Online UTR / CMS Ref No.</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. SBIN00291823901"
                  value={formState.bank_utr_ref_no}
                  onChange={e => setFormState({ ...formState, bank_utr_ref_no: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Online Remitted to AM (₹)</label>
                <div className="input-prefix-wrapper">
                  <span className="input-prefix">₹</span>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    value={formState.online_remitted || ''}
                    onChange={e => setFormState({ ...formState, online_remitted: Number(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Sign-off & Audit Status */}
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '10px', letterSpacing: '0.04em' }}>
              4. Sign-off & Reconciliation Approval
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Area Manager Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={formState.area_manager_name}
                  onChange={e => setFormState({ ...formState, area_manager_name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Manager Approval Status</label>
                <select
                  className="form-select"
                  value={formState.manager_approval_status}
                  onChange={e => setFormState({ ...formState, manager_approval_status: e.target.value })}
                >
                  <option value="Approved & Reconciled">Approved & Reconciled</option>
                  <option value="Pending">Pending Approval</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Remittance Audit Status</label>
                <select
                  className="form-select"
                  value={formState.remittance_audit_status}
                  onChange={e => setFormState({ ...formState, remittance_audit_status: e.target.value })}
                >
                  <option value="Verified • Bank Confirmed">Verified • Bank Confirmed</option>
                  <option value="Pending">Pending Bank Confirmation</option>
                </select>
              </div>
            </div>
          </div>

          {/* Form Submit Footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={saving}
            >
              <Save size={18} />
              <span>{saving ? 'Saving...' : 'Save & Confirm Bank Remittance'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Historical Remittance Entries Table */}
      <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '20px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '14px' }}>
          Recent Hub Remittance History
        </h3>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Bank & Branch</th>
                <th>Challan / Slip No.</th>
                <th style={{ textAlign: 'right' }}>Cash Deposited</th>
                <th>UTR / Ref No.</th>
                <th style={{ textAlign: 'right' }}>Online Remitted</th>
                <th>Area Manager</th>
                <th style={{ textAlign: 'center' }}>Audit Status</th>
                <th style={{ textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {remittanceEntries.map(rem => (
                <tr key={rem.id || rem.entry_date}>
                  <td style={{ fontWeight: 700 }}>
                    {formatDate(rem.entry_date, 'medium')}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{rem.deposit_bank}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{rem.deposit_branch}</div>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                    {rem.cash_challan_no || 'N/A'}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: '#d97706' }}>
                    {formatINR(rem.cash_deposited)}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                    {rem.bank_utr_ref_no || 'N/A'}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                    {formatINR(rem.online_remitted)}
                  </td>
                  <td>{rem.area_manager_name}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="badge badge-balanced">
                      {rem.remittance_audit_status || 'Verified'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setSelectedDate(rem.entry_date)}
                    >
                      View / Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
