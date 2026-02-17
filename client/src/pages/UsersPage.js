import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  ShieldAlert,
  X,
  ChevronDown,
  Trash2,
  Loader2,
  AlertCircle,
  Search,
} from 'lucide-react';
import { useAuth } from '../store/AuthContext';

const ROLE_CONFIG = {
  admin: { label: 'Admin', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', icon: ShieldAlert },
  manager: { label: 'Manager', bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', icon: ShieldCheck },
  agent: { label: 'Agent', bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', icon: Shield },
};

function getInitials(firstName, lastName) {
  const first = firstName ? firstName[0] : '';
  const last = lastName ? lastName[0] : '';
  return (first + last).toUpperCase() || '?';
}

const emptyForm = {
  first_name: '',
  last_name: '',
  email: '',
  password: '',
  role: 'agent',
};

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [search, setSearch] = useState('');
  const [editingRoleId, setEditingRoleId] = useState(null);

  const isAuthorized = currentUser?.role === 'admin' || currentUser?.role === 'manager';

  useEffect(() => {
    if (isAuthorized) {
      fetchUsers();
    }
  }, [isAuthorized]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    if (!form.first_name || !form.email || !form.password) {
      setFormError('First name, email, and password are required');
      return;
    }
    if (form.password.length < 6) {
      setFormError('Password must be at least 6 characters');
      return;
    }
    try {
      setFormSaving(true);
      setFormError('');
      await api.post('/auth/register', form);
      setForm({ ...emptyForm });
      setShowModal(false);
      fetchUsers();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to add user');
    } finally {
      setFormSaving(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.put(`/users/${userId}/role`, { role: newRole });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      setEditingRoleId(null);
    } catch (err) {
      console.error('Failed to update role:', err);
    }
  };

  const handleDeactivate = async (userId) => {
    if (!window.confirm('Are you sure you want to deactivate this user?')) return;
    try {
      await api.delete(`/users/${userId}`);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: 'inactive' } : u))
      );
    } catch (err) {
      console.error('Failed to deactivate user:', err);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[50vh]">
        <AlertCircle className="w-16 h-16 text-red-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-500 text-sm">You must be an admin or manager to view this page.</p>
      </div>
    );
  }

  const filteredUsers = users.filter((u) => {
    if (!search) return true;
    const term = search.toLowerCase();
    const fullName = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
    return (
      fullName.includes(term) ||
      (u.email || '').toLowerCase().includes(term) ||
      (u.role || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-sm text-gray-500">
              {users.length} user{users.length !== 1 ? 's' : ''} total
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setForm({ ...emptyForm });
            setFormError('');
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#8B2500] rounded-lg hover:bg-[#6E1D00] transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users by name, email, or role..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#8B2500]/20 focus:border-[#8B2500] outline-none transition-all"
        />
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4 border-b border-gray-100">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm">{search ? 'No users match your search' : 'No users found'}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-6 py-3">
                    User
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-6 py-3">
                    Email
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-6 py-3">
                    Role
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-6 py-3">
                    Status
                  </th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wide px-6 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((u) => {
                  const roleConfig = ROLE_CONFIG[u.role] || ROLE_CONFIG.agent;
                  const isActive = u.status !== 'inactive';
                  const isSelf = currentUser?.id === u.id;

                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-gray-50 transition-colors ${!isActive ? 'opacity-50' : ''}`}
                    >
                      {/* Avatar + Name */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#8B2500]/10 flex items-center justify-center text-sm font-semibold text-[#8B2500]">
                            {getInitials(u.first_name, u.last_name)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {u.first_name} {u.last_name}
                            </p>
                            {isSelf && (
                              <span className="text-xs text-gray-400">(You)</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">{u.email}</span>
                      </td>

                      {/* Role */}
                      <td className="px-6 py-4">
                        {editingRoleId === u.id ? (
                          <div className="relative">
                            <select
                              value={u.role}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                              onBlur={() => setEditingRoleId(null)}
                              autoFocus
                              className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-[#8B2500]/20 focus:border-[#8B2500] outline-none"
                            >
                              <option value="admin">Admin</option>
                              <option value="manager">Manager</option>
                              <option value="agent">Agent</option>
                            </select>
                          </div>
                        ) : (
                          <button
                            onClick={() => !isSelf && setEditingRoleId(u.id)}
                            disabled={isSelf}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${roleConfig.bg} ${roleConfig.text} ${
                              !isSelf ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
                            } transition-opacity`}
                          >
                            {roleConfig.label}
                            {!isSelf && <ChevronDown className="w-3 h-3" />}
                          </button>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                            isActive ? 'text-green-700' : 'text-gray-500'
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isActive ? 'bg-green-500' : 'bg-gray-400'
                            }`}
                          ></span>
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        {!isSelf && isActive && (
                          <button
                            onClick={() => handleDeactivate(u.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Deactivate
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowModal(false)}
          ></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">Add New User</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {formError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#8B2500]/20 focus:border-[#8B2500] outline-none transition-all"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#8B2500]/20 focus:border-[#8B2500] outline-none transition-all"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#8B2500]/20 focus:border-[#8B2500] outline-none transition-all"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#8B2500]/20 focus:border-[#8B2500] outline-none transition-all"
                  placeholder="Minimum 6 characters"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#8B2500]/20 focus:border-[#8B2500] outline-none transition-all bg-white"
                >
                  <option value="agent">Agent</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddUser}
                disabled={formSaving}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#8B2500] rounded-lg hover:bg-[#6E1D00] disabled:opacity-50 transition-colors"
              >
                {formSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                Add User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
