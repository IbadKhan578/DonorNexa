import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import AppLayout from '../../components/layout/AppLayout';

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = {};
      if (roleFilter) params.role = roleFilter;
      const res = await api.get('/admin/users', { params });
      setUsers(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBlock = async (userId, currentStatus, email) => {
    const action = currentStatus === 'active' ? 'block' : 'unblock';
    if (!window.confirm(`Are you sure you want to ${action} user ${email}?`)) return;

    try {
      await api.patch(`/admin/users/${userId}/status`, {
        status: action === 'block' ? 'blocked' : 'active',
      });
      setMessage(`User ${email} status set to ${action === 'block' ? 'BLOCKED' : 'ACTIVE'}.`);
      fetchUsers();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to update user status.');
    }
  };

  return (
    <AppLayout title="User Management">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-serif font-bold text-sand-900">User Governance & Access Control</h2>
            <p className="text-xs text-sand-600 mt-1">
              Manage platform accounts across all roles (Donors, Hospitals, Administrators).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase text-sand-500">Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="input-field text-xs py-1.5 px-3 max-w-xs bg-white"
            >
              <option value="">All Roles</option>
              <option value="donor">Donors</option>
              <option value="hospital">Hospitals</option>
              <option value="admin">Administrators</option>
            </select>
          </div>
        </div>

        {message && (
          <div className="p-3 bg-teal-50 border border-teal-200 text-teal-800 rounded text-xs">
            ✓ {message}
          </div>
        )}

        <div className="card bg-white p-0 overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-sans">
              <thead>
                <tr className="bg-sand-100 border-b border-sand-200 text-sand-600 font-mono uppercase text-[11px]">
                  <th className="py-3 px-4">User ID</th>
                  <th className="py-3 px-4">Account Email</th>
                  <th className="py-3 px-4">Assigned Role</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4">Registered (PKT)</th>
                  <th className="py-3 px-4 text-right">Access Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-100">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-sand-500 font-mono">
                      Loading user accounts...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-sand-500">
                      No users match the selected role.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-sand-50">
                      <td className="py-3 px-4 font-mono font-bold text-sand-700">#{u.id}</td>
                      <td className="py-3 px-4 font-medium text-sand-900">{u.email}</td>
                      <td className="py-3 px-4 font-mono uppercase text-[11px]">
                        <span className={`px-2 py-0.5 rounded font-semibold ${
                          u.role === 'admin'
                            ? 'bg-purple-50 text-purple-800 border border-purple-200'
                            : u.role === 'hospital'
                            ? 'bg-teal-50 text-teal-800 border border-teal-200'
                            : 'bg-sand-100 text-sand-800'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border font-semibold ${
                          u.status === 'active'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-red-50 text-red-800 border-red-200'
                        }`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-sand-500 text-[11px]">
                        {u.created_at_pkt || '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {u.role !== 'admin' && (
                          <button
                            onClick={() => handleToggleBlock(u.id, u.status, u.email)}
                            className={`text-[11px] font-mono py-1 px-3 rounded border transition-colors ${
                              u.status === 'active'
                                ? 'border-red-200 text-red-700 hover:bg-red-50'
                                : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                            }`}
                          >
                            {u.status === 'active' ? 'Block Access' : 'Unblock Access'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
