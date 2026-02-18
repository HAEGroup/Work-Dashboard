import { useEffect, useState } from 'react';
import { User, Shield, Key, Building2, Plus, X, Lock, Eye, EyeOff, Link2, Copy, Check } from 'lucide-react';
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

  // Add user modal
  const [showAddUser, setShowAddUser] = useState(false);
  const [addUserForm, setAddUserForm] = useState({ email: '', firstName: '', lastName: '', password: '', role: 'VIEWER' });
  const [addUserError, setAddUserError] = useState('');
  const [addUserSaving, setAddUserSaving] = useState(false);

  // Reset password modal
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [resetPasswordError, setResetPasswordError] = useState('');
  const [resetPasswordSaving, setResetPasswordSaving] = useState(false);
  const [resetPasswordSuccess, setResetPasswordSuccess] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  // Generate reset link modal
  const [resetLinkUserId, setResetLinkUserId] = useState<string | null>(null);
  const [resetLinkUrl, setResetLinkUrl] = useState('');
  const [resetLinkLoading, setResetLinkLoading] = useState(false);
  const [resetLinkCopied, setResetLinkCopied] = useState(false);

  // Change own password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changePasswordError, setChangePasswordError] = useState('');
  const [changePasswordSuccess, setChangePasswordSuccess] = useState('');
  const [changePasswordSaving, setChangePasswordSaving] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

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

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    setAddUserError('');
    setAddUserSaving(true);
    try {
      await api.post('/auth/register', addUserForm);
      setShowAddUser(false);
      setAddUserForm({ email: '', firstName: '', lastName: '', password: '', role: 'VIEWER' });
      loadUsers();
    } catch (err: any) {
      setAddUserError(err.response?.data?.message || 'Failed to create user');
    } finally {
      setAddUserSaving(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetPasswordUserId) return;
    setResetPasswordError('');
    setResetPasswordSaving(true);
    try {
      await api.post(`/auth/users/${resetPasswordUserId}/reset-password`, { password: resetPasswordValue });
      setResetPasswordSuccess(true);
      setTimeout(() => {
        setResetPasswordUserId(null);
        setResetPasswordValue('');
        setResetPasswordSuccess(false);
        setShowResetPassword(false);
      }, 1500);
    } catch (err: any) {
      setResetPasswordError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setResetPasswordSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setChangePasswordError('');
    setChangePasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setChangePasswordError('New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setChangePasswordError('New password must be at least 8 characters');
      return;
    }

    setChangePasswordSaving(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      setChangePasswordSuccess('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setChangePasswordError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setChangePasswordSaving(false);
    }
  }

  function openResetPassword(userId: string) {
    setResetPasswordUserId(userId);
    setResetPasswordValue('');
    setResetPasswordError('');
    setResetPasswordSuccess(false);
    setShowResetPassword(true);
  }

  async function generateResetLink(userId: string) {
    setResetLinkUserId(userId);
    setResetLinkUrl('');
    setResetLinkCopied(false);
    setResetLinkLoading(true);
    try {
      const { data } = await api.post(`/auth/users/${userId}/generate-reset-link`);
      const url = `${window.location.origin}/reset-password?token=${data.token}`;
      setResetLinkUrl(url);
    } catch (err) {
      console.error('Failed to generate reset link:', err);
    } finally {
      setResetLinkLoading(false);
    }
  }

  function copyResetLink() {
    navigator.clipboard.writeText(resetLinkUrl);
    setResetLinkCopied(true);
    setTimeout(() => setResetLinkCopied(false), 2000);
  }

  const resetUser = users.find(u => u.id === resetPasswordUserId);
  const resetLinkUser = users.find(u => u.id === resetLinkUserId);

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
            <div className="space-y-6">
              <div className="card">
                <div className="card-header"><h3 className="font-semibold dark:text-white">Profile</h3></div>
                <div className="card-body space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">First Name</label>
                      <p className="text-sm text-gray-900 dark:text-gray-100">{user?.firstName}</p>
                    </div>
                    <div>
                      <label className="label">Last Name</label>
                      <p className="text-sm text-gray-900 dark:text-gray-100">{user?.lastName}</p>
                    </div>
                  </div>
                  <div>
                    <label className="label">Email</label>
                    <p className="text-sm text-gray-900 dark:text-gray-100">{user?.email}</p>
                  </div>
                  <div>
                    <label className="label">Role</label>
                    <p className="text-sm text-gray-900 dark:text-gray-100">{user?.role}</p>
                  </div>
                </div>
              </div>

              {/* Change Password */}
              <div className="card">
                <div className="card-header"><h3 className="font-semibold dark:text-white">Change Password</h3></div>
                <div className="card-body">
                  <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
                    <div>
                      <label className="label">Current Password</label>
                      <div className="relative">
                        <input
                          className="input pr-10"
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={e => setCurrentPassword(e.target.value)}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="label">New Password</label>
                      <div className="relative">
                        <input
                          className="input pr-10"
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          required
                          minLength={8}
                          placeholder="Minimum 8 characters"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="label">Confirm New Password</label>
                      <input
                        className="input"
                        type="password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        required
                      />
                    </div>
                    {changePasswordError && (
                      <p className="text-sm text-red-600">{changePasswordError}</p>
                    )}
                    {changePasswordSuccess && (
                      <p className="text-sm text-green-600">{changePasswordSuccess}</p>
                    )}
                    <button type="submit" className="btn-primary" disabled={changePasswordSaving}>
                      <Lock className="h-4 w-4 mr-2" />
                      {changePasswordSaving ? 'Changing...' : 'Change Password'}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Users */}
          {tab === 'users' && user?.role === 'ADMIN' && (
            <div className="card">
              <div className="card-header flex items-center justify-between">
                <h3 className="font-semibold dark:text-white">Team Members</h3>
                <button onClick={() => setShowAddUser(true)} className="btn-primary btn-sm">
                  <Plus className="h-3.5 w-3.5 mr-1.5" /> Add User
                </button>
              </div>
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
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openResetPassword(u.id)}
                              className="btn-ghost btn-sm"
                              title="Reset password"
                            >
                              <Key className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => generateResetLink(u.id)}
                              className="btn-ghost btn-sm"
                              title="Generate reset link"
                            >
                              <Link2 className="h-3.5 w-3.5" />
                            </button>
                            {u.id !== user.id && (
                              <button
                                onClick={() => toggleUserActive(u.id, u.isActive!)}
                                className="btn-ghost btn-sm"
                              >
                                {u.isActive ? 'Disable' : 'Enable'}
                              </button>
                            )}
                          </div>
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
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Rentvine Connected</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Base URL: {rentvineConfig.baseUrl}
                        {rentvineConfig.lastSyncAt && ` | Last sync: ${new Date(rentvineConfig.lastSyncAt).toLocaleString()}`}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="card">
                <div className="card-header">
                  <h3 className="font-semibold dark:text-white">{rentvineConfig ? 'Update' : 'Configure'} Rentvine API</h3>
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

      {/* ====== ADD USER MODAL ====== */}
      {showAddUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700">
              <h2 className="text-lg font-semibold dark:text-white">Add User</h2>
              <button onClick={() => setShowAddUser(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleAddUser} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">First Name</label>
                  <input
                    className="input"
                    value={addUserForm.firstName}
                    onChange={e => setAddUserForm({...addUserForm, firstName: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="label">Last Name</label>
                  <input
                    className="input"
                    value={addUserForm.lastName}
                    onChange={e => setAddUserForm({...addUserForm, lastName: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  className="input"
                  type="email"
                  value={addUserForm.email}
                  onChange={e => setAddUserForm({...addUserForm, email: e.target.value})}
                  required
                  placeholder="user@company.com"
                />
              </div>
              <div>
                <label className="label">Temporary Password</label>
                <input
                  className="input"
                  type="text"
                  value={addUserForm.password}
                  onChange={e => setAddUserForm({...addUserForm, password: e.target.value})}
                  required
                  minLength={8}
                  placeholder="Minimum 8 characters"
                />
                <p className="text-xs text-gray-500 mt-1">Share this with the user so they can sign in</p>
              </div>
              <div>
                <label className="label">Role</label>
                <select
                  className="input"
                  value={addUserForm.role}
                  onChange={e => setAddUserForm({...addUserForm, role: e.target.value})}
                >
                  <option value="VIEWER">Viewer</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              {addUserError && (
                <p className="text-sm text-red-600">{addUserError}</p>
              )}
              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-primary flex-1" disabled={addUserSaving}>
                  {addUserSaving ? 'Creating...' : 'Create User'}
                </button>
                <button type="button" onClick={() => setShowAddUser(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====== GENERATE RESET LINK MODAL ====== */}
      {resetLinkUserId && resetLinkUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700">
              <h2 className="text-lg font-semibold dark:text-white">Password Reset Link</h2>
              <button onClick={() => setResetLinkUserId(null)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Reset link for <span className="font-medium text-gray-900 dark:text-white">{resetLinkUser.firstName} {resetLinkUser.lastName}</span> ({resetLinkUser.email})
              </p>
              {resetLinkLoading ? (
                <p className="text-sm text-gray-500">Generating link...</p>
              ) : resetLinkUrl ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      className="input text-xs font-mono"
                      value={resetLinkUrl}
                      readOnly
                      onClick={e => (e.target as HTMLInputElement).select()}
                    />
                    <button onClick={copyResetLink} className="btn-secondary btn-sm whitespace-nowrap">
                      {resetLinkCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    This link expires in 24 hours. Share it with the user so they can set a new password.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-red-600">Failed to generate reset link</p>
              )}
              <div className="flex justify-end pt-2">
                <button onClick={() => setResetLinkUserId(null)} className="btn-secondary">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====== RESET PASSWORD MODAL ====== */}
      {showResetPassword && resetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700">
              <h2 className="text-lg font-semibold dark:text-white">Reset Password</h2>
              <button onClick={() => { setShowResetPassword(false); setResetPasswordUserId(null); }} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleResetPassword} className="p-6 space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Set a new password for <span className="font-medium text-gray-900 dark:text-white">{resetUser.firstName} {resetUser.lastName}</span> ({resetUser.email})
              </p>
              <div>
                <label className="label">New Password</label>
                <input
                  className="input"
                  type="text"
                  value={resetPasswordValue}
                  onChange={e => setResetPasswordValue(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Minimum 8 characters"
                />
              </div>
              {resetPasswordError && (
                <p className="text-sm text-red-600">{resetPasswordError}</p>
              )}
              {resetPasswordSuccess && (
                <p className="text-sm text-green-600">Password reset successfully</p>
              )}
              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-primary flex-1" disabled={resetPasswordSaving || resetPasswordSuccess}>
                  <Lock className="h-4 w-4 mr-2" />
                  {resetPasswordSaving ? 'Resetting...' : 'Reset Password'}
                </button>
                <button type="button" onClick={() => { setShowResetPassword(false); setResetPasswordUserId(null); }} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
