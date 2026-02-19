import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, Download } from 'lucide-react';
import { format } from 'date-fns';
import api from '@/services/api';
import type { Statement, Asset, Liability, AssetCategory, LiabilityCategory } from '@/types';
import {
  ASSET_CATEGORIES, LIABILITY_CATEGORIES,
  ASSET_CATEGORY_LABELS, LIABILITY_CATEGORY_LABELS,
} from '@/types';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function StatementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [statement, setStatement] = useState<Statement | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Personal info form state
  const [personalInfo, setPersonalInfo] = useState({
    fullName: '', address: '', city: '', state: '', zip: '',
    phone: '', employer: '', jobTitle: '',
    annualSalary: '', otherIncome: '', otherIncomeDesc: '',
  });

  // Asset form state
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [assetForm, setAssetForm] = useState({
    category: 'CASH_AND_EQUIVALENTS' as AssetCategory,
    description: '',
    value: '',
    notes: '',
  });

  // Liability form state
  const [showLiabilityForm, setShowLiabilityForm] = useState(false);
  const [liabilityForm, setLiabilityForm] = useState({
    category: 'MORTGAGE' as LiabilityCategory,
    description: '',
    balance: '',
    monthlyPayment: '',
    interestRate: '',
    creditor: '',
    notes: '',
  });

  const loadStatement = useCallback(async () => {
    const { data } = await api.get(`/statements/${id}`);
    setStatement(data.statement);
    setPersonalInfo({
      fullName: data.statement.fullName || '',
      address: data.statement.address || '',
      city: data.statement.city || '',
      state: data.statement.state || '',
      zip: data.statement.zip || '',
      phone: data.statement.phone || '',
      employer: data.statement.employer || '',
      jobTitle: data.statement.jobTitle || '',
      annualSalary: data.statement.annualSalary?.toString() || '',
      otherIncome: data.statement.otherIncome?.toString() || '',
      otherIncomeDesc: data.statement.otherIncomeDesc || '',
    });
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadStatement();
  }, [loadStatement]);

  async function savePersonalInfo() {
    setSaving(true);
    await api.patch(`/statements/${id}`, {
      fullName: personalInfo.fullName || undefined,
      address: personalInfo.address || undefined,
      city: personalInfo.city || undefined,
      state: personalInfo.state || undefined,
      zip: personalInfo.zip || undefined,
      phone: personalInfo.phone || undefined,
      employer: personalInfo.employer || undefined,
      jobTitle: personalInfo.jobTitle || undefined,
      annualSalary: personalInfo.annualSalary ? Number(personalInfo.annualSalary) : undefined,
      otherIncome: personalInfo.otherIncome ? Number(personalInfo.otherIncome) : undefined,
      otherIncomeDesc: personalInfo.otherIncomeDesc || undefined,
    });
    setSaving(false);
  }

  async function addAsset() {
    await api.post(`/statements/${id}/assets`, {
      category: assetForm.category,
      description: assetForm.description,
      value: Number(assetForm.value),
      notes: assetForm.notes || undefined,
    });
    setAssetForm({ category: 'CASH_AND_EQUIVALENTS', description: '', value: '', notes: '' });
    setShowAssetForm(false);
    loadStatement();
  }

  async function deleteAsset(assetId: string) {
    await api.delete(`/statements/${id}/assets/${assetId}`);
    loadStatement();
  }

  async function addLiability() {
    await api.post(`/statements/${id}/liabilities`, {
      category: liabilityForm.category,
      description: liabilityForm.description,
      balance: Number(liabilityForm.balance),
      monthlyPayment: liabilityForm.monthlyPayment ? Number(liabilityForm.monthlyPayment) : undefined,
      interestRate: liabilityForm.interestRate ? Number(liabilityForm.interestRate) : undefined,
      creditor: liabilityForm.creditor || undefined,
      notes: liabilityForm.notes || undefined,
    });
    setLiabilityForm({ category: 'MORTGAGE', description: '', balance: '', monthlyPayment: '', interestRate: '', creditor: '', notes: '' });
    setShowLiabilityForm(false);
    loadStatement();
  }

  async function deleteLiability(liabilityId: string) {
    await api.delete(`/statements/${id}/liabilities/${liabilityId}`);
    loadStatement();
  }

  async function downloadPdf() {
    const response = await api.get(`/statements/${id}/pdf`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `pfs-${id}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  if (loading || !statement) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Loading...</div>;
  }

  // Group assets by category
  const assetsByCategory = new Map<AssetCategory, Asset[]>();
  for (const asset of statement.assets) {
    const cat = asset.category;
    if (!assetsByCategory.has(cat)) assetsByCategory.set(cat, []);
    assetsByCategory.get(cat)!.push(asset);
  }

  // Group liabilities by category
  const liabilitiesByCategory = new Map<LiabilityCategory, Liability[]>();
  for (const liability of statement.liabilities) {
    const cat = liability.category;
    if (!liabilitiesByCategory.has(cat)) liabilitiesByCategory.set(cat, []);
    liabilitiesByCategory.get(cat)!.push(liability);
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/statements')} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{statement.name}</h1>
            <p className="text-sm text-gray-500">As of {format(new Date(statement.asOfDate), 'MMMM d, yyyy')}</p>
          </div>
        </div>
        <button
          onClick={downloadPdf}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Download size={18} />
          Export PDF
        </button>
      </div>

      {/* Net Worth Banner */}
      <div className={`rounded-xl p-6 mb-6 text-white ${statement.netWorth >= 0 ? 'bg-emerald-600' : 'bg-red-600'}`}>
        <div className="text-center">
          <div className="text-sm opacity-80 uppercase tracking-wide">Net Worth</div>
          <div className="text-4xl font-bold mt-1">{formatCurrency(statement.netWorth)}</div>
          <div className="flex justify-center gap-8 mt-3 text-sm opacity-80">
            <span>Assets: {formatCurrency(statement.totalAssets)}</span>
            <span>Liabilities: {formatCurrency(statement.totalLiabilities)}</span>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
          <button
            onClick={savePersonalInfo}
            disabled={saving}
            className="flex items-center gap-2 text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Save size={14} />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Full Name</label>
            <input type="text" value={personalInfo.fullName} onChange={(e) => setPersonalInfo(p => ({ ...p, fullName: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Phone</label>
            <input type="text" value={personalInfo.phone} onChange={(e) => setPersonalInfo(p => ({ ...p, phone: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Address</label>
            <input type="text" value={personalInfo.address} onChange={(e) => setPersonalInfo(p => ({ ...p, address: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">City</label>
              <input type="text" value={personalInfo.city} onChange={(e) => setPersonalInfo(p => ({ ...p, city: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">State</label>
              <input type="text" value={personalInfo.state} onChange={(e) => setPersonalInfo(p => ({ ...p, state: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">ZIP</label>
              <input type="text" value={personalInfo.zip} onChange={(e) => setPersonalInfo(p => ({ ...p, zip: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Employer</label>
            <input type="text" value={personalInfo.employer} onChange={(e) => setPersonalInfo(p => ({ ...p, employer: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Job Title</label>
            <input type="text" value={personalInfo.jobTitle} onChange={(e) => setPersonalInfo(p => ({ ...p, jobTitle: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Annual Salary</label>
            <input type="number" value={personalInfo.annualSalary} onChange={(e) => setPersonalInfo(p => ({ ...p, annualSalary: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Other Income</label>
            <input type="number" value={personalInfo.otherIncome} onChange={(e) => setPersonalInfo(p => ({ ...p, otherIncome: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
          </div>
        </div>
      </div>

      {/* Two-column layout for Assets and Liabilities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assets */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Assets <span className="text-emerald-600 ml-2">{formatCurrency(statement.totalAssets)}</span>
            </h2>
            <button onClick={() => setShowAssetForm(true)} className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700">
              <Plus size={16} /> Add
            </button>
          </div>

          {/* Add Asset Form */}
          {showAssetForm && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                  <select value={assetForm.category} onChange={(e) => setAssetForm(f => ({ ...f, category: e.target.value as AssetCategory }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    {ASSET_CATEGORIES.map(c => <option key={c} value={c}>{ASSET_CATEGORY_LABELS[c]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                  <input type="text" value={assetForm.description} onChange={(e) => setAssetForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="e.g., Chase Checking Account" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Value ($)</label>
                  <input type="number" value={assetForm.value} onChange={(e) => setAssetForm(f => ({ ...f, value: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="0" />
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowAssetForm(false)} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5">Cancel</button>
                  <button onClick={addAsset} disabled={!assetForm.description || !assetForm.value}
                    className="text-sm bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50">Add Asset</button>
                </div>
              </div>
            </div>
          )}

          {/* Asset List */}
          {statement.assets.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No assets added yet</p>
          ) : (
            <div className="space-y-4">
              {Array.from(assetsByCategory.entries()).map(([cat, assets]) => (
                <div key={cat}>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    {ASSET_CATEGORY_LABELS[cat]}
                    <span className="float-right">{formatCurrency(assets.reduce((s, a) => s + Number(a.value), 0))}</span>
                  </h3>
                  {assets.map(asset => (
                    <div key={asset.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <span className="text-sm text-gray-700">{asset.description}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-900">{formatCurrency(Number(asset.value))}</span>
                        <button onClick={() => deleteAsset(asset.id)} className="text-gray-300 hover:text-red-500">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Liabilities */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Liabilities <span className="text-red-600 ml-2">{formatCurrency(statement.totalLiabilities)}</span>
            </h2>
            <button onClick={() => setShowLiabilityForm(true)} className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700">
              <Plus size={16} /> Add
            </button>
          </div>

          {/* Add Liability Form */}
          {showLiabilityForm && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                  <select value={liabilityForm.category} onChange={(e) => setLiabilityForm(f => ({ ...f, category: e.target.value as LiabilityCategory }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    {LIABILITY_CATEGORIES.map(c => <option key={c} value={c}>{LIABILITY_CATEGORY_LABELS[c]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                  <input type="text" value={liabilityForm.description} onChange={(e) => setLiabilityForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="e.g., Primary Residence Mortgage" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Balance ($)</label>
                    <input type="number" value={liabilityForm.balance} onChange={(e) => setLiabilityForm(f => ({ ...f, balance: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Monthly Payment ($)</label>
                    <input type="number" value={liabilityForm.monthlyPayment} onChange={(e) => setLiabilityForm(f => ({ ...f, monthlyPayment: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="0" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Interest Rate (%)</label>
                    <input type="number" step="0.001" value={liabilityForm.interestRate} onChange={(e) => setLiabilityForm(f => ({ ...f, interestRate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="0.000" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Creditor</label>
                    <input type="text" value={liabilityForm.creditor} onChange={(e) => setLiabilityForm(f => ({ ...f, creditor: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Bank name" />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowLiabilityForm(false)} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5">Cancel</button>
                  <button onClick={addLiability} disabled={!liabilityForm.description || !liabilityForm.balance}
                    className="text-sm bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 disabled:opacity-50">Add Liability</button>
                </div>
              </div>
            </div>
          )}

          {/* Liability List */}
          {statement.liabilities.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No liabilities added yet</p>
          ) : (
            <div className="space-y-4">
              {Array.from(liabilitiesByCategory.entries()).map(([cat, liabilities]) => (
                <div key={cat}>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    {LIABILITY_CATEGORY_LABELS[cat]}
                    <span className="float-right">{formatCurrency(liabilities.reduce((s, l) => s + Number(l.balance), 0))}</span>
                  </h3>
                  {liabilities.map(liability => (
                    <div key={liability.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <div>
                        <span className="text-sm text-gray-700">{liability.description}</span>
                        {liability.creditor && <span className="text-xs text-gray-400 ml-2">({liability.creditor})</span>}
                        {liability.interestRate && <span className="text-xs text-gray-400 ml-2">{Number(liability.interestRate)}%</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-900">{formatCurrency(Number(liability.balance))}</span>
                        <button onClick={() => deleteLiability(liability.id)} className="text-gray-300 hover:text-red-500">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
