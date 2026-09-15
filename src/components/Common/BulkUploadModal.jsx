import React, { useState } from 'react';
import { X, UploadCloud, FileText, Check, AlertCircle } from 'lucide-react';
import { formatINR } from '../../utils/formatters';

export default function BulkUploadModal({ onClose, onImportSuccess }) {
  const [csvText, setCsvText] = useState('');
  const [parsingError, setParsingError] = useState('');
  const [previewData, setPreviewData] = useState([]);

  const SAMPLE_TEMPLATE = `Agent Name,Login Account ID,Date,Delivered,COD Orders,Online UPI,Reported COD Cash,Actual Cash Collected
Ramesh Chandra,LOG-VNS-109,${new Date().toISOString().split('T')[0]},45,25,12000,20000,20000
Suraj Verma,LOG-VNS-110,${new Date().toISOString().split('T')[0]},50,30,15000,24000,23900`;

  const handleLoadSample = () => {
    setCsvText(SAMPLE_TEMPLATE);
    parseCSV(SAMPLE_TEMPLATE);
  };

  const parseCSV = (text) => {
    setParsingError('');
    if (!text.trim()) {
      setPreviewData([]);
      return;
    }

    try {
      const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length <= 1) {
        setParsingError('Please provide CSV header line plus at least one data row.');
        setPreviewData([]);
        return;
      }

      const rows = [];
      // Skip header
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',').map(p => p.trim());
        if (parts.length >= 4) {
          const agent_name = parts[0] || 'Rider';
          const login_account_id = parts[1] || '';
          const entry_date = parts[2] || new Date().toISOString().split('T')[0];
          const total_delivered = Number(parts[3]) || 0;
          const cod_orders = Number(parts[4]) || 0;
          const online_received = Number(parts[5]) || 0;
          const reported_cod_cash = Number(parts[6]) || 0;
          const actual_cash_tally = Number(parts[7]) || reported_cod_cash;

          rows.push({
            agent_name,
            login_account_id,
            entry_date,
            total_delivered,
            cod_orders,
            online_received,
            reported_cod_cash,
            actual_cash_tally,
          });
        }
      }

      setPreviewData(rows);
    } catch (err) {
      setParsingError(`Failed to parse CSV: ${err.message}`);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        setCsvText(content);
        parseCSV(content);
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    if (previewData.length === 0) return;
    await onImportSuccess(previewData);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card wide" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UploadCloud size={20} color="#4f46e5" />
            <h3 className="modal-title">Bulk Upload Delivery Shift Entries</h3>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '14px' }}>
            Upload a CSV file or paste spreadsheet data directly. Manager can upload multiple rider reconciliations at once without fixed name constraints.
          </p>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
            <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
              <UploadCloud size={14} />
              <span>Choose CSV File</span>
              <input type="file" accept=".csv,.txt" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>

            <button type="button" className="btn btn-secondary btn-sm" onClick={handleLoadSample}>
              <FileText size={14} />
              <span>Load Sample CSV</span>
            </button>
          </div>

          <div className="form-group">
            <textarea
              className="form-input"
              rows={5}
              style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}
              placeholder="Paste CSV rows here..."
              value={csvText}
              onChange={e => {
                setCsvText(e.target.value);
                parseCSV(e.target.value);
              }}
            />
          </div>

          {parsingError && (
            <div style={{ background: '#fef2f2', color: '#991b1b', padding: '8px 12px', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertCircle size={14} />
              <span>{parsingError}</span>
            </div>
          )}

          {previewData.length > 0 && (
            <div>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
                Preview Parsed Rows ({previewData.length} entries)
              </h4>
              <div className="table-container" style={{ maxHeight: '180px' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Agent Name</th>
                      <th>Login ID</th>
                      <th>Date</th>
                      <th>Delivered / COD</th>
                      <th>Online</th>
                      <th>Reported Cash</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{row.agent_name}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{row.login_account_id}</td>
                        <td>{row.entry_date}</td>
                        <td>{row.total_delivered} / {row.cod_orders} COD</td>
                        <td>{formatINR(row.online_received)}</td>
                        <td>{formatINR(row.reported_cod_cash)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={previewData.length === 0}
            onClick={handleConfirmImport}
          >
            <Check size={16} />
            <span>Import {previewData.length} Shift Entries</span>
          </button>
        </div>
      </div>
    </div>
  );
}
