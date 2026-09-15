# Varanasi Hub — Delivery Fleet Operations & Bank Remittance Tracker

A modern, mobile-responsive web application designed for the Varanasi Hub (VNS-01) Delivery Hub Manager to replace manual Excel tracking with real-time rider reconciliation, physical cash tallying, and hub-level bank remittance accounting.

## Features

- 📅 **Calendar Reconciliation Dashboard**: Month calendar view with color-coded daily audit statuses (Green = Balanced, Red = Shortage, Yellow = Surplus, Grey = No Data).
- 💰 **Single-Flow Shift Reconciliation**: Dynamic Rider Name & Login Account ID inputs, delivery volume, reported collections, and physical currency note counter (₹500, ₹200, ₹100, ₹50, ₹20, ₹10, ₹1 coins) with live actual cash calculation.
- ✏️ **Full Post-Submission Editability**: Click any past or present entry to update numbers, recounts, and reconciliations in real-time.
- 🏦 **Hub-Level Bank Remittance**: Daily bank branch cash deposits, challan slips, UTR reference tracking, Area Manager sign-off, and vault cash monitoring.
- 📊 **Indian Rupee Formatting**: Strict Indian number formatting (`₹1,28,750`) and crimson negative accounting syntax `(₹100)`.
- 📁 **Bulk CSV Import**: Upload or paste spreadsheet shift entries on the fly.
- ⚡ **Dual Backend Ready**: Works instantly offline via LocalStorage demo mode or with live Supabase / PostgreSQL integration using `supabase/schema.sql`.

## Tech Stack

- **Frontend**: React 18, Vite, Lucide Icons, Custom CSS Design System
- **Database / Auth**: Supabase (PostgreSQL + Auth) & LocalStorage Fallback

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Run local development server
npm run dev

# 3. Build for production
npm run build
```

## Supabase Database Setup

Execute [`supabase/schema.sql`](supabase/schema.sql) in your Supabase SQL Editor and add your project URL and Anon key via the database icon in the app header or `.env` file (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
