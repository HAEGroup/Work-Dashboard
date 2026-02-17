import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  Building2,
  Wrench,
  Home,
  ExternalLink,
  RefreshCw,
  Edit2,
  Save,
  FileText,
  DollarSign,
  Users,
  ClipboardList,
  BarChart3,
} from 'lucide-react';

const METRIC_CARDS = [
  { key: 'units_managed', label: 'Units Managed', icon: Building2, color: 'text-[#8B2500]', bg: 'bg-red-50' },
  { key: 'open_maintenance', label: 'Open Maintenance Requests', icon: Wrench, color: 'text-[#D4A574]', bg: 'bg-amber-50' },
  { key: 'vacancy_count', label: 'Vacancy Count', icon: Home, color: 'text-blue-600', bg: 'bg-blue-50' },
];

const QUICK_LINKS = [
  { label: 'Properties', icon: Building2, path: '/properties' },
  { label: 'Leases', icon: FileText, path: '/leases' },
  { label: 'Maintenance', icon: Wrench, path: '/maintenance' },
  { label: 'Accounting', icon: DollarSign, path: '/accounting' },
  { label: 'Reports', icon: BarChart3, path: '/reports' },
  { label: 'Tenants', icon: Users, path: '/tenants' },
];

export default function RentvinePage() {
  const [metrics, setMetrics] = useState({ units_managed: 0, open_maintenance: 0, vacancy_count: 0 });
  const [rentvineUrl, setRentvineUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingMetric, setEditingMetric] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [metricsRes, configRes] = await Promise.all([
        api.get('/rentvine/metrics'),
        api.get('/rentvine/config').catch(() => ({ data: {} })),
      ]);
      setMetrics(metricsRes.data);
      setRentvineUrl(configRes.data?.url || '');
    } catch (err) {
      console.error('Failed to fetch Rentvine data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const startEditing = (key, currentValue) => {
    setEditingMetric(key);
    setEditValue(String(currentValue));
  };

  const saveMetric = async (key) => {
    try {
      const value = parseInt(editValue, 10);
      if (isNaN(value) || value < 0) return;
      await api.put('/rentvine/metrics', { [key]: value });
      setMetrics((prev) => ({ ...prev, [key]: value }));
      setEditingMetric(null);
      setEditValue('');
    } catch (err) {
      console.error('Failed to update metric:', err);
    }
  };

  const handleQuickLink = (link) => {
    if (rentvineUrl) {
      window.open(`${rentvineUrl}${link.path}`, '_blank', 'noopener,noreferrer');
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-50 rounded-lg">
            <Building2 className="w-6 h-6 text-[#8B2500]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Rentvine Integration</h1>
            <p className="text-sm text-gray-500">Property management overview</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {rentvineUrl && (
            <a
              href={rentvineUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#8B2500] rounded-lg hover:bg-[#6E1D00] transition-colors"
            >
              Open Rentvine
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {METRIC_CARDS.map((card) => {
          const Icon = card.icon;
          const isEditing = editingMetric === card.key;

          return (
            <div
              key={card.key}
              className="rounded-xl shadow-sm border border-gray-200 bg-white p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${card.bg}`}>
                    <Icon className={`w-5 h-5 ${card.color}`} />
                  </div>
                  <span className="text-sm font-medium text-gray-600">{card.label}</span>
                </div>
                {isEditing ? (
                  <button
                    onClick={() => saveMetric(card.key)}
                    className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition-colors"
                    title="Save"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => startEditing(card.key, metrics[card.key])}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              {isEditing ? (
                <input
                  type="number"
                  min="0"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveMetric(card.key);
                    if (e.key === 'Escape') setEditingMetric(null);
                  }}
                  className="text-3xl font-bold text-gray-900 w-full border-b-2 border-[#8B2500] outline-none bg-transparent"
                  autoFocus
                />
              ) : (
                <p className="text-3xl font-bold text-gray-900">{metrics[card.key] ?? 0}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick Links */}
      <div className="rounded-xl shadow-sm border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Links</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {QUICK_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <button
                key={link.label}
                onClick={() => handleQuickLink(link)}
                disabled={!rentvineUrl}
                className="flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-200 hover:border-[#8B2500] hover:bg-red-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <Icon className="w-6 h-6 text-gray-500 group-hover:text-[#8B2500] transition-colors" />
                <span className="text-xs font-medium text-gray-700 group-hover:text-[#8B2500] transition-colors">
                  {link.label}
                </span>
              </button>
            );
          })}
        </div>
        {!rentvineUrl && (
          <p className="text-xs text-gray-400 mt-3 text-center">
            Configure Rentvine URL in Settings to enable quick links
          </p>
        )}
      </div>

      {/* Iframe Section */}
      <div className="rounded-xl shadow-sm border border-gray-200 bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">Rentvine Portal</h2>
        </div>
        {rentvineUrl ? (
          <iframe
            src={rentvineUrl}
            title="Rentvine Portal"
            className="w-full border-0"
            style={{ height: '700px' }}
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <Building2 className="w-16 h-16 mb-4 text-gray-300" />
            <p className="text-lg font-medium text-gray-500">Configure Rentvine URL in Settings</p>
            <p className="text-sm text-gray-400 mt-1">
              Go to Settings &rarr; Rentvine Configuration to add your Rentvine URL
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
