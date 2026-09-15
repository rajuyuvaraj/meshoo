import React from 'react';
import { Calendar, ShieldCheck } from 'lucide-react';

export default function BottomNav({ activeTab, onTabChange }) {
  return (
    <nav className="bottom-nav" style={{ gridTemplateColumns: '1fr 1fr' }}>
      <button
        type="button"
        className={`bottom-nav-item ${activeTab === 'calendar' ? 'active' : ''}`}
        onClick={() => onTabChange('calendar')}
      >
        <Calendar size={20} />
        <span>Calendar Reconciliation</span>
      </button>

      <button
        type="button"
        className={`bottom-nav-item ${activeTab === 'remittance' ? 'active' : ''}`}
        onClick={() => onTabChange('remittance')}
      >
        <ShieldCheck size={20} />
        <span>Bank Remittance</span>
      </button>
    </nav>
  );
}
