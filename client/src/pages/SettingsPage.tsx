import { useEffect, useState } from 'react';
import { User, Shield, Key, Building2 } from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/auth';
import type { User as UserType } from '../types';
import PageHeader from '../components/shared/PageHeader';

type Tab = 'profile' | 'users' | 'rentvine';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState<Tab>('profile');
  const [users, setUsers] = useState<UserType[]>([]);
  const [rentvineConfig, setRentvineConfig] = useState<{ baseUrl: string; isActive: boolean; lastSyncAt?: string } | null>(null);

  // Rentvine form
  const [rvForm, setRvForm] = useState({ apiKey: '', apiSecret: '', baseUrl: 'https://api.rentvine.com' });
  const [rvSaving, setRvSaving] = useState(false);

  useEffect(() => {
    if (tab === 'users' && user?.role === 'ADMIN') loadUsers();
    if (tab === 'rentvine' && user?.role === 'ADMIN') loadRentvineConfig();
  }, [tab]);

  async function loadUsers() {
    try {
      const { data } = await api.get('/auth/users');
      setUsers(data.users);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  }

  async function loadRentvineConfig() {
    try {
      const { data } = await api.get('/rentvine/config');
      setRentvineConfig(data.config);
    } catch (err) {
      console.error('Failed to load config:', err);
    }
  }

  async function saveRentvineConfig(e: React.FormEvent) {
    e.preventDefault();
    setRvSaving(true);
    try {
      await api.post('/rentvine/config', rvForm);
      loadRentvineConfig();
      setRvForm({ apiKey: '', apiSecret: '', baseUrl: 'https://api.rentvine.com' });
    } catch (err) {
      console.error('Failed to save config:', err);
    } finally {
      setRvSaving(false);
    }
  }

  async function updateUserRole(userId: string, role: string) {
    try {
      await api.patch(`/auth/users/${userId}`, { role });
      loadUsers();
    } catch (err) {
      console.error('Failed to update user:', err);
    }
  }

  async function toggleUserActive(userId: string, isActive: boolean) {
    try {
      await api.patch(`/auth/users/${userId}`, { isActive: !isActive });
      loadUsers();
    } catch (err) {
      console.error('Failed to toggle user:', err);
    }
  }

  return (
    <div>
      <PageHeader title="Settings" />

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-48 space-y-1">
          <button onClick={() => setTab('profile')} className={`sidebar-link w-full ${tab === 'profile' ? 'active' : ''}`}>
            <User className="h-4 w-4" /> Profile
          </button>
          {user?.role === 'ADMIN' && (
            <>
              <button onClick={() => setTab('users')} className={`sidebar-link w-full ${tab === 'users' ? 'active' : ''}`}>
                <Shield className="h-4 w-4" /> Users
              </button>
              <button onClick={() => setTab('rentvine')} className={`sidebar-link w-full ${tab === 'rentvine' ? 'active' : ''}`}>
                <Building2 className="h-4 w-4" /> Rentvine API
              </button>
            </>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 max-w-2xl">
          {/* Profile */}
          {tab === 'profile' && (
            <div className="card">
              <div className="card-header"><h3 className="font-semibold">Profile</h3></div>
              <div className="card-body space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">First Name</label>
                    <p className="text-sm text-gray-900">{user?.firstName}</p>
                  </div>
                  <div>
                    <label className="label">Last Name</label>
                    <p className="text-sm text-gray-900">{user?.lastName}</p>
                  </div>
                </div>
                <div>
                  <label className="label">Email</label>
                  <p className="text-sm text-gray-900">{user?.email}</p>
                </div>
                <div>
                  <label className="label">Role</label>
                  <p className="text-sm text-gray-900">{user?.role}</p>
                </div>
              </div>
            </div>
          )}

          {/* Users */}
          {tab === 'users' && user?.role === 'ADMIN' && (
            <div className="card">
              <div className="card-header"><h3 className="font-semibold">Team Members</h3></div>
              <div className="overflow-x-auto">
                <table className="table w-full">
                  <thead>
                    <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td className="font-medium">{u.firstName} {u.lastName}</td>
                        <td className="text-gray-500">{u.email}</td>
                        <td>
                          <select
                            className="input w-32"
                            value={u.role}
                            onChange={e => updateUserRole(u.id, e.target.value)}
                            disabled={u.id === user.id}
                          >
                            <option value="ADMIN">Admin</option>
                            <option value="MANAGER">Manager</option>
                            <option value="VIEWER">Viewer</option>
                          </select>
                        </td>
                        <td>
                          <span className={u.isActive ? 'badge-green' : 'badge-red'}>
                            {u.isActive ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td>
                          {u.id !== user.id && (
                            <button
                              onClick={() => toggleUserActive(u.id, u.isActive!)}
                              className="btn-ghost btn-sm"
                            >
                              {u.isActive ? 'Disable' : 'Enable'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Rentvine Config */}
          {tab === 'rentvine' && user?.role === 'ADMIN' && (
            <div className="space-y-4">
              {rentvineConfig && (
                <div className="card card-body">
                  <div className="flex items-center gap-3">
                    <Key className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Rentvine Connected</p>
                      <p className="text-xs text-gray-500">
                        Base URL: {rentvineConfig.baseUrl}
                        {rentvineConfig.lastSyncAt && ` | Last sync: ${new Date(rentvineConfig.lastSyncAt).toLocaleString()}`}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="card">
                <div className="card-header">
                  <h3 className="font-semibold">{rentvineConfig ? 'Update' : 'Configure'} Rentvine API</h3>
                </div>
                <div className="card-body">
                  <form onSubmit={saveRentvineConfig} className="space-y-3">
                    <div>
                      <label className="label">API Key</label>
                      <input className="input" value={rvForm.apiKey} onChange={e => setRvForm({...rvForm, apiKey: e.target.value})} required placeholder="Your Rentvine API key" />
                    </div>
                    <div>
                      <label className="label">API Secret</label>
                      <input className="input" type="password" value={rvForm.apiSecret} onChange={e => setRvForm({...rvForm, apiSecret: e.target.value})} required placeholder="Your Rentvine API secret" />
                    </div>
                    <div>
                      <label className="label">Base URL</label>
                      <input className="input" value={rvForm.baseUrl} onChange={e => setRvForm({...rvForm, baseUrl: e.target.value})} />
                    </div>
                    <button type="submit" className="btn-primary" disabled={rvSaving}>
                      {rvSaving ? 'Saving...' : 'Save Configuration'}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
