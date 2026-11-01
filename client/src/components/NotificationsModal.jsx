import React, { useState } from 'react';
import { X, Search, Bell, Check, Award, AlertTriangle, Clock, Mail } from 'lucide-react';
import { api } from '../api';

export default function NotificationsModal({ isOpen, onClose, notifications, onRefresh }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);

  if (!isOpen) return null;

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    try {
      const res = await api.searchNotifications(searchTerm.trim());
      setSearchResults(res);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const displayList = searchResults !== null ? searchResults : notifications;

  const getIcon = (type) => {
    switch (type) {
      case 'payout':
        return <Award className="w-4 h-4 text-amber-400" />;
      case 'default':
        return <AlertTriangle className="w-4 h-4 text-rose-400" />;
      case 'auction':
        return <Clock className="w-4 h-4 text-sky-400" />;
      default:
        return <Mail className="w-4 h-4 text-emerald-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">System Notifications</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Full Text Search Box (Demonstrates Q17) */}
        <div className="p-4 bg-slate-950/50 border-b border-slate-800">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Full-Text Search (e.g. +payment +reminder or payout)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition"
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
            {searchResults !== null && (
              <button
                type="button"
                onClick={() => { setSearchResults(null); setSearchTerm(''); }}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs"
              >
                Clear
              </button>
            )}
          </form>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
            <span className="font-mono bg-slate-800 px-1 rounded text-emerald-400">MATCH(message) AGAINST(... IN BOOLEAN MODE)</span>
            <span>demonstrates indexed full-text search.</span>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {displayList.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No notifications found.
            </div>
          ) : (
            displayList.map((n) => (
              <div 
                key={n.notif_id}
                className={`p-3.5 rounded-xl border text-xs transition flex items-start justify-between gap-3 ${
                  n.read_status 
                    ? 'bg-slate-900/60 border-slate-800/80 text-slate-400' 
                    : 'bg-slate-800/80 border-emerald-500/30 text-slate-200 shadow-sm'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 p-1.5 rounded-lg bg-slate-800 border border-slate-700">
                    {getIcon(n.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white capitalize">{n.type || 'General'}</span>
                      {n.user_name && <span className="text-[10px] text-slate-400">• For {n.user_name}</span>}
                    </div>
                    <p className="mt-1 leading-relaxed text-slate-300">{n.message}</p>
                    <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                      {n.sent_at}
                    </span>
                  </div>
                </div>

                {!n.read_status && (
                  <button
                    onClick={() => handleMarkRead(n.notif_id)}
                    className="p-1 rounded bg-slate-700/60 hover:bg-emerald-600/30 text-slate-400 hover:text-emerald-300 transition"
                    title="Mark as read"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
