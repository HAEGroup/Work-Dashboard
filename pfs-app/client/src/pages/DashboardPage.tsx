import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { FileText, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import api from '@/services/api';
import type { DashboardData } from '@/types';
import { ASSET_CATEGORY_LABELS, LIABILITY_CATEGORY_LABELS } from '@/types';

const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#14B8A6', '#F97316', '#6366F1'];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/dashboard').then(res => {
      setData(res.data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Loading...</div>;
  }

  if (!data || data.statementCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <FileText size={48} className="mb-4 text-gray-300" />
        <p className="text-lg font-medium">No statements yet</p>
        <p className="text-sm mt-1">Create your first personal financial statement to get started.</p>
        <button
          onClick={() => navigate('/statements')}
          className="mt-4 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
        >
          Create Statement
        </button>
      </div>
    );
  }

  const latest = data.netWorthHistory[data.netWorthHistory.length - 1];
  const previous = data.netWorthHistory.length > 1 ? data.netWorthHistory[data.netWorthHistory.length - 2] : null;
  const netWorthChange = previous ? latest.netWorth - previous.netWorth : 0;

  const assetPieData = Object.entries(data.assetBreakdown).map(([key, value]) => ({
    name: ASSET_CATEGORY_LABELS[key as keyof typeof ASSET_CATEGORY_LABELS] || key,
    value,
  }));

  const liabilityPieData = Object.entries(data.liabilityBreakdown).map(([key, value]) => ({
    name: LIABILITY_CATEGORY_LABELS[key as keyof typeof LIABILITY_CATEGORY_LABELS] || key,
    value,
  }));

  const chartData = data.netWorthHistory.map(point => ({
    ...point,
    date: format(new Date(point.date), 'MMM yyyy'),
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <DollarSign size={20} className="text-emerald-600" />
            </div>
            <span className="text-sm text-gray-500">Net Worth</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(latest.netWorth)}</div>
          {previous && (
            <div className={`text-sm mt-1 flex items-center gap-1 ${netWorthChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {netWorthChange >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {formatCurrency(Math.abs(netWorthChange))} from last statement
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp size={20} className="text-blue-600" />
            </div>
            <span className="text-sm text-gray-500">Total Assets</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(latest.totalAssets)}</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-100 rounded-lg">
              <TrendingDown size={20} className="text-red-600" />
            </div>
            <span className="text-sm text-gray-500">Total Liabilities</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(latest.totalLiabilities)}</div>
        </div>
      </div>

      {/* Net Worth Trend */}
      {chartData.length > 1 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Net Worth Over Time</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Line type="monotone" dataKey="netWorth" stroke="#10B981" strokeWidth={2} name="Net Worth" />
              <Line type="monotone" dataKey="totalAssets" stroke="#3B82F6" strokeWidth={1} strokeDasharray="5 5" name="Assets" />
              <Line type="monotone" dataKey="totalLiabilities" stroke="#EF4444" strokeWidth={1} strokeDasharray="5 5" name="Liabilities" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Breakdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {assetPieData.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Asset Breakdown</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={assetPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {assetPieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {liabilityPieData.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Liability Breakdown</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={liabilityPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {liabilityPieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
