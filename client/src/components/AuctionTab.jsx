import React, { useState, useEffect } from 'react';
import { 
  Gavel, 
  Flame, 
  Trophy, 
  DollarSign, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Users, 
  ShieldCheck, 
  Sparkles,
  ArrowRight,
  TrendingDown,
  RefreshCw,
  Send
} from 'lucide-react';
import { api } from '../api';

export default function AuctionTab({ 
  cycles, 
  selectedCycleId, 
  onSelectCycle, 
  users, 
  currentPersona,
  onRefresh 
}) {
  const [activeCycleId, setActiveCycleId] = useState(selectedCycleId || cycles[0]?.cycle_id || 1);
  const [cycleData, setCycleData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [bidAmount, setBidAmount] = useState('');
  const [bidUserId, setBidUserId] = useState(currentPersona?.user_id || 4);
  const [actionAlert, setActionAlert] = useState(null);
  const [closedPayoutSummary, setClosedPayoutSummary] = useState(null);

  useEffect(() => {
    if (selectedCycleId) {
      setActiveCycleId(selectedCycleId);
    }
  }, [selectedCycleId]);

  useEffect(() => {
    if (activeCycleId) {
      loadCycleDetails(activeCycleId);
    }
  }, [activeCycleId]);

  useEffect(() => {
    if (currentPersona?.user_id) {
      setBidUserId(currentPersona.user_id);
    }
  }, [currentPersona]);

  const loadCycleDetails = async (id) => {
    setLoading(true);
    setActionAlert(null);
    try {
      const data = await api.getCycleById(id);
      setCycleData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceBid = async (e) => {
    e.preventDefault();
    if (!bidAmount) return;
    setActionAlert(null);
    try {
      // Calls stored procedure sp_place_bid(cycle_id, user_id, bid_amount)
      const res = await api.placeBid(activeCycleId, bidUserId, parseFloat(bidAmount));
      setActionAlert({ type: 'success', text: res.message || 'Bid successfully recorded in database!' });
      setBidAmount('');
      loadCycleDetails(activeCycleId);
      onRefresh();
    } catch (err) {
      setActionAlert({ type: 'error', text: err.message });
    }
  };

  const handleCloseAuction = async () => {
    if (!window.confirm('Are you sure you want to CLOSE this auction cycle? This will execute an atomic DBMS transaction to declare the winner and disburse payouts.')) {
      return;
    }
    setActionAlert(null);
    try {
      // Calls stored procedure sp_close_cycle(cycle_id)
      const res = await api.closeCycle(activeCycleId);
      setClosedPayoutSummary(res.payoutSummary);
      setActionAlert({ 
        type: 'success', 
        text: `Auction closed successfully! Winner awarded: ${res.payoutSummary?.amount_disbursed} payout, dividend per member: ${res.payoutSummary?.dividend_per_member}` 
      });
      loadCycleDetails(activeCycleId);
      onRefresh();
    } catch (err) {
      setActionAlert({ type: 'error', text: err.message });
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await api.updateCycleStatus(activeCycleId, newStatus);
      setActionAlert({ type: 'success', text: `Cycle status changed to '${newStatus}'` });
      loadCycleDetails(activeCycleId);
      onRefresh();
    } catch (err) {
      setActionAlert({ type: 'error', text: err.message });
    }
  };

  const currentCycle = cycleData?.cycle;
  const bids = cycleData?.bids || [];
  const eligibleMembers = cycleData?.eligibleMembers || [];
  const highestBid = bids[0];

  const maxAllowedBid = currentCycle?.total_amount ? currentCycle.total_amount * 0.30 : 0;

  return (
    <div className="space-y-6">
      {/* Top Header & Cycle Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase tracking-wider">
              Live Reverse Auction Arena
            </span>
            <span className="text-slate-400 text-xs">Lowest Net Payout / Highest Discount Bidding</span>
          </div>
          <h1 className="text-xl font-black text-white mt-1 tracking-tight flex items-center gap-2">
            <Gavel className="w-5 h-5 text-amber-400" />
            Auction Cycle Workbench
          </h1>
        </div>

        {/* Cycle Dropdown */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-slate-400">Select Cycle:</label>
          <select
            value={activeCycleId}
            onChange={(e) => setActiveCycleId(parseInt(e.target.value, 10))}
            className="bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-emerald-500"
          >
            {cycles.map((c) => (
              <option key={c.cycle_id} value={c.cycle_id}>
                #{c.cycle_id} • {c.group_name} (M#{c.month_number} - {c.status})
              </option>
            ))}
          </select>
          <button
            onClick={() => loadCycleDetails(activeCycleId)}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
            title="Refresh Cycle"
          >
            <RefreshCw className="w-4 h-4" />
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
            {actionAlert.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
            <span className="font-semibold">{actionAlert.text}</span>
          </div>
          <button onClick={() => setActionAlert(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-slate-400 text-xs">Loading cycle arena...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Bidding Arena & Current Standing (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Cycle Status Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-lg font-black text-white">{currentCycle?.group_name}</h2>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                      Cycle Month #{currentCycle?.month_number}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Cycle Date: <strong className="text-slate-200 font-mono">{currentCycle?.cycle_date}</strong> • Total Chit Fund: <strong className="text-emerald-400 font-mono">₹{Number(currentCycle?.total_amount).toLocaleString('en-IN')}</strong>
                  </div>
                </div>

                {/* Status Switcher & Action */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Status:</span>
                  <select
                    value={currentCycle?.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-xl border focus:outline-none ${
                      currentCycle?.status === 'bidding'
                        ? 'bg-amber-950 text-amber-400 border-amber-800'
                        : currentCycle?.status === 'closed'
                          ? 'bg-slate-800 text-slate-400 border-slate-700'
                          : 'bg-emerald-950 text-emerald-400 border-emerald-800'
                    }`}
                  >
                    <option value="collection">collection</option>
                    <option value="bidding">bidding</option>
                    <option value="closed">closed</option>
                  </select>

                  {currentCycle?.status === 'bidding' && (
                    <button
                      onClick={handleCloseAuction}
                      className="px-3 py-1.5 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white rounded-xl text-xs font-bold shadow-lg transition flex items-center gap-1.5"
                    >
                      <Trophy className="w-3.5 h-3.5" />
                      <span>Close & Disburse Payout</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Bidding Metrics Highlights */}
              <div className="mt-5 grid grid-cols-3 gap-3">
                <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Leading Bid (Discount)</span>
                  <div className="text-base font-black text-amber-400 font-mono mt-0.5">
                    {highestBid ? `₹${Number(highestBid.bid_amount).toLocaleString('en-IN')}` : 'No Bids'}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {highestBid ? `By ${highestBid.bidder_name}` : 'Awaiting first bid'}
                  </span>
                </div>

                <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Net Payout to Winner</span>
                  <div className="text-base font-black text-emerald-400 font-mono mt-0.5">
                    {highestBid ? `₹${(currentCycle.total_amount - highestBid.bid_amount).toLocaleString('en-IN')}` : `₹${Number(currentCycle?.total_amount).toLocaleString('en-IN')}`}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Pool - Winning Bid
                  </span>
                </div>

                <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Dividend Per Member</span>
                  <div className="text-base font-black text-indigo-400 font-mono mt-0.5">
                    {highestBid ? `₹${(Math.round((highestBid.bid_amount / (currentCycle.max_members || 1)) * 100) / 100).toLocaleString('en-IN')}` : '₹0.00'}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block font-mono">
                    fn_dividend(group, bid)
                  </span>
                </div>
              </div>
            </div>

            {/* If Closed, Show Winner Card */}
            {currentCycle?.status === 'closed' && (
              <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-indigo-950/40 border border-emerald-500/30 rounded-2xl p-5 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                      Cycle Closed & Settled
                    </span>
                    <h3 className="text-sm font-bold text-white">
                      Winner: <span className="text-amber-400">{currentCycle.winner_name || 'Declared Winner'}</span>
                    </h3>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-500 text-[10px]">Winning Bid:</span>
                    <div className="font-mono font-bold text-white">₹{Number(currentCycle.winning_bid_amount).toLocaleString('en-IN')}</div>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px]">Disbursed Payout:</span>
                    <div className="font-mono font-bold text-emerald-400">₹{Number(currentCycle.amount_disbursed).toLocaleString('en-IN')}</div>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px]">Member Dividend:</span>
                    <div className="font-mono font-bold text-indigo-400">₹{Number(currentCycle.dividend_per_member).toLocaleString('en-IN')}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Bids Leaderboard Table (vw_bid_ranking) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-400" />
                    Bids Leaderboard & Ranking (vw_bid_ranking)
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Ranked via SQL Window Function: <code className="text-emerald-400 font-mono">RANK() OVER (ORDER BY bid_amount DESC)</code>
                  </p>
                </div>
                <span className="text-xs font-mono bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg">
                  {bids.length} Bids Placed
                </span>
              </div>

              {bids.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No bids have been placed for this cycle yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-[11px] text-slate-500 uppercase">
                        <th className="pb-2">Rank</th>
                        <th className="pb-2">Member</th>
                        <th className="pb-2">Bid Discount Amount</th>
                        <th className="pb-2">Bid Timestamp</th>
                        <th className="pb-2">Outcome</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {bids.map((b) => (
                        <tr key={b.bid_id} className={`hover:bg-slate-950/40 transition ${b.bid_rank === 1 ? 'bg-amber-950/20' : ''}`}>
                          <td className="py-2.5">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold font-mono text-[11px] ${
                              b.bid_rank === 1 
                                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30' 
                                : b.bid_rank === 2
                                  ? 'bg-slate-700 text-slate-200'
                                  : 'text-slate-500'
                            }`}>
                              #{b.bid_rank}
                            </span>
                          </td>
                          <td className="py-2.5 font-semibold text-white">
                            {b.bidder_name}
                          </td>
                          <td className="py-2.5 font-mono font-bold text-amber-400 text-sm">
                            ₹{Number(b.bid_amount).toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 font-mono text-slate-400 text-[11px]">
                            {b.bid_time}
                          </td>
                          <td className="py-2.5">
                            {b.is_winner ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold">
                                WINNER ✓
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500">Active</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Place Bid Desk & Enforced Constraints */}
          <div className="space-y-6">
            {/* Place Bid Form */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
                <Send className="w-4 h-4 text-emerald-400" />
                Place Live Bid (sp_place_bid)
              </h3>
              <p className="text-[11px] text-slate-400 mb-4">
                Submit auction bid on behalf of an active member
              </p>

              <form onSubmit={handlePlaceBid} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Bidding Member</label>
                  <select
                    value={bidUserId}
                    onChange={(e) => setBidUserId(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  >
                    {eligibleMembers.map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.name} {m.has_won_payout ? '(Won Payout Already ✗)' : '(Eligible ✓)'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-slate-300 font-semibold">Bid Discount Amount (₹)</label>
                    <span className="text-[10px] text-slate-500">
                      Max: ₹{maxAllowedBid.toLocaleString('en-IN')} (30%)
                    </span>
                  </div>
                  <input
                    type="number"
                    step="100"
                    min="100"
                    max={maxAllowedBid}
                    required
                    placeholder={`e.g. ${highestBid ? Number(highestBid.bid_amount) + 500 : 7000}`}
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={currentCycle?.status !== 'bidding'}
                  className={`w-full py-2.5 rounded-xl font-bold transition flex items-center justify-center gap-2 shadow-lg ${
                    currentCycle?.status === 'bidding'
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Gavel className="w-4 h-4" />
                  <span>Submit Bid to Database</span>
                </button>

                {currentCycle?.status !== 'bidding' && (
                  <p className="text-[11px] text-amber-400/90 text-center">
                    Cycle is in <strong>{currentCycle?.status}</strong> status. Change status to <strong>bidding</strong> above to open bids.
                  </p>
                )}
              </form>

              {/* Enforced Triggers Box */}
              <div className="mt-5 p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-[11px] space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Triggers Validated on INSERT:
                </span>
                <div className="text-slate-300">
                  <strong className="text-amber-400">trg_prevent_repeat_bid:</strong> Rejects if member already won a previous cycle payout.
                </div>
                <div className="text-slate-300">
                  <strong className="text-amber-400">trg_validate_bid:</strong> Validates cycle is in 'bidding', bid &le; 30% of total chit amount, and member is active.
                </div>
              </div>
            </div>

            {/* Member Eligibility Checklist */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-3">
                <Users className="w-4 h-4 text-indigo-400" />
                Group Bidding Eligibility
              </h3>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1 text-xs">
                {eligibleMembers.map((m) => (
                  <div key={m.user_id} className="flex items-center justify-between p-2 rounded-lg bg-slate-950/50 border border-slate-800/80">
                    <span className="font-medium text-slate-300">{m.name}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      m.has_won_payout 
                        ? 'bg-rose-950 text-rose-400' 
                        : m.has_bid
                          ? 'bg-amber-950 text-amber-400'
                          : 'bg-emerald-950 text-emerald-400'
                    }`}>
                      {m.has_won_payout ? 'Won (Ineligible)' : m.has_bid ? 'Bid Placed' : 'Eligible'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
