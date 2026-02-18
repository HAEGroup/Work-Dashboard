import { useEffect, useState } from 'react';
import { Mail, Star, Paperclip, RefreshCw, Plus, Send, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import api from '../services/api';
import type { EmailAccount, EmailMessage } from '../types';
import PageHeader from '../components/shared/PageHeader';
import LoadingSpinner from '../components/shared/LoadingSpinner';

export default function EmailPage() {
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<EmailMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);

  // Compose state
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [sending, setSending] = useState(false);

  // Add account state
  const [accountForm, setAccountForm] = useState({
    label: '', emailAddress: '', imapHost: '', imapPort: 993,
    smtpHost: '', smtpPort: 587, username: '', password: '',
  });

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccount) loadMessages(selectedAccount);
  }, [selectedAccount]);

  async function loadAccounts() {
    try {
      const { data } = await api.get('/email/accounts');
      setAccounts(data.accounts);
      if (data.accounts.length > 0 && !selectedAccount) {
        setSelectedAccount(data.accounts[0].id);
      }
    } catch (err) {
      console.error('Failed to load email accounts:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages(accountId: string) {
    setLoading(true);
    try {
      const { data } = await api.get(`/email/accounts/${accountId}/messages`);
      setMessages(data.messages);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoading(false);
    }
  }

  async function syncEmail() {
    if (!selectedAccount) return;
    setSyncing(true);
    try {
      await api.post(`/email/accounts/${selectedAccount}/sync`);
      await loadMessages(selectedAccount);
    } catch (err) {
      console.error('Failed to sync:', err);
    } finally {
      setSyncing(false);
    }
  }

  async function openMessage(id: string) {
    try {
      const { data } = await api.get(`/email/messages/${id}`);
      setSelectedMessage(data.message);
      setMessages(msgs => msgs.map(m => m.id === id ? { ...m, isRead: true } : m));
    } catch (err) {
      console.error('Failed to load message:', err);
    }
  }

  async function toggleStar(id: string, isStarred: boolean) {
    try {
      await api.patch(`/email/messages/${id}`, { isStarred: !isStarred });
      setMessages(msgs => msgs.map(m => m.id === id ? { ...m, isStarred: !isStarred } : m));
    } catch (err) {
      console.error('Failed to toggle star:', err);
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAccount) return;
    setSending(true);
    try {
      await api.post('/email/send', {
        accountId: selectedAccount,
        to: composeTo.split(',').map(s => s.trim()),
        subject: composeSubject,
        body: composeBody,
        isHtml: false,
      });
      setShowCompose(false);
      setComposeTo('');
      setComposeSubject('');
      setComposeBody('');
    } catch (err) {
      console.error('Failed to send:', err);
    } finally {
      setSending(false);
    }
  }

  async function addAccount(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post('/email/accounts', accountForm);
      setShowAddAccount(false);
      loadAccounts();
    } catch (err) {
      console.error('Failed to add account:', err);
    }
  }

  if (loading && accounts.length === 0) return <LoadingSpinner />;

  // No accounts configured
  if (accounts.length === 0 && !showAddAccount) {
    return (
      <div>
        <PageHeader title="Email" />
        <div className="card card-body text-center py-12">
          <Mail className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No email accounts</h3>
          <p className="text-sm text-gray-500 mb-4">Add an email account to get started</p>
          <button onClick={() => setShowAddAccount(true)} className="btn-primary mx-auto">
            <Plus className="h-4 w-4 mr-2" /> Add Email Account
          </button>
        </div>
      </div>
    );
  }

  // Add account form
  if (showAddAccount) {
    return (
      <div>
        <PageHeader title="Add Email Account" />
        <div className="card card-body max-w-lg">
          <form onSubmit={addAccount} className="space-y-4">
            <div>
              <label className="label">Label</label>
              <input className="input" value={accountForm.label} onChange={e => setAccountForm({...accountForm, label: e.target.value})} required placeholder="Work Email" />
            </div>
            <div>
              <label className="label">Email Address</label>
              <input className="input" type="email" value={accountForm.emailAddress} onChange={e => setAccountForm({...accountForm, emailAddress: e.target.value})} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">IMAP Host</label>
                <input className="input" value={accountForm.imapHost} onChange={e => setAccountForm({...accountForm, imapHost: e.target.value})} required placeholder="imap.gmail.com" />
              </div>
              <div>
                <label className="label">IMAP Port</label>
                <input className="input" type="number" value={accountForm.imapPort} onChange={e => setAccountForm({...accountForm, imapPort: +e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">SMTP Host</label>
                <input className="input" value={accountForm.smtpHost} onChange={e => setAccountForm({...accountForm, smtpHost: e.target.value})} required placeholder="smtp.gmail.com" />
              </div>
              <div>
                <label className="label">SMTP Port</label>
                <input className="input" type="number" value={accountForm.smtpPort} onChange={e => setAccountForm({...accountForm, smtpPort: +e.target.value})} />
              </div>
            </div>
            <div>
              <label className="label">Username</label>
              <input className="input" value={accountForm.username} onChange={e => setAccountForm({...accountForm, username: e.target.value})} required />
            </div>
            <div>
              <label className="label">Password / App Password</label>
              <input className="input" type="password" value={accountForm.password} onChange={e => setAccountForm({...accountForm, password: e.target.value})} required />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary">Add Account</button>
              <button type="button" onClick={() => setShowAddAccount(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Email"
        actions={
          <div className="flex gap-2">
            <button onClick={syncEmail} className="btn-secondary" disabled={syncing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} /> Sync
            </button>
            <button onClick={() => setShowCompose(true)} className="btn-primary">
              <Plus className="h-4 w-4 mr-2" /> Compose
            </button>
          </div>
        }
      />

      {/* Account tabs */}
      {accounts.length > 1 && (
        <div className="flex gap-2 mb-4">
          {accounts.map(acc => (
            <button
              key={acc.id}
              onClick={() => setSelectedAccount(acc.id)}
              className={`btn-sm ${selectedAccount === acc.id ? 'btn-primary' : 'btn-secondary'}`}
            >
              {acc.label}
            </button>
          ))}
          <button onClick={() => setShowAddAccount(true)} className="btn-sm btn-ghost">
            <Plus className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Compose modal */}
      {showCompose && (
        <div className="card mb-4">
          <div className="card-header flex items-center justify-between">
            <h3 className="font-medium">New Message</h3>
            <button onClick={() => setShowCompose(false)} className="btn-ghost btn-sm">Cancel</button>
          </div>
          <div className="card-body">
            <form onSubmit={handleSend} className="space-y-3">
              <input className="input" placeholder="To (comma-separated)" value={composeTo} onChange={e => setComposeTo(e.target.value)} required />
              <input className="input" placeholder="Subject" value={composeSubject} onChange={e => setComposeSubject(e.target.value)} />
              <textarea className="input min-h-[200px]" placeholder="Message body..." value={composeBody} onChange={e => setComposeBody(e.target.value)} required />
              <button type="submit" className="btn-primary" disabled={sending}>
                <Send className="h-4 w-4 mr-2" /> {sending ? 'Sending...' : 'Send'}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Message list */}
        <div className={`card ${selectedMessage ? 'lg:col-span-1' : 'lg:col-span-3'}`}>
          <div className="divide-y divide-gray-100 max-h-[calc(100vh-16rem)] overflow-y-auto">
            {loading ? <LoadingSpinner size="sm" /> : messages.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">No messages</div>
            ) : (
              messages.map(msg => (
                <div
                  key={msg.id}
                  onClick={() => openMessage(msg.id)}
                  className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 ${
                    !msg.isRead ? 'bg-blue-50/50' : ''
                  } ${selectedMessage?.id === msg.id ? 'bg-primary-50' : ''}`}
                >
                  <button
                    onClick={e => { e.stopPropagation(); toggleStar(msg.id, msg.isStarred); }}
                    className="mt-0.5"
                  >
                    <Star className={`h-4 w-4 ${msg.isStarred ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm truncate ${!msg.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                        {msg.fromName || msg.fromAddress}
                      </p>
                      {msg.hasAttachments && <Paperclip className="h-3 w-3 text-gray-400 flex-shrink-0" />}
                    </div>
                    <p className={`text-sm truncate ${!msg.isRead ? 'font-medium text-gray-800' : 'text-gray-600'}`}>
                      {msg.subject || '(no subject)'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {format(new Date(msg.date), 'MMM d, h:mm a')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Message detail */}
        {selectedMessage && (
          <div className="card lg:col-span-2">
            <div className="card-header">
              <button onClick={() => setSelectedMessage(null)} className="btn-ghost btn-sm mb-2 lg:hidden">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </button>
              <h2 className="text-lg font-medium text-gray-900">{selectedMessage.subject || '(no subject)'}</h2>
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                <span className="font-medium text-gray-700">
                  {selectedMessage.fromName || selectedMessage.fromAddress}
                </span>
                <span>&lt;{selectedMessage.fromAddress}&gt;</span>
                <span className="ml-auto">{format(new Date(selectedMessage.date), 'MMM d, yyyy h:mm a')}</span>
              </div>
            </div>
            <div className="card-body">
              {selectedMessage.bodyHtml ? (
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedMessage.bodyHtml }}
                />
              ) : (
                <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                  {selectedMessage.bodyText || 'No content'}
                </pre>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
