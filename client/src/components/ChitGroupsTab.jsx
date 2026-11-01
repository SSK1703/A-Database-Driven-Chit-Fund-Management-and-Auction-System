import React, { useState } from 'react';
import { 
  Users, 
  PlusCircle, 
  Calendar, 
  UserCheck, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  ChevronRight, 
  X, 
  Sparkles,
  TrendingUp,
  UserPlus,
  RefreshCw,
  Award
} from 'lucide-react';
import { api } from '../api';

export default function ChitGroupsTab({ 
  groups, 
  users, 
  onRefresh, 
  onSelectCycle, 
  setActiveTab 
}) {
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupDetails, setGroupDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [actionMessage, setActionMessage] = useState(null);

  // New Group Form State
  const [newGroup, setNewGroup] = useState({
    group_name: '',
    organizer_id: users.find(u => u.role === 'organizer')?.user_id || users[0]?.user_id || 1,
    monthly_installment: 10000,
    duration_months: 10,
    max_members: 10,
    start_date: new Date().toISOString().split('T')[0],
    status: 'upcoming'
  });

  const loadGroupDetails = async (groupId) => {
    setSelectedGroup(groupId);
    setLoadingDetails(true);
    setActionMessage(null);
    try {
      const data = await api.getGroupById(groupId);
      setGroupDetails(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    setActionMessage(null);
    try {
      const res = await api.createGroup(newGroup);
      setIsCreateOpen(false);
      onRefresh();
      setActionMessage({ type: 'success', text: `Group created successfully (ID #${res.group_id})` });
      loadGroupDetails(res.group_id);
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!selectedUserId || !selectedGroup) return;
    setActionMessage(null);
    try {
      // Calls stored procedure sp_add_member(group, user)
      const res = await api.addMemberToGroup(selectedGroup, selectedUserId);
      setIsAddMemberOpen(false);
      setActionMessage({ type: 'success', text: res.result?.result || 'Member added to group!' });
      loadGroupDetails(selectedGroup);
      onRefresh();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const handleGenerateCycles = async () => {
    if (!selectedGroup) return;
    setActionMessage(null);
    try {
      const res = await api.generateCycles(selectedGroup);
      setActionMessage({ type: 'success', text: res.result?.result || 'Monthly cycles generated successfully!' });
      loadGroupDetails(selectedGroup);
      onRefresh();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!selectedGroup) return;
    try {
      await api.updateGroupStatus(selectedGroup, newStatus);
      setActionMessage({ type: 'success', text: `Status updated to ${newStatus}. (trg_audit_group_status recorded to AuditLog)` });
      loadGroupDetails(selectedGroup);
      onRefresh();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const filteredGroups = groups.filter(g => filterStatus === 'all' || g.status === filterStatus);

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            Chit Groups Management
          </h1>
          <p className="text-xs text-slate-400">
            Enforce relational integrity, cycle generation, and member quota constraints
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Status filter pills */}
          <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
            {['all', 'active', 'upcoming', 'completed'].map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1 rounded-lg capitalize transition ${filterStatus === s ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                {s}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-emerald-600/20"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Chit</span>
          </button>
        </div>
      </div>

      {/* Action Notification Alert Banner */}
      {actionMessage && (
        <div className={`p-4 rounded-xl text-xs flex items-center justify-between gap-3 border animate-in fade-in ${
          actionMessage.type === 'success' 
            ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200' 
            : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
            <span className="font-semibold">{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Grid: Groups Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredGroups.map((g) => {
          const isSelected = selectedGroup === g.group_id;
          const progress = g.duration_months > 0 ? Math.round((g.cycles_completed / g.duration_months) * 100) : 0;

          return (
            <div
              key={g.group_id}
              onClick={() => loadGroupDetails(g.group_id)}
              className={`bg-slate-900 border rounded-2xl p-5 shadow-xl transition-all cursor-pointer flex flex-col justify-between ${
                isSelected 
                  ? 'border-emerald-500 ring-2 ring-emerald-500/30' 
                  : 'border-slate-800 hover:border-slate-700 hover:shadow-2xl'
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-base">{g.group_name}</span>
                  </div>
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                    g.status === 'active' 
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' 
                      : g.status === 'upcoming'
                        ? 'bg-amber-950 text-amber-400 border border-amber-800'
                        : 'bg-slate-800 text-slate-300'
                  }`}>
                    {g.status}
                  </span>
                </div>

                <div className="text-xs text-slate-400 mt-1">
                  Organizer: <strong className="text-slate-300 font-medium">{g.organizer}</strong>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500">Chit Pool</span>
                    <div className="text-sm font-black text-emerald-400 font-mono">
                      ₹{Number(g.total_amount).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500">Monthly</span>
                    <div className="text-sm font-black text-white font-mono">
                      ₹{Number(g.monthly_installment).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Cycles Completed: <strong className="text-white">{g.cycles_completed}</strong> / {g.duration_months}</span>
                    <span className="font-mono text-slate-300 font-bold">{progress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  Members: <strong className="text-slate-200">{g.current_members} / {g.max_members}</strong>
                </span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1 group-hover:translate-x-1 transition">
                  {isSelected ? 'Viewing Details ↓' : 'Inspect Details →'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Group Deep Dive Drawer / Panel */}
      {selectedGroup && (
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl animate-in fade-in slide-in-from-top-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-black text-white">
                  {groupDetails?.group?.group_name || `Group #${selectedGroup}`}
                </h2>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400">Status:</span>
                  <select
                    value={groupDetails?.group?.status || 'active'}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="bg-slate-950 border border-slate-700 text-emerald-400 text-xs rounded-lg px-2 py-1 font-bold focus:outline-none"
                  >
                    <option value="upcoming">upcoming</option>
                    <option value="active">active</option>
                    <option value="completed">completed</option>
                    <option value="cancelled">cancelled</option>
                  </select>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Managed by {groupDetails?.group?.organizer_name} ({groupDetails?.group?.organizer_email}) • Start Date: {groupDetails?.group?.start_date}
              </p>
            </div>

            {/* Quick Group Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsAddMemberOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Member (sp_add_member)</span>
              </button>
              <button
                onClick={handleGenerateCycles}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Generate Cycles (sp_generate_cycles)</span>
              </button>
              <button
                onClick={() => setSelectedGroup(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {loadingDetails ? (
            <div className="py-12 text-center text-slate-400 text-xs">Loading group details...</div>
          ) : (
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Enrolled Members Table */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    Enrolled Members ({groupDetails?.members?.length || 0} / {groupDetails?.group?.max_members})
                  </h3>
                  <span className="text-[10px] text-slate-500 font-mono">
                    trg_limit_members blocks enrollment if full
                  </span>
                </div>

                <div className="overflow-x-auto max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-[11px] text-slate-500 uppercase">
                        <th className="pb-2 font-semibold">User</th>
                        <th className="pb-2 font-semibold">Slot</th>
                        <th className="pb-2 font-semibold">Risk Level</th>
                        <th className="pb-2 font-semibold">Total Paid</th>
                        <th className="pb-2 font-semibold">Payout</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {groupDetails?.members?.map((m) => (
                        <tr key={m.membership_id} className="hover:bg-slate-900/40">
                          <td className="py-2.5">
                            <div className="font-semibold text-white">{m.name}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{m.phone}</div>
                          </td>
                          <td className="py-2.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              m.slot_status === 'active' 
                                ? 'bg-emerald-950 text-emerald-400' 
                                : 'bg-rose-950 text-rose-400'
                            }`}>
                              {m.slot_status}
                            </span>
                          </td>
                          <td className="py-2.5">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              m.risk_level === 'LOW' 
                                ? 'text-emerald-400' 
                                : m.risk_level === 'MEDIUM' 
                                  ? 'text-amber-400' 
                                  : 'text-rose-400'
                            }`}>
                              {m.risk_level}
                            </span>
                          </td>
                          <td className="py-2.5 font-mono text-slate-300">
                            ₹{Number(m.total_paid).toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5">
                            {m.has_won_payout ? (
                              <span className="px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 text-[10px] font-bold">
                                Won Payout
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500">Eligible</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Monthly Cycles Timeline */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-indigo-400" />
                    Monthly Auction Cycles ({groupDetails?.cycles?.length || 0})
                  </h3>
                  <span className="text-[10px] text-slate-500">Click a cycle to jump to Auction Arena</span>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {groupDetails?.cycles?.map((c) => (
                    <div 
                      key={c.cycle_id}
                      onClick={() => {
                        onSelectCycle(c.cycle_id);
                        setActiveTab('auctions');
                      }}
                      className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 transition cursor-pointer flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center font-mono font-bold text-slate-300 text-xs">
                          #{c.month_number}
                        </div>
                        <div>
                          <div className="font-semibold text-white">Date: {c.cycle_date}</div>
                          <div className="text-[10px] text-slate-400">
                            Bids: <strong className="text-slate-300">{c.bids_count}</strong> • Paid: <strong className="text-slate-300">{c.paid_members_count}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          c.status === 'bidding'
                            ? 'bg-amber-950 text-amber-400 border border-amber-800 animate-pulse'
                            : c.status === 'closed'
                              ? 'bg-slate-800 text-slate-400'
                              : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        }`}>
                          {c.status}
                        </span>
                        {c.winner_name && (
                          <div className="text-[10px] text-emerald-400 font-semibold mt-0.5">
                            Winner: {c.winner_name}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal: Create Chit Group */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-emerald-400" /> Create New Chit Scheme
              </h2>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Group Scheme Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Diamond Savers Circle"
                  value={newGroup.group_name}
                  onChange={(e) => setNewGroup({ ...newGroup, group_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Organizer</label>
                  <select
                    value={newGroup.organizer_id}
                    onChange={(e) => setNewGroup({ ...newGroup, organizer_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  >
                    {users.map(u => (
                      <option key={u.user_id} value={u.user_id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={newGroup.start_date}
                    onChange={(e) => setNewGroup({ ...newGroup, start_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Monthly (₹)</label>
                  <input
                    type="number"
                    step="500"
                    required
                    value={newGroup.monthly_installment}
                    onChange={(e) => setNewGroup({ ...newGroup, monthly_installment: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Duration (Months)</label>
                  <input
                    type="number"
                    min="2"
                    max="60"
                    required
                    value={newGroup.duration_months}
                    onChange={(e) => setNewGroup({ ...newGroup, duration_months: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Max Members</label>
                  <input
                    type="number"
                    min="2"
                    max="100"
                    required
                    value={newGroup.max_members}
                    onChange={(e) => setNewGroup({ ...newGroup, max_members: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Automatic check constraint computation */}
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-[11px] text-slate-300">
                <div className="flex justify-between items-center">
                  <span>Computed Total Scheme Amount:</span>
                  <span className="text-emerald-400 font-mono font-bold text-sm">
                    ₹{(newGroup.monthly_installment * newGroup.duration_months).toLocaleString('en-IN')}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Satisfies relational CHECK constraint: <code className="text-slate-400">total_amount = monthly_installment * duration_months</code>
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20"
                >
                  Create Scheme
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Enroll Member (sp_add_member) */}
      {isAddMemberOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-400" /> Enroll Member to Group
              </h2>
              <button onClick={() => setIsAddMemberOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Select Member</label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- Choose User --</option>
                  {users.map(u => (
                    <option key={u.user_id} value={u.user_id}>
                      {u.name} (KYC: {u.kyc_verified ? 'Verified ✓' : 'Unverified ✗'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div className="font-semibold text-slate-300">Enforced DBMS Constraints:</div>
                <div>1. <code className="text-emerald-400">sp_add_member</code> rejects unverified KYC users</div>
                <div>2. <code className="text-emerald-400">trg_limit_members</code> rejects if group is full</div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddMemberOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl"
                >
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
