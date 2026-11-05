"use client";
import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import DashboardTab from './components/DashboardTab';
import ChitGroupsTab from './components/ChitGroupsTab';
import AuctionTab from './components/AuctionTab';
import PaymentsTab from './components/PaymentsTab';
import DefaultersTab from './components/DefaultersTab';
import MembersTab from './components/MembersTab';
import DbmsEvaluationTab from './components/DbmsEvaluationTab';
import NotificationsModal from './components/NotificationsModal';
import {
  api,
  getAuthToken,
  getAuthUser,
  saveAuthToken,
  saveAuthUser,
  clearAuthToken
} from './api';

import LoginScreen from './components/LoginScreen.jsx';
import { Database, ShieldCheck } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [groups, setGroups] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [users, setUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [currentPersona, setCurrentPersona] = useState(null);
  const [selectedCycleId, setSelectedCycleId] = useState(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const handleLogin = async (credentials) => {
  setLoginLoading(true);
  setLoginError('');

  try {
    const result = await api.login(credentials);

    saveAuthToken(result.token);
    saveAuthUser(result.user);

    setCurrentUser(result.user);
    setIsAuthenticated(true);

    await loadAllData();
  } catch (error) {
    setLoginError(error.message);
  } finally {
    setLoginLoading(false);
  }
};

const handleLogout = () => {
  clearAuthToken();

  setCurrentUser(null);
  setCurrentPersona(null);
  setIsAuthenticated(false);

  setDashboardData(null);
  setGroups([]);
  setCycles([]);
  setUsers([]);
  setNotifications([]);
  setLoading(true);
};

  const loadAllData = async () => {
    try {
      const [status, dash, grps, cycs, usrs, notifs] = await Promise.all([
        api.getDbStatus().catch(e => ({ success: false, error: e.message })),
        api.getDashboard().catch(() => null),
        api.getGroups().catch(() => []),
        api.getCycles().catch(() => []),
        api.getUsers().catch(() => []),
        api.getNotifications().catch(() => [])
      ]);

      setDbStatus(status);
      setDashboardData(dash);
      setGroups(grps);
      setCycles(cycs);
      setUsers(usrs);
      setNotifications(notifs);

      if (!currentPersona && usrs.length > 0) {
        setCurrentPersona(usrs[0]); // Default to Admin Rao
      }
    } catch (err) {
      console.error('Error loading initial data:', err);
    } finally {
      setLoading(false);
    }
  };

 useEffect(() => {
  const token = getAuthToken();
  const savedUser = getAuthUser();

  if (token && savedUser) {
    setCurrentUser(savedUser);
    setIsAuthenticated(true);
    loadAllData();
  } else {
    clearAuthToken();
    setLoading(false);
  }
}, []);

  const unreadCount = notifications.filter(n => !n.read_status).length;
  if (!isAuthenticated) {
  return (
    <LoginScreen
      onLogin={handleLogin}
      error={loginError}
      loading={loginLoading}
    />
  );
}

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        dbStatus={dbStatus}
        notifications={notifications}
        unreadCount={unreadCount}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        currentUser={currentUser}
        onLogout={handleLogout}
        onRefresh={loadAllData}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-slate-400">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-mono">Connecting to MySQL chitvault database...</p>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <DashboardTab
              currentUser={currentUser}
                dashboardData={dashboardData}
                groups={groups}
                cycles={cycles}
                setActiveTab={setActiveTab}
                onSelectCycle={(cId) => setSelectedCycleId(cId)}
                onOpenNewGroup={() => setActiveTab('groups')}
              />
            )}

            {activeTab === 'groups' && (
              <ChitGroupsTab
                groups={groups}
                users={users}
                onRefresh={loadAllData}
                onSelectCycle={(cId) => setSelectedCycleId(cId)}
                setActiveTab={setActiveTab}
              />
            )}

            {activeTab === 'auctions' && (
              <AuctionTab
                cycles={cycles}
                selectedCycleId={selectedCycleId}
                onSelectCycle={(cId) => setSelectedCycleId(cId)}
                users={users}
                currentPersona={currentPersona}
                onRefresh={loadAllData}
              />
            )}

            {activeTab === 'payments' && (
              <PaymentsTab
                cycles={cycles}
                users={users}
                onRefresh={loadAllData}
              />
            )}

            {activeTab === 'defaulters' && (
              <DefaultersTab
                onRefresh={loadAllData}
              />
            )}

            {activeTab === 'members' && (
              <MembersTab
                users={users}
                onRefresh={loadAllData}
              />
            )}

            {activeTab === 'evaluation' && (
              <DbmsEvaluationTab
                users={users}
                groups={groups}
                cycles={cycles}
              />
            )}
          </>
        )}
      </main>

      {/* Notifications Drawer */}
      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onRefresh={loadAllData}
      />

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800 bg-slate-900/60 py-6 px-4 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="font-mono font-bold text-slate-200">CHITVAULT</span>
            <span>— A Database-Driven Chit Fund Management and Auction System</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-500 font-mono">
            <span>PES University</span>
            <span>•</span>
            <span>Group 10 (Section H)</span>
            <span>•</span>
            <span className="text-emerald-400 font-semibold">MySQL 8.0 chitvault</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
