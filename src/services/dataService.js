import { supabase, isSupabaseConfigured } from './supabaseClient';
import { generateInitialDailyEntries, generateInitialRemittanceEntries } from './mockSeedData';
import { calculateCashTally, getAuditStatus } from '../utils/formatters';
import { hashString, secureCompare, SECURE_MANAGER_CREDENTIALS } from '../utils/security';

const STORAGE_KEYS = {
  DAILY_ENTRIES: 'vns_hub_daily_entries',
  REMITTANCE_ENTRIES: 'vns_hub_remittance_entries',
  KNOWN_AGENTS: 'vns_hub_known_agents',
  AUTH_SESSION: 'vns_hub_secure_session',
};

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
  // AUTHENTICATION & SECURITY
  // --------------------------------------------------------------------------
  async getCurrentUser() {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          return {
            id: session.user.id,
            email: session.user.email,
            username: session.user.email.split('@')[0],
            role: 'Hub Manager',
            hub: 'Varanasi Hub (VNS-01)',
            name: SECURE_MANAGER_CREDENTIALS.displayName,
          };
        }
      } catch (err) {
        console.warn('Supabase session check error:', err);
      }
    }
    const saved = localStorage.getItem(STORAGE_KEYS.AUTH_SESSION);
    if (!saved) return null;
    try {
      const parsed = JSON.parse(saved);
      // Validate session expiry (e.g. 7 days)
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
    const cleanUser = (usernameOrEmail || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

    if (!cleanUser || !cleanPass) {
      throw new Error('Please enter both username and password.');
    }

    // 1. Verify Manager Credentials ('vaibhav' / 'vaibhav@kan')
    const usernamePart = cleanUser.includes('@') ? cleanUser.split('@')[0] : cleanUser;
    const inputUserHash = await hashString(usernamePart);
    const inputPassHash = await hashString(cleanPass);

    const isManagerUser = secureCompare(inputUserHash, SECURE_MANAGER_CREDENTIALS.usernameHash) || usernamePart === 'vaibhav';
    const isManagerPass = secureCompare(inputPassHash, SECURE_MANAGER_CREDENTIALS.passwordHash) || cleanPass === 'vaibhav@kan';

    if (isManagerUser && isManagerPass) {
      const user = {
        id: 'mgr-vns-vaibhav',
        email: 'vaibhav@varanasi-hub.in',
        username: 'vaibhav',
        role: 'Hub Manager',
        hub: 'Varanasi Hub (VNS-01)',
        name: 'Vaibhav',
      };

      // If Supabase Auth is available, try to sign in or auto-provision in background
      if (isSupabaseConfigured && supabase) {
        const email = 'vaibhav@varanasi-hub.meesho.in';
        try {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password: cleanPass,
          });
          if (signInError) {
            // Attempt auto-signup on Supabase for this manager
            await supabase.auth.signUp({
              email,
              password: cleanPass,
            });
          }
        } catch (e) {
          console.warn('Supabase auth sync note:', e.message);
        }
      }

      const session = {
        user,
        token: `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      };
      localStorage.setItem(STORAGE_KEYS.AUTH_SESSION, JSON.stringify(session));
      return user;
    }

    // 2. Otherwise check Supabase Auth for other registered accounts
    if (isSupabaseConfigured && supabase) {
      const email = cleanUser.includes('@') ? cleanUser : `${cleanUser}@varanasi-hub.meesho.in`;
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: cleanPass,
      });
      if (!error && data?.user) {
        const user = {
          id: data.user.id,
          email: data.user.email,
          username: cleanUser,
          role: 'Hub Manager',
          hub: 'Varanasi Hub (VNS-01)',
          name: SECURE_MANAGER_CREDENTIALS.displayName,
        };
        const session = {
          user,
          token: `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        };
        localStorage.setItem(STORAGE_KEYS.AUTH_SESSION, JSON.stringify(session));
        return user;
      }
    }

    throw new Error('Invalid credentials. Please check your manager username and password.');
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
  // DAILY DELIVERY ENTRIES
  // --------------------------------------------------------------------------
  async getDailyEntries({ monthStr = null, dateStr = null } = {}) {
    if (isSupabaseConfigured && supabase) {
      let query = supabase.from('daily_entries').select('*').order('entry_date', { ascending: false });

      if (dateStr) {
        query = query.eq('entry_date', dateStr);
      } else if (monthStr) {
        const start = `${monthStr}-01`;
        const end = `${monthStr}-31`;
        query = query.gte('entry_date', start).lte('entry_date', end);
      }

      const { data, error } = await query;
      if (!error && data) return data;
    }

    ensureLocalStorageInitialized();
    const entries = JSON.parse(localStorage.getItem(STORAGE_KEYS.DAILY_ENTRIES) || '[]');

    const filtered = entries.filter(e => {
      if (dateStr && e.entry_date !== dateStr) return false;
      if (monthStr && !e.entry_date.startsWith(monthStr)) return false;
      return true;
    });

    return filtered.sort((a, b) => (a.entry_date < b.entry_date ? 1 : -1));
  },

  async saveDailyEntry(entry) {
    const actualCashTally = entry.actual_cash_tally !== undefined && entry.actual_cash_tally !== null && entry.actual_cash_tally !== ''
      ? Number(entry.actual_cash_tally) || 0
      : (entry.actual_cash_collected !== undefined ? Number(entry.actual_cash_collected) || 0 : calculateCashTally(entry));

    const onlineReceived = Number(entry.online_received) || 0;
    const reportedCodCash = Number(entry.reported_cod_cash) || 0;
    const totalSettled = onlineReceived + actualCashTally;
    const cashVariance = actualCashTally - reportedCodCash;
    const auditStatus = getAuditStatus(cashVariance);

    const payload = {
      agent_name: entry.agent_name?.trim() || 'Rider',
      login_account_id: entry.login_account_id?.trim() || '',
      entry_date: entry.entry_date,
      hub_location: entry.hub_location || 'Varanasi Hub',
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
      updated_at: new Date().toISOString(),
    };

    await this.recordKnownAgent(payload.agent_name, payload.login_account_id);

    if (isSupabaseConfigured && supabase) {
      if (entry.id && !entry.id.startsWith('de-')) {
        const { data, error } = await supabase
          .from('daily_entries')
          .update(payload)
          .eq('id', entry.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('daily_entries')
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    }

    ensureLocalStorageInitialized();
    const entries = JSON.parse(localStorage.getItem(STORAGE_KEYS.DAILY_ENTRIES) || '[]');
    let resultEntry;

    if (entry.id) {
      const idx = entries.findIndex(e => e.id === entry.id);
      if (idx >= 0) {
        entries[idx] = { ...entries[idx], ...payload };
        resultEntry = entries[idx];
      }
    }

    if (!resultEntry) {
      resultEntry = {
        id: `de-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        ...payload,
        created_at: new Date().toISOString(),
      };
      entries.push(resultEntry);
    }

    localStorage.setItem(STORAGE_KEYS.DAILY_ENTRIES, JSON.stringify(entries));
    return resultEntry;
  },

  async deleteDailyEntry(id) {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('daily_entries').delete().eq('id', id);
      if (error) throw error;
      return true;
    }
    ensureLocalStorageInitialized();
    const entries = JSON.parse(localStorage.getItem(STORAGE_KEYS.DAILY_ENTRIES) || '[]');
    const remaining = entries.filter(e => e.id !== id);
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
      const cashVariance = actualCashTally - reportedCodCash;
      const auditStatus = getAuditStatus(cashVariance);

      const newEntry = {
        id: `de-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        agent_name: item.agent_name || 'Rider',
        login_account_id: item.login_account_id || '',
        entry_date: item.entry_date || new Date().toISOString().split('T')[0],
        hub_location: item.hub_location || 'Varanasi Hub',
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
  // BANK REMITTANCE ENTRIES
  // --------------------------------------------------------------------------
  async getRemittanceEntries({ monthStr = null, dateStr = null } = {}) {
    if (isSupabaseConfigured && supabase) {
      let query = supabase.from('remittance_entries').select('*').order('entry_date', { ascending: false });
      if (dateStr) query = query.eq('entry_date', dateStr);
      const { data, error } = await query;
      if (!error && data) return data;
    }

    ensureLocalStorageInitialized();
    const records = JSON.parse(localStorage.getItem(STORAGE_KEYS.REMITTANCE_ENTRIES) || '[]');
    return records.filter(r => {
      if (dateStr && r.entry_date !== dateStr) return false;
      if (monthStr && !r.entry_date.startsWith(monthStr)) return false;
      return true;
    }).sort((a, b) => (a.entry_date < b.entry_date ? 1 : -1));
  },

  async saveRemittanceEntry(remittanceData) {
    const payload = {
      entry_date: remittanceData.entry_date,
      hub_location: remittanceData.hub_location || 'Varanasi Hub',
      deposit_bank: remittanceData.deposit_bank || 'State Bank of India',
      deposit_branch: remittanceData.deposit_branch || 'Varanasi Main Branch (Cantt)',
      cash_challan_no: remittanceData.cash_challan_no || '',
      cash_deposited: Number(remittanceData.cash_deposited) || 0,
      bank_utr_ref_no: remittanceData.bank_utr_ref_no || '',
      online_remitted: Number(remittanceData.online_remitted) || 0,
      area_manager_name: remittanceData.area_manager_name || 'Rajesh Kumar (AM)',
      manager_approval_status: remittanceData.manager_approval_status || 'Approved & Reconciled',
      signoff_date: remittanceData.signoff_date || remittanceData.entry_date,
      remittance_audit_status: remittanceData.remittance_audit_status || 'Verified • Bank Confirmed',
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('remittance_entries')
        .upsert([payload], { onConflict: 'entry_date' })
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    ensureLocalStorageInitialized();
    const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.REMITTANCE_ENTRIES) || '[]');
    const idx = list.findIndex(r => r.entry_date === payload.entry_date);
    let result;
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...payload };
      result = list[idx];
    } else {
      result = {
        id: `rem-${Date.now()}`,
        ...payload,
        created_at: new Date().toISOString(),
      };
      list.push(result);
    }
    localStorage.setItem(STORAGE_KEYS.REMITTANCE_ENTRIES, JSON.stringify(list));
    return result;
  },

  async deleteRemittanceEntry(idOrDate) {
    if (isSupabaseConfigured && supabase) {
      if (idOrDate.includes('-')) {
        await supabase.from('remittance_entries').delete().eq('entry_date', idOrDate);
      } else {
        await supabase.from('remittance_entries').delete().eq('id', idOrDate);
      }
      return true;
    }

    ensureLocalStorageInitialized();
    const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.REMITTANCE_ENTRIES) || '[]');
    const remaining = list.filter(r => r.id !== idOrDate && r.entry_date !== idOrDate);
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
