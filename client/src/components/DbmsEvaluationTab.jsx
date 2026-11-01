import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Database, 
  Terminal, 
  Play, 
  Code, 
  Layers, 
  Calculator, 
  GitBranch, 
  Lock, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Table, 
  BookOpen, 
  Search,
  HelpCircle,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { api } from '../api';

export default function DbmsEvaluationTab({ users, groups, cycles }) {
  const [activeSubTab, setActiveSubTab] = useState('queries'); // 'queries' | 'views' | 'functions' | 'transactions' | 'terminal' | 'schema'

  // 1. Preset Queries State
  const [presetQueries, setPresetQueries] = useState([]);
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [queryResult, setQueryResult] = useState(null);
  const [runningQuery, setRunningQuery] = useState(false);

  // 2. Views Explorer State
  const [selectedView, setSelectedView] = useState('vw_group_overview');
  const [viewData, setViewData] = useState([]);
  const [loadingView, setLoadingView] = useState(false);

  // 3. Stored Functions State
  const [selectedFn, setSelectedFn] = useState('fn_member_count');
  const [fnParams, setFnParams] = useState({
    group_id: 1,
    user_id: 4,
    installment: 12500,
    days_late: 3,
    bid_amount: 9500
  });
  const [fnResult, setFnResult] = useState(null);
  const [runningFn, setRunningFn] = useState(false);

  // 4. Transactions Demo State
  const [selectedTxnDemo, setSelectedTxnDemo] = useState('commit');
  const [txnLogs, setTxnLogs] = useState([]);
  const [runningTxn, setRunningTxn] = useState(false);

  // 5. Custom SQL Terminal State
  const [customSql, setCustomSql] = useState('SELECT u.name, u.role, u.city, u.kyc_verified FROM Users u ORDER BY u.user_id;');
  const [terminalResult, setTerminalResult] = useState(null);
  const [runningTerminal, setRunningTerminal] = useState(false);
  const [terminalError, setTerminalError] = useState(null);

  useEffect(() => {
    loadPresetQueries();
    loadViewData('vw_group_overview');
  }, []);

  const loadPresetQueries = async () => {
    try {
      const data = await api.getPresetQueries();
      setPresetQueries(data);
      if (data.length > 0) {
        setSelectedQuery(data[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRunPresetQuery = async (queryItem) => {
    setRunningQuery(true);
    setQueryResult(null);
    try {
      const res = await api.runPresetQuery(queryItem.id);
      setQueryResult(res);
    } catch (err) {
      setQueryResult({ error: err.message });
    } finally {
      setRunningQuery(false);
    }
  };

  const loadViewData = async (viewName) => {
    setSelectedView(viewName);
    setLoadingView(true);
    try {
      const data = await api.getViewData(viewName);
      setViewData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingView(false);
    }
  };

  const handleRunFunction = async (e) => {
    e.preventDefault();
    setRunningFn(true);
    setFnResult(null);
    try {
      const res = await api.executeFunction(selectedFn, fnParams);
      setFnResult(res);
    } catch (err) {
      setFnResult({ error: err.message });
    } finally {
      setRunningFn(false);
    }
  };

  const handleRunTxnDemo = async (type) => {
    setSelectedTxnDemo(type);
    setRunningTxn(true);
    setTxnLogs([]);
    try {
      const res = await api.runTransactionDemo(type);
      setTxnLogs(res.logs || []);
    } catch (err) {
      setTxnLogs([`Error executing transaction: ${err.message}`]);
    } finally {
      setRunningTxn(false);
    }
  };

  const handleRunCustomSql = async (e) => {
    e.preventDefault();
    setRunningTerminal(true);
    setTerminalResult(null);
    setTerminalError(null);
    try {
      const res = await api.runCustomQuery(customSql);
      setTerminalResult(res);
    } catch (err) {
      setTerminalError(err.message);
    } finally {
      setRunningTerminal(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-950/70 via-slate-900 to-indigo-950/70 border border-emerald-500/30 rounded-2xl p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-400" /> DBMS Evaluation Workbench
            </span>
            <span className="text-slate-400 text-xs">• Group 10 Comprehensive Testbed</span>
          </div>
          <h1 className="text-2xl font-black text-white mt-1 tracking-tight">
            Academic SQL & Database Engine Showcase
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
            Live interactive laboratory demonstrating the 19 complex relational queries, 5 database views, 5 stored functions, ACID transactions (COMMIT, ROLLBACK, SAVEPOINT, row locking), and triggers.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 text-xs text-slate-300 font-mono">
          <Database className="w-4 h-4 text-emerald-400" />
          <span>Connected: <strong className="text-emerald-400">chitvault</strong> @ MySQL 8.0</span>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3 text-xs font-semibold">
        {[
          { id: 'queries', label: '19 Select Queries', icon: Code, count: '19' },
          { id: 'views', label: 'Database Views', icon: Layers, count: '5' },
          { id: 'functions', label: 'Stored Functions Bench', icon: Calculator, count: '5' },
          { id: 'transactions', label: 'ACID Transactions (T1-T4)', icon: GitBranch, count: '4' },
          { id: 'terminal', label: 'Interactive SQL Console', icon: Terminal },
          { id: 'schema', label: 'ER & Relational Model', icon: BookOpen }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition ${
                isActive
                  ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* SUB-TAB 1: 19 SELECT QUERIES */}
      {activeSubTab === 'queries' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Query Selection List */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-2 max-h-[750px] overflow-y-auto">
            <div className="px-2 py-1 text-xs font-bold uppercase tracking-wider text-slate-400">
              Select Query from DBMS Syllabus
            </div>
            {presetQueries.map((q) => {
              const isSelected = selectedQuery?.id === q.id;
              return (
                <button
                  key={q.id}
                  onClick={() => {
                    setSelectedQuery(q);
                    handleRunPresetQuery(q);
                  }}
                  className={`w-full text-left p-3 rounded-xl transition border text-xs flex flex-col gap-1 ${
                    isSelected
                      ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-200'
                      : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/50 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold font-mono text-emerald-400">{q.number}: {q.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 uppercase tracking-wider">
                      {q.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-1">{q.description}</p>
                </button>
              );
            })}
          </div>

          {/* Query Details & Results Pane (2 cols) */}
          <div className="lg:col-span-2 space-y-5">
            {selectedQuery && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-emerald-400 text-sm">{selectedQuery.number}</span>
                      <h2 className="text-base font-bold text-white">{selectedQuery.name}</h2>
                      <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold uppercase">
                        {selectedQuery.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{selectedQuery.description}</p>
                  </div>

                  <button
                    onClick={() => handleRunPresetQuery(selectedQuery)}
                    disabled={runningQuery}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>{runningQuery ? 'Executing...' : 'Run Query'}</span>
                  </button>
                </div>

                {/* SQL Code Block */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span className="font-mono text-emerald-400 flex items-center gap-1">
                      <Code className="w-3.5 h-3.5" /> MySQL Statement
                    </span>
                    <span>Ready for evaluation</span>
                  </div>
                  <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-300 overflow-x-auto leading-relaxed selection:bg-emerald-500/30">
                    {selectedQuery.sql}
                  </pre>
                </div>
              </div>
            )}

            {/* Results Display */}
            {queryResult && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <Table className="w-4 h-4 text-emerald-400" />
                      Live Query Results ({queryResult.rowCount} rows)
                    </h3>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Execution: <strong className="text-emerald-400">{queryResult.executionTimeMs} ms</strong>
                    </span>
                  </div>
                </div>

                {queryResult.error ? (
                  <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs">
                    {queryResult.error}
                  </div>
                ) : queryResult.rows && queryResult.rows.length > 0 ? (
                  <div className="overflow-x-auto max-h-80 overflow-y-auto rounded-xl border border-slate-800">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-950 border-b border-slate-800 text-[11px] text-slate-400 font-semibold">
                          {Object.keys(queryResult.rows[0]).map((col) => (
                            <th key={col} className="py-2.5 px-3 whitespace-nowrap">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        {queryResult.rows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/30">
                            {Object.values(row).map((val, cIdx) => (
                              <td key={cIdx} className="py-2 px-3 whitespace-nowrap text-slate-300">
                                {val === null ? <span className="text-slate-600 italic">NULL</span> : String(val)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-500 text-xs">0 rows returned.</div>
                )}

                {/* EXPLAIN Execution Plan Check (Demonstrates indexing) */}
                {queryResult.explain && queryResult.explain.length > 0 && (
                  <div className="pt-3 border-t border-slate-800">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      EXPLAIN Query Execution Plan (Index & Optimization Inspection)
                    </h4>
                    <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-950/60">
                      <table className="w-full text-left text-[11px] font-mono">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-500">
                            <th className="py-1.5 px-2.5">select_type</th>
                            <th className="py-1.5 px-2.5">table</th>
                            <th className="py-1.5 px-2.5">type</th>
                            <th className="py-1.5 px-2.5">possible_keys</th>
                            <th className="py-1.5 px-2.5">key</th>
                            <th className="py-1.5 px-2.5">rows</th>
                            <th className="py-1.5 px-2.5">Extra</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-900 text-slate-300">
                          {queryResult.explain.map((exp, eIdx) => (
                            <tr key={eIdx}>
                              <td className="py-1.5 px-2.5 text-indigo-300">{exp.select_type}</td>
                              <td className="py-1.5 px-2.5">{exp.table}</td>
                              <td className="py-1.5 px-2.5 text-amber-400">{exp.type}</td>
                              <td className="py-1.5 px-2.5 text-slate-400">{exp.possible_keys || 'None'}</td>
                              <td className="py-1.5 px-2.5 text-emerald-400 font-bold">{exp.key || 'None'}</td>
                              <td className="py-1.5 px-2.5">{exp.rows}</td>
                              <td className="py-1.5 px-2.5 text-slate-400">{exp.Extra || 'None'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: DATABASE VIEWS EXPLORER */}
      {activeSubTab === 'views' && (
        <div className="space-y-5">
          {/* View Selector Tabs */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'vw_group_overview', label: 'vw_group_overview', desc: 'Group financial & member aggregations' },
              { id: 'vw_member_payment_summary', label: 'vw_member_payment_summary', desc: 'Member payments, defaults, and penalty totals' },
              { id: 'vw_cycle_results', label: 'vw_cycle_results', desc: 'Auction cycle winners and dividend disbursement' },
              { id: 'vw_defaulter_report', label: 'vw_defaulter_report', desc: 'Defaulter audit records with amounts due' },
              { id: 'vw_bid_ranking', label: 'vw_bid_ranking', desc: 'Bid rankings computed with RANK() OVER window function' }
            ].map((v) => (
              <button
                key={v.id}
                onClick={() => loadViewData(v.id)}
                className={`px-4 py-2.5 rounded-xl text-left border transition text-xs ${
                  selectedView === v.id
                    ? 'bg-emerald-600 text-white font-bold border-emerald-500 shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800'
                }`}
              >
                <div className="font-mono font-bold">{v.label}</div>
                <div className={`text-[10px] ${selectedView === v.id ? 'text-emerald-100' : 'text-slate-500'}`}>{v.desc}</div>
              </button>
            ))}
          </div>

          {/* View Table Display */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <h3 className="font-mono font-bold text-emerald-400 text-sm">
                  SELECT * FROM {selectedView};
                </h3>
                <span className="text-xs text-slate-400">{viewData.length} records retrieved from MySQL view</span>
              </div>
              <button
                onClick={() => loadViewData(selectedView)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Refresh View
              </button>
            </div>

            {loadingView ? (
              <div className="py-12 text-center text-slate-400 text-xs">Querying database view...</div>
            ) : viewData.length > 0 ? (
              <div className="overflow-x-auto max-h-96 overflow-y-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-[11px] text-slate-400">
                      {Object.keys(viewData[0]).map((col) => (
                        <th key={col} className="py-2.5 px-3 whitespace-nowrap">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {viewData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30">
                        {Object.values(row).map((val, cIdx) => (
                          <td key={cIdx} className="py-2 px-3 whitespace-nowrap text-slate-300">
                            {val === null ? <span className="text-slate-600 italic">NULL</span> : String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 text-xs">No records in view.</div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: STORED FUNCTIONS BENCH */}
      {activeSubTab === 'functions' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Function Selector & Inputs */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Calculator className="w-4 h-4 text-emerald-400" />
                Select Stored Function to Execute
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Evaluates compiled MySQL user-defined function logic on the server
              </p>
            </div>

            <div className="space-y-2 text-xs">
              {[
                { id: 'fn_member_count', name: 'fn_member_count(p_group)', desc: 'Returns active member count excluding exited members' },
                { id: 'fn_calc_penalty', name: 'fn_calc_penalty(p_installment, p_days_late)', desc: 'Calculates 2% flat penalty + ₹10 per late day' },
                { id: 'fn_total_paid', name: 'fn_total_paid(p_user, p_group)', desc: 'Sums total installments paid by user for a group' },
                { id: 'fn_dividend', name: 'fn_dividend(p_group, p_bid)', desc: 'Divides winning discount bid equally among group members' },
                { id: 'fn_risk_level', name: 'fn_risk_level(p_user)', desc: 'Classifies risk as LOW, MEDIUM, or HIGH based on defaulters count' }
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFn(f.id)}
                  className={`w-full text-left p-3 rounded-xl border transition ${
                    selectedFn === f.id
                      ? 'bg-emerald-950/60 border-emerald-500/50 text-white font-semibold'
                      : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="font-mono text-emerald-400 font-bold">{f.name}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{f.desc}</div>
                </button>
              ))}
            </div>

            {/* Parameter Inputs */}
            <form onSubmit={handleRunFunction} className="mt-4 pt-4 border-t border-slate-800 space-y-3 text-xs">
              <span className="text-[11px] uppercase font-bold text-slate-400 block tracking-wider">
                Function Parameters
              </span>

              {(selectedFn === 'fn_member_count' || selectedFn === 'fn_total_paid' || selectedFn === 'fn_dividend') && (
                <div>
                  <label className="block text-slate-400 mb-1">Group ID (p_group)</label>
                  <select
                    value={fnParams.group_id}
                    onChange={(e) => setFnParams({ ...fnParams, group_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                  >
                    {groups.map(g => (
                      <option key={g.group_id} value={g.group_id}>
                        #{g.group_id} - {g.group_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {(selectedFn === 'fn_total_paid' || selectedFn === 'fn_risk_level') && (
                <div>
                  <label className="block text-slate-400 mb-1">User ID (p_user)</label>
                  <select
                    value={fnParams.user_id}
                    onChange={(e) => setFnParams({ ...fnParams, user_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                  >
                    {users.map(u => (
                      <option key={u.user_id} value={u.user_id}>
                        #{u.user_id} - {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedFn === 'fn_calc_penalty' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Installment Amount (₹)</label>
                    <input
                      type="number"
                      step="500"
                      value={fnParams.installment}
                      onChange={(e) => setFnParams({ ...fnParams, installment: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Days Late</label>
                    <input
                      type="number"
                      min="0"
                      value={fnParams.days_late}
                      onChange={(e) => setFnParams({ ...fnParams, days_late: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
                    />
                  </div>
                </div>
              )}

              {selectedFn === 'fn_dividend' && (
                <div>
                  <label className="block text-slate-400 mb-1">Winning Bid Amount (₹)</label>
                  <input
                    type="number"
                    step="500"
                    value={fnParams.bid_amount}
                    onChange={(e) => setFnParams({ ...fnParams, bid_amount: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={runningFn}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2 mt-2"
              >
                <Play className="w-4 h-4" />
                <span>{runningFn ? 'Computing...' : `Execute ${selectedFn}`}</span>
              </button>
            </form>
          </div>

          {/* Execution Output Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Function Output & Evaluation Result
              </h2>
              <p className="text-xs text-slate-400 mb-4">
                Result calculated in MySQL and returned as SQL scalar:
              </p>

              {fnResult ? (
                fnResult.error ? (
                  <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs">
                    {fnResult.error}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-6 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                      <span className="text-xs uppercase font-bold text-slate-500 block mb-1">
                        Return Value
                      </span>
                      <div className="text-4xl font-black font-mono text-emerald-400 tracking-tight">
                        {String(fnResult.result)}
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 mt-2 block">
                        Function: {fnResult.function}
                      </span>
                    </div>

                    <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-xs space-y-1.5 font-mono">
                      <div className="text-slate-400">Passed Inputs:</div>
                      {Object.entries(fnResult.inputs || {}).map(([k, v]) => (
                        <div key={k} className="flex justify-between text-slate-300">
                          <span>{k}:</span>
                          <span className="text-emerald-400 font-bold">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              ) : (
                <div className="py-16 text-center text-slate-500 text-xs">
                  Click Execute to test stored function logic.
                </div>
              )}
            </div>

            <div className="mt-4 p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-[11px] text-slate-400">
              <strong className="text-slate-300">Deterministic check:</strong> <code className="text-emerald-400">fn_calc_penalty</code> is marked DETERMINISTIC for fast query caching.
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: ACID TRANSACTIONS (COMMIT, ROLLBACK, SAVEPOINT, ISOLATION) */}
      {activeSubTab === 'transactions' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {[
              { id: 'commit', label: 'T1: COMMIT', title: 'Atomic Payment Settlement', icon: CheckCircle2 },
              { id: 'rollback', label: 'T2: ROLLBACK', title: 'Mistaken Update Undo', icon: RotateCcw },
              { id: 'savepoint', label: 'T3: SAVEPOINT', title: 'Partial Rollback', icon: Layers },
              { id: 'isolation', label: 'T4: ROW LOCKING', title: 'Repeatable Read & Lock', icon: Lock }
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => handleRunTxnDemo(t.id)}
                  disabled={runningTxn}
                  className={`p-4 rounded-xl text-left border transition ${
                    selectedTxnDemo === t.id
                      ? 'bg-emerald-950/70 border-emerald-500 text-white shadow-lg'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5 text-emerald-400 mb-2" />
                  <div className="font-bold text-xs">{t.label}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{t.title}</div>
                </button>
              );
            })}
          </div>

          {/* Live Execution Logs Console */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <h3 className="font-bold text-white text-xs flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                ACID Execution Trace Log ({selectedTxnDemo.toUpperCase()})
              </h3>
              <button
                onClick={() => handleRunTxnDemo(selectedTxnDemo)}
                disabled={runningTxn}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{runningTxn ? 'Executing Txn...' : 'Re-Run Transaction'}</span>
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 min-h-[220px] max-h-[350px] overflow-y-auto space-y-2">
              {txnLogs.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  Select a transaction button above to run live demonstration.
                </div>
              ) : (
                txnLogs.map((log, lIdx) => (
                  <div key={lIdx} className="flex items-start gap-2">
                    <span className="text-emerald-500 select-none">❯</span>
                    <span className={log.includes('COMMIT') ? 'text-emerald-400 font-bold' : log.includes('ROLLBACK') ? 'text-amber-400 font-bold' : 'text-slate-200'}>
                      {log}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: INTERACTIVE SQL CONSOLE */}
      {activeSubTab === 'terminal' && (
        <div className="space-y-4">
          <form onSubmit={handleRunCustomSql} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                Interactive SQL Query Runner
              </h2>
              <span className="text-[11px] text-slate-400 font-mono">Runs directly on chitvault DB</span>
            </div>

            <textarea
              rows={4}
              value={customSql}
              onChange={(e) => setCustomSql(e.target.value)}
              className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl font-mono text-xs text-emerald-300 focus:outline-none focus:border-emerald-500"
              placeholder="Type any SQL query..."
            />

            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {[
                  'SELECT * FROM Users LIMIT 5;',
                  'SELECT * FROM ChitGroups;',
                  'SELECT * FROM Payments WHERE status = "late";',
                  'SHOW TABLES;'
                ].map((sample, sIdx) => (
                  <button
                    key={sIdx}
                    type="button"
                    onClick={() => setCustomSql(sample)}
                    className="text-[10px] bg-slate-800 text-slate-300 px-2 py-1 rounded hover:bg-slate-700 font-mono hidden md:inline-block"
                  >
                    {sample}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={runningTerminal}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg"
              >
                <Play className="w-4 h-4" />
                <span>{runningTerminal ? 'Running...' : 'Execute SQL'}</span>
              </button>
            </div>
          </form>

          {terminalError && (
            <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs font-mono">
              {terminalError}
            </div>
          )}

          {terminalResult && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-white uppercase tracking-wider">Query Output</span>
                <span className="font-mono text-slate-400">
                  {terminalResult.rowCount} rows • <strong className="text-emerald-400">{terminalResult.executionTimeMs} ms</strong>
                </span>
              </div>

              {Array.isArray(terminalResult.result) && terminalResult.result.length > 0 ? (
                <div className="overflow-x-auto max-h-80 overflow-y-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="bg-slate-950 border-b border-slate-800 text-[11px] text-slate-400">
                        {Object.keys(terminalResult.result[0]).map((col) => (
                          <th key={col} className="py-2.5 px-3 whitespace-nowrap">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {terminalResult.result.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/30">
                          {Object.values(row).map((val, cIdx) => (
                            <td key={cIdx} className="py-2 px-3 whitespace-nowrap text-slate-300">
                              {val === null ? <span className="text-slate-600 italic">NULL</span> : String(val)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-950 font-mono text-xs text-emerald-400">
                  Query executed successfully. Rows affected: {terminalResult.rowCount}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 6: SCHEMA & ER RELATIONAL MODEL */}
      {activeSubTab === 'schema' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-400" />
              ChitVault Relational Schema & Table Architecture
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Exact relational model matching Section H Project Specifications
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-mono">
            {[
              {
                table: 'Users',
                pk: 'user_id (INT AI)',
                fields: ['name VARCHAR(100)', 'email VARCHAR(100) UNIQUE', 'phone VARCHAR(15) UNIQUE', 'city VARCHAR(50)', 'role ENUM(organizer,member,admin)', 'kyc_verified BOOLEAN'],
                checks: ['CHAR_LENGTH(phone) >= 10']
              },
              {
                table: 'ChitGroups',
                pk: 'group_id (INT AI)',
                fields: ['group_name VARCHAR(100)', 'organizer_id INT FK -> Users', 'total_amount DECIMAL(12,2)', 'monthly_installment DECIMAL(10,2)', 'duration_months INT', 'max_members INT', 'status ENUM'],
                checks: ['total_amount = monthly_installment * duration_months', 'max_members > 1']
              },
              {
                table: 'GroupMembers',
                pk: 'membership_id (INT AI)',
                fields: ['group_id INT FK -> ChitGroups', 'user_id INT FK -> Users', 'joined_date DATE', 'has_won_payout BOOLEAN', 'slot_status ENUM(active,defaulted,exited)'],
                checks: ['UNIQUE(group_id, user_id)']
              },
              {
                table: 'MonthlyCycles',
                pk: 'cycle_id (INT AI)',
                fields: ['group_id INT FK -> ChitGroups', 'month_number INT', 'cycle_date DATE', 'status ENUM(collection,bidding,closed)', 'total_pool_amount DECIMAL', 'winning_bid_amount DECIMAL'],
                checks: ['UNIQUE(group_id, month_number)']
              },
              {
                table: 'Bids',
                pk: 'bid_id (INT AI)',
                fields: ['cycle_id INT FK -> MonthlyCycles', 'user_id INT FK -> Users', 'bid_amount DECIMAL(10,2)', 'bid_time TIMESTAMP', 'is_winner BOOLEAN'],
                checks: ['UNIQUE(cycle_id, user_id)', 'bid_amount > 0', 'bid_amount <= 30% of total_amount (trigger)']
              },
              {
                table: 'Payouts',
                pk: 'payout_id (INT AI)',
                fields: ['cycle_id INT FK -> MonthlyCycles UNIQUE', 'winner_id INT FK -> Users', 'amount_disbursed DECIMAL(12,2)', 'dividend_per_member DECIMAL(10,2)', 'disbursed_date DATE'],
                checks: ['One payout per cycle']
              },
              {
                table: 'Payments',
                pk: 'payment_id (INT AI)',
                fields: ['cycle_id INT FK -> MonthlyCycles', 'user_id INT FK -> Users', 'amount_paid DECIMAL(10,2)', 'payment_date DATE', 'status ENUM(paid,late,defaulted)', 'penalty_amount DECIMAL'],
                checks: ['UNIQUE(cycle_id, user_id)', 'amount_paid >= 0 AND penalty_amount >= 0']
              },
              {
                table: 'Defaulters',
                pk: 'default_id (INT AI)',
                fields: ['user_id INT FK -> Users', 'group_id INT FK -> ChitGroups', 'cycle_id INT FK -> MonthlyCycles', 'amount_due DECIMAL', 'penalty_applied DECIMAL', 'resolved_status ENUM(pending,resolved)'],
                checks: ['Auto-populated via trg_flag_defaulter']
              },
              {
                table: 'KYCDocuments',
                pk: 'doc_id (INT AI)',
                fields: ['user_id INT FK -> Users', 'doc_type VARCHAR(50)', 'doc_number VARCHAR(50)', 'verified_status ENUM(pending,verified,rejected)', 'uploaded_at TIMESTAMP'],
                checks: ['Updates Users.kyc_verified upon verification']
              },
              {
                table: 'AuditLog',
                pk: 'log_id (INT AI)',
                fields: ['table_name VARCHAR(50)', 'record_id INT', 'action VARCHAR(30)', 'old_value VARCHAR(100)', 'new_value VARCHAR(100)', 'changed_at TIMESTAMP'],
                checks: ['Populated via trg_audit_group_status']
              }
            ].map((tbl) => (
              <div key={tbl.table} className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="font-bold text-white text-sm pb-2 border-b border-slate-800 flex justify-between">
                  <span>{tbl.table}</span>
                  <span className="text-[10px] text-emerald-400">PK: {tbl.pk}</span>
                </div>
                <div className="mt-2.5 space-y-1 text-slate-300 text-[11px]">
                  {tbl.fields.map((f, i) => (
                    <div key={i} className="text-slate-400">• {f}</div>
                  ))}
                </div>
                {tbl.checks && (
                  <div className="mt-3 pt-2 border-t border-slate-900 text-[10px] text-amber-400">
                    Constraints: {tbl.checks.join('; ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
