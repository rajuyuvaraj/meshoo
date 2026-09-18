import React, { useState, useMemo } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Edit2, 
  CheckCircle2, 
  XCircle, 
  ToggleLeft, 
  ToggleRight,
  ShieldCheck,
  UserCheck,
  UserX
} from 'lucide-react';

export default function AgentsView({ agents = [], onSaveAgent, onToggleActive }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | active | inactive
  const [showModal, setShowModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);

  // Form inputs
  const [name, setName] = useState('');
  const [loginId, setLoginId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filter agents
  const filteredAgents = useMemo(() => {
    return agents.filter(agent => {
      const matchSearch = 
        agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.login_account_id.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchSearch) return false;
      if (statusFilter === 'active') return agent.active;
      if (statusFilter === 'inactive') return !agent.active;
      return true;
    });
  }, [agents, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const total = agents.length;
    const active = agents.filter(a => a.active).length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [agents]);

  const handleOpenAdd = () => {
    setEditingAgent(null);
    setName('');
    // Auto suggest next ID (e.g. LOG-VNS-109)
    const nextNum = 101 + agents.length;
    setLoginId(`LOG-VNS-${nextNum}`);
    setIsActive(true);
    setShowModal(true);
  };

  const handleOpenEdit = (agent) => {
    setEditingAgent(agent);
    setName(agent.name);
    setLoginId(agent.login_account_id);
    setIsActive(agent.active ?? true);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !loginId.trim()) return;

    setSaving(true);
    try {
      await onSaveAgent({
        id: editingAgent?.id || null,
        name: name.trim(),
        login_account_id: loginId.trim(),
        active: isActive,
      });
      setShowModal(false);
    } catch (err) {
      alert(err.message || 'Failed to save delivery agent');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="agents-container">
      {/* Header & Stats Banner */}
      <div style={{
        background: '#ffffff',
        padding: '18px 20px',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        marginBottom: '20px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '14px'
      }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
            UT8 HUB Delivery Agents (Riders)
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Manage delivery fleet roster. Inactive riders remain preserved in historical entries.
          </p>
        </div>

        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <UserPlus size={16} />
          <span>+ Add Delivery Agent</span>
        </button>
      </div>

      {/* KPI Stats Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
        <div style={{ background: '#ffffff', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Total Fleet</div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
            {stats.total} Agents
          </div>
        </div>

        <div style={{ background: '#ecfdf5', padding: '14px', borderRadius: '12px', border: '1px solid #a7f3d0' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#065f46', textTransform: 'uppercase' }}>Active On-Duty</div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800, color: '#059669' }}>
            {stats.active} Riders
          </div>
        </div>

        <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Inactive / Relieved</div>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800, color: '#64748b' }}>
            {stats.inactive} Riders
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div style={{
        background: '#ffffff',
        padding: '12px 16px',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        marginBottom: '16px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px'
      }}>
        <div className="input-prefix-wrapper" style={{ flex: '1', minWidth: '220px', maxWidth: '380px' }}>
          <span className="input-prefix"><Search size={16} /></span>
          <input
            type="text"
            className="form-input"
            placeholder="Search by agent name or LOG-VNS-ID..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            className={`btn btn-sm ${statusFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setStatusFilter('all')}
          >
            All ({stats.total})
          </button>
          <button
            className={`btn btn-sm ${statusFilter === 'active' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setStatusFilter('active')}
          >
            Active ({stats.active})
          </button>
          <button
            className={`btn btn-sm ${statusFilter === 'inactive' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setStatusFilter('inactive')}
          >
            Inactive ({stats.inactive})
          </button>
        </div>
      </div>

      {/* Agents Roster List */}
      <div>
        {filteredAgents.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '36px',
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px dashed #cbd5e1'
          }}>
            <Users size={32} color="#94a3b8" style={{ margin: '0 auto 8px' }} />
            <p style={{ fontWeight: 600, color: '#475569' }}>No agents match your query</p>
          </div>
        ) : (
          filteredAgents.map(agent => (
            <div key={agent.id} className="agent-card">
              <div className="agent-info">
                <div className="agent-avatar" style={{ background: agent.active ? '#eef2ff' : '#f1f5f9', color: agent.active ? '#4f46e5' : '#94a3b8' }}>
                  {agent.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="agent-name" style={{ color: agent.active ? '#0f172a' : '#64748b' }}>
                    {agent.name}
                  </div>
                  <div className="agent-id-tag">
                    {agent.login_account_id} • UT8 HUB
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <button
                  onClick={() => onToggleActive(agent.id, !agent.active)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                  title={agent.active ? 'Click to deactivate agent' : 'Click to activate agent'}
                >
                  <span className={`badge ${agent.active ? 'badge-active' : 'badge-inactive'}`}>
                    {agent.active ? 'Active' : 'Inactive'}
                  </span>
                  {agent.active ? (
                    <ToggleRight size={26} color="#10b981" />
                  ) : (
                    <ToggleLeft size={26} color="#94a3b8" />
                  )}
                </button>

                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleOpenEdit(agent)}
                  title="Edit agent details"
                >
                  <Edit2 size={14} />
                  <span>Edit</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Agent Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-card" style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingAgent ? 'Edit Delivery Agent' : 'Add New Delivery Agent'}
              </h3>
              <button className="btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Full Name <span className="required">*</span></label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    placeholder="e.g. Suresh Pal"
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Login Account ID <span className="required">*</span></label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    placeholder="e.g. LOG-VNS-109"
                    value={loginId}
                    onChange={e => setLoginId(e.target.value)}
                  />
                  <small style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                    Standard format: LOG-VNS-[Number]
                  </small>
                </div>

                <div className="form-group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>Active Status</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Active riders appear in shift entry dropdowns</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={e => setIsActive(e.target.checked)}
                    style={{ width: 18, height: 18, cursor: 'pointer' }}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : (editingAgent ? 'Update Agent' : 'Create Agent')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
