import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Database, 
  Bell, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  RefreshCw,
  ExternalLink
} from 'lucide-react';

export default function Navbar({
  activeTab,
  setActiveTab,
  dbStatus,
  notifications,
  unreadCount,
  onOpenNotifications,
  currentUser,
  onLogout,
  onRefresh
}) {
  const [showDbInfo, setShowDbInfo] = useState(false);
  const userRole = String(currentUser?.role || '').toLowerCase().trim();
  

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      {/* Top Banner - PES Academic Credit */}
      <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-indigo-950/80 border-b border-emerald-900/40 px-4 py-1.5 text-xs text-slate-300 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded border border-emerald-500/30 uppercase tracking-wider text-[10px]">
            PES University • DBMS Mini Project
          </span>
          <span className="text-slate-400 font-medium">
            Group 10 (Section H)
          </span>
        </div>
        <div className="flex items-center gap-3 text-slate-400">
          <span><strong className="text-emerald-400">Shasank SK</strong> (PES2UG24CS460)</span>
          <span>•</span>
          <span><strong className="text-indigo-400">Samartha MS</strong> (PES2UG24CS435)</span>
        </div>
      </div>

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-500/20 border border-emerald-400/30">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-white font-mono">
                CHIT<span className="text-emerald-400">VAULT</span>
              </span>
              <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700 font-mono">
                v1.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Database-Driven Chit Fund & Auction Engine
            </p>
          </div>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center gap-3">
          {/* DB Connection Pill */}
          <div className="relative">
            <button
              onClick={() => setShowDbInfo(!showDbInfo)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 transition"
              title="Click to view database connection status"
            >
              <div className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dbStatus?.success ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${dbStatus?.success ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
              </div>
              <Database className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-mono text-[11px] hidden md:inline">
                {dbStatus?.success ? 'MySQL 8.0 (chitvault)' : 'DB Disconnected'}
              </span>
            </button>

            {/* DB Popover */}
            {showDbInfo && (
              <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-4 text-xs z-50 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-emerald-400" /> Database Status
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${dbStatus?.success ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400'}`}>
                    {dbStatus?.success ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </div>
                <div className="mt-3 space-y-1.5 text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Host:</span>
                    <span className="font-mono text-slate-200">{dbStatus?.config?.host || 'localhost'}:{dbStatus?.config?.port || '3306'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Database:</span>
                    <span className="font-mono text-emerald-400">{dbStatus?.config?.database || 'chitvault'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">User:</span>
                    <span className="font-mono text-slate-200">{dbStatus?.config?.user || 'root'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Engine:</span>
                    <span className="font-mono text-slate-200">MySQL Community Server 8.0</span>
                  </div>
                </div>
                {dbStatus?.tableCounts && (
                  <div className="mt-3 pt-2 border-t border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Loaded Tables:</span>
                    <div className="grid grid-cols-2 gap-1 mt-1 text-[11px]">
                      {dbStatus.tableCounts.slice(0, 8).map(t => (
                        <div key={t.entity} className="flex justify-between bg-slate-800/50 px-2 py-0.5 rounded">
                          <span className="text-slate-400">{t.entity}:</span>
                          <span className="font-mono text-emerald-400 font-bold">{t.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

         {/* Authenticated User */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/60">
            <User className="w-4 h-4 text-emerald-400" />
            <div className="hidden sm:block">
              <span className="font-semibold block text-xs text-emerald-200">
                {currentUser?.name}
              </span>
              <span className="text-[10px] text-emerald-400 uppercase">
                {currentUser?.role}
              </span>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="px-3 py-2 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-800/60 text-rose-300 text-xs font-semibold"
          >
            Logout
          </button>

          {/* Notifications Button */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-emerald-500 text-white font-mono text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"
            title="Refresh All Database Records"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-800/80">
        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2 text-xs font-medium no-scrollbar">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: '📊' },
            { id: 'groups', label: 'Chit Groups', icon: '💰' },
            { id: 'auctions', label: 'Live Auction Arena', icon: '⚡' },
            { id: 'payments', label: 'Payments & Ledger', icon: '💳' },
            { id: 'defaulters', label: 'Defaulters & Settlements', icon: '⚠️' },
            { id: 'members', label: 'Members & KYC', icon: '👥' },
            { id: 'evaluation', label: 'DBMS Evaluation Lab', icon: '🎓', highlight: true }
          ].filter((tab) => {
          if (userRole === 'admin') return true;

  if (userRole === 'organizer') {
    return ['dashboard', 'groups', 'auctions', 'payments', 'defaulters'].includes(tab.id);
  }

  if (userRole === 'member') {
    return ['dashboard', 'groups', 'auctions', 'payments'].includes(tab.id);
  }

  return false;
        })
        .map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg whitespace-nowrap transition-all duration-150 ${
                  isActive
                    ? tab.highlight 
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold shadow-md shadow-emerald-500/20'
                      : 'bg-slate-800 text-emerald-400 font-semibold shadow-sm'
                    : tab.highlight
                      ? 'bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60 border border-emerald-700/50'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.highlight && (
                  <Sparkles className="w-3 h-3 text-emerald-300 animate-pulse ml-0.5" />
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
