import React, { useState } from 'react';
import { 
  X, 
  Download, 
  ExternalLink, 
  FileText, 
  Image as ImageIcon, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Building2, 
  CheckCircle2, 
  Calendar,
  CreditCard
} from 'lucide-react';
import { formatINR, formatDate } from '../../utils/formatters';

export default function ReceiptViewerModal({ deposit, onClose }) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);

  if (!deposit) return null;

  const receiptUrl = deposit.receipt_image || deposit.receipt_url;
  const fileName = deposit.receipt_filename || `deposit_receipt_${deposit.entry_date}.jpg`;
  const isPdf = deposit.receipt_filename?.toLowerCase().endsWith('.pdf') || receiptUrl?.startsWith('data:application/pdf');

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.25, 2.5));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  const handleReset = () => {
    setZoomLevel(1);
    setRotation(0);
  };

  const handleDownload = () => {
    if (!receiptUrl) return;
    try {
      if (receiptUrl.startsWith('data:')) {
        const parts = receiptUrl.split(';base64,');
        const contentType = parts[0].split(':')[1];
        const raw = window.atob(parts[1]);
        const rawLength = raw.length;
        const uInt8Array = new Uint8Array(rawLength);
        for (let i = 0; i < rawLength; ++i) {
          uInt8Array[i] = raw.charCodeAt(i);
        }
        const blob = new Blob([uInt8Array], { type: contentType });
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      } else {
        const link = document.createElement('a');
        link.href = receiptUrl;
        link.download = fileName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (e) {
      console.warn('Download fallback:', e);
      window.open(receiptUrl, '_blank');
    }
  };

  const handleOpenNewTab = () => {
    if (!receiptUrl) return;
    try {
      if (receiptUrl.startsWith('data:')) {
        const parts = receiptUrl.split(';base64,');
        const contentType = parts[0].split(':')[1];
        const raw = window.atob(parts[1]);
        const rawLength = raw.length;
        const uInt8Array = new Uint8Array(rawLength);
        for (let i = 0; i < rawLength; ++i) {
          uInt8Array[i] = raw.charCodeAt(i);
        }
        const blob = new Blob([uInt8Array], { type: contentType });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
      } else {
        window.open(receiptUrl, '_blank');
      }
    } catch (e) {
      window.open(receiptUrl, '_blank');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 70, backgroundColor: 'rgba(15, 23, 42, 0.75)' }}>
      <div 
        className="modal-card wide" 
        onClick={e => e.stopPropagation()} 
        style={{ 
          maxWidth: '820px', 
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)'
        }}
      >
        {/* Modal Header */}
        <div 
          className="modal-header" 
          style={{ 
            background: 'linear-gradient(135deg, #042f2e 0%, #115e59 100%)', 
            color: '#ffffff',
            padding: '14px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#5eead4'
            }}>
              {isPdf ? <FileText size={22} /> : <ImageIcon size={22} />}
            </div>
            <div>
              <h3 className="modal-title" style={{ color: '#ffffff', fontSize: '1.05rem', margin: 0, fontWeight: 700 }}>
                Bank Deposit Slip & Transaction Proof
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#ccfbf1', margin: 0 }}>
                {formatDate(deposit.entry_date, 'long')} • {formatINR(deposit.cash_deposited)} Deposited
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-sm"
              onClick={handleOpenNewTab}
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 10px',
                borderRadius: '7px',
                fontSize: '0.76rem',
                fontWeight: 600
              }}
              title="Open Full Image in New Tab"
            >
              <ExternalLink size={14} />
              <span>Full View</span>
            </button>

            <button
              type="button"
              className="btn btn-sm"
              onClick={handleDownload}
              style={{
                background: '#0d9488',
                color: '#ffffff',
                border: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '7px',
                fontSize: '0.76rem',
                fontWeight: 700
              }}
              title="Download Deposit Slip File"
            >
              <Download size={14} />
              <span>Download</span>
            </button>

            <button 
              className="btn-icon" 
              onClick={onClose} 
              style={{ color: '#ccfbf1', marginLeft: '4px' }}
              title="Close Preview"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Controls Toolbar for Image (Zoom & Rotate) */}
        {!isPdf && receiptUrl && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 16px',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            fontSize: '0.78rem'
          }}>
            <div style={{ color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                📎 {fileName}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                className="btn-icon"
                onClick={handleZoomOut}
                disabled={zoomLevel <= 0.5}
                title="Zoom Out"
                style={{ width: '28px', height: '28px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px' }}
              >
                <ZoomOut size={14} />
              </button>
              <span style={{ minWidth: '42px', textAlign: 'center', fontWeight: 700, color: '#334155' }}>
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                type="button"
                className="btn-icon"
                onClick={handleZoomIn}
                disabled={zoomLevel >= 2.5}
                title="Zoom In"
                style={{ width: '28px', height: '28px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px' }}
              >
                <ZoomIn size={14} />
              </button>
              <button
                type="button"
                className="btn-icon"
                onClick={handleRotate}
                title="Rotate 90°"
                style={{ width: '28px', height: '28px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', marginLeft: '4px' }}
              >
                <RotateCw size={14} />
              </button>
              {(zoomLevel !== 1 || rotation !== 0) && (
                <button
                  type="button"
                  onClick={handleReset}
                  style={{
                    background: '#e2e8f0',
                    color: '#475569',
                    padding: '3px 8px',
                    borderRadius: '5px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    marginLeft: '4px'
                  }}
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        )}

        {/* Modal Body: Document / Image Preview Area */}
        <div 
          style={{ 
            flex: 1, 
            minHeight: '340px',
            maxHeight: '52vh', 
            overflow: 'auto', 
            background: '#0f172a', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            padding: '16px',
            position: 'relative'
          }}
        >
          {receiptUrl ? (
            isPdf ? (
              <iframe
                src={receiptUrl}
                title="Deposit Slip PDF"
                style={{ width: '100%', height: '100%', minHeight: '380px', border: 'none', borderRadius: '8px' }}
              />
            ) : (
              <div style={{
                overflow: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '100%'
              }}>
                <img
                  src={receiptUrl}
                  alt={`Deposit Receipt - ${deposit.entry_date}`}
                  style={{
                    transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                    transformOrigin: 'center center',
                    transition: 'transform 0.15s ease-out',
                    maxWidth: '100%',
                    maxHeight: '48vh',
                    objectFit: 'contain',
                    borderRadius: '8px',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
                    background: '#ffffff'
                  }}
                />
              </div>
            )
          ) : (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '32px' }}>
              <ImageIcon size={48} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <p style={{ fontWeight: 600, color: '#e2e8f0' }}>No image data found for this deposit record.</p>
              <p style={{ fontSize: '0.8rem', color: '#64748b' }}>The receipt file may not have been attached during deposit creation.</p>
            </div>
          )}
        </div>

        {/* Deposit Meta Details Banner */}
        <div style={{
          padding: '14px 20px',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '12px',
          fontSize: '0.8rem'
        }}>
          <div>
            <div style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 600 }}>DEPOSIT DATE</div>
            <div style={{ fontWeight: 700, color: '#0f172a' }}>{formatDate(deposit.entry_date, 'medium')}</div>
          </div>

          <div>
            <div style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 600 }}>CASH DEPOSITED</div>
            <div style={{ fontWeight: 800, color: '#0d9488', fontSize: '1.05rem', fontFamily: 'var(--font-heading)' }}>
              {formatINR(deposit.cash_deposited)}
            </div>
          </div>

          <div>
            <div style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 600 }}>BANK & LOCATION</div>
            <div style={{ fontWeight: 600, color: '#334155' }}>
              {deposit.deposit_bank || 'State Bank of India'}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
              {deposit.hub_location || 'Varanasi Hub'}
            </div>
          </div>

          <div>
            <div style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 600 }}>AUDIT VERIFICATION</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#059669', fontWeight: 700 }}>
              <CheckCircle2 size={14} />
              <span>Verified Slip</span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer" style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} style={{ marginLeft: 'auto' }}>
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}
