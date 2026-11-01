import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  FileText, 
  Check, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  Search,
  Upload,
  RefreshCw,
  Phone,
  Mail,
  MapPin
} from 'lucide-react';
import { api } from '../api';

export default function MembersTab({ users, onRefresh }) {
  const [kycDocs, setKycDocs] = useState([]);
  const [loadingKyc, setLoadingKyc] = useState(false);
  const [filterRole, setFilterRole] = useState('all');
  const [searchMember, setSearchMember] = useState('');
  const [actionAlert, setActionAlert] = useState(null);

  // Modals
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isSubmitKycOpen, setIsSubmitKycOpen] = useState(false);

  // Form states
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    phone: '',
    city: 'Bengaluru',
    role: 'member'
  });

  const [newKyc, setNewKyc] = useState({
    user_id: users.find(u => !u.kyc_verified)?.user_id || users[0]?.user_id || 4,
    doc_type: 'Aadhar',
    doc_number: ''
  });

  const loadKyc = async () => {
    setLoadingKyc(true);
    try {
      const data = await api.getKycDocs();
      setKycDocs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingKyc(false);
    }
  };

  useEffect(() => {
    loadKyc();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setActionAlert(null);
    try {
      const res = await api.createUser(newUser);
      setIsAddUserOpen(false);
      setActionAlert({ type: 'success', text: `User ${newUser.name} created successfully!` });
      setNewUser({ name: '', email: '', phone: '', city: 'Bengaluru', role: 'member' });
      onRefresh();
    } catch (err) {
      setActionAlert({ type: 'error', text: err.message });
    }
  };

  const handleKycAction = async (docId, newStatus) => {
    setActionAlert(null);
    try {
      const res = await api.updateKycStatus(docId, newStatus);
      setActionAlert({ 
        type: 'success', 
        text: `Document status changed to '${newStatus}'. If verified, Users.kyc_verified set to TRUE automatically!` 
      });
      loadKyc();
      onRefresh();
    } catch (err) {
      setActionAlert({ type: 'error', text: err.message });
    }
  };

  const handleSubmitKyc = async (e) => {
    e.preventDefault();
    setActionAlert(null);
    try {
      await api.submitKyc(newKyc);
      setIsSubmitKycOpen(false);
      setActionAlert({ type: 'success', text: 'KYC Document submitted for verification.' });
      setNewKyc({ ...newKyc, doc_number: '' });
      loadKyc();
      onRefresh();
    } catch (err) {
      setActionAlert({ type: 'error', text: err.message });
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    const matchesSearch = !searchMember || u.name.toLowerCase().includes(searchMember.toLowerCase()) || u.phone.includes(searchMember);
    return matchesRole && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            Users & KYC Verification Desk
          </h1>
          <p className="text-xs text-slate-400">
            Audit identity records and member credit risk levels (<code className="text-emerald-400 font-mono">fn_risk_level</code>)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsSubmitKycOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition"
          >
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>Upload KYC Doc</span>
          </button>
          <button
            onClick={() => setIsAddUserOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-600/20"
          >
            <UserPlus className="w-4 h-4" />
            <span>Register User</span>
          </button>
        </div>
      </div>

      {/* Action Alert */}
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

      {/* KYC Documents Approval Queue */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> KYC Verification Queue
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Approving automatically updates <code className="text-emerald-400 font-mono">Users.kyc_verified = TRUE</code> required by <code className="text-emerald-400 font-mono">sp_add_member</code>
            </p>
          </div>
          <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg font-mono">
            {kycDocs.filter(d => d.verified_status === 'pending').length} Pending Review
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950/70 border-b border-slate-800 text-[11px] text-slate-400 uppercase font-semibold">
                <th className="py-2.5 px-3">Doc ID</th>
                <th className="py-2.5 px-3">User</th>
                <th className="py-2.5 px-3">Document Type</th>
                <th className="py-2.5 px-3">ID / Number</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Verification Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {kycDocs.map((doc) => (
                <tr key={doc.doc_id} className="hover:bg-slate-800/40 transition">
                  <td className="py-2.5 px-3 font-mono text-slate-500">#{doc.doc_id}</td>
                  <td className="py-2.5 px-3 font-semibold text-white">
                    {doc.user_name}
                    <span className="text-[10px] text-slate-500 block font-normal">{doc.user_phone}</span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-300 font-medium">{doc.doc_type}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-300">{doc.doc_number}</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      doc.verified_status === 'verified'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : doc.verified_status === 'rejected'
                          ? 'bg-rose-950 text-rose-400 border border-rose-800'
                          : 'bg-amber-950 text-amber-400 border border-amber-800 animate-pulse'
                    }`}>
                      {doc.verified_status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {doc.verified_status === 'pending' ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleKycAction(doc.doc_id, 'verified')}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" /> Approve
                        </button>
                        <button
                          onClick={() => handleKycAction(doc.doc_id, 'rejected')}
                          className="px-2.5 py-1 bg-rose-950 hover:bg-rose-900 text-rose-400 border border-rose-800 rounded-lg text-[11px] font-semibold transition"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-500 italic">Evaluated</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Users Directory */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search user by name or phone..."
              value={searchMember}
              onChange={(e) => setSearchMember(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs">
            {['all', 'member', 'organizer', 'admin'].map((role) => (
              <button
                key={role}
                onClick={() => setFilterRole(role)}
                className={`px-3 py-1 rounded-lg capitalize font-medium transition ${
                  filterRole === role 
                    ? 'bg-emerald-600 text-white font-bold' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950/70 border-b border-slate-800 text-[11px] text-slate-400 uppercase font-semibold">
                <th className="py-3 px-4">User ID</th>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">City</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">KYC Status</th>
                <th className="py-3 px-4">Risk Level (fn_risk_level)</th>
                <th className="py-3 px-4">Chits Enrolled</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredUsers.map((u) => (
                <tr key={u.user_id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-4 font-mono text-slate-500">#{u.user_id}</td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-white">{u.name}</span>
                    <span className="text-[10px] text-slate-500 block">{u.email}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      u.role === 'admin'
                        ? 'bg-purple-950 text-purple-300 border border-purple-800'
                        : u.role === 'organizer'
                          ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                          : 'bg-slate-800 text-slate-300'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-300">{u.city || 'Bengaluru'}</td>
                  <td className="py-3 px-4 font-mono text-slate-400">{u.phone}</td>
                  <td className="py-3 px-4">
                    {u.kyc_verified ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold flex items-center gap-1 w-fit">
                        <Check className="w-3 h-3" /> Verified
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-amber-950 text-amber-400 border border-amber-800 text-[10px] font-bold flex items-center gap-1 w-fit">
                        <AlertCircle className="w-3 h-3" /> Unverified
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                      u.risk_level === 'LOW'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : u.risk_level === 'MEDIUM'
                          ? 'bg-amber-950 text-amber-400 border border-amber-800'
                          : 'bg-rose-950 text-rose-400 border border-rose-800'
                    }`}>
                      {u.risk_level || 'LOW'}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-300 font-bold">
                    {u.groups_joined || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Register User */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-400" /> Register User
              </h2>
              <button onClick={() => setIsAddUserOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateUser} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Anand R"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Email</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. anand@mail.com"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Phone Number</label>
                  <input
                    type="text"
                    required
                    minLength={10}
                    placeholder="e.g. 9000000012"
                    value={newUser.phone}
                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-slate-500">Constraint: &ge; 10 digits</span>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={newUser.city}
                    onChange={(e) => setNewUser({ ...newUser, city: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="member">Member</option>
                  <option value="organizer">Organizer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl"
                >
                  Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Submit KYC Document */}
      {isSubmitKycOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-emerald-400" /> Submit KYC Document
              </h2>
              <button onClick={() => setIsSubmitKycOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSubmitKyc} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">User</label>
                <select
                  value={newKyc.user_id}
                  onChange={(e) => setNewKyc({ ...newKyc, user_id: parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                >
                  {users.map((u) => (
                    <option key={u.user_id} value={u.user_id}>
                      {u.name} ({u.kyc_verified ? 'Already Verified' : 'Pending Verification'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Doc Type</label>
                  <select
                    value={newKyc.doc_type}
                    onChange={(e) => setNewKyc({ ...newKyc, doc_type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Aadhar">Aadhar</option>
                    <option value="PAN">PAN</option>
                    <option value="Passport">Passport</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Doc Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 6666-7777-8888"
                    value={newKyc.doc_number}
                    onChange={(e) => setNewKyc({ ...newKyc, doc_number: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSubmitKycOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl"
                >
                  Upload & Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
