import React, { useState, useMemo, useRef } from 'react';
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
  Plus,
  Upload,
  Camera,
  FileText,
  Eye,
  ImageIcon
} from 'lucide-react';
import { formatINR, formatDate } from '../../utils/formatters';
import { compressImageFile, formatFileSize } from '../../utils/fileUtils';
import ReceiptViewerModal from '../Common/ReceiptViewerModal';

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
  const fileInputRef = useRef(null);

  // Form state for creating a new bank deposit
  const [depositDate, setDepositDate] = useState(() => {
    return depositToEdit?.entry_date || initialDate || new Date().toISOString().split('T')[0];
  });

  // Attached receipt / transaction slip state
  const [receiptFile, setReceiptFile] = useState(() => {
    if (depositToEdit?.receipt_image) {
      return {
        dataUrl: depositToEdit.receipt_image,
        filename: depositToEdit.receipt_filename || 'deposit_receipt.jpg',
        fileSize: 0,
        isPdf: depositToEdit.receipt_filename?.toLowerCase().endsWith('.pdf') || depositToEdit.receipt_image?.startsWith('data:application/pdf'),
      };
    }
    return null;
  });

  const [processingFile, setProcessingFile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Lightbox preview state for viewing slips
  const [selectedReceiptDeposit, setSelectedReceiptDeposit] = useState(null);

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
    // Vault balance includes both Cash and Online collections minus Bank Deposited
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

  const [deletingDepositKey, setDeletingDepositKey] = useState(null);

  // Sorted list of all deposits (newest first)
  const sortedDeposits = useMemo(() => {
    return [...remittanceEntries].sort((a, b) => (a.entry_date < b.entry_date ? 1 : -1));
  }, [remittanceEntries]);

  // Sorted list of all collections (newest first)
  const sortedCollections = useMemo(() => {
    return [...dailyEntries].sort((a, b) => (a.entry_date < b.entry_date ? 1 : -1));
  }, [dailyEntries]);

  // Handle file processing from selection or drop
  const processIncomingFile = async (file) => {
    if (!file) return;
    setError('');
    setProcessingFile(true);
    try {
      const processed = await compressImageFile(file);
      setReceiptFile(processed);
    } catch (err) {
      console.error('Error processing file:', err);
      setError('Could not process the selected file. Please select a valid JPG, PNG, or PDF.');
    } finally {
      setProcessingFile(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processIncomingFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processIncomingFile(file);
    }
  };

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
        deposit_bank: 'State Bank of India',
        deposit_branch: 'Varanasi Main Branch (Cantt)',
        cash_challan_no: `SBI-VNS-${depositDate.replace(/-/g, '')}`,
        bank_utr_ref_no: '',
        hub_location: 'UT8 HUB',
        receipt_image: receiptFile?.dataUrl || null,
        receipt_filename: receiptFile?.filename || '',
        area_manager_name: 'Rajesh Kumar (AM)',
        manager_approval_status: 'Approved & Reconciled',
        remittance_audit_status: 'Verified • Bank Confirmed',
      });
      // Clear after saving and close
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to record bank deposit.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
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
                  Bank Deposits & In-Hand Transactions
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#ccfbf1' }}>
                  All deposit transactions, shift cash records & transaction slip verification
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
          <div className="modal-body" style={{ padding: '20px', maxHeight: 'calc(80vh - 130px)', overflowY: 'auto' }}>
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
                    <div style={{ fontSize: '0.68rem', color: '#6d28d9' }}>Online ({formatINR(aggregates.totalOnline)}) + Cash ({formatINR(aggregates.totalCash)})</div>
                  </div>

                  <div style={{ background: aggregates.pendingVault > 0 ? '#fffbeb' : '#ecfdf5', padding: '12px 14px', borderRadius: '10px', border: `1px solid ${aggregates.pendingVault > 0 ? '#fde68a' : '#a7f3d0'}` }}>
                    <div style={{ fontSize: '0.72rem', color: aggregates.pendingVault > 0 ? '#92400e' : '#065f46', fontWeight: 600 }}>NET PENDING IN VAULT</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: aggregates.pendingVault > 0 ? '#d97706' : '#10b981', fontFamily: 'var(--font-heading)' }}>
                      {formatINR(aggregates.pendingVault)}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: aggregates.pendingVault > 0 ? '#92400e' : '#065f46' }}>
                      {aggregates.pendingVault > 0 ? `Total Collections (${formatINR(aggregates.totalInHand)}) − Deposited (${formatINR(aggregates.totalDeposited)})` : 'Fully deposited'}
                    </div>
                  </div>
                </div>

                {/* Quick Record New Deposit Form Card with File Explorer Upload */}
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

                  <form onSubmit={handleSubmitDeposit}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontWeight: 700 }}>
                          Deposit Date <span className="required">*</span>
                        </label>
                        <input
                          type="date"
                          className="form-input"
                          required
                          value={depositDate}
                          onChange={e => setDepositDate(e.target.value)}
                        />
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontWeight: 700 }}>
                          Amount Deposited (₹) <span className="required">*</span>
                        </label>
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
                    </div>

                    {/* Transaction Proof File Explorer & Drag-Drop Upload Area */}
                    <div style={{
                      marginBottom: '14px',
                      padding: '12px',
                      background: isDragging ? '#f0fdfa' : '#f8fafc',
                      borderRadius: '8px',
                      border: isDragging ? '1.5px dashed #0d9488' : '1px dashed #cbd5e1',
                      transition: 'all 0.2s'
                    }}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Upload size={14} color="#0d9488" />
                          <span>Bank Deposit Slip / Transaction File (Optional)</span>
                        </label>
                        {receiptFile && (
                          <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700 }}>
                            ✓ File Attached & Ready
                          </span>
                        )}
                      </div>

                      {/* Hidden File Input opened by Explorer Button */}
                      <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        accept="image/*,application/pdf"
                        onChange={handleFileChange}
                      />

                      {processingFile ? (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '10px',
                          padding: '16px',
                          background: '#ffffff',
                          borderRadius: '8px',
                          border: '1px solid #99f6e4',
                          color: '#0d9488',
                          fontSize: '0.85rem',
                          fontWeight: 600
                        }}>
                          <div style={{
                            width: 16,
                            height: 16,
                            border: '2px solid #0d9488',
                            borderTopColor: 'transparent',
                            borderRadius: '50%',
                            animation: 'spin 0.6s linear infinite'
                          }} />
                          <span>Processing & attaching transaction slip...</span>
                        </div>
                      ) : !receiptFile ? (
                        <div 
                          onClick={() => fileInputRef.current?.click()}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexDirection: 'column',
                            gap: '6px',
                            padding: '16px 12px',
                            background: isDragging ? '#e6fffa' : '#ffffff',
                            border: isDragging ? '2px dashed #0d9488' : '1.5px dashed #94a3b8',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            color: '#475569',
                            textAlign: 'center'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = '#0d9488'; e.currentTarget.style.background = '#f0fdfa'; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = isDragging ? '#0d9488' : '#94a3b8'; e.currentTarget.style.background = isDragging ? '#e6fffa' : '#ffffff'; }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Camera size={18} color="#0d9488" />
                            <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#0f766e' }}>
                              Click to select file or drag & drop slip here
                            </span>
                          </div>
                          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                            Supports JPG, PNG, WEBP, and PDF receipts (Auto-compressed for instant upload)
                          </span>
                        </div>
                      ) : (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          background: '#ffffff',
                          border: '1px solid #a7f3d0',
                          borderRadius: '8px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                            {receiptFile.isPdf ? (
                              <div style={{ width: 40, height: 40, borderRadius: 6, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <FileText size={24} color="#dc2626" />
                              </div>
                            ) : (
                              <img 
                                src={receiptFile.dataUrl} 
                                alt="slip preview" 
                                style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #cbd5e1' }} 
                              />
                            )}
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '280px' }}>
                                {receiptFile.filename}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600 }}>
                                {receiptFile.fileSize ? formatFileSize(receiptFile.fileSize) : 'Attached'} • Ready to save
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              type="button"
                              className="btn btn-sm"
                              style={{ background: '#f0fdfa', color: '#0d9488', border: '1px solid #99f6e4', fontSize: '0.75rem', padding: '5px 12px', fontWeight: 700 }}
                              onClick={() => setSelectedReceiptDeposit({ receipt_image: receiptFile.dataUrl, receipt_filename: receiptFile.filename, entry_date: depositDate, cash_deposited: Number(depositAmount) || 0 })}
                            >
                              <Eye size={14} />
                              <span>View Slip</span>
                            </button>
                            <button
                              type="button"
                              className="btn-icon"
                              style={{ color: '#ef4444', width: '30px', height: '30px', borderRadius: '6px' }}
                              title="Remove attached file"
                              onClick={() => {
                                setReceiptFile(null);
                                if (fileInputRef.current) fileInputRef.current.value = '';
                              }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ background: '#0d9488', borderColor: '#0d9488', height: '42px', padding: '0 22px', fontWeight: 700 }}
                        disabled={saving || processingFile}
                      >
                        <Save size={16} />
                        <span>{saving ? 'Saving Deposit...' : 'Save Deposit'}</span>
                      </button>
                    </div>
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
                            <th style={{ textAlign: 'center' }}>Proof / Receipt</th>
                            <th style={{ textAlign: 'center' }}>Status</th>
                            {onDeleteDeposit && <th style={{ textAlign: 'center', width: '60px' }}>Action</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {sortedDeposits.map((dep, idx) => {
                            const hasReceipt = Boolean(dep.receipt_image || dep.receipt_url);

                            return (
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
                                  {hasReceipt ? (
                                    <button
                                      type="button"
                                      className="btn btn-sm"
                                      style={{
                                        background: '#f0fdfa',
                                        color: '#0d9488',
                                        border: '1px solid #99f6e4',
                                        fontWeight: 700,
                                        fontSize: '0.75rem',
                                        padding: '4px 10px',
                                        borderRadius: '6px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        cursor: 'pointer'
                                      }}
                                      onClick={() => setSelectedReceiptDeposit(dep)}
                                      title="View Bank Deposit Slip Picture"
                                    >
                                      <Eye size={14} />
                                      <span>View Slip</span>
                                    </button>
                                  ) : (
                                    <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>No slip</span>
                                  )}
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <span className="badge badge-balanced">Verified</span>
                                </td>
                                {onDeleteDeposit && (
                                  <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                                    {deletingDepositKey === (dep.id || dep.entry_date) ? (
                                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                        <button
                                          type="button"
                                          style={{
                                            background: '#ef4444',
                                            color: '#ffffff',
                                            border: 'none',
                                            padding: '4px 8px',
                                            borderRadius: '6px',
                                            fontSize: '0.72rem',
                                            fontWeight: 700,
                                            cursor: 'pointer'
                                          }}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onDeleteDeposit(dep.id, dep.entry_date);
                                            setDeletingDepositKey(null);
                                          }}
                                        >
                                          Delete
                                        </button>
                                        <button
                                          type="button"
                                          style={{
                                            background: '#e2e8f0',
                                            color: '#475569',
                                            border: 'none',
                                            padding: '4px 6px',
                                            borderRadius: '6px',
                                            fontSize: '0.72rem',
                                            cursor: 'pointer'
                                          }}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setDeletingDepositKey(null);
                                          }}
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    ) : (
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
                                          cursor: 'pointer',
                                          margin: '0 auto'
                                        }}
                                        title="Delete deposit transaction"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDeletingDepositKey(dep.id || dep.entry_date);
                                        }}
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    )}
                                  </td>
                                )}
                              </tr>
                            );
                          })}
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

      {/* Full-Screen / Lightbox Receipt Viewer */}
      {selectedReceiptDeposit && (
        <ReceiptViewerModal
          deposit={selectedReceiptDeposit}
          onClose={() => setSelectedReceiptDeposit(null)}
        />
      )}
    </>
  );
}

