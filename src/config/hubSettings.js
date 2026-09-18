/**
 * Central Hub Settings and Business Constants
 * (Issue #8: Move hardcoded business constants to config)
 */

export const HUB_CONFIG = {
  // Hub Identity
  HUB_NAME: 'UT8 HUB',
  HUB_TAG: 'UT8-01',
  HUB_DISPLAY_TITLE: 'UT8 HUB (UT8-01)',
  
  // Delivery Fleet Salary Rules
  SALARY_RATE_PER_PARCEL: 18, // ₹18 per successfully delivered parcel
  TDS_DEDUCTION_PERCENT: 1,   // 1% TDS deduction on gross earnings

  // Default Bank & Remittance Entities
  DEFAULT_DEPOSIT_BANK: 'State Bank of India',
  DEFAULT_DEPOSIT_BRANCH: 'Varanasi Main Branch (Cantt)',
  DEFAULT_AREA_MANAGER: 'Rajesh Kumar (AM)',
  
  // Cloud Storage
  STORAGE_RECEIPTS_BUCKET: 'deposit-receipts',

  // Pagination & Fetch Limits
  DEFAULT_PAGE_SIZE: 100,
};
