import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  Settings,
  User,
  CloudSun,
  Mail,
  Building2,
  Info,
  Save,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react';
import { useAuth } from '../store/AuthContext';

const TABS = [
  { key: 'profile', label: 'Profile', icon: User },
  { key: 'weather', label: 'Weather', icon: CloudSun },
  { key: 'email', label: 'Email Accounts', icon: Mail },
  { key: 'rentvine', label: 'Rentvine', icon: Building2 },
  { key: 'system', label: 'System Info', icon: Info },
];

export default function SettingsPage() {
  const { user, setUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-slate-100 rounded-lg">
          <Settings className="w-6 h-6 text-[#2D3436]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500">Manage your account and application preferences</p>
        </div>
      </div>

      {/* Toast Message */}
      {message && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-md whitespace-nowrap transition-all ${
                activeTab === tab.key
                  ? 'bg-white text-[#8B2500] shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="rounded-xl shadow-sm border border-gray-200 bg-white">
        {activeTab === 'profile' && (
          <ProfileSettings user={user} setUser={setUser} saving={saving} setSaving={setSaving} showMessage={showMessage} />
        )}
        {activeTab === 'weather' && (
          <WeatherSettings saving={saving} setSaving={setSaving} showMessage={showMessage} />
        )}
        {activeTab === 'email' && (
          <EmailAccountSettings showMessage={showMessage} />
        )}
        {activeTab === 'rentvine' && (
          <RentvineSettings saving={saving} setSaving={setSaving} showMessage={showMessage} />
        )}
        {activeTab === 'system' && <SystemInfo />}
      </div>
    </div>
  );
}

/* ===================== Profile Settings ===================== */
function ProfileSettings({ user, setUser, saving, setSaving, showMessage }) {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
      });
    }
  }, [user]);

  const handleProfileSave = async () => {
    try {
      setSaving(true);
      const res = await api.put('/auth/profile', form);
      if (setUser) {
        setUser(res.data);
        localStorage.setItem('user', JSON.stringify(res.data));
      }
      showMessage('Profile updated successfully');
    } catch (err) {
      showMessage(err.response?.data?.error || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      showMessage('Passwords do not match', 'error');
      return;
    }
    if (passwordForm.new_password.length < 6) {
      showMessage('Password must be at least 6 characters', 'error');
      return;
    }
    try {
      setSaving(true);
      await api.put('/auth/password', {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      showMessage('Password changed successfully');
    } catch (err) {
      showMessage(err.response?.data?.error || 'Failed to change password', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Profile Settings</h2>
        <p className="text-sm text-gray-500 mb-6">Update your personal information</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
            <input
              type="text"
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#8B2500]/20 focus:border-[#8B2500] outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
            <input
              type="text"
              value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#8B2500]/20 focus:border-[#8B2500] outline-none transition-all"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#8B2500]/20 focus:border-[#8B2500] outline-none transition-all"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={handleProfileSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#8B2500] rounded-lg hover:bg-[#6E1D00] disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Profile
          </button>
        </div>
      </div>

      <hr className="border-gray-200" />

      <div>
        <h3 className="text-md font-semibold text-gray-900 mb-1">Change Password</h3>
        <p className="text-sm text-gray-500 mb-4">Update your account password</p>

        <div className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwordForm.current_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#8B2500]/20 focus:border-[#8B2500] outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={passwordForm.new_password}
              onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#8B2500]/20 focus:border-[#8B2500] outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={passwordForm.confirm_password}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#8B2500]/20 focus:border-[#8B2500] outline-none transition-all"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={handlePasswordChange}
            disabled={saving || !passwordForm.current_password || !passwordForm.new_password}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#2D3436] rounded-lg hover:bg-[#1E2324] disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Change Password
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===================== Weather Settings ===================== */
function WeatherSettings({ saving, setSaving, showMessage }) {
  const [config, setConfig] = useState({ location: '', units: 'imperial' });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api
      .get('/settings/weather_config')
      .then((res) => {
        if (res.data) {
          setConfig({
            location: res.data.location || '',
            units: res.data.units || 'imperial',
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.put('/settings/weather_config', config);
      showMessage('Weather configuration saved');
    } catch (err) {
      showMessage(err.response?.data?.error || 'Failed to save weather config', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Weather Configuration</h2>
        <p className="text-sm text-gray-500 mb-6">Set your location and preferred units for weather display</p>

        <div className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input
              type="text"
              value={config.location}
              onChange={(e) => setConfig({ ...config, location: e.target.value })}
              placeholder="e.g. New York, NY or 10001"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#8B2500]/20 focus:border-[#8B2500] outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Temperature Units</label>
            <div className="flex gap-2">
              <button
                onClick={() => setConfig({ ...config, units: 'imperial' })}
                className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border transition-all ${
                  config.units === 'imperial'
                    ? 'bg-[#8B2500] text-white border-[#8B2500]'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Imperial (°F)
              </button>
              <button
                onClick={() => setConfig({ ...config, units: 'metric' })}
                className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg border transition-all ${
                  config.units === 'metric'
                    ? 'bg-[#8B2500] text-white border-[#8B2500]'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Metric (°C)
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#8B2500] rounded-lg hover:bg-[#6E1D00] disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Weather Config
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===================== Email Account Settings ===================== */
function EmailAccountSettings({ showMessage }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formSaving, setFormSaving] = useState(false);
  const [form, setForm] = useState({
    email: '',
    display_name: '',
    imap_host: '',
    imap_port: '993',
    smtp_host: '',
    smtp_port: '587',
    username: '',
    password: '',
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const res = await api.get('/emails/accounts');
      setAccounts(res.data);
    } catch (err) {
      console.error('Failed to fetch email accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    try {
      setFormSaving(true);
      await api.post('/emails/accounts', {
        ...form,
        imap_port: parseInt(form.imap_port, 10),
        smtp_port: parseInt(form.smtp_port, 10),
      });
      setForm({
        email: '',
        display_name: '',
        imap_host: '',
        imap_port: '993',
        smtp_host: '',
        smtp_port: '587',
        username: '',
        password: '',
      });
      setShowForm(false);
      fetchAccounts();
      showMessage('Email account added successfully');
    } catch (err) {
      showMessage(err.response?.data?.error || 'Failed to add email account', 'error');
    } finally {
      setFormSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this email account?')) return;
    try {
      await api.delete(`/emails/accounts/${id}`);
      fetchAccounts();
      showMessage('Email account removed');
    } catch (err) {
      showMessage(err.response?.data?.error || 'Failed to remove account', 'error');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Email Account Management</h2>
          <p className="text-sm text-gray-500">Manage your connected email accounts</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#8B2500] rounded-lg hover:bg-[#6E1D00] transition-colors"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancel' : 'Add Account'}
        </button>
      </div>

      {/* Add Account Form */}
      {showForm && (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
          <h3 className="text-md font-semibold text-gray-900 mb-4">Add Email Account</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="user@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#8B2500]/20 focus:border-[#8B2500] outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
              <input
                type="text"
                value={form.display_name}
                onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                placeholder="John Doe"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#8B2500]/20 focus:border-[#8B2500] outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">IMAP Host</label>
              <input
                type="text"
                value={form.imap_host}
                onChange={(e) => setForm({ ...form, imap_host: e.target.value })}
                placeholder="imap.example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#8B2500]/20 focus:border-[#8B2500] outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">IMAP Port</label>
              <input
                type="text"
                value={form.imap_port}
                onChange={(e) => setForm({ ...form, imap_port: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#8B2500]/20 focus:border-[#8B2500] outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Host</label>
              <input
                type="text"
                value={form.smtp_host}
                onChange={(e) => setForm({ ...form, smtp_host: e.target.value })}
                placeholder="smtp.example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#8B2500]/20 focus:border-[#8B2500] outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Port</label>
              <input
                type="text"
                value={form.smtp_port}
                onChange={(e) => setForm({ ...form, smtp_port: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#8B2500]/20 focus:border-[#8B2500] outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="user@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#8B2500]/20 focus:border-[#8B2500] outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#8B2500]/20 focus:border-[#8B2500] outline-none transition-all"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleAdd}
              disabled={formSaving || !form.email || !form.imap_host || !form.smtp_host || !form.username || !form.password}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#8B2500] rounded-lg hover:bg-[#6E1D00] disabled:opacity-50 transition-colors"
            >
              {formSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add Account
            </button>
          </div>
        </div>
      )}

      {/* Accounts List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse"></div>
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Mail className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm">No email accounts configured</p>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#8B2500]/10 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-[#8B2500]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {account.display_name || account.email}
                  </p>
                  <p className="text-xs text-gray-500">{account.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">
                  {account.imap_host}
                </span>
                <button
                  onClick={() => handleDelete(account.id)}
                  className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Remove account"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ===================== Rentvine Settings ===================== */
function RentvineSettings({ saving, setSaving, showMessage }) {
  const [config, setConfig] = useState({ url: '', api_key: '' });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api
      .get('/rentvine/config')
      .then((res) => {
        if (res.data) {
          setConfig({
            url: res.data.url || '',
            api_key: res.data.api_key || '',
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.put('/settings/rentvine_config', config);
      showMessage('Rentvine configuration saved');
    } catch (err) {
      showMessage(err.response?.data?.error || 'Failed to save Rentvine config', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Rentvine Configuration</h2>
        <p className="text-sm text-gray-500 mb-6">Configure your Rentvine integration settings</p>

        <div className="space-y-4 max-w-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rentvine API URL</label>
            <input
              type="url"
              value={config.url}
              onChange={(e) => setConfig({ ...config, url: e.target.value })}
              placeholder="https://app.rentvine.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#8B2500]/20 focus:border-[#8B2500] outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
            <input
              type="password"
              value={config.api_key}
              onChange={(e) => setConfig({ ...config, api_key: e.target.value })}
              placeholder="Enter your Rentvine API key"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#8B2500]/20 focus:border-[#8B2500] outline-none transition-all"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#8B2500] rounded-lg hover:bg-[#6E1D00] disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Rentvine Config
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===================== System Info ===================== */
function SystemInfo() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/health')
      .then((res) => setHealth(res.data))
      .catch((err) => setHealth({ status: 'error', message: err.message }))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">System Information</h2>
        <p className="text-sm text-gray-500 mb-6">Application version and server status</p>

        {loading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-10 bg-gray-200 rounded w-full"></div>
            <div className="h-10 bg-gray-200 rounded w-full"></div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">App Version</p>
                <p className="text-lg font-semibold text-gray-900">{health?.version || '1.0.0'}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Server Status</p>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      health?.status === 'ok' || health?.status === 'healthy'
                        ? 'bg-green-500'
                        : 'bg-red-500'
                    }`}
                  ></span>
                  <p className="text-lg font-semibold text-gray-900 capitalize">
                    {health?.status === 'ok' || health?.status === 'healthy' ? 'Healthy' : 'Error'}
                  </p>
                </div>
              </div>
            </div>
            {health?.uptime && (
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Uptime</p>
                <p className="text-lg font-semibold text-gray-900">{health.uptime}</p>
              </div>
            )}
            {health?.message && health?.status === 'error' && (
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-xs font-medium text-red-500 uppercase tracking-wide mb-1">Error Details</p>
                <p className="text-sm text-red-700">{health.message}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
