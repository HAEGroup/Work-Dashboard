import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Trash2, Copy, Download } from 'lucide-react';
import { format } from 'date-fns';
import api from '@/services/api';
import type { Statement } from '@/types';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function StatementsPage() {
  const [statements, setStatements] = useState<Statement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newName, setNewName] = useState('Personal Financial Statement');
  const [newDate, setNewDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const navigate = useNavigate();

  async function loadStatements() {
    const { data } = await api.get('/statements');
    setStatements(data.statements);
    setLoading(false);
  }

  useEffect(() => {
    loadStatements();
  }, []);

  async function createStatement() {
    const { data } = await api.post('/statements', {
      name: newName,
      asOfDate: newDate,
    });
    setShowNewModal(false);
    navigate(`/statements/${data.statement.id}`);
  }

  async function deleteStatement(id: string) {
    if (!confirm('Delete this statement? This cannot be undone.')) return;
    await api.delete(`/statements/${id}`);
    loadStatements();
  }

  async function duplicateStatement(id: string) {
    const newDate = format(new Date(), 'yyyy-MM-dd');
    const { data } = await api.post(`/statements/${id}/duplicate`, { asOfDate: newDate });
    navigate(`/statements/${data.statement.id}`);
  }

  async function downloadPdf(id: string) {
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

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Loading...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Financial Statements</h1>
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <Plus size={18} />
          New Statement
        </button>
      </div>

      {statements.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <FileText size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">No statements yet</p>
          <p className="text-sm mt-1">Create your first personal financial statement.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {statements.map((stmt) => (
            <div
              key={stmt.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/statements/${stmt.id}`)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{stmt.name}</h3>
                  <p className="text-sm text-gray-500">
                    As of {format(new Date(stmt.asOfDate), 'MMMM d, yyyy')}
                  </p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Net Worth</div>
                    <div className={`text-xl font-bold ${stmt.netWorth >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatCurrency(stmt.netWorth)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => downloadPdf(stmt.id)}
                      className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                      title="Download PDF"
                    >
                      <Download size={18} />
                    </button>
                    <button
                      onClick={() => duplicateStatement(stmt.id)}
                      className="p-2 text-gray-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors"
                      title="Duplicate"
                    >
                      <Copy size={18} />
                    </button>
                    <button
                      onClick={() => deleteStatement(stmt.id)}
                      className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex gap-6 mt-3 text-sm text-gray-500">
                <span>Assets: {formatCurrency(stmt.totalAssets)}</span>
                <span>Liabilities: {formatCurrency(stmt.totalLiabilities)}</span>
                <span>{stmt._count?.assets || 0} assets, {stmt._count?.liabilities || 0} liabilities</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Statement Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowNewModal(false)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">New Financial Statement</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">As of Date</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={createStatement}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
