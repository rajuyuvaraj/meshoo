import * as XLSX from 'xlsx';
import { calculateRiderSalary } from './formatters';

/**
 * Downloads single date Excel sheet
 */
export function exportSingleDateExcel(dateStr, entries = [], deposits = [], dayStats = {}) {
  const wb = XLSX.utils.book_new();

  // 1. Sheet 1: Rider Shift Collections
  const shiftRows = entries.map((entry, index) => {
    const sal = calculateRiderSalary(entry.total_delivered, 18, 1);
    return {
      'S.No': index + 1,
      'Shift Date': entry.entry_date,
      'Rider Name': entry.agent_name || 'Rider',
      'Login Account ID': entry.login_account_id || '',
      'Hub Location': entry.hub_location || 'Varanasi Hub',
      'Delivered Parcels': Number(entry.total_delivered) || 0,
      'COD App Target (₹)': Number(entry.reported_cod_cash) || 0,
      'Online UPI Received (₹)': Number(entry.online_received) || 0,
      'Cash Collected by FE (₹)': Number(entry.actual_cash_tally) || 0,
      'Total Settled (₹)': Number(entry.total_settled) || 0,
      'Variance (₹)': Number(entry.cash_variance) || 0,
      'Audit Status': entry.audit_status || 'Balanced',
      'Salary Rate (₹)': 18,
      'Gross Salary (₹)': sal.gross,
      'TDS 1% (₹)': sal.tds,
      'Net Salary Payable (₹)': sal.net,
      'Salary Status': entry.salary_paid ? 'PAID' : 'PENDING',
    };
  });

  const wsShifts = XLSX.utils.json_to_sheet(shiftRows.length > 0 ? shiftRows : [
    { 'Note': `No rider shift entries for ${dateStr}` }
  ]);
  XLSX.utils.book_append_sheet(wb, wsShifts, 'Rider Collections');

  // 2. Sheet 2: Bank Deposits for Date
  const depositRows = deposits.map((dep, index) => ({
    'S.No': index + 1,
    'Deposit Date': dep.entry_date,
    'Amount Deposited (₹)': Number(dep.cash_deposited) || 0,
    'Approval Status': dep.manager_approval_status || 'Approved & Reconciled',
  }));

  const wsDeposits = XLSX.utils.json_to_sheet(depositRows.length > 0 ? depositRows : [
    { 'Note': `No bank cash deposits recorded for ${dateStr}` }
  ]);
  XLSX.utils.book_append_sheet(wb, wsDeposits, 'Bank Deposits');

  // 3. Sheet 3: Daily Executive Summary
  const totalNetSalary = entries.reduce((sum, e) => sum + calculateRiderSalary(e.total_delivered, 18, 1).net, 0);

  const summaryRows = [
    { 'Metric': 'Date', 'Value': dateStr },
    { 'Metric': 'Hub Name', 'Value': 'Varanasi Hub (VNS-01)' },
    { 'Metric': 'Riders Submitted', 'Value': dayStats.agentCount ?? entries.length },
    { 'Metric': 'Total Delivered Parcels', 'Value': dayStats.totalDelivered ?? 0 },
    { 'Metric': 'Reported COD App Target (₹)', 'Value': dayStats.reportedCodCash ?? 0 },
    { 'Metric': 'Online UPI Received (₹)', 'Value': dayStats.onlineReceived ?? 0 },
    { 'Metric': 'Physical Cash Collected by FE (₹)', 'Value': dayStats.actualCashTally ?? 0 },
    { 'Metric': 'Total Settled (₹)', 'Value': dayStats.totalSettled ?? 0 },
    { 'Metric': 'Net Cash Variance (₹)', 'Value': dayStats.cashVariance ?? 0 },
    { 'Metric': 'Total Bank Cash Deposited (₹)', 'Value': dayStats.totalDeposited ?? 0 },
    { 'Metric': 'Vault Cash in Hand (₹)', 'Value': dayStats.dayVaultBalance ?? 0 },
    { 'Metric': 'Total Rider Net Salary Payout (₹)', 'Value': totalNetSalary },
  ];

  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Day Summary');

  // Write and download
  XLSX.writeFile(wb, `Varanasi_Hub_Report_${dateStr}.xlsx`);
}

/**
 * Downloads all dates complete Excel sheet
 */
export function exportAllDatesExcel(dailyEntries = [], remittanceEntries = []) {
  const wb = XLSX.utils.book_new();

  // 1. Sheet 1: All Rider Shift Reconciliations
  const sortedEntries = [...dailyEntries].sort((a, b) => (a.entry_date < b.entry_date ? 1 : -1));
  const shiftRows = sortedEntries.map((entry, index) => {
    const sal = calculateRiderSalary(entry.total_delivered, 18, 1);
    return {
      'S.No': index + 1,
      'Shift Date': entry.entry_date,
      'Rider Name': entry.agent_name || 'Rider',
      'Login Account ID': entry.login_account_id || '',
      'Hub Location': entry.hub_location || 'Varanasi Hub',
      'Delivered Parcels': Number(entry.total_delivered) || 0,
      'COD App Target (₹)': Number(entry.reported_cod_cash) || 0,
      'Online UPI Received (₹)': Number(entry.online_received) || 0,
      'Cash Collected by FE (₹)': Number(entry.actual_cash_tally) || 0,
      'Total Settled (₹)': Number(entry.total_settled) || 0,
      'Variance (₹)': Number(entry.cash_variance) || 0,
      'Audit Status': entry.audit_status || 'Balanced',
      'Salary Rate (₹)': 18,
      'Gross Salary (₹)': sal.gross,
      'TDS 1% (₹)': sal.tds,
      'Net Salary Payable (₹)': sal.net,
      'Salary Status': entry.salary_paid ? 'PAID' : 'PENDING',
    };
  });

  const wsShifts = XLSX.utils.json_to_sheet(shiftRows.length > 0 ? shiftRows : [
    { 'Note': 'No shift entries available' }
  ]);
  XLSX.utils.book_append_sheet(wb, wsShifts, 'All Shift Collections');

  // 2. Sheet 2: All Bank Remittances
  const sortedDeposits = [...remittanceEntries].sort((a, b) => (a.entry_date < b.entry_date ? 1 : -1));
  const depositRows = sortedDeposits.map((dep, index) => ({
    'S.No': index + 1,
    'Deposit Date': dep.entry_date,
    'Amount Deposited (₹)': Number(dep.cash_deposited) || 0,
    'Approval Status': dep.manager_approval_status || 'Approved & Reconciled',
  }));

  const wsDeposits = XLSX.utils.json_to_sheet(depositRows.length > 0 ? depositRows : [
    { 'Note': 'No bank deposits available' }
  ]);
  XLSX.utils.book_append_sheet(wb, wsDeposits, 'All Bank Deposits');

  // 3. Sheet 3: Daily Summary Aggregates
  const dateMap = {};
  dailyEntries.forEach(entry => {
    const d = entry.entry_date;
    if (!dateMap[d]) {
      dateMap[d] = {
        date: d,
        riderCount: 0,
        delivered: 0,
        codTarget: 0,
        online: 0,
        cashFE: 0,
        settled: 0,
        variance: 0,
        deposited: 0,
      };
    }
    dateMap[d].riderCount += 1;
    dateMap[d].delivered += Number(entry.total_delivered) || 0;
    dateMap[d].codTarget += Number(entry.reported_cod_cash) || 0;
    dateMap[d].online += Number(entry.online_received) || 0;
    dateMap[d].cashFE += Number(entry.actual_cash_tally) || 0;
    dateMap[d].settled += Number(entry.total_settled) || 0;
    dateMap[d].variance += Number(entry.cash_variance) || 0;
  });

  remittanceEntries.forEach(dep => {
    const d = dep.entry_date;
    if (!dateMap[d]) {
      dateMap[d] = {
        date: d,
        riderCount: 0,
        delivered: 0,
        codTarget: 0,
        online: 0,
        cashFE: 0,
        settled: 0,
        variance: 0,
        deposited: 0,
      };
    }
    dateMap[d].deposited += Number(dep.cash_deposited) || 0;
  });

  const dailyAggregateRows = Object.values(dateMap)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map(row => ({
      'Date': row.date,
      'Riders Count': row.riderCount,
      'Delivered Parcels': row.delivered,
      'COD App Target (₹)': row.codTarget,
      'Online UPI Received (₹)': row.online,
      'Cash by FE (₹)': row.cashFE,
      'Total Settled (₹)': row.settled,
      'Net Variance (₹)': row.variance,
      'Bank Deposited (₹)': row.deposited,
      'Vault in Hand (₹)': row.settled - row.deposited,
    }));

  const wsDaily = XLSX.utils.json_to_sheet(dailyAggregateRows.length > 0 ? dailyAggregateRows : [
    { 'Note': 'No aggregated daily data' }
  ]);
  XLSX.utils.book_append_sheet(wb, wsDaily, 'Daily Aggregates');

  const todayStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `Varanasi_Hub_Complete_Ledger_${todayStr}.xlsx`);
}
