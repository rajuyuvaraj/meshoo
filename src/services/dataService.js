import { supabase, isSupabaseConfigured } from './supabaseClient';
import { generateInitialDailyEntries, generateInitialRemittanceEntries } from './mockSeedData';
import { calculateCashTally, getAuditStatus } from '../utils/formatters';
import { saveReceiptToStorage, getReceiptFromStorage, deleteReceiptFromStorage } from '../utils/fileUtils';
import { HUB_CONFIG } from '../config/hubSettings';

const STORAGE_KEYS = {
  DAILY_ENTRIES: 'vns_hub_daily_entries',
  REMITTANCE_ENTRIES: 'vns_hub_remittance_entries',
  KNOWN_AGENTS: 'vns_hub_known_agents',
  AUTH_SESSION: 'vns_hub_secure_session',
  SALARY_STATUS_MAP: 'vns_hub_salary_status_map',
};

function getSalaryStatusMap() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.SALARY_STATUS_MAP) || '{}');
  } catch {
    return {};
  }
}

function setSalaryStatusRecord(id, agentName, entryDate, isPaid) {
  try {
    const map = getSalaryStatusMap();
    if (id) map[id] = Boolean(isPaid);
    if (agentName && entryDate) {
      map[`${agentName.trim().toLowerCase()}_${entryDate}`] = Boolean(isPaid);
    }
    localStorage.setItem(STORAGE_KEYS.SALARY_STATUS_MAP, JSON.stringify(map));
  } catch (err) {
    console.warn('Could not persist salary status to map', err);
  }
}

function resolveSalaryPaid(item) {
  const map = getSalaryStatusMap();
  if (item.salary_paid !== undefined && item.salary_paid !== null) {
    return item.salary_paid === true || item.salary_paid === 'true' || item.salary_paid === 1 || item.salary_paid === 'PAID';
  }
  if (item.id && map[item.id] !== undefined) {
    return Boolean(map[item.id]);
  }
  if (item.agent_name && item.entry_date) {
    const key = `${item.agent_name.trim().toLowerCase()}_${item.entry_date}`;
    if (map[key] !== undefined) {
      return Boolean(map[key]);
    }
  }
  return false;
}

// Convert Base64 Data URL to a Blob for Supabase Storage uploads
function dataUrlToBlob(dataUrl) {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

// Default initial agent suggestions for autocomplete
const INITIAL_KNOWN_AGENTS = [
  { name: 'Rahul Sharma', login_account_id: 'LOG-VNS-101' },
  { name: 'Amit Patel', login_account_id: 'LOG-VNS-102' },
  { name: 'Vikram Singh', login_account_id: 'LOG-VNS-103' },
  { name: 'Priya Verma', login_account_id: 'LOG-VNS-104' },
  { name: 'Deepak Yadav', login_account_id: 'LOG-VNS-105' },
  { name: 'Sandeep Gupta', login_account_id: 'LOG-VNS-106' },
  { name: 'Manoj Kumar', login_account_id: 'LOG-VNS-107' },
];

function ensureLocalStorageInitialized() {
  if (!localStorage.getItem(STORAGE_KEYS.DAILY_ENTRIES)) {
    localStorage.setItem(STORAGE_KEYS.DAILY_ENTRIES, JSON.stringify(generateInitialDailyEntries()));
  }
  if (!localStorage.getItem(STORAGE_KEYS.REMITTANCE_ENTRIES)) {
    localStorage.setItem(STORAGE_KEYS.REMITTANCE_ENTRIES, JSON.stringify(generateInitialRemittanceEntries()));
  }
  if (!localStorage.getItem(STORAGE_KEYS.KNOWN_AGENTS)) {
    localStorage.setItem(STORAGE_KEYS.KNOWN_AGENTS, JSON.stringify(INITIAL_KNOWN_AGENTS));
  }
}

ensureLocalStorageInitialized();

export const dataService = {
  // --------------------------------------------------------------------------
  // AUTHENTICATION & SECURITY (Issues #1, #3 & Demo Mode)
  // --------------------------------------------------------------------------
  async getCurrentUser() {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (session?.user && !error) {
          return {
            id: session.user.id,
            email: session.user.email,
            username: session.user.email ? session.user.email.split('@')[0] : 'Manager',
            role: 'Hub Manager',
            hub: HUB_CONFIG.HUB_DISPLAY_TITLE,
            name: session.user.user_metadata?.name || session.user.email.split('@')[0],
            isDemo: false,
          };
        }
      } catch (err) {
        console.warn('Supabase session check error:', err);
      }
      return null;
    }

    // When Supabase is not configured, check if local demo session is active
    const saved = localStorage.getItem(STORAGE_KEYS.AUTH_SESSION);
    if (!saved) return null;
    try {
      const parsed = JSON.parse(saved);
      if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
        localStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
        return null;
      }
      return parsed.user;
    } catch {
      return null;
    }
  },

  async login(usernameOrEmail, password) {
    const cleanUser = (usernameOrEmail || '').trim();
    const cleanPass = (password || '').trim();

    if (!cleanUser || !cleanPass) {
      throw new Error('Please enter both username/email and password.');
    }

    // Require configured Supabase instance for real login (Issue #1)
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase is not configured. Please use "Enter Local Demo Mode" for offline development.');
    }

    const email = cleanUser.includes('@') ? cleanUser : `${cleanUser}@${HUB_CONFIG.HUB_NAME.toLowerCase().replace(/\s+/g, '')}.in`;

    // Strictly authenticate via Supabase Auth without hardcoded bypasses (Issue #1 & #3)
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: cleanPass,
    });

    if (error || !data?.user) {
      throw new Error(error?.message || 'Invalid email or password.');
    }

    const user = {
      id: data.user.id,
      email: data.user.email,
      username: data.user.email ? data.user.email.split('@')[0] : cleanUser,
      role: 'Hub Manager',
      hub: HUB_CONFIG.HUB_DISPLAY_TITLE,
      name: data.user.user_metadata?.name || data.user.email.split('@')[0],
      isDemo: false,
    };

    const session = {
      user,
      token: data.session?.access_token || `sess_${Date.now()}`,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    };
    localStorage.setItem(STORAGE_KEYS.AUTH_SESSION, JSON.stringify(session));
    return user;
  },

  async enterDemoMode() {
    const demoUser = {
      id: 'demo-local-manager',
      email: 'demo@local.hub',
      username: 'demomanager',
      role: 'Demo Mode (Offline)',
      hub: `${HUB_CONFIG.HUB_NAME} (Offline Demo)`,
      name: 'Demo Hub Manager',
      isDemo: true,
    };

    const session = {
      user: demoUser,
      token: `demo_sess_${Date.now()}`,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    };
    localStorage.setItem(STORAGE_KEYS.AUTH_SESSION, JSON.stringify(session));
    return demoUser;
  },

  async logout() {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.error('Signout error:', e);
      }
    }
    localStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
    return true;
  },

  /**
   * Check if the logged-in user is in the allowed_managers table.
   * Without this, RLS silently blocks all data operations and each
   * device ends up with its own isolated localStorage data.
   */
  async checkAuthorization() {
    if (!isSupabaseConfigured || !supabase) {
      return { authorized: true, isDemo: true };
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        return { authorized: false, isDemo: false, message: 'No active Supabase session.' };
      }
      const { data, error } = await supabase
        .from('allowed_managers')
        .select('user_id, role, hub_assigned')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (error) {
        return { authorized: false, isDemo: false, message: `Authorization check failed: ${error.message}` };
      }
      if (!data) {
        const fixSQL = `INSERT INTO allowed_managers (user_id, email) VALUES ('${session.user.id}', '${session.user.email}');`;
        return {
          authorized: false,
          isDemo: false,
          fixSQL,
          message: `Account "${session.user.email}" is not in allowed_managers — data will NOT sync across devices. Run this in Supabase SQL Editor: ${fixSQL}`,
        };
      }
      return { authorized: true, isDemo: false, role: data.role, hub: data.hub_assigned };
    } catch (err) {
      return { authorized: false, isDemo: false, message: `Authorization check error: ${err.message}` };
    }
  },

  // --------------------------------------------------------------------------
  // KNOWN AGENTS / AUTOCOMPLETE SUGGESTIONS
  // --------------------------------------------------------------------------
  async getKnownAgents() {
    ensureLocalStorageInitialized();
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.KNOWN_AGENTS) || '[]');
    const entries = JSON.parse(localStorage.getItem(STORAGE_KEYS.DAILY_ENTRIES) || '[]');
    const map = new Map();
    stored.forEach(a => {
      if (a.name) map.set(a.name.toLowerCase(), a);
    });
    entries.forEach(e => {
      if (e.agent_name && !map.has(e.agent_name.toLowerCase())) {
        map.set(e.agent_name.toLowerCase(), {
          name: e.agent_name,
          login_account_id: e.login_account_id || '',
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  },

  async recordKnownAgent(name, loginAccountId) {
    if (!name) return;
    ensureLocalStorageInitialized();
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.KNOWN_AGENTS) || '[]');
    const existing = stored.find(a => a.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      if (loginAccountId) existing.login_account_id = loginAccountId;
    } else {
      stored.push({ name, login_account_id: loginAccountId || '' });
    }
    localStorage.setItem(STORAGE_KEYS.KNOWN_AGENTS, JSON.stringify(stored));
  },

  // --------------------------------------------------------------------------
  // DAILY DELIVERY ENTRIES (Issue #10: Pagination & Date Filters)
  // --------------------------------------------------------------------------
  async getDailyEntries({ 
    monthStr = null, 
    dateStr = null, 
    startDate = null, 
    endDate = null,
    limit = HUB_CONFIG.DEFAULT_PAGE_SIZE,
    offset = 0 
  } = {}) {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from('daily_entries').select('*').order('entry_date', { ascending: false });

        if (dateStr) {
          query = query.eq('entry_date', dateStr);
        } else if (startDate && endDate) {
          query = query.gte('entry_date', startDate).lte('entry_date', endDate);
        } else if (monthStr) {
          const start = `${monthStr}-01`;
          const end = `${monthStr}-31`;
          query = query.gte('entry_date', start).lte('entry_date', end);
        }

        if (limit) {
          query = query.range(offset, offset + limit - 1);
        }

        const { data, error } = await query;
        if (!error && Array.isArray(data)) {
          return data.map(row => ({
            ...row,
            salary_paid: resolveSalaryPaid(row),
          }));
        }
        if (error) {
          console.warn('Supabase getDailyEntries error:', error.message);
        }
        return []; // Supabase configured but query failed — don't use stale localStorage
      } catch (err) {
        console.warn('Supabase getDailyEntries exception:', err);
        return []; // Don't silently fall back to per-device localStorage
      }
    }

    // LocalStorage path — runs only in demo mode (Supabase not configured)
    ensureLocalStorageInitialized();
    const entries = JSON.parse(localStorage.getItem(STORAGE_KEYS.DAILY_ENTRIES) || '[]');

    const filtered = entries.filter(e => {
      if (dateStr && e.entry_date !== dateStr) return false;
      if (startDate && endDate && (e.entry_date < startDate || e.entry_date > endDate)) return false;
      if (monthStr && !e.entry_date.startsWith(monthStr)) return false;
      return true;
    });

    const paginated = limit ? filtered.slice(offset, offset + limit) : filtered;

    return paginated.map(row => ({
      ...row,
      salary_paid: resolveSalaryPaid(row),
    })).sort((a, b) => (a.entry_date < b.entry_date ? 1 : -1));
  },

  async saveDailyEntry(entry) {
    const actualCashTally = entry.cash_collected_fe !== undefined && entry.cash_collected_fe !== null && entry.cash_collected_fe !== ''
      ? Number(entry.cash_collected_fe) || 0
      : (entry.actual_cash_tally !== undefined && entry.actual_cash_tally !== null && entry.actual_cash_tally !== ''
        ? Number(entry.actual_cash_tally) || 0
        : (entry.actual_cash_collected !== undefined ? Number(entry.actual_cash_collected) || 0 : calculateCashTally(entry)));

    const onlineReceived = Number(entry.online_received) || 0;
    const reportedCodCash = Number(entry.reported_cod_cash) || 0;
    const totalSettled = onlineReceived + actualCashTally;
    const cashVariance = totalSettled - reportedCodCash;
    const auditStatus = getAuditStatus(cashVariance);
    const isSalaryPaid = Boolean(entry.salary_paid);

    const payload = {
      agent_name: entry.agent_name?.trim() || 'Rider',
      login_account_id: entry.login_account_id?.trim() || '',
      entry_date: entry.entry_date,
      hub_location: entry.hub_location || HUB_CONFIG.HUB_NAME,
      total_delivered: Number(entry.total_delivered) || 0,
      cod_orders: Number(entry.cod_orders) || 0,
      online_received: onlineReceived,
      reported_cod_cash: reportedCodCash,
      note_500: Number(entry.note_500) || 0,
      note_200: Number(entry.note_200) || 0,
      note_100: Number(entry.note_100) || 0,
      note_50: Number(entry.note_50) || 0,
      note_20: Number(entry.note_20) || 0,
      note_10: Number(entry.note_10) || 0,
      coin_1: Number(entry.coin_1) || 0,
      actual_cash_tally: actualCashTally,
      total_settled: totalSettled,
      cash_variance: cashVariance,
      audit_status: auditStatus,
      salary_paid: isSalaryPaid,
      updated_at: new Date().toISOString(),
    };

    await this.recordKnownAgent(payload.agent_name, payload.login_account_id);
    setSalaryStatusRecord(entry.id, payload.agent_name, payload.entry_date, isSalaryPaid);

    // Save to Supabase first if configured
    if (isSupabaseConfigured && supabase) {
      const executeSupabase = async (dataPayload) => {
        if (entry.id && !entry.id.startsWith('de-')) {
          const { data, error } = await supabase
            .from('daily_entries')
            .update(dataPayload)
            .eq('id', entry.id)
            .select()
            .single();
          if (error) throw error;
          return data;
        } else {
          const { data, error } = await supabase
            .from('daily_entries')
            .insert([dataPayload])
            .select()
            .single();
          if (error) throw error;
          return data;
        }
      };

      try {
        const res = await executeSupabase(payload);
        if (res?.id) {
          setSalaryStatusRecord(res.id, payload.agent_name, payload.entry_date, isSalaryPaid);
        }
        
        // Also update local cache
        ensureLocalStorageInitialized();
        const localEntries = JSON.parse(localStorage.getItem(STORAGE_KEYS.DAILY_ENTRIES) || '[]');
        const idx = localEntries.findIndex(e => e.id === res.id || (e.agent_name === payload.agent_name && e.entry_date === payload.entry_date));
        if (idx >= 0) {
          localEntries[idx] = { ...localEntries[idx], ...res, salary_paid: isSalaryPaid };
        } else {
          localEntries.unshift({ ...res, salary_paid: isSalaryPaid });
        }
        localStorage.setItem(STORAGE_KEYS.DAILY_ENTRIES, JSON.stringify(localEntries));

        return { ...res, salary_paid: isSalaryPaid };
      } catch (err) {
        // Fallback without salary_paid column if not on remote table
        if (err?.message?.includes('salary_paid') || err?.code === '42703' || err?.message?.includes('column')) {
          const { salary_paid, ...fallbackPayload } = payload;
          const res = await executeSupabase(fallbackPayload);
          if (res?.id) {
            setSalaryStatusRecord(res.id, payload.agent_name, payload.entry_date, isSalaryPaid);
          }
          return { ...res, salary_paid: isSalaryPaid };
        }
        throw err;
      }
    }

    // LocalStorage fallback for Demo Mode
    ensureLocalStorageInitialized();
    const localEntries = JSON.parse(localStorage.getItem(STORAGE_KEYS.DAILY_ENTRIES) || '[]');
    let localResultEntry;
    if (entry.id) {
      const idx = localEntries.findIndex(e => e.id === entry.id || (e.agent_name === payload.agent_name && e.entry_date === payload.entry_date));
      if (idx >= 0) {
        localEntries[idx] = { ...localEntries[idx], ...payload, id: entry.id };
        localResultEntry = localEntries[idx];
      }
    }
    if (!localResultEntry) {
      localResultEntry = {
        id: entry.id || `de-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        ...payload,
        created_at: new Date().toISOString(),
      };
      localEntries.push(localResultEntry);
    }
    localStorage.setItem(STORAGE_KEYS.DAILY_ENTRIES, JSON.stringify(localEntries));

    return localResultEntry;
  },

  // Issue #7: Reliable Remote Delete
  async deleteDailyEntry(id, agentName = null, entryDate = null) {
    if (isSupabaseConfigured && supabase) {
      let query = supabase.from('daily_entries').delete();
      if (id && !id.startsWith('de-')) {
        query = query.eq('id', id);
      } else if (agentName && entryDate) {
        query = query.match({ agent_name: agentName, entry_date: entryDate });
      }

      const { error } = await query;
      if (error) {
        console.error('Supabase daily entry delete error:', error);
        throw new Error(`Failed to delete record from server: ${error.message}`);
      }
    }

    // Only clean local state once remote delete succeeded or in local demo mode
    ensureLocalStorageInitialized();
    const entries = JSON.parse(localStorage.getItem(STORAGE_KEYS.DAILY_ENTRIES) || '[]');
    const remaining = entries.filter(e => {
      if (id && e.id === id) return false;
      if (agentName && entryDate && e.agent_name === agentName && e.entry_date === entryDate) return false;
      return true;
    });
    localStorage.setItem(STORAGE_KEYS.DAILY_ENTRIES, JSON.stringify(remaining));

    return true;
  },

  async bulkImportDailyEntries(entriesList) {
    ensureLocalStorageInitialized();
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEYS.DAILY_ENTRIES) || '[]');
    const added = [];

    for (const item of entriesList) {
      const actualCashTally = calculateCashTally(item);
      const onlineReceived = Number(item.online_received) || 0;
      const reportedCodCash = Number(item.reported_cod_cash) || 0;
      const totalSettled = onlineReceived + actualCashTally;
      const cashVariance = totalSettled - reportedCodCash;
      const auditStatus = getAuditStatus(cashVariance);

      const newEntry = {
        id: `de-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        agent_name: item.agent_name || 'Rider',
        login_account_id: item.login_account_id || '',
        entry_date: item.entry_date || new Date().toISOString().split('T')[0],
        hub_location: item.hub_location || HUB_CONFIG.HUB_NAME,
        total_delivered: Number(item.total_delivered) || 0,
        cod_orders: Number(item.cod_orders) || 0,
        online_received: onlineReceived,
        reported_cod_cash: reportedCodCash,
        note_500: Number(item.note_500) || 0,
        note_200: Number(item.note_200) || 0,
        note_100: Number(item.note_100) || 0,
        note_50: Number(item.note_50) || 0,
        note_20: Number(item.note_20) || 0,
        note_10: Number(item.note_10) || 0,
        coin_1: Number(item.coin_1) || 0,
        actual_cash_tally: actualCashTally,
        total_settled: totalSettled,
        cash_variance: cashVariance,
        audit_status: auditStatus,
        salary_paid: Boolean(item.salary_paid),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      existing.push(newEntry);
      added.push(newEntry);
      await this.recordKnownAgent(newEntry.agent_name, newEntry.login_account_id);
    }

    localStorage.setItem(STORAGE_KEYS.DAILY_ENTRIES, JSON.stringify(existing));
    return added;
  },

  // --------------------------------------------------------------------------
  // BANK REMITTANCE ENTRIES (Issues #6, #7, #10)
  // --------------------------------------------------------------------------
  async getRemittanceEntries({ 
    monthStr = null, 
    dateStr = null, 
    startDate = null, 
    endDate = null,
    limit = HUB_CONFIG.DEFAULT_PAGE_SIZE,
    offset = 0 
  } = {}) {
    let records = [];

    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from('remittance_entries').select('*').order('entry_date', { ascending: false });
        if (dateStr) {
          query = query.eq('entry_date', dateStr);
        } else if (startDate && endDate) {
          query = query.gte('entry_date', startDate).lte('entry_date', endDate);
        } else if (monthStr) {
          query = query.gte('entry_date', `${monthStr}-01`).lte('entry_date', `${monthStr}-31`);
        }

        if (limit) {
          query = query.range(offset, offset + limit - 1);
        }

        const { data, error } = await query;
        if (!error && Array.isArray(data)) {
          records = data;
        } else if (error) {
          console.warn('Supabase fetch remittance warning:', error.message);
        }
      } catch (err) {
        console.warn('Supabase fetch remittance exception:', err);
      }
    }

    if (!isSupabaseConfigured && records.length === 0) {
      ensureLocalStorageInitialized();
      const localRecords = JSON.parse(localStorage.getItem(STORAGE_KEYS.REMITTANCE_ENTRIES) || '[]');
      const filtered = localRecords.filter(r => {
        if (dateStr && r.entry_date !== dateStr) return false;
        if (startDate && endDate && (r.entry_date < startDate || r.entry_date > endDate)) return false;
        if (monthStr && !r.entry_date.startsWith(monthStr)) return false;
        return true;
      });
      records = limit ? filtered.slice(offset, offset + limit) : filtered;
    }

    // Merge with IndexedDB & memory receipt data if image isn't already populated
    const enriched = await Promise.all(records.map(async (r) => {
      if (r.receipt_image) return r;
      try {
        const storedReceipt = await getReceiptFromStorage(r.entry_date) || (r.id ? await getReceiptFromStorage(r.id) : null);
        if (storedReceipt?.dataUrl) {
          return {
            ...r,
            receipt_image: storedReceipt.dataUrl,
            receipt_filename: r.receipt_filename || storedReceipt.filename || 'deposit_receipt.jpg',
          };
        }
      } catch (err) {
        console.warn('Error reading stored receipt:', err);
      }
      return r;
    }));

    return enriched.sort((a, b) => (a.entry_date < b.entry_date ? 1 : -1));
  },

  // Issue #6: Upload receipts to Supabase Storage Bucket
  async saveRemittanceEntry(remittanceData) {
    let receiptUrl = remittanceData.receipt_image;
    const filename = remittanceData.receipt_filename || `deposit_${remittanceData.entry_date}.jpg`;

    // 1. If Supabase is configured and image is Data URL, upload to Supabase Storage bucket
    if (isSupabaseConfigured && supabase && receiptUrl && receiptUrl.startsWith('data:')) {
      try {
        const blob = dataUrlToBlob(receiptUrl);
        const storagePath = `receipts/${remittanceData.entry_date}_${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from(HUB_CONFIG.STORAGE_RECEIPTS_BUCKET)
          .upload(storagePath, blob, { contentType: 'image/jpeg', upsert: true });

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from(HUB_CONFIG.STORAGE_RECEIPTS_BUCKET)
            .getPublicUrl(storagePath);

          if (publicUrl) {
            receiptUrl = publicUrl;
          }
        } else {
          console.warn('Supabase storage upload notice, falling back to database column:', uploadError.message);
        }
      } catch (storageErr) {
        console.warn('Storage upload exception:', storageErr);
      }
    }

    const payload = {
      entry_date: remittanceData.entry_date,
      hub_location: remittanceData.hub_location || HUB_CONFIG.HUB_NAME,
      deposit_bank: remittanceData.deposit_bank || HUB_CONFIG.DEFAULT_DEPOSIT_BANK,
      deposit_branch: remittanceData.deposit_branch || HUB_CONFIG.DEFAULT_DEPOSIT_BRANCH,
      cash_challan_no: remittanceData.cash_challan_no || '',
      cash_deposited: Number(remittanceData.cash_deposited) || 0,
      bank_utr_ref_no: remittanceData.bank_utr_ref_no || '',
      online_remitted: Number(remittanceData.online_remitted) || 0,
      receipt_image: receiptUrl || null,
      receipt_filename: filename,
      area_manager_name: remittanceData.area_manager_name || HUB_CONFIG.DEFAULT_AREA_MANAGER,
      manager_approval_status: remittanceData.manager_approval_status || 'Approved & Reconciled',
      signoff_date: remittanceData.signoff_date || remittanceData.entry_date,
      remittance_audit_status: remittanceData.remittance_audit_status || 'Verified • Bank Confirmed',
      updated_at: new Date().toISOString(),
    };

    const recordId = remittanceData.id || `rem-${Date.now()}`;

    // Cache receipt to IndexedDB + memory storage for offline speed
    if (remittanceData.receipt_image) {
      await saveReceiptToStorage(payload.entry_date, {
        dataUrl: remittanceData.receipt_image,
        filename,
      });
      await saveReceiptToStorage(recordId, {
        dataUrl: remittanceData.receipt_image,
        filename,
      });
    }

    // Sync to Supabase if configured — errors must surface, not silently fall back
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('remittance_entries')
        .upsert([payload], { onConflict: 'entry_date' })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to save deposit to server: ${error.message}`);
      }

      // Update local cache mirror
      ensureLocalStorageInitialized();
      const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.REMITTANCE_ENTRIES) || '[]');
      const idx = list.findIndex(r => r.entry_date === payload.entry_date);
      if (idx >= 0) list[idx] = data;
      else list.unshift(data);
      localStorage.setItem(STORAGE_KEYS.REMITTANCE_ENTRIES, JSON.stringify(list));

      return { ...data, receipt_image: payload.receipt_image, receipt_filename: payload.receipt_filename };
    }

    // Persist in LocalStorage — Demo mode only (Supabase not configured)
    ensureLocalStorageInitialized();
    const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.REMITTANCE_ENTRIES) || '[]');
    const idx = list.findIndex(r => r.entry_date === payload.entry_date || (remittanceData.id && r.id === remittanceData.id));
    let localResult;
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...payload, id: list[idx].id || recordId };
      localResult = list[idx];
    } else {
      localResult = {
        id: recordId,
        ...payload,
        created_at: new Date().toISOString(),
      };
      list.push(localResult);
    }

    try {
      localStorage.setItem(STORAGE_KEYS.REMITTANCE_ENTRIES, JSON.stringify(list));
    } catch (quotaErr) {
      console.warn('localStorage quota note, receipt preserved in IndexedDB:', quotaErr);
    }

    return localResult;
  },

  // Issue #7: Reliable Remote Delete
  async deleteRemittanceEntry(idOrDate, entryDate = null) {
    if (isSupabaseConfigured && supabase) {
      const isDateString = typeof idOrDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(idOrDate);
      let query = supabase.from('remittance_entries').delete();
      if (isDateString) {
        query = query.eq('entry_date', idOrDate);
      } else if (entryDate) {
        query = query.eq('entry_date', entryDate);
      } else if (idOrDate && !String(idOrDate).startsWith('rem-')) {
        query = query.eq('id', idOrDate);
      }

      const { error } = await query;
      if (error) {
        console.error('Supabase deleteRemittanceEntry error:', error);
        throw new Error(`Failed to delete deposit record from server: ${error.message}`);
      }
    }

    // Clear local storage and IndexedDB only after remote delete succeeds
    if (idOrDate) {
      await deleteReceiptFromStorage(idOrDate);
    }
    if (entryDate) {
      await deleteReceiptFromStorage(entryDate);
    }

    ensureLocalStorageInitialized();
    const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.REMITTANCE_ENTRIES) || '[]');
    const remaining = list.filter(r => {
      if (idOrDate && (r.id === idOrDate || r.entry_date === idOrDate)) return false;
      if (entryDate && r.entry_date === entryDate) return false;
      return true;
    });
    localStorage.setItem(STORAGE_KEYS.REMITTANCE_ENTRIES, JSON.stringify(remaining));

    return true;
  },

  resetToMockData() {
    localStorage.setItem(STORAGE_KEYS.DAILY_ENTRIES, JSON.stringify(generateInitialDailyEntries()));
    localStorage.setItem(STORAGE_KEYS.REMITTANCE_ENTRIES, JSON.stringify(generateInitialRemittanceEntries()));
    localStorage.setItem(STORAGE_KEYS.KNOWN_AGENTS, JSON.stringify(INITIAL_KNOWN_AGENTS));
    return true;
  }
};
