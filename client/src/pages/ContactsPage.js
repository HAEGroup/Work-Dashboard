import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Plus,
  Download,
  Upload,
  Eye,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
} from 'lucide-react';
import api from '../services/api';

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'tenant', label: 'Tenant' },
  { value: 'owner', label: 'Owner' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'lead', label: 'Lead' },
];

const LEAD_STAGE_OPTIONS = [
  { value: '', label: 'All Stages' },
  { value: 'new_lead', label: 'New Lead' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'showing', label: 'Showing' },
  { value: 'application', label: 'Application' },
  { value: 'lease_signed', label: 'Lease Signed' },
  { value: 'lost', label: 'Lost' },
];

const TYPE_BADGE_CLASSES = {
  tenant: 'bg-blue-100 text-blue-800',
  owner: 'bg-green-100 text-green-800',
  vendor: 'bg-orange-100 text-orange-800',
  lead: 'bg-purple-100 text-purple-800',
};

const LEAD_STAGE_BADGE_CLASSES = {
  new_lead: 'bg-gray-100 text-gray-800',
  contacted: 'bg-blue-100 text-blue-800',
  showing: 'bg-yellow-100 text-yellow-800',
  application: 'bg-orange-100 text-orange-800',
  lease_signed: 'bg-green-100 text-green-800',
  lost: 'bg-red-100 text-red-800',
};

const EMPTY_FORM = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  address: '',
  type: 'tenant',
  lead_stage: 'new_lead',
  tags: '',
  notes: '',
};

export default function ContactsPage() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [leadStageFilter, setLeadStageFilter] = useState('');
  const [pagination, setPagination] = useState({ limit: 20, offset: 0, total: 0 });
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('limit', pagination.limit);
      params.append('offset', pagination.offset);
      if (search) params.append('search', search);
      if (typeFilter) params.append('type', typeFilter);
      if (leadStageFilter) params.append('lead_stage', leadStageFilter);

      const response = await api.get(`/contacts?${params.toString()}`);
      const data = response.data;
      setContacts(data.contacts || data.results || data);
      setPagination((prev) => ({
        ...prev,
        total: data.total ?? data.count ?? (data.contacts || data.results || data).length,
      }));
    } catch (err) {
      console.error('Failed to fetch contacts:', err);
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, leadStageFilter, pagination.limit, pagination.offset]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Reset offset when filters change
  useEffect(() => {
    setPagination((prev) => ({ ...prev, offset: 0 }));
  }, [search, typeFilter, leadStageFilter]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        tags: formData.tags
          ? formData.tags.split(',').map((t) => t.trim()).filter(Boolean)
          : [],
      };
      await api.post('/contacts', payload);
      setShowAddModal(false);
      setFormData({ ...EMPTY_FORM });
      fetchContacts();
    } catch (err) {
      console.error('Failed to add contact:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/contacts/${id}`);
      setDeleteId(null);
      fetchContacts();
    } catch (err) {
      console.error('Failed to delete contact:', err);
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.get('/contacts/export/csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'contacts.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export contacts:', err);
    }
  };

  const totalPages = Math.ceil(pagination.total / pagination.limit) || 1;
  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;

  const goToPage = (page) => {
    setPagination((prev) => ({ ...prev, offset: (page - 1) * prev.limit }));
  };

  const formatStageName = (stage) =>
    stage
      ? stage
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase())
      : '';

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-500">Contacts</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your CRM contacts, leads, and vendors</p>
      </div>

      {/* Top Bar – Filters & Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-redrock-500 focus:border-redrock-500"
            />
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-redrock-500 focus:border-redrock-500"
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Lead Stage Filter */}
          <select
            value={leadStageFilter}
            onChange={(e) => setLeadStageFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-redrock-500 focus:border-redrock-500"
          >
            {LEAD_STAGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Action Buttons */}
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-redrock-500 text-white rounded-md text-sm font-medium hover:bg-redrock-600 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Contact
          </button>

          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2 bg-sandstone-400 text-white rounded-md text-sm font-medium hover:bg-sandstone-500 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>

          <button
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-slate-500 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Upload className="h-4 w-4" />
            Import
          </button>
        </div>
      </div>

      {/* Contacts Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-redrock-500" />
            <span className="ml-3 text-gray-500">Loading contacts...</span>
          </div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p className="text-lg font-medium">No contacts found</p>
            <p className="text-sm mt-1">Try adjusting your filters or add a new contact.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500">Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500">Email</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500">Phone</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500">Type</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500">Lead Stage</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500">Tags</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {contacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {contact.first_name} {contact.last_name}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{contact.email || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{contact.phone || '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          TYPE_BADGE_CLASSES[contact.type] || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {contact.type ? contact.type.charAt(0).toUpperCase() + contact.type.slice(1) : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {contact.type === 'lead' && contact.lead_stage ? (
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            LEAD_STAGE_BADGE_CLASSES[contact.lead_stage] || 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {formatStageName(contact.lead_stage)}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {contact.tags && contact.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {(Array.isArray(contact.tags) ? contact.tags : [contact.tags]).map(
                            (tag, idx) => (
                              <span
                                key={idx}
                                className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                              >
                                {tag}
                              </span>
                            )
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/contacts/${contact.id}`}
                          className="p-1.5 text-gray-400 hover:text-redrock-500 hover:bg-gray-100 rounded transition-colors"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          to={`/contacts/${contact.id}`}
                          className="p-1.5 text-gray-400 hover:text-sandstone-400 hover:bg-gray-100 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => setDeleteId(contact.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && contacts.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-600">
              Showing {pagination.offset + 1}–{Math.min(pagination.offset + pagination.limit, pagination.total)} of{' '}
              {pagination.total} contacts
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className="p-1.5 rounded border border-gray-300 text-gray-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let page;
                if (totalPages <= 5) {
                  page = i + 1;
                } else if (currentPage <= 3) {
                  page = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  page = totalPages - 4 + i;
                } else {
                  page = currentPage - 2 + i;
                }
                return (
                  <button
                    key={page}
                    onClick={() => goToPage(page)}
                    className={`px-3 py-1.5 rounded border text-sm font-medium transition-colors ${
                      page === currentPage
                        ? 'bg-redrock-500 text-white border-redrock-500'
                        : 'border-gray-300 text-gray-600 hover:bg-white'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="p-1.5 rounded border border-gray-300 text-gray-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Contact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-slate-500">Add Contact</h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setFormData({ ...EMPTY_FORM });
                }}
                className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddContact} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleFormChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-redrock-500 focus:border-redrock-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleFormChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-redrock-500 focus:border-redrock-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-redrock-500 focus:border-redrock-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-redrock-500 focus:border-redrock-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-redrock-500 focus:border-redrock-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleFormChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-redrock-500 focus:border-redrock-500"
                  >
                    <option value="tenant">Tenant</option>
                    <option value="owner">Owner</option>
                    <option value="vendor">Vendor</option>
                    <option value="lead">Lead</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lead Stage</label>
                  <select
                    name="lead_stage"
                    value={formData.lead_stage}
                    onChange={handleFormChange}
                    disabled={formData.type !== 'lead'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-redrock-500 focus:border-redrock-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="new_lead">New Lead</option>
                    <option value="contacted">Contacted</option>
                    <option value="showing">Showing</option>
                    <option value="application">Application</option>
                    <option value="lease_signed">Lease Signed</option>
                    <option value="lost">Lost</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                <input
                  type="text"
                  name="tags"
                  value={formData.tags}
                  onChange={handleFormChange}
                  placeholder="Comma-separated tags"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-redrock-500 focus:border-redrock-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleFormChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-redrock-500 focus:border-redrock-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setFormData({ ...EMPTY_FORM });
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-redrock-500 text-white rounded-md text-sm font-medium hover:bg-redrock-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {submitting ? 'Adding...' : 'Add Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Contact</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete this contact? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
