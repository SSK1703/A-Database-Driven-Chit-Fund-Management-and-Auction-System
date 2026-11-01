import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  DollarSign, 
  Clock, 
  X,
  CreditCard,
  FileCheck
} from 'lucide-react';
import { api } from '../api';

export default function DefaultersTab({ onRefresh }) {
  const [defaulters, setDefaulters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionAlert, setActionAlert] = useState(null);
  const [settlingId, setSettlingId] = useState(null);

  const loadDefaulters = async () => {
    setLoading(true);
    try {
      const data = await api.getDefaulters();
      setDefaulters(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDefaulters();
  }, []);

  const handleSettleDues = async (defaultId) => {
    if (!window.confirm('Execute ACID Transaction (T1 COMMIT) to settle overdue installment and clear defaulter flag?')) {
      return;
    }
    setSettlingId(defaultId);
    setActionAlert(null);
    try {
      // Calls transaction settlement endpoint
      const res = await api.settleDefaulter(defaultId);
      setActionAlert({ type: 'success', text: res.message });
      loadDefaulters();
      onRefresh();
    } catch (err) {
      setActionAlert({ type: 'error', text: err.message });
    } finally {
      setSettlingId(null);
    }
  };

  const pendingDefaulters = defaulters.filter(d => d.resolved_status === 'pending');
  const resolvedDefaulters = defaulters.filter(d => d.resolved_status === 'resolved');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            Defaulters & ACID Transaction Settlements
          </h1>
          <p className="text-xs text-slate-400">
            Backed by <code className="text-emerald-400 font-mono">vw_defaulter_report</code> view with atomic transaction clearance
          </p>
        </div>

        <button
          onClick={loadDefaulters}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-semibold transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Defaulters</span>
        </button>
      </div>

      {/* Action Alert */}
      {actionAlert && (
        <div className={`p-4 rounded-xl text-xs flex items-center justify-between gap-3 border animate-in fade-in ${
          actionAlert.type === 'success' 
            ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200' 
            : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            {actionAlert.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
            <span className="font-semibold">{actionAlert.text}</span>
          </div>
          <button onClick={() => setActionAlert(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <span className="text-xs text-slate-400 font-medium">Pending Defaulters</span>
          <div className="text-2xl font-black text-rose-400 font-mono mt-1">
            {pendingDefaulters.length}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Awaiting settlement</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <span className="text-xs text-slate-400 font-medium">Resolved Cases</span>
          <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
            {resolvedDefaulters.length}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Cleared via ACID transaction</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <span className="text-xs text-slate-400 font-medium">Total Overdue Dues</span>
          <div className="text-2xl font-black text-white font-mono mt-1">
            ₹{pendingDefaulters.reduce((acc, d) => acc + Number(d.amount_due) + Number(d.penalty_applied), 0).toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Including penalties</span>
        </div>
      </div>

      {/* Defaulters Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400" /> Flagged Defaulters Audit Report
          </h2>
          <span className="text-[10px] text-slate-400 font-mono">
            trg_notify_defaulter automatically notifies member upon insertion
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950/70 border-b border-slate-800 text-[11px] text-slate-400 uppercase font-semibold">
                <th className="py-3 px-4">Default ID</th>
                <th className="py-3 px-4">Member Name</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">Chit Scheme</th>
                <th className="py-3 px-4">Cycle Month</th>
                <th className="py-3 px-4">Amount Due</th>
                <th className="py-3 px-4">Penalty Applied</th>
                <th className="py-3 px-4">Resolution Status</th>
                <th className="py-3 px-4 text-right">ACID Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {defaulters.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-slate-500">
                    No defaulter records found.
                  </td>
                </tr>
              ) : (
                defaulters.map((d) => (
                  <tr key={d.default_id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono text-slate-500">#{d.default_id}</td>
                    <td className="py-3 px-4 font-semibold text-white">{d.name}</td>
                    <td className="py-3 px-4 font-mono text-slate-400">{d.phone}</td>
                    <td className="py-3 px-4 text-slate-300">{d.group_name}</td>
                    <td className="py-3 px-4 font-mono text-slate-400">Month #{d.month_number}</td>
                    <td className="py-3 px-4 font-mono font-bold text-rose-400">
                      ₹{Number(d.amount_due).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 font-mono text-amber-400 font-medium">
                      ₹{Number(d.penalty_applied).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        d.resolved_status === 'resolved'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-rose-950 text-rose-400 border border-rose-800 animate-pulse'
                      }`}>
                        {d.resolved_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {d.resolved_status === 'pending' ? (
                        <button
                          onClick={() => handleSettleDues(d.default_id)}
                          disabled={settlingId === d.default_id}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[11px] font-bold shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5 ml-auto"
                        >
                          <FileCheck className="w-3.5 h-3.5" />
                          <span>{settlingId === d.default_id ? 'Committing...' : 'Commit Settle'}</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-500 italic">Settled in DB</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Details Explanation Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl text-xs">
        <h3 className="font-bold text-white mb-2 flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-400" />
          Academic DBMS Concept: Atomic Settlement Transaction (T1 COMMIT)
        </h3>
        <p className="text-slate-400 leading-relaxed mb-3">
          When clicking <strong>"Commit Settle"</strong>, the backend executes the exact transaction specified in Part 6 of the DBMS mini-project:
        </p>
        <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 font-mono text-[11px] text-emerald-300 space-y-1">
          <div>START TRANSACTION;</div>
          <div className="pl-4 text-slate-300">UPDATE Payments SET amount_paid = installment, status = 'late', payment_date = CURDATE() WHERE ...;</div>
          <div className="pl-4 text-slate-300">UPDATE Defaulters SET resolved_status = 'resolved' WHERE ...;</div>
          <div className="pl-4 text-slate-300">INSERT INTO Notifications (user_id, message, type) VALUES (..., 'Your overdue installment has been settled.', 'payment');</div>
          <div>COMMIT;</div>
        </div>
      </div>
    </div>
  );
}
