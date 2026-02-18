import { useEffect, useState } from 'react';
import { Plus, FileText, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import api from '../services/api';
import type { Entity, Account, JournalEntry, AccountType } from '../types';
import PageHeader from '../components/shared/PageHeader';
import LoadingSpinner from '../components/shared/LoadingSpinner';

type Tab = 'journal' | 'accounts' | 'reports';

const accountTypeColors: Record<AccountType, string> = {
  ASSET: 'badge-blue',
  LIABILITY: 'badge-red',
  EQUITY: 'badge-green',
  REVENUE: 'badge-green',
  EXPENSE: 'badge-yellow',
};

export default function AccountingPage() {
  const [tab, setTab] = useState<Tab>('journal');
  const [entities, setEntities] = useState<Entity[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<string>('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [showEntityForm, setShowEntityForm] = useState(false);

  // Journal entry form
  const [entryForm, setEntryForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    reference: '',
    description: '',
    lines: [
      { accountId: '', debit: 0, credit: 0, description: '' },
      { accountId: '', debit: 0, credit: 0, description: '' },
    ],
  });

  // Account form
  const [accountForm, setAccountForm] = useState({
    code: '', name: '', type: 'ASSET' as AccountType, description: '',
  });

  // Entity form
  const [entityForm, setEntityForm] = useState({ name: '', description: '' });

  // Report state
  const [reportType, setReportType] = useState<'trial-balance' | 'balance-sheet' | 'income-statement'>('trial-balance');
  const [reportData, setReportData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    loadEntities();
  }, []);

  useEffect(() => {
    if (selectedEntity) {
      loadAccounts();
      if (tab === 'journal') loadEntries();
    }
  }, [selectedEntity, tab]);

  async function loadEntities() {
    try {
      const { data } = await api.get('/accounting/entities');
      setEntities(data.entities);
      if (data.entities.length > 0) setSelectedEntity(data.entities[0].id);
    } catch (err) {
      console.error('Failed to load entities:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadAccounts() {
    try {
      const { data } = await api.get('/accounting/accounts', { params: { entityId: selectedEntity } });
      setAccounts(data.accounts);
    } catch (err) {
      console.error('Failed to load accounts:', err);
    }
  }

  async function loadEntries() {
    try {
      const { data } = await api.get('/accounting/journal-entries', { params: { entityId: selectedEntity } });
      setEntries(data.entries);
    } catch (err) {
      console.error('Failed to load entries:', err);
    }
  }

  async function createEntity(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post('/accounting/entities', entityForm);
      setShowEntityForm(false);
      setEntityForm({ name: '', description: '' });
      loadEntities();
    } catch (err) {
      console.error('Failed to create entity:', err);
    }
  }

  async function createAccount(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post('/accounting/accounts', { ...accountForm, entityId: selectedEntity });
      setShowAccountForm(false);
      setAccountForm({ code: '', name: '', type: 'ASSET', description: '' });
      loadAccounts();
    } catch (err) {
      console.error('Failed to create account:', err);
    }
  }

  async function createJournalEntry(e: React.FormEvent) {
    e.preventDefault();
    const validLines = entryForm.lines.filter(l => l.accountId && (l.debit > 0 || l.credit > 0));
    if (validLines.length < 2) return;

    try {
      await api.post('/accounting/journal-entries', {
        entityId: selectedEntity,
        date: entryForm.date,
        reference: entryForm.reference || undefined,
        description: entryForm.description,
        lines: validLines,
      });
      setShowEntryForm(false);
      resetEntryForm();
      loadEntries();
    } catch (err) {
      console.error('Failed to create entry:', err);
    }
  }

  function resetEntryForm() {
    setEntryForm({
      date: format(new Date(), 'yyyy-MM-dd'),
      reference: '', description: '',
      lines: [
        { accountId: '', debit: 0, credit: 0, description: '' },
        { accountId: '', debit: 0, credit: 0, description: '' },
      ],
    });
  }

  function addLine() {
    setEntryForm({
      ...entryForm,
      lines: [...entryForm.lines, { accountId: '', debit: 0, credit: 0, description: '' }],
    });
  }

  function updateLine(index: number, field: string, value: string | number) {
    const newLines = [...entryForm.lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setEntryForm({ ...entryForm, lines: newLines });
  }

  async function loadReport() {
    if (!selectedEntity) return;
    try {
      const { data } = await api.get(`/accounting/reports/${reportType}`, {
        params: { entityId: selectedEntity },
      });
      setReportData(data);
    } catch (err) {
      console.error('Failed to load report:', err);
    }
  }

  async function postEntry(id: string) {
    try {
      await api.post(`/accounting/journal-entries/${id}/post`);
      loadEntries();
    } catch (err) {
      console.error('Failed to post entry:', err);
    }
  }

  if (loading) return <LoadingSpinner />;

  // Total debits/credits for journal entry form
  const totalDebits = entryForm.lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalCredits = entryForm.lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01 && totalDebits > 0;

  return (
    <div>
      <PageHeader
        title="Accounting"
        actions={
          <div className="flex gap-2">
            <select
              className="input w-48"
              value={selectedEntity}
              onChange={e => setSelectedEntity(e.target.value)}
            >
              {entities.map(ent => (
                <option key={ent.id} value={ent.id}>{ent.name}</option>
              ))}
            </select>
            <button onClick={() => setShowEntityForm(true)} className="btn-secondary btn-sm">
              <Plus className="h-3 w-3 mr-1" /> Entity
            </button>
          </div>
        }
      />

      {/* Entity form modal */}
      {showEntityForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowEntityForm(false)}>
          <div className="card w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <div className="card-header"><h3 className="font-semibold">New Entity</h3></div>
            <div className="card-body">
              <form onSubmit={createEntity} className="space-y-3">
                <div>
                  <label className="label">Name</label>
                  <input className="input" value={entityForm.name} onChange={e => setEntityForm({...entityForm, name: e.target.value})} required />
                </div>
                <div>
                  <label className="label">Description</label>
                  <input className="input" value={entityForm.description} onChange={e => setEntityForm({...entityForm, description: e.target.value})} />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="btn-primary">Create</button>
                  <button type="button" onClick={() => setShowEntityForm(false)} className="btn-secondary">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {[
          { key: 'journal' as Tab, label: 'Journal Entries', icon: FileText },
          { key: 'accounts' as Tab, label: 'Chart of Accounts', icon: BarChart3 },
          { key: 'reports' as Tab, label: 'Reports', icon: BarChart3 },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === key ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {/* Journal Entries Tab */}
      {tab === 'journal' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowEntryForm(true)} className="btn-primary">
              <Plus className="h-4 w-4 mr-2" /> New Entry
            </button>
          </div>

          {/* Journal Entry Form */}
          {showEntryForm && (
            <div className="card mb-6">
              <div className="card-header"><h3 className="font-semibold">New Journal Entry</h3></div>
              <div className="card-body">
                <form onSubmit={createJournalEntry} className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="label">Date</label>
                      <input className="input" type="date" value={entryForm.date} onChange={e => setEntryForm({...entryForm, date: e.target.value})} required />
                    </div>
                    <div>
                      <label className="label">Reference</label>
                      <input className="input" value={entryForm.reference} onChange={e => setEntryForm({...entryForm, reference: e.target.value})} placeholder="INV-001" />
                    </div>
                    <div>
                      <label className="label">Description</label>
                      <input className="input" value={entryForm.description} onChange={e => setEntryForm({...entryForm, description: e.target.value})} required />
                    </div>
                  </div>

                  <div>
                    <table className="table w-full">
                      <thead>
                        <tr>
                          <th>Account</th>
                          <th className="w-32">Debit</th>
                          <th className="w-32">Credit</th>
                          <th>Memo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entryForm.lines.map((line, i) => (
                          <tr key={i}>
                            <td>
                              <select
                                className="input"
                                value={line.accountId}
                                onChange={e => updateLine(i, 'accountId', e.target.value)}
                              >
                                <option value="">Select account...</option>
                                {accounts.map(acc => (
                                  <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <input
                                className="input"
                                type="number"
                                step="0.01"
                                min="0"
                                value={line.debit || ''}
                                onChange={e => updateLine(i, 'debit', parseFloat(e.target.value) || 0)}
                              />
                            </td>
                            <td>
                              <input
                                className="input"
                                type="number"
                                step="0.01"
                                min="0"
                                value={line.credit || ''}
                                onChange={e => updateLine(i, 'credit', parseFloat(e.target.value) || 0)}
                              />
                            </td>
                            <td>
                              <input
                                className="input"
                                value={line.description}
                                onChange={e => updateLine(i, 'description', e.target.value)}
                              />
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-gray-50">
                          <td className="font-medium text-right">Totals</td>
                          <td className="font-medium">${totalDebits.toFixed(2)}</td>
                          <td className="font-medium">${totalCredits.toFixed(2)}</td>
                          <td>
                            {isBalanced ? (
                              <span className="text-green-600 text-xs font-medium">Balanced</span>
                            ) : (
                              <span className="text-red-600 text-xs font-medium">
                                Off by ${Math.abs(totalDebits - totalCredits).toFixed(2)}
                              </span>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <button type="button" onClick={addLine} className="btn-ghost btn-sm mt-2">
                      <Plus className="h-3 w-3 mr-1" /> Add Line
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button type="submit" className="btn-primary" disabled={!isBalanced}>Create Entry</button>
                    <button type="button" onClick={() => { setShowEntryForm(false); resetEntryForm(); }} className="btn-secondary">Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Entry list */}
          <div className="card">
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Reference</th>
                    <th>Description</th>
                    <th>Lines</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.length === 0 ? (
                    <tr><td colSpan={6} className="text-center text-gray-500 py-8">No journal entries</td></tr>
                  ) : entries.map(entry => (
                    <tr key={entry.id}>
                      <td>{format(new Date(entry.date), 'MMM d, yyyy')}</td>
                      <td className="text-gray-500">{entry.reference || '-'}</td>
                      <td>{entry.description}</td>
                      <td>{entry.lines.length} lines</td>
                      <td>
                        <span className={entry.isPosted ? 'badge-green' : 'badge-yellow'}>
                          {entry.isPosted ? 'Posted' : 'Draft'}
                        </span>
                      </td>
                      <td>
                        {!entry.isPosted && (
                          <button onClick={() => postEntry(entry.id)} className="btn-ghost btn-sm text-primary-600">
                            Post
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Chart of Accounts Tab */}
      {tab === 'accounts' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowAccountForm(true)} className="btn-primary">
              <Plus className="h-4 w-4 mr-2" /> New Account
            </button>
          </div>

          {showAccountForm && (
            <div className="card mb-4 max-w-md">
              <div className="card-header"><h3 className="font-semibold">New Account</h3></div>
              <div className="card-body">
                <form onSubmit={createAccount} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Code</label>
                      <input className="input" value={accountForm.code} onChange={e => setAccountForm({...accountForm, code: e.target.value})} required placeholder="1000" />
                    </div>
                    <div>
                      <label className="label">Type</label>
                      <select className="input" value={accountForm.type} onChange={e => setAccountForm({...accountForm, type: e.target.value as AccountType})}>
                        {['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'].map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="label">Name</label>
                    <input className="input" value={accountForm.name} onChange={e => setAccountForm({...accountForm, name: e.target.value})} required />
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className="btn-primary">Create</button>
                    <button type="button" onClick={() => setShowAccountForm(false)} className="btn-secondary">Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="card">
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map(acc => (
                    <tr key={acc.id}>
                      <td className="font-mono">{acc.code}</td>
                      <td className="font-medium">{acc.name}</td>
                      <td><span className={accountTypeColors[acc.type]}>{acc.type}</span></td>
                      <td className="text-gray-500">{acc.description || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {tab === 'reports' && (
        <div>
          <div className="flex gap-2 mb-4">
            {[
              { key: 'trial-balance' as const, label: 'Trial Balance' },
              { key: 'balance-sheet' as const, label: 'Balance Sheet' },
              { key: 'income-statement' as const, label: 'Income Statement' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => { setReportType(key); setReportData(null); }}
                className={reportType === key ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
              >
                {label}
              </button>
            ))}
            <button onClick={loadReport} className="btn-primary btn-sm ml-auto">
              Generate Report
            </button>
          </div>

          {reportData && (
            <div className="card">
              <div className="card-header">
                <h3 className="font-semibold capitalize">{reportType.replace('-', ' ')}</h3>
              </div>
              <div className="card-body">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                  {JSON.stringify(reportData, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
