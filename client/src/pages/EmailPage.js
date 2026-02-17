import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  Inbox,
  Send,
  FileText,
  Trash2,
  Star,
  RefreshCw,
  PenSquare,
  ChevronLeft,
  Search,
  Plus,
  X,
} from 'lucide-react';

const FOLDERS = [
  { key: 'inbox', label: 'Inbox', icon: Inbox },
  { key: 'sent', label: 'Sent', icon: Send },
  { key: 'drafts', label: 'Drafts', icon: FileText },
  { key: 'trash', label: 'Trash', icon: Trash2 },
];

const EMAILS_PER_PAGE = 20;

export default function EmailPage() {
  const [folder, setFolder] = useState('inbox');
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [composing, setComposing] = useState(false);
  const [composeForm, setComposeForm] = useState({
    to: '',
    cc: '',
    subject: '',
    body: '',
  });
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [unreadCounts, setUnreadCounts] = useState({
    inbox: 0,
    sent: 0,
    drafts: 0,
    trash: 0,
  });
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);

  // Fetch emails when folder or page changes
  useEffect(() => {
    fetchEmails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folder, page]);

  // Fetch templates on mount
  useEffect(() => {
    fetchTemplates();
  }, []);

  async function fetchEmails() {
    setLoading(true);
    try {
      const response = await api.get('/emails', {
        params: {
          folder,
          page,
          limit: EMAILS_PER_PAGE,
          search: searchQuery || undefined,
        },
      });
      const data = response.data;
      setEmails(data.emails || []);
      setTotalPages(data.totalPages || 1);
      if (data.unreadCounts) {
        setUnreadCounts(data.unreadCounts);
      }
    } catch (err) {
      console.error('Failed to fetch emails:', err);
      setEmails([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTemplates() {
    try {
      const response = await api.get('/emails/templates');
      setTemplates(response.data.templates || response.data || []);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    }
  }

  async function handleSend() {
    try {
      await api.post('/emails', {
        to: composeForm.to,
        cc: composeForm.cc,
        subject: composeForm.subject,
        body: composeForm.body,
      });
      setComposing(false);
      setComposeForm({ to: '', cc: '', subject: '', body: '' });
      if (folder === 'sent') {
        fetchEmails();
      }
    } catch (err) {
      console.error('Failed to send email:', err);
    }
  }

  async function handleSaveDraft() {
    try {
      await api.post('/emails/draft', {
        to: composeForm.to,
        cc: composeForm.cc,
        subject: composeForm.subject,
        body: composeForm.body,
      });
      setComposing(false);
      setComposeForm({ to: '', cc: '', subject: '', body: '' });
      if (folder === 'drafts') {
        fetchEmails();
      }
    } catch (err) {
      console.error('Failed to save draft:', err);
    }
  }

  async function handleStar(emailId, e) {
    e.stopPropagation();
    try {
      await api.put(`/emails/${emailId}/star`);
      setEmails((prev) =>
        prev.map((em) =>
          em.id === emailId ? { ...em, starred: !em.starred } : em
        )
      );
      if (selectedEmail && selectedEmail.id === emailId) {
        setSelectedEmail((prev) => ({ ...prev, starred: !prev.starred }));
      }
    } catch (err) {
      console.error('Failed to toggle star:', err);
    }
  }

  async function handleMarkRead(email) {
    if (email.read) return;
    try {
      await api.put(`/emails/${email.id}/read`);
      setEmails((prev) =>
        prev.map((em) => (em.id === email.id ? { ...em, read: true } : em))
      );
      setUnreadCounts((prev) => ({
        ...prev,
        [folder]: Math.max(0, (prev[folder] || 0) - 1),
      }));
    } catch (err) {
      console.error('Failed to mark email as read:', err);
    }
  }

  async function handleDelete(emailId) {
    try {
      await api.delete(`/emails/${emailId}`);
      if (selectedEmail && selectedEmail.id === emailId) {
        setSelectedEmail(null);
      }
      setEmails((prev) => prev.filter((em) => em.id !== emailId));
    } catch (err) {
      console.error('Failed to delete email:', err);
    }
  }

  function handleSelectEmail(email) {
    setComposing(false);
    setSelectedEmail(email);
    handleMarkRead(email);
  }

  function handleCompose() {
    setSelectedEmail(null);
    setComposeForm({ to: '', cc: '', subject: '', body: '' });
    setComposing(true);
  }

  function handleReply() {
    if (!selectedEmail) return;
    setComposeForm({
      to: selectedEmail.from || '',
      cc: '',
      subject: `Re: ${selectedEmail.subject || ''}`,
      body: `\n\n--- Original Message ---\n${selectedEmail.body || ''}`,
    });
    setSelectedEmail(null);
    setComposing(true);
  }

  function handleUseTemplate(template) {
    setComposeForm((prev) => ({
      ...prev,
      subject: template.subject || prev.subject,
      body: template.body || '',
    }));
  }

  function handleSearch(e) {
    e.preventDefault();
    setPage(1);
    fetchEmails();
  }

  function formatTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  function truncate(str, len) {
    if (!str) return '';
    return str.length > len ? str.substring(0, len) + '...' : str;
  }

  // ── Templates Modal ──
  function renderTemplatesModal() {
    if (!showTemplatesModal) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-slate-700">Email Templates</h2>
            <button
              onClick={() => setShowTemplatesModal(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>
          <div className="p-6 max-h-96 overflow-y-auto">
            {templates.length === 0 ? (
              <p className="text-gray-500 text-sm">No templates available.</p>
            ) : (
              <ul className="space-y-3">
                {templates.map((tpl) => (
                  <li
                    key={tpl.id}
                    className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      handleUseTemplate(tpl);
                      setShowTemplatesModal(false);
                      if (!composing) {
                        handleCompose();
                      }
                    }}
                  >
                    <p className="font-medium text-slate-700">{tpl.name || tpl.subject}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {truncate(tpl.subject || '', 60)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Left Panel: Folder Sidebar ──
  function renderSidebar() {
    return (
      <div className="w-48 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
        {/* Compose Button */}
        <div className="p-3">
          <button
            onClick={handleCompose}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-redrock-500 text-white rounded-lg hover:bg-redrock-600 transition-colors font-medium shadow-sm"
          >
            <PenSquare size={16} />
            Compose
          </button>
        </div>

        {/* Folders */}
        <nav className="flex-1 px-2 py-1">
          {FOLDERS.map(({ key, label, icon: Icon }) => {
            const isActive = folder === key;
            const count = unreadCounts[key] || 0;
            return (
              <button
                key={key}
                onClick={() => {
                  setFolder(key);
                  setPage(1);
                  setSelectedEmail(null);
                  setComposing(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm mb-0.5 transition-colors ${
                  isActive
                    ? 'bg-redrock-50 text-redrock-700 font-semibold'
                    : 'text-slate-600 hover:bg-gray-100'
                }`}
              >
                <Icon size={18} />
                <span className="flex-1 text-left">{label}</span>
                {count > 0 && (
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-redrock-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Templates Link */}
        <div className="px-3 pb-4 border-t border-gray-200 pt-3">
          <button
            onClick={() => setShowTemplatesModal(true)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FileText size={16} />
            Templates
          </button>
        </div>
      </div>
    );
  }

  // ── Middle Panel: Email List ──
  function renderEmailList() {
    return (
      <div className="w-80 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
        {/* Search Bar */}
        <div className="p-3 border-b border-gray-200">
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search emails..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-redrock-500 focus:border-transparent"
              />
            </div>
            <button
              type="button"
              onClick={fetchEmails}
              className="p-2 text-gray-500 hover:text-redrock-500 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </form>
        </div>

        {/* Email List */}
        <div className="flex-1 overflow-y-auto">
          {loading && emails.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw size={20} className="animate-spin text-gray-400" />
            </div>
          ) : emails.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400">
              <Inbox size={24} />
              <p className="mt-2 text-sm">No emails in this folder</p>
            </div>
          ) : (
            emails.map((email) => {
              const isSelected = selectedEmail && selectedEmail.id === email.id;
              const isUnread = !email.read;
              return (
                <div
                  key={email.id}
                  onClick={() => handleSelectEmail(email)}
                  className={`px-4 py-3 border-b border-gray-100 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-redrock-50 border-l-2 border-l-redrock-500'
                      : 'hover:bg-gray-50'
                  } ${isUnread ? 'bg-blue-50/40' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <p
                      className={`text-sm truncate flex-1 ${
                        isUnread ? 'font-bold text-slate-800' : 'text-slate-600'
                      }`}
                    >
                      {folder === 'sent' || folder === 'drafts'
                        ? truncate(email.to, 28)
                        : truncate(email.from, 28)}
                    </p>
                    <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                      <button
                        onClick={(e) => handleStar(email.id, e)}
                        className="p-0.5"
                      >
                        <Star
                          size={14}
                          className={
                            email.starred
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300 hover:text-yellow-400'
                          }
                        />
                      </button>
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {formatTime(email.date)}
                      </span>
                    </div>
                  </div>
                  <p
                    className={`text-sm mt-0.5 truncate ${
                      isUnread ? 'font-semibold text-slate-700' : 'text-slate-600'
                    }`}
                  >
                    {truncate(email.subject, 40)}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">
                    {truncate(email.preview || email.body, 50)}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 text-sm">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 rounded text-slate-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <span className="text-gray-500">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 rounded text-slate-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Right Panel: Email Detail ──
  function renderEmailDetail() {
    if (!selectedEmail) return null;
    return (
      <div className="flex-1 flex flex-col bg-white overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <button
            onClick={() => setSelectedEmail(null)}
            className="md:hidden flex items-center gap-1 text-sm text-slate-600 hover:text-redrock-500"
          >
            <ChevronLeft size={16} />
            Back
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReply}
              className="px-3 py-1.5 text-sm bg-redrock-500 text-white rounded-lg hover:bg-redrock-600 transition-colors"
            >
              Reply
            </button>
            <button
              onClick={(e) => handleStar(selectedEmail.id, e)}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Star
                size={18}
                className={
                  selectedEmail.starred
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-400 hover:text-yellow-400'
                }
              />
            </button>
            <button
              onClick={() => handleDelete(selectedEmail.id)}
              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        {/* Email Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <h1 className="text-xl font-semibold text-slate-800 mb-4">
            {selectedEmail.subject || '(No Subject)'}
          </h1>

          <div className="space-y-1 text-sm text-gray-600 mb-6 border-b border-gray-100 pb-4">
            <div className="flex">
              <span className="w-14 font-medium text-slate-500">From:</span>
              <span>{selectedEmail.from}</span>
            </div>
            <div className="flex">
              <span className="w-14 font-medium text-slate-500">To:</span>
              <span>{selectedEmail.to}</span>
            </div>
            {selectedEmail.cc && (
              <div className="flex">
                <span className="w-14 font-medium text-slate-500">Cc:</span>
                <span>{selectedEmail.cc}</span>
              </div>
            )}
            <div className="flex">
              <span className="w-14 font-medium text-slate-500">Date:</span>
              <span>
                {selectedEmail.date
                  ? new Date(selectedEmail.date).toLocaleString()
                  : ''}
              </span>
            </div>
          </div>

          {/* Render email body as HTML */}
          <div
            className="prose prose-sm max-w-none text-slate-700"
            dangerouslySetInnerHTML={{ __html: selectedEmail.body || '' }}
          />
        </div>
      </div>
    );
  }

  // ── Right Panel: Compose ──
  function renderCompose() {
    return (
      <div className="flex-1 flex flex-col bg-white overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setComposing(false)}
              className="md:hidden flex items-center gap-1 text-sm text-slate-600 hover:text-redrock-500"
            >
              <ChevronLeft size={16} />
              Back
            </button>
            <h2 className="text-lg font-semibold text-slate-700">New Message</h2>
          </div>
          <button
            onClick={() => {
              setComposing(false);
              setComposeForm({ to: '', cc: '', subject: '', body: '' });
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Compose Form */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* To */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              To
            </label>
            <input
              type="text"
              value={composeForm.to}
              onChange={(e) =>
                setComposeForm((prev) => ({ ...prev, to: e.target.value }))
              }
              placeholder="recipient@example.com"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-redrock-500 focus:border-transparent"
            />
          </div>

          {/* Cc */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Cc
            </label>
            <input
              type="text"
              value={composeForm.cc}
              onChange={(e) =>
                setComposeForm((prev) => ({ ...prev, cc: e.target.value }))
              }
              placeholder="cc@example.com"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-redrock-500 focus:border-transparent"
            />
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Subject
            </label>
            <input
              type="text"
              value={composeForm.subject}
              onChange={(e) =>
                setComposeForm((prev) => ({ ...prev, subject: e.target.value }))
              }
              placeholder="Email subject"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-redrock-500 focus:border-transparent"
            />
          </div>

          {/* Use Template Dropdown */}
          {templates.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Use Template
              </label>
              <select
                onChange={(e) => {
                  const tpl = templates.find(
                    (t) => String(t.id) === e.target.value
                  );
                  if (tpl) handleUseTemplate(tpl);
                }}
                defaultValue=""
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-redrock-500 focus:border-transparent bg-white"
              >
                <option value="" disabled>
                  Select a template...
                </option>
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name || tpl.subject}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Body */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Body
            </label>
            <textarea
              value={composeForm.body}
              onChange={(e) =>
                setComposeForm((prev) => ({ ...prev, body: e.target.value }))
              }
              placeholder="Write your message..."
              rows={14}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-redrock-500 focus:border-transparent resize-y"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={handleSend}
            disabled={!composeForm.to || !composeForm.subject}
            className="flex items-center gap-2 px-5 py-2.5 bg-redrock-500 text-white rounded-lg hover:bg-redrock-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <Send size={16} />
            Send
          </button>
          <button
            onClick={handleSaveDraft}
            className="flex items-center gap-2 px-5 py-2.5 border border-gray-300 text-slate-600 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            <FileText size={16} />
            Save Draft
          </button>
        </div>
      </div>
    );
  }

  // ── Right Panel: Empty State ──
  function renderEmptyState() {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-400">
          <Inbox size={48} className="mx-auto mb-3" />
          <p className="text-lg font-medium">Select an email to read</p>
          <p className="text-sm mt-1">
            Or click <strong>Compose</strong> to write a new message
          </p>
        </div>
      </div>
    );
  }

  // ── Main Render ──
  return (
    <div className="flex h-full bg-gray-50">
      {/* Left Panel: Folder Sidebar */}
      {renderSidebar()}

      {/* Middle Panel: Email List */}
      {renderEmailList()}

      {/* Right Panel: Detail / Compose / Empty */}
      {composing
        ? renderCompose()
        : selectedEmail
        ? renderEmailDetail()
        : renderEmptyState()}

      {/* Templates Modal */}
      {renderTemplatesModal()}
    </div>
  );
}
