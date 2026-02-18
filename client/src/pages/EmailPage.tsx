import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Mail, Star, Paperclip, RefreshCw, Plus, Send, Search,
  Inbox, SendHorizontal, FileEdit, Trash2, AlertCircle,
  Reply, ReplyAll, Forward, MailOpen, X, ChevronDown,
  Archive, Flag,
} from 'lucide-react';
import { format, isToday, isYesterday, isThisYear } from 'date-fns';
import api from '../services/api';
import type { EmailAccount, EmailMessage, EmailFolder } from '../types';
import LoadingSpinner from '../components/shared/LoadingSpinner';

// ============================================================
// HELPERS
// ============================================================

const AVATAR_COLORS = [
  '#0078d4', '#00a4ef', '#7fba00', '#ff8c00', '#e81123',
  '#5c2d91', '#00bcf2', '#009e49', '#bad80a', '#ec008c',
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

function formatMessageDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return format(date, 'h:mm a');
  if (isYesterday(date)) return 'Yesterday';
  if (isThisYear(date)) return format(date, 'MMM d');
  return format(date, 'M/d/yyyy');
}

function formatFullDate(dateStr: string): string {
  return format(new Date(dateStr), 'EEEE, MMMM d, yyyy h:mm a');
}

interface FolderDef {
  key: string;
  label: string;
  icon: typeof Inbox;
  folder?: string;
  starred?: boolean;
}

const FOLDER_DEFS: FolderDef[] = [
  { key: 'inbox', label: 'Inbox', icon: Inbox, folder: 'INBOX' },
  { key: 'sent', label: 'Sent Items', icon: SendHorizontal, folder: 'Sent' },
  { key: 'drafts', label: 'Drafts', icon: FileEdit, folder: 'Drafts' },
  { key: 'junk', label: 'Junk Email', icon: AlertCircle, folder: 'Junk' },
  { key: 'deleted', label: 'Deleted Items', icon: Trash2, folder: 'Trash' },
  { key: 'starred', label: 'Flagged', icon: Flag, starred: true },
];

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function EmailPage() {
  // Account state
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  // Folder state
  const [activeFolderKey, setActiveFolderKey] = useState('inbox');
  const [folderCounts, setFolderCounts] = useState<EmailFolder[]>([]);
  const [starredCount, setStarredCount] = useState(0);

  // Message state
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [totalMessages, setTotalMessages] = useState(0);
  const [selectedMessage, setSelectedMessage] = useState<EmailMessage | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // UI state
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);

  // Compose state
  const [composeMode, setComposeMode] = useState<'new' | 'reply' | 'replyAll' | 'forward'>('new');
  const [composeTo, setComposeTo] = useState('');
  const [composeCc, setComposeCc] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [sending, setSending] = useState(false);

  // Add account form
  const [accountForm, setAccountForm] = useState({
    label: '', emailAddress: '', imapHost: '', imapPort: 993,
    smtpHost: '', smtpPort: 587, username: '', password: '',
  });

  const activeFolder = FOLDER_DEFS.find(f => f.key === activeFolderKey) || FOLDER_DEFS[0];

  // ============================================================
  // DATA LOADING
  // ============================================================

  const loadAccounts = useCallback(async () => {
    try {
      const { data } = await api.get('/email/accounts');
      setAccounts(data.accounts);
      if (data.accounts.length > 0 && !selectedAccountId) {
        setSelectedAccountId(data.accounts[0].id);
      }
    } catch (err) {
      console.error('Failed to load email accounts:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedAccountId]);

  const loadFolderCounts = useCallback(async () => {
    if (!selectedAccountId) return;
    try {
      const { data } = await api.get(`/email/accounts/${selectedAccountId}/folders`);
      setFolderCounts(data.folders);
      setStarredCount(data.starredCount);
    } catch (err) {
      console.error('Failed to load folder counts:', err);
    }
  }, [selectedAccountId]);

  const loadMessages = useCallback(async (search?: string) => {
    if (!selectedAccountId) return;
    setMessagesLoading(true);
    try {
      const params: Record<string, string> = {};
      if (activeFolder.starred) {
        params.starred = 'true';
      } else if (activeFolder.folder) {
        params.folder = activeFolder.folder;
      }
      if (search) params.search = search;

      const { data } = await api.get(`/email/accounts/${selectedAccountId}/messages`, { params });
      setMessages(data.messages);
      setTotalMessages(data.total);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setMessagesLoading(false);
    }
  }, [selectedAccountId, activeFolder]);

  useEffect(() => { loadAccounts(); }, []);

  useEffect(() => {
    if (selectedAccountId) {
      loadMessages();
      loadFolderCounts();
      setSelectedMessage(null);
    }
  }, [selectedAccountId, activeFolderKey]);

  // Debounced search
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      if (selectedAccountId) loadMessages(searchQuery || undefined);
    }, 300);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [searchQuery]);

  // ============================================================
  // ACTIONS
  // ============================================================

  async function syncEmail() {
    if (!selectedAccountId) return;
    setSyncing(true);
    try {
      const body: Record<string, string> = {};
      if (activeFolder.folder && activeFolder.folder !== 'INBOX') {
        body.folder = activeFolder.folder;
      }
      await api.post(`/email/accounts/${selectedAccountId}/sync`, body);
      await Promise.all([loadMessages(), loadFolderCounts()]);
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

  async function toggleStar(e: React.MouseEvent, id: string, isStarred: boolean) {
    e.stopPropagation();
    try {
      await api.patch(`/email/messages/${id}`, { isStarred: !isStarred });
      setMessages(msgs => msgs.map(m => m.id === id ? { ...m, isStarred: !isStarred } : m));
      if (selectedMessage?.id === id) {
        setSelectedMessage(prev => prev ? { ...prev, isStarred: !isStarred } : null);
      }
    } catch (err) {
      console.error('Failed to toggle star:', err);
    }
  }

  async function toggleRead(id: string, isRead: boolean) {
    try {
      await api.patch(`/email/messages/${id}`, { isRead: !isRead });
      setMessages(msgs => msgs.map(m => m.id === id ? { ...m, isRead: !isRead } : m));
      if (selectedMessage?.id === id) {
        setSelectedMessage(prev => prev ? { ...prev, isRead: !isRead } : null);
      }
    } catch (err) {
      console.error('Failed to toggle read:', err);
    }
  }

  async function deleteMessage(id: string) {
    try {
      await api.delete(`/email/messages/${id}`);
      setMessages(msgs => msgs.filter(m => m.id !== id));
      if (selectedMessage?.id === id) setSelectedMessage(null);
      loadFolderCounts();
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  }

  function openCompose(mode: 'new' | 'reply' | 'replyAll' | 'forward', msg?: EmailMessage | null) {
    setComposeMode(mode);
    if (mode === 'new' || !msg) {
      setComposeTo('');
      setComposeCc('');
      setComposeSubject('');
      setComposeBody('');
    } else if (mode === 'reply') {
      setComposeTo(msg.fromAddress);
      setComposeCc('');
      setComposeSubject(`Re: ${(msg.subject || '').replace(/^Re:\s*/i, '')}`);
      setComposeBody(`\n\n--- Original Message ---\nFrom: ${msg.fromName || msg.fromAddress}\nDate: ${formatFullDate(msg.date)}\n\n${msg.bodyText || ''}`);
    } else if (mode === 'replyAll') {
      setComposeTo(msg.fromAddress);
      const ccAddrs = [
        ...(msg.toAddresses || []).map(a => a.address),
        ...(msg.ccAddresses || []).map(a => a.address),
      ].filter(Boolean).join(', ');
      setComposeCc(ccAddrs);
      setComposeSubject(`Re: ${(msg.subject || '').replace(/^Re:\s*/i, '')}`);
      setComposeBody(`\n\n--- Original Message ---\nFrom: ${msg.fromName || msg.fromAddress}\nDate: ${formatFullDate(msg.date)}\n\n${msg.bodyText || ''}`);
    } else if (mode === 'forward') {
      setComposeTo('');
      setComposeCc('');
      setComposeSubject(`Fwd: ${(msg.subject || '').replace(/^Fwd:\s*/i, '')}`);
      setComposeBody(`\n\n--- Forwarded Message ---\nFrom: ${msg.fromName || msg.fromAddress}\nDate: ${formatFullDate(msg.date)}\nSubject: ${msg.subject || ''}\n\n${msg.bodyText || ''}`);
    }
    setShowCompose(true);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAccountId) return;
    setSending(true);
    try {
      await api.post('/email/send', {
        accountId: selectedAccountId,
        to: composeTo.split(',').map(s => s.trim()).filter(Boolean),
        cc: composeCc ? composeCc.split(',').map(s => s.trim()).filter(Boolean) : undefined,
        subject: composeSubject,
        body: composeBody,
        isHtml: false,
      });
      setShowCompose(false);
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
      setAccountForm({
        label: '', emailAddress: '', imapHost: '', imapPort: 993,
        smtpHost: '', smtpPort: 587, username: '', password: '',
      });
      loadAccounts();
    } catch (err) {
      console.error('Failed to add account:', err);
    }
  }

  // ============================================================
  // RENDER HELPERS
  // ============================================================

  function getFolderUnread(folderDef: FolderDef): number {
    if (folderDef.starred) return starredCount;
    const found = folderCounts.find(f => f.name === folderDef.folder);
    return found?.unread || 0;
  }

  const senderDisplay = (msg: EmailMessage) => msg.fromName || msg.fromAddress;

  // ============================================================
  // LOADING / NO ACCOUNTS
  // ============================================================

  if (loading && accounts.length === 0) {
    return (
      <div className="-m-6 flex items-center justify-center h-screen bg-white">
        <LoadingSpinner />
      </div>
    );
  }

  if (accounts.length === 0 && !showAddAccount) {
    return (
      <div className="-m-6 flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center max-w-sm">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center mb-4">
            <Mail className="h-8 w-8 text-primary-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Welcome to Mail</h2>
          <p className="text-sm text-gray-500 mb-6">Connect your email account to get started</p>
          <button onClick={() => setShowAddAccount(true)} className="btn-primary">
            <Plus className="h-4 w-4 mr-2" /> Add Email Account
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // ADD ACCOUNT MODAL
  // ============================================================

  if (showAddAccount) {
    return (
      <div className="-m-6 flex items-center justify-center h-screen bg-gray-900/50">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">Add Email Account</h2>
            <button onClick={() => setShowAddAccount(false)} className="p-1 rounded-lg hover:bg-gray-100">
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
          <form onSubmit={addAccount} className="p-6 space-y-4">
            <div>
              <label className="label">Account Name</label>
              <input className="input" value={accountForm.label} onChange={e => setAccountForm({...accountForm, label: e.target.value})} required placeholder="Work Email" />
            </div>
            <div>
              <label className="label">Email Address</label>
              <input className="input" type="email" value={accountForm.emailAddress} onChange={e => setAccountForm({...accountForm, emailAddress: e.target.value})} required placeholder="you@company.com" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="label">IMAP Server</label>
                <input className="input" value={accountForm.imapHost} onChange={e => setAccountForm({...accountForm, imapHost: e.target.value})} required placeholder="imap.gmail.com" />
              </div>
              <div>
                <label className="label">Port</label>
                <input className="input" type="number" value={accountForm.imapPort} onChange={e => setAccountForm({...accountForm, imapPort: +e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="label">SMTP Server</label>
                <input className="input" value={accountForm.smtpHost} onChange={e => setAccountForm({...accountForm, smtpHost: e.target.value})} required placeholder="smtp.gmail.com" />
              </div>
              <div>
                <label className="label">Port</label>
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
            <div className="flex gap-2 pt-2">
              <button type="submit" className="btn-primary flex-1">Connect Account</button>
              <button type="button" onClick={() => setShowAddAccount(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ============================================================
  // MAIN OUTLOOK LAYOUT
  // ============================================================

  return (
    <div className="-m-6 flex flex-col h-screen bg-white">
      {/* ====== TOOLBAR ====== */}
      <div className="flex items-center gap-1 px-3 py-2 border-b bg-gray-50 flex-shrink-0">
        {/* New Mail */}
        <button
          onClick={() => openCompose('new')}
          className="flex items-center gap-2 px-4 py-1.5 rounded-md bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Mail
        </button>

        <div className="w-px h-6 bg-gray-300 mx-2" />

        {/* Message actions */}
        <button
          onClick={() => selectedMessage && deleteMessage(selectedMessage.id)}
          disabled={!selectedMessage}
          className="toolbar-btn"
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
          <span className="hidden xl:inline">Delete</span>
        </button>
        <button
          onClick={() => selectedMessage && toggleRead(selectedMessage.id, selectedMessage.isRead)}
          disabled={!selectedMessage}
          className="toolbar-btn"
          title={selectedMessage?.isRead ? 'Mark as unread' : 'Mark as read'}
        >
          <MailOpen className="h-4 w-4" />
          <span className="hidden xl:inline">{selectedMessage?.isRead ? 'Unread' : 'Read'}</span>
        </button>

        <div className="w-px h-6 bg-gray-300 mx-2" />

        {/* Reply actions */}
        <button
          onClick={() => openCompose('reply', selectedMessage)}
          disabled={!selectedMessage}
          className="toolbar-btn"
          title="Reply"
        >
          <Reply className="h-4 w-4" />
          <span className="hidden xl:inline">Reply</span>
        </button>
        <button
          onClick={() => openCompose('replyAll', selectedMessage)}
          disabled={!selectedMessage}
          className="toolbar-btn"
          title="Reply All"
        >
          <ReplyAll className="h-4 w-4" />
          <span className="hidden xl:inline">Reply All</span>
        </button>
        <button
          onClick={() => openCompose('forward', selectedMessage)}
          disabled={!selectedMessage}
          className="toolbar-btn"
          title="Forward"
        >
          <Forward className="h-4 w-4" />
          <span className="hidden xl:inline">Forward</span>
        </button>

        <div className="flex-1" />

        {/* Sync */}
        <button
          onClick={syncEmail}
          disabled={syncing}
          className="toolbar-btn"
          title="Sync"
        >
          <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
        </button>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search mail"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md w-52 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 bg-white"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2"
            >
              <X className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>
      </div>

      {/* ====== THREE-PANEL LAYOUT ====== */}
      <div className="flex flex-1 overflow-hidden">

        {/* ====== LEFT: FOLDER SIDEBAR ====== */}
        <div className="w-56 border-r bg-gray-50/50 flex flex-col flex-shrink-0 overflow-y-auto">
          {accounts.map(account => (
            <div key={account.id} className="py-2">
              {/* Account header */}
              <button
                onClick={() => {
                  setSelectedAccountId(account.id);
                  setActiveFolderKey('inbox');
                }}
                className={`w-full flex items-center gap-2 px-4 py-1.5 text-sm font-semibold text-left truncate ${
                  selectedAccountId === account.id ? 'text-gray-900' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Mail className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{account.label}</span>
              </button>

              {/* Folders (only show for selected account) */}
              {selectedAccountId === account.id && (
                <div className="mt-0.5">
                  {FOLDER_DEFS.map(f => {
                    const unread = getFolderUnread(f);
                    const isActive = activeFolderKey === f.key;
                    const Icon = f.icon;
                    return (
                      <button
                        key={f.key}
                        onClick={() => setActiveFolderKey(f.key)}
                        className={`w-full flex items-center gap-2.5 pl-8 pr-3 py-1.5 text-sm transition-colors ${
                          isActive
                            ? 'bg-primary-100 text-primary-800 font-medium'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate flex-1 text-left">{f.label}</span>
                        {unread > 0 && (
                          <span className={`text-xs font-semibold ${
                            isActive ? 'text-primary-700' : 'text-primary-600'
                          }`}>
                            {unread}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          {/* Add account */}
          <div className="mt-auto border-t py-2">
            <button
              onClick={() => setShowAddAccount(true)}
              className="w-full flex items-center gap-2 px-4 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add account
            </button>
          </div>
        </div>

        {/* ====== MIDDLE: MESSAGE LIST ====== */}
        <div className="w-80 border-r flex flex-col flex-shrink-0 bg-white">
          {/* Folder title */}
          <div className="px-4 py-3 border-b flex-shrink-0">
            <h2 className="text-base font-semibold text-gray-900">{activeFolder.label}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {totalMessages} message{totalMessages !== 1 ? 's' : ''}
              {searchQuery && <span> matching "{searchQuery}"</span>}
            </p>
          </div>

          {/* Message rows */}
          <div className="flex-1 overflow-y-auto">
            {messagesLoading ? (
              <LoadingSpinner size="sm" />
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Mail className="h-10 w-10 mb-3" />
                <p className="text-sm">No messages</p>
              </div>
            ) : (
              messages.map(msg => {
                const sender = senderDisplay(msg);
                const isSelected = selectedMessage?.id === msg.id;
                return (
                  <div
                    key={msg.id}
                    onClick={() => openMessage(msg.id)}
                    className={`relative flex gap-3 px-4 py-3 cursor-pointer border-b border-gray-100 transition-colors ${
                      isSelected
                        ? 'bg-primary-50'
                        : msg.isRead
                          ? 'hover:bg-gray-50'
                          : 'bg-blue-50/40 hover:bg-blue-50/70'
                    }`}
                  >
                    {/* Unread indicator */}
                    {!msg.isRead && (
                      <div className="absolute left-0 top-3 bottom-3 w-[3px] bg-primary-600 rounded-r" />
                    )}

                    {/* Avatar */}
                    <div
                      className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold mt-0.5"
                      style={{ backgroundColor: getAvatarColor(sender) }}
                    >
                      {getInitials(sender)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm truncate ${!msg.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                          {sender}
                        </p>
                        <span className="text-xs text-gray-400 flex-shrink-0 whitespace-nowrap">
                          {formatMessageDate(msg.date)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <p className={`text-sm truncate ${!msg.isRead ? 'font-medium text-gray-800' : 'text-gray-600'}`}>
                          {msg.subject || '(no subject)'}
                        </p>
                        {msg.hasAttachments && <Paperclip className="h-3 w-3 text-gray-400 flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {msg.bodyPreview || ''}
                      </p>
                    </div>

                    {/* Star */}
                    <button
                      onClick={e => toggleStar(e, msg.id, msg.isStarred)}
                      className="flex-shrink-0 mt-0.5 p-0.5 rounded hover:bg-gray-200/50"
                    >
                      {msg.isStarred ? (
                        <Flag className="h-3.5 w-3.5 fill-red-500 text-red-500" />
                      ) : (
                        <Flag className="h-3.5 w-3.5 text-gray-300 hover:text-gray-400" />
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ====== RIGHT: READING PANE ====== */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          {selectedMessage ? (
            <>
              {/* Message header */}
              <div className="px-6 py-4 border-b flex-shrink-0">
                <h2 className="text-xl font-semibold text-gray-900 mb-3">
                  {selectedMessage.subject || '(no subject)'}
                </h2>

                <div className="flex items-start gap-3">
                  {/* Sender avatar */}
                  <div
                    className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                    style={{ backgroundColor: getAvatarColor(senderDisplay(selectedMessage)) }}
                  >
                    {getInitials(senderDisplay(selectedMessage))}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-gray-900">
                        {selectedMessage.fromName || selectedMessage.fromAddress}
                      </span>
                      <span className="text-sm text-gray-500">
                        &lt;{selectedMessage.fromAddress}&gt;
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 mt-0.5">
                      To: {(selectedMessage.toAddresses || []).map(a => a.name || a.address).join(', ')}
                      {selectedMessage.ccAddresses && (selectedMessage.ccAddresses as Array<{address: string; name?: string}>).length > 0 && (
                        <span className="ml-2">
                          Cc: {(selectedMessage.ccAddresses as Array<{address: string; name?: string}>).map(a => a.name || a.address).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-gray-400">
                      {formatFullDate(selectedMessage.date)}
                    </span>
                  </div>
                </div>

                {/* Inline reply actions */}
                <div className="flex items-center gap-1 mt-3 pt-3 border-t">
                  <button
                    onClick={() => openCompose('reply', selectedMessage)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-md text-sm text-gray-600 hover:bg-gray-100 border border-gray-200"
                  >
                    <Reply className="h-3.5 w-3.5" /> Reply
                  </button>
                  <button
                    onClick={() => openCompose('replyAll', selectedMessage)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-md text-sm text-gray-600 hover:bg-gray-100 border border-gray-200"
                  >
                    <ReplyAll className="h-3.5 w-3.5" /> Reply All
                  </button>
                  <button
                    onClick={() => openCompose('forward', selectedMessage)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-md text-sm text-gray-600 hover:bg-gray-100 border border-gray-200"
                  >
                    <Forward className="h-3.5 w-3.5" /> Forward
                  </button>
                </div>
              </div>

              {/* Message body */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {selectedMessage.bodyHtml ? (
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: selectedMessage.bodyHtml }}
                  />
                ) : (
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">
                    {selectedMessage.bodyText || 'No content'}
                  </pre>
                )}
              </div>
            </>
          ) : (
            /* Empty state */
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Mail className="h-16 w-16 mx-auto mb-4 text-gray-200" />
                <p className="text-lg font-medium text-gray-400">Select a message to read</p>
                <p className="text-sm text-gray-300 mt-1">Choose an item from the message list</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ====== COMPOSE OVERLAY ====== */}
      {showCompose && (
        <div className="fixed bottom-0 right-8 w-[560px] bg-white rounded-t-xl shadow-2xl border border-gray-200 flex flex-col z-50" style={{ maxHeight: 'calc(100vh - 80px)' }}>
          {/* Compose header */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-primary-700 rounded-t-xl">
            <h3 className="text-sm font-medium text-white">
              {composeMode === 'new' ? 'New Message' :
               composeMode === 'reply' ? 'Reply' :
               composeMode === 'replyAll' ? 'Reply All' : 'Forward'}
            </h3>
            <button onClick={() => setShowCompose(false)} className="text-white/80 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSend} className="flex flex-col flex-1 overflow-hidden">
            <div className="px-4 py-2 space-y-1 border-b flex-shrink-0">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-500 w-8">To</label>
                <input
                  className="flex-1 text-sm py-1 border-0 focus:outline-none focus:ring-0"
                  value={composeTo}
                  onChange={e => setComposeTo(e.target.value)}
                  required
                  placeholder="Recipients"
                />
              </div>
              <div className="flex items-center gap-2 border-t pt-1">
                <label className="text-sm text-gray-500 w-8">Cc</label>
                <input
                  className="flex-1 text-sm py-1 border-0 focus:outline-none focus:ring-0"
                  value={composeCc}
                  onChange={e => setComposeCc(e.target.value)}
                  placeholder=""
                />
              </div>
              <div className="flex items-center gap-2 border-t pt-1">
                <label className="text-sm text-gray-500 w-8 flex-shrink-0">Subj</label>
                <input
                  className="flex-1 text-sm py-1 border-0 focus:outline-none focus:ring-0"
                  value={composeSubject}
                  onChange={e => setComposeSubject(e.target.value)}
                  placeholder="Subject"
                />
              </div>
            </div>

            <textarea
              className="flex-1 px-4 py-3 text-sm resize-none focus:outline-none min-h-[200px]"
              value={composeBody}
              onChange={e => setComposeBody(e.target.value)}
              placeholder="Type your message here..."
              required
            />

            <div className="flex items-center gap-2 px-4 py-2.5 border-t bg-gray-50 flex-shrink-0">
              <button type="submit" className="btn-primary text-sm py-1.5" disabled={sending}>
                <Send className="h-3.5 w-3.5 mr-1.5" />
                {sending ? 'Sending...' : 'Send'}
              </button>
              <button
                type="button"
                onClick={() => setShowCompose(false)}
                className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5"
              >
                Discard
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
