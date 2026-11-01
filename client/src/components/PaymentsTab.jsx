import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  PlusCircle, 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  ShieldAlert, 
  Calendar, 
  Clock, 
  DollarSign, 
  X,
  Play,
  FileText
} from 'lucide-react';
import { api } from '../api';

export default function PaymentsTab({ 
  cycles, 
  users, 
  onRefresh 
}) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchUser, setSearchUser] = useState('');
  
  // Modals & Action
  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [isDefaulterScanOpen, setIsDefaulterScanOpen] = useState(false);
  const [selectedScanCycle, setSelectedScanCycle] = useState(cycles[0]?.cycle_id || 1);
  const [actionAlert, setActionAlert] = useState(null);

  // New Payment state
  const [paymentForm, setPaymentForm] = useState({
    cycle_id: cycles[0]?.cycle_id || 1,
    user_id: users[3]?.user_id || 4,
    amount_paid: 12500,
    payment_date: new Date().toISOString().split('T')[0]
  });

  const loadPayments = async () => {
    setLoading(true);
    try {
      const data = await api.getPayments();
      setPayments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setActionAlert(null);
    try {
      // Calls stored procedure sp_record_payment(p_cycle, p_user, p_amount, p_date)
      const res = await api.recordPayment(paymentForm);
      setIsRecordOpen(false);
      setActionAlert({ 
        type: 'success', 
        text: `${res.result?.result || 'Payment successfully recorded!'} (trg_auto_penalty evaluated)` 
      });
      loadPayments();
      onRefresh();
    } catch (err) {
      setActionAlert({ type: 'error', text: err.message });
    }
  };

  const handleRunDefaulterScan = async (e) => {
    e.preventDefault();
    setActionAlert(null);
    try {
      // Calls stored procedure sp_mark_defaulters(p_cycle)
      const res = await api.markDefaulters(selectedScanCycle);
      setIsDefaulterScanOpen(false);
      setActionAlert({ 
        type: 'success', 
        text: `Defaulter cursor executed: ${res.result?.members_marked_defaulter || 0} members marked as defaulted and notifications dispatched!` 
      });
      loadPayments();
      onRefresh();
    } catch (err) {
      setActionAlert({ type: 'error', text: err.message });
    }
  };

  const filteredPayments = payments.filter(p => {
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
    const matchesSearch = !searchUser || p.user_name.toLowerCase().includes(searchUser.toLowerCase()) || p.group_name.toLowerCase().includes(searchUser.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-400" />
            Installment Payments & Ledger
          </h1>
          <p className="text-xs text-slate-400">
            Recorded via <code className="text-emerald-400 font-mono">sp_record_payment</code> with automated penalty calculation via <code className="text-emerald-400 font-mono">trg_auto_penalty</code>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsDefaulterScanOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold transition"
          >
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span>Scan Defaulters (Cursor sp)</span>
          </button>
          <button
            onClick={() => setIsRecordOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-600/20"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionAlert && (
        <div className={`p-4 rounded-xl text-xs flex items-center justify-between gap-3 border animate-in fade-in ${
          actionAlert.type === 'success' 
            ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200' 
            : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            {actionAlert.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
            <span className="font-semibold">{actionAlert.text}</span>
          </div>
          <button onClick={() => setActionAlert(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search member or group..."
            value={searchUser}
            onChange={(e) => setSearchUser(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs w-full sm:w-auto overflow-x-auto">
          {['all', 'paid', 'late', 'defaulted'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1 rounded-lg capitalize font-medium transition ${
                filterStatus === status 
                  ? 'bg-emerald-600 text-white font-bold' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950/70 border-b border-slate-800 text-[11px] text-slate-400 uppercase font-semibold">
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Member</th>
                <th className="py-3 px-4">Group & Cycle</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Payment Date</th>
                <th className="py-3 px-4">Amount Paid</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Penalty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredPayments.map((p) => (
                <tr key={p.payment_id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-4 font-mono text-slate-500">#{p.payment_id}</td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-white">{p.user_name}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-slate-200">{p.group_name}</div>
                    <div className="text-[10px] text-slate-500">Cycle #{p.cycle_id} (Month {p.month_number})</div>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-400">{p.cycle_date}</td>
                  <td className="py-3 px-4 font-mono text-slate-400">{p.payment_date}</td>
                  <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                    ₹{Number(p.amount_paid).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      p.status === 'paid'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : p.status === 'late'
                          ? 'bg-amber-950 text-amber-400 border border-amber-800'
                          : 'bg-rose-950 text-rose-400 border border-rose-800'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono">
                    {p.penalty_amount > 0 ? (
                      <span className="text-rose-400 font-bold">
                        ₹{Number(p.penalty_amount).toLocaleString('en-IN')}
                      </span>
                    ) : (
                      <span className="text-slate-500">₹0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Record Payment */}
      {isRecordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-400" /> Record Member Payment
              </h2>
              <button onClick={() => setIsRecordOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleRecordPayment} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Select Cycle</label>
                <select
                  value={paymentForm.cycle_id}
                  onChange={(e) => setPaymentForm({ ...paymentForm, cycle_id: parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                >
                  {cycles.map((c) => (
                    <option key={c.cycle_id} value={c.cycle_id}>
                      #{c.cycle_id} • {c.group_name} (M#{c.month_number} - Due {c.cycle_date})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Select Member</label>
                <select
                  value={paymentForm.user_id}
                  onChange={(e) => setPaymentForm({ ...paymentForm, user_id: parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                >
                  {users.filter(u => u.role === 'member').map((u) => (
                    <option key={u.user_id} value={u.user_id}>
                      {u.name} (ID #{u.user_id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    step="500"
                    required
                    value={paymentForm.amount_paid}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount_paid: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Payment Date</label>
                  <input
                    type="date"
                    required
                    value={paymentForm.payment_date}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <span className="font-semibold text-slate-300 block">Trigger Automation (trg_auto_penalty):</span>
                <span>If payment date exceeds cycle due date, the trigger invokes <code className="text-emerald-400">fn_calc_penalty</code>:</span>
                <div className="font-mono text-emerald-400">2% flat penalty + ₹10 per day late</div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRecordOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Defaulter Cursor Scan */}
      {isDefaulterScanOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-400" /> Run Defaulters Scan
              </h2>
              <button onClick={() => setIsDefaulterScanOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleRunDefaulterScan} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Target Cycle to Audit</label>
                <select
                  value={selectedScanCycle}
                  onChange={(e) => setSelectedScanCycle(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                >
                  {cycles.map((c) => (
                    <option key={c.cycle_id} value={c.cycle_id}>
                      #{c.cycle_id} • {c.group_name} (M#{c.month_number} - Status: {c.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1.5">
                <span className="font-semibold text-slate-300 block">Behind the Scenes (DBMS Logic):</span>
                <p>
                  Executes stored procedure <code className="text-emerald-400 font-mono">sp_mark_defaulters</code> using a SQL <strong>CURSOR</strong>:
                </p>
                <ul className="list-disc pl-4 space-y-1 text-slate-400">
                  <li>Loops through all active group members missing payment for this cycle</li>
                  <li>Inserts payment with 'defaulted' status</li>
                  <li>Fires <code className="text-amber-400 font-mono">trg_flag_defaulter</code> which records entry in Defaulters</li>
                  <li>Fires <code className="text-amber-400 font-mono">trg_notify_defaulter</code> which dispatches warning notification</li>
                  <li>Excludes member if &ge; 2 pending defaults</li>
                </ul>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDefaulterScanOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl"
                >
                  Execute Cursor Scan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
