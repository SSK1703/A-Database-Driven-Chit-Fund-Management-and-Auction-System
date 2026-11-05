import React from 'react';
import { 
  DollarSign, 
  Users, 
  Flame, 
  AlertTriangle, 
  ArrowUpRight, 
  TrendingUp, 
  ShieldAlert, 
  Clock, 
  ChevronRight,
  Gavel,
  CreditCard,
  PlusCircle,
  Activity,
  History
} from 'lucide-react';

export default function DashboardTab({
  dashboardData,
  groups,
  cycles,
  setActiveTab,
  onSelectCycle,
  onOpenNewGroup,
  currentUser
}) {
  const { groups: grpSummary, users: usrSummary, financials, auctions, pendingDefaulters, recentBids, recentAudit } = dashboardData || {};

  const activeAuctions = cycles.filter(c => c.status === 'bidding');
  const userRole = String(currentUser?.role || '').toLowerCase().trim();

if (userRole === 'member') {
  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="bg-gradient-to-r from-slate-900 to-emerald-950/40 border border-slate-800 rounded-2xl p-8">
        <span className="text-xs text-emerald-400 font-bold uppercase">
          Member Dashboard
        </span>

        <h1 className="text-2xl font-black text-white mt-3">
          Welcome, {currentUser?.name}!
        </h1>

        <p className="text-sm text-slate-400 mt-2">
          Welcome to CHITVAULT. Manage your chit fund participation
          and stay updated with your auctions and payments.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            title: 'My Chit Groups',
            description: 'View your enrolled chit groups',
            tab: 'groups',
            icon: '💰'
          },
          {
            title: 'My Payments',
            description: 'View your payment records',
            tab: 'payments',
            icon: '💳'
          },
          {
            title: 'Live Auctions',
            description: 'View available auction information',
            tab: 'auctions',
            icon: '⚡'
          }
        ].map(item => (
          <button
            key={item.tab}
            onClick={() => setActiveTab(item.tab)}
            className="text-left p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 transition"
          >
            <div className="text-2xl">{item.icon}</div>
            <h2 className="text-white font-bold mt-3">{item.title}</h2>
            <p className="text-xs text-slate-400 mt-2">
              {item.description}
            </p>
            <span className="text-emerald-400 text-xs mt-4 block">
              Open →
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Welcome & Quick Action Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
              DBMS Project Live Engine
            </span>
            <span className="text-slate-500 text-xs">•</span>
            <span className="text-slate-400 text-xs">chitvault Database</span>
          </div>
          <h1 className="text-2xl font-black text-white mt-1 tracking-tight">
            Chit Fund & Live Auction Management System
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Fully integrated relational database implementing ACID transactions, stored procedures, triggers, views, and complex queries.
          </p>
        </div>

        {/* Action Shortcuts */}
        <div className="flex flex-wrap items-center gap-2.5">
          {userRole === 'admin' && (
  <button
    onClick={onOpenNewGroup}
    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-emerald-600/20"
  >
    <PlusCircle className="w-4 h-4" />
    <span>Create Group</span>
  </button>
)}
          <button
            onClick={() => setActiveTab('auctions')}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-indigo-600/20"
          >
            <Gavel className="w-4 h-4" />
            <span>Auction Arena</span>
          </button>
          {userRole === 'admin' && (
  <button
    onClick={() => setActiveTab('evaluation')}
    className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 text-xs font-bold rounded-xl transition"
  >
    <span>DBMS Lab (19 Queries)</span>
    <ArrowUpRight className="w-3.5 h-3.5" />
  </button>
)}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Funds Managed */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-emerald-500/40 transition">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Capital Value</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-white font-mono">
            ₹{Number(grpSummary?.total_fund_volume || 0).toLocaleString('en-IN')}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
            <span>Collected: <strong className="text-emerald-400 font-mono">₹{Number(financials?.total_collected || 0).toLocaleString('en-IN')}</strong></span>
            <span>Disbursed: <strong className="text-indigo-400 font-mono">₹{Number(financials?.total_disbursed || 0).toLocaleString('en-IN')}</strong></span>
          </div>
        </div>

        {/* Chit Groups */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-indigo-500/40 transition">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Chit Groups</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-white font-mono">
            {grpSummary?.total_groups || 0}
          </div>
          <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
            <span className="text-emerald-400 font-semibold">{grpSummary?.active_groups || 0} Active</span>
            <span>•</span>
            <span className="text-amber-400 font-semibold">{grpSummary?.upcoming_groups || 0} Upcoming</span>
            <span>•</span>
            <span>{grpSummary?.completed_groups || 0} Done</span>
          </div>
        </div>

        {/* Active Bidding Cycles */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-amber-500/40 transition">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Live Auctions Open</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-400 font-mono flex items-center gap-2">
            {auctions?.active_auctions || 0}
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-sans font-medium">
              Bidding Phase
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
            <span>In Collection: <strong>{auctions?.collection_cycles || 0}</strong></span>
            <span>Closed: <strong>{auctions?.closed_cycles || 0}</strong></span>
          </div>
        </div>

        {/* Defaulters & Dues */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-rose-500/40 transition">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Pending Defaulters</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-rose-400 font-mono">
            {pendingDefaulters || 0}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
            <span>Overdue Dues: <strong className="text-rose-400 font-mono">₹{Number(financials?.pending_defaults_amount || 0).toLocaleString('en-IN')}</strong></span>
            <button 
              onClick={() => setActiveTab('defaulters')}
              className="text-xs text-rose-400 hover:underline font-semibold"
            >
              Resolve →
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Active Groups + Live Auctions Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chit Groups Snapshot */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" /> Chit Groups Overview
              </h2>
              <p className="text-xs text-slate-400">Active and upcoming schemes managed in database</p>
            </div>
            <button
              onClick={() => setActiveTab('groups')}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
            >
              View All Groups <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3.5">
            {groups.slice(0, 3).map((g) => {
              const progress = g.duration_months > 0 ? Math.round((g.cycles_completed / g.duration_months) * 100) : 0;
              return (
                <div 
                  key={g.group_id}
                  className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{g.group_name}</span>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                          g.status === 'active' 
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' 
                            : 'bg-amber-950 text-amber-400 border border-amber-800'
                        }`}>
                          {g.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        Organizer: <span className="text-slate-300">{g.organizer}</span> • Started: <span className="font-mono text-slate-300">{g.start_date}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-bold text-emerald-400 font-mono">
                        ₹{Number(g.total_amount).toLocaleString('en-IN')}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        ₹{Number(g.monthly_installment).toLocaleString('en-IN')}/mo
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Cycle {g.cycles_completed} of {g.duration_months} completed</span>
                      <span className="font-mono font-bold text-slate-300">{progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-900">
                    <span className="flex items-center gap-1">
                      <span>Members:</span>
                      <strong className="text-slate-200 font-mono">{g.current_members} / {g.max_members}</strong>
                    </span>
                    <button
                      onClick={() => setActiveTab('groups')}
                      className="text-emerald-400 hover:text-emerald-300 font-medium"
                    >
                      Manage Group →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Auctions & Recent Bids Stream */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-400" /> Live Auctions
              </h2>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono font-bold">
                {activeAuctions.length} Open
              </span>
            </div>

            {activeAuctions.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                No cycles currently in bidding status.
              </div>
            ) : (
              <div className="space-y-3">
                {activeAuctions.slice(0, 2).map((c) => (
                  <div 
                    key={c.cycle_id}
                    className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-600/30 hover:border-amber-500/50 transition cursor-pointer"
                    onClick={() => {
                      onSelectCycle(c.cycle_id);
                      setActiveTab('auctions');
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-white text-xs">{c.group_name}</div>
                        <div className="text-[11px] text-amber-300 font-medium mt-0.5">
                          Cycle {c.month_number} • Date: {c.cycle_date}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-bold uppercase tracking-wider animate-pulse">
                        Bidding
                      </span>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between text-xs pt-2 border-t border-amber-900/40">
                      <span className="text-slate-400">Total Bids: <strong className="text-white font-mono">{c.total_bids}</strong></span>
                      <span className="text-amber-400 font-bold font-mono">
                        High: ₹{Number(c.current_highest_bid || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recent Bids Feed */}
            <div className="mt-5 pt-4 border-t border-slate-800">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-400" /> Live Bid Activity
              </h3>
              <div className="space-y-2">
                {recentBids?.slice(0, 3).map((b) => (
                  <div key={b.bid_id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-950/40 border border-slate-800/80">
                    <div>
                      <span className="font-medium text-slate-200">{b.bidder_name}</span>
                      <span className="text-[10px] text-slate-500 block">{b.group_name} • C#{b.cycle_id}</span>
                    </div>
                    <span className="font-mono font-bold text-emerald-400">
                      ₹{Number(b.bid_amount).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Audit Log Peek */}
          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-slate-500" />
              Audit Triggers Active
            </span>
            <button 
              onClick={() => setActiveTab('evaluation')}
              className="text-emerald-400 hover:underline font-semibold"
            >
              Inspect Audit Log →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
