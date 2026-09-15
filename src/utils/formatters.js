/**
 * Indian Rupee and Arithmetic Formatting Utilities
 */

/**
 * Format a number using Indian Numbering System (e.g. ₹1,28,750)
 * @param {number|string} amount 
 * @param {object} options 
 * @returns {string} Formatted string
 */
export function formatINR(amount, options = {}) {
  const { showSymbol = true, showParenthesesForNegative = true } = options;
  const num = Number(amount) || 0;
  const isNegative = num < 0;
  const absValue = Math.abs(num);

  // Format with en-IN locale
  const formattedAbs = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(absValue);

  const symbolStr = showSymbol ? '₹' : '';

  if (isNegative && showParenthesesForNegative) {
    return `(${symbolStr}${formattedAbs})`;
  } else if (isNegative) {
    return `-${symbolStr}${formattedAbs}`;
  }

  return `${symbolStr}${formattedAbs}`;
}

/**
 * Format date to readable string (e.g. "15 Sep 2026", "Tuesday, 15 September")
 */
export function formatDate(dateStr, format = 'medium') {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);

  if (format === 'short') {
    return dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }
  if (format === 'medium') {
    return dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  if (format === 'long') {
    return dateObj.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  }
  if (format === 'weekday') {
    return dateObj.toLocaleDateString('en-IN', { weekday: 'long' });
  }
  return dateStr;
}

/**
 * Calculate physical cash total from denomination counts
 */
export function calculateCashTally(denominations = {}) {
  const note500 = (Number(denominations.note_500) || 0) * 500;
  const note200 = (Number(denominations.note_200) || 0) * 200;
  const note100 = (Number(denominations.note_100) || 0) * 100;
  const note50 = (Number(denominations.note_50) || 0) * 50;
  const note20 = (Number(denominations.note_20) || 0) * 20;
  const note10 = (Number(denominations.note_10) || 0) * 10;
  const coin1 = (Number(denominations.coin_1) || 0) * 1;

  return note500 + note200 + note100 + note50 + note20 + note10 + coin1;
}

/**
 * Determine audit status from cash variance
 */
export function getAuditStatus(variance) {
  const v = Number(variance) || 0;
  if (v === 0) return 'Balanced';
  if (v < 0) return 'Shortage';
  return 'Surplus';
}

/**
 * Denomination metadata list for rendering
 */
export const DENOMINATIONS = [
  { key: 'note_500', value: 500, label: '₹500 Note', color: '#10b981', tag: '₹500' },
  { key: 'note_200', value: 200, label: '₹200 Note', color: '#f59e0b', tag: '₹200' },
  { key: 'note_100', value: 100, label: '₹100 Note', color: '#6366f1', tag: '₹100' },
  { key: 'note_50', value: 50, label: '₹50 Note', color: '#06b6d4', tag: '₹50' },
  { key: 'note_20', value: 20, label: '₹20 Note', color: '#ec4899', tag: '₹20' },
  { key: 'note_10', value: 10, label: '₹10 Note', color: '#8b5cf6', tag: '₹10' },
  { key: 'coin_1', value: 1, label: '₹1 Coins', color: '#64748b', tag: '₹1 Coin' },
];
