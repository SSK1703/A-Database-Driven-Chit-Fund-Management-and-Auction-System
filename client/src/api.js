// API Client for ChitVault Backend

const API_BASE = '/api';

export async function fetchJson(endpoint, options = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}: ${res.statusText}`);
  }

  return data;
}

export const api = {
  // DB & System
  getDbStatus: () => fetchJson('/db-status'),
  updateDbConfig: (config) => fetchJson('/db-config', { method: 'POST', body: JSON.stringify(config) }),
  
  // Dashboard
  getDashboard: () => fetchJson('/dashboard'),

  // Groups
  getGroups: () => fetchJson('/groups'),
  getGroupById: (id) => fetchJson(`/groups/${id}`),
  createGroup: (data) => fetchJson('/groups', { method: 'POST', body: JSON.stringify(data) }),
  addMemberToGroup: (groupId, userId) => fetchJson(`/groups/${groupId}/add-member`, { method: 'POST', body: JSON.stringify({ user_id: userId }) }),
  generateCycles: (groupId) => fetchJson(`/groups/${groupId}/generate-cycles`, { method: 'POST' }),
  updateGroupStatus: (groupId, status) => fetchJson(`/groups/${groupId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // Cycles & Bidding
  getCycles: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return fetchJson(`/cycles${qs ? `?${qs}` : ''}`);
  },
  getCycleById: (id) => fetchJson(`/cycles/${id}`),
  updateCycleStatus: (id, status) => fetchJson(`/cycles/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  placeBid: (cycleId, userId, bidAmount) => fetchJson(`/cycles/${cycleId}/bid`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, bid_amount: bidAmount })
  }),
  closeCycle: (cycleId) => fetchJson(`/cycles/${cycleId}/close`, { method: 'POST' }),
  markDefaulters: (cycleId) => fetchJson(`/cycles/${cycleId}/mark-defaulters`, { method: 'POST' }),

  // Payments
  getPayments: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return fetchJson(`/payments${qs ? `?${qs}` : ''}`);
  },
  recordPayment: (data) => fetchJson('/payments', { method: 'POST', body: JSON.stringify(data) }),

  // Defaulters
  getDefaulters: () => fetchJson('/defaulters'),
  settleDefaulter: (defaultId, paymentDate) => fetchJson(`/defaulters/${defaultId}/settle`, {
    method: 'POST',
    body: JSON.stringify({ payment_date: paymentDate })
  }),

  // Users & KYC
  getUsers: () => fetchJson('/users'),
  createUser: (data) => fetchJson('/users', { method: 'POST', body: JSON.stringify(data) }),
  getKycDocs: () => fetchJson('/kyc'),
  submitKyc: (data) => fetchJson('/kyc', { method: 'POST', body: JSON.stringify(data) }),
  updateKycStatus: (id, status) => fetchJson(`/kyc/${id}`, { method: 'PATCH', body: JSON.stringify({ verified_status: status }) }),

  // Notifications & Audit
  getNotifications: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return fetchJson(`/notifications${qs ? `?${qs}` : ''}`);
  },
  searchNotifications: (term) => fetchJson(`/notifications/search?term=${encodeURIComponent(term)}`),
  markNotificationRead: (id) => fetchJson(`/notifications/${id}/read`, { method: 'PATCH' }),
  getAuditLog: () => fetchJson('/audit-log'),

  // DBMS Evaluation
  getViewData: (viewName) => fetchJson(`/views/${viewName}`),
  executeFunction: (fnName, params) => fetchJson('/functions/calculate', { method: 'POST', body: JSON.stringify({ fnName, params }) }),
  getPresetQueries: () => fetchJson('/preset-queries'),
  runPresetQuery: (id) => fetchJson(`/preset-queries/${id}/run`, { method: 'POST' }),
  runCustomQuery: (sql) => fetchJson('/custom-query', { method: 'POST', body: JSON.stringify({ sql }) }),
  runTransactionDemo: (demoType) => fetchJson('/transactions/run-demo', { method: 'POST', body: JSON.stringify({ demoType }) }),
};
