-- Allow multiple remittance entries on the same date.
-- Run this against the existing Supabase database.

alter table if exists public.remittance_entries
  drop constraint if exists remittance_entries_entry_date_key;
