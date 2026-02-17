import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Edit2,
  Save,
  X,
  Mail,
  Phone,
  MapPin,
  Tag,
  FileText,
  PhoneCall,
  MessageSquare,
  Calendar,
  Loader2,
  User,
  CheckCircle2,
} from 'lucide-react';
import api from '../services/api';

const PIPELINE_STAGES = [
  { key: 'new_lead', label: 'New Lead', color: 'gray' },
  { key: 'contacted', label: 'Contacted', color: 'blue' },
  { key: 'showing', label: 'Showing', color: 'yellow' },
  { key: 'application', label: 'Application', color: 'orange' },
  { key: 'lease_signed', label: 'Lease Signed', color: 'green' },
  { key: 'lost', label: 'Lost', color: 'red' },
];

const STAGE_COLORS = {
  gray: {
    active: 'bg-gray-600 text-white border-gray-600',
    inactive: 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50',
    connector: 'bg-gray-600',
    connectorInactive: 'bg-gray-300',
  },
  blue: {
    active: 'bg-blue-600 text-white border-blue-600',
    inactive: 'bg-white text-blue-500 border-blue-300 hover:bg-blue-50',
    connector: 'bg-blue-600',
    connectorInactive: 'bg-gray-300',
  },
  yellow: {
    active: 'bg-yellow-500 text-white border-yellow-500',
    inactive: 'bg-white text-yellow-600 border-yellow-300 hover:bg-yellow-50',
    connector: 'bg-yellow-500',
    connectorInactive: 'bg-gray-300',
  },
  orange: {
    active: 'bg-orange-500 text-white border-orange-500',
    inactive: 'bg-white text-orange-500 border-orange-300 hover:bg-orange-50',
    connector: 'bg-orange-500',
    connectorInactive: 'bg-gray-300',
  },
  green: {
    active: 'bg-green-600 text-white border-green-600',
    inactive: 'bg-white text-green-500 border-green-300 hover:bg-green-50',
    connector: 'bg-green-600',
    connectorInactive: 'bg-gray-300',
  },
  red: {
    active: 'bg-red-600 text-white border-red-600',
    inactive: 'bg-white text-red-500 border-red-300 hover:bg-red-50',
    connector: 'bg-red-600',
    connectorInactive: 'bg-gray-300',
  },
};

const ACTIVITY_TYPE_OPTIONS = [
  { value: 'call', label: 'Call' },
  { value: 'email', label: 'Email' },
  { value: 'note', label: 'Note' },
  { value: 'meeting', label: 'Meeting' },
];

const ACTIVITY_ICONS = {
  call: PhoneCall,
  email: Mail,
  note: FileText,
  meeting: Calendar,
};

const TYPE_BADGE_CLASSES = {
  tenant: 'bg-blue-100 text-blue-800',
  owner: 'bg-green-100 text-green-800',
  vendor: 'bg-orange-100 text-orange-800',
  lead: 'bg-purple-100 text-purple-800',
};

export default function ContactDetailPage() {
  const { id } = useParams();
  const [contact, setContact] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [updatingStage, setUpdatingStage] = useState(false);

  // Activity form
  const [activityType, setActivityType] = useState('call');
  const [activityDescription, setActivityDescription] = useState('');
  const [submittingActivity, setSubmittingActivity] = useState(false);

  const fetchContact = useCallback(async () => {
    try {
      const response = await api.get(`/contacts/${id}`);
      setContact(response.data);
      setEditForm(response.data);
    } catch (err) {
      console.error('Failed to fetch contact:', err);
    }
  }, [id]);

  const fetchActivities = useCallback(async () => {
    try {
      const response = await api.get(`/activities/contact/${id}`);
      setActivities(response.data.activities || response.data.results || response.data || []);
    } catch (err) {
      console.error('Failed to fetch activities:', err);
    }
  }, [id]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchContact(), fetchActivities()]);
      setLoading(false);
    };
    load();
  }, [fetchContact, fetchActivities]);

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      const payload = {
        ...editForm,
        tags:
          typeof editForm.tags === 'string'
            ? editForm.tags.split(',').map((t) => t.trim()).filter(Boolean)
            : editForm.tags,
      };
      const response = await api.put(`/contacts/${id}`, payload);
      setContact(response.data);
      setEditForm(response.data);
      setEditing(false);
    } catch (err) {
      console.error('Failed to update contact:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleStageUpdate = async (newStage) => {
    if (updatingStage || !contact || contact.lead_stage === newStage) return;
    setUpdatingStage(true);
    try {
      const response = await api.put(`/contacts/${id}/stage`, { lead_stage: newStage });
      setContact((prev) => ({ ...prev, lead_stage: response.data.lead_stage || newStage }));
    } catch (err) {
      console.error('Failed to update stage:', err);
    } finally {
      setUpdatingStage(false);
    }
  };

  const handleAddActivity = async (e) => {
    e.preventDefault();
    if (!activityDescription.trim()) return;
    setSubmittingActivity(true);
    try {
      await api.post('/activities', {
        contact_id: parseInt(id, 10),
        type: activityType,
        description: activityDescription.trim(),
      });
      setActivityDescription('');
      setActivityType('call');
      await fetchActivities();
    } catch (err) {
      console.error('Failed to add activity:', err);
    } finally {
      setSubmittingActivity(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const currentStageIndex = contact
    ? PIPELINE_STAGES.findIndex((s) => s.key === contact.lead_stage)
    : -1;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-redrock-500" />
        <span className="ml-3 text-gray-500">Loading contact...</span>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <p className="text-gray-500 text-lg mb-4">Contact not found</p>
        <Link
          to="/contacts"
          className="inline-flex items-center gap-2 text-redrock-500 hover:text-redrock-600 font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Contacts
        </Link>
      </div>
    );
  }

  const tagsArray = Array.isArray(contact.tags)
    ? contact.tags
    : contact.tags
    ? String(contact.tags).split(',').map((t) => t.trim()).filter(Boolean)
    : [];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Back Link */}
      <Link
        to="/contacts"
        className="inline-flex items-center gap-2 text-slate-500 hover:text-redrock-500 font-medium mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Contacts
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Info Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-redrock-500 flex items-center justify-center text-white text-xl font-bold">
                  {contact.first_name?.charAt(0) || ''}
                  {contact.last_name?.charAt(0) || ''}
                </div>
                <div>
                  {editing ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        name="first_name"
                        value={editForm.first_name || ''}
                        onChange={handleEditChange}
                        className="px-2 py-1 border border-gray-300 rounded text-lg font-bold focus:outline-none focus:ring-2 focus:ring-redrock-500"
                        placeholder="First name"
                      />
                      <input
                        type="text"
                        name="last_name"
                        value={editForm.last_name || ''}
                        onChange={handleEditChange}
                        className="px-2 py-1 border border-gray-300 rounded text-lg font-bold focus:outline-none focus:ring-2 focus:ring-redrock-500"
                        placeholder="Last name"
                      />
                    </div>
                  ) : (
                    <h1 className="text-xl font-bold text-gray-900">
                      {contact.first_name} {contact.last_name}
                    </h1>
                  )}
                  <span
                    className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      TYPE_BADGE_CLASSES[contact.type] || 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {contact.type ? contact.type.charAt(0).toUpperCase() + contact.type.slice(1) : 'Unknown'}
                  </span>
                </div>
              </div>
              <div>
                {editing ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveEdit}
                      disabled={saving}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-redrock-500 text-white rounded-md text-sm font-medium hover:bg-redrock-600 disabled:opacity-50 transition-colors"
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => {
                        setEditing(false);
                        setEditForm(contact);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditing(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-slate-500 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                    Edit
                  </button>
                )}
              </div>
            </div>

            {/* Contact Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Email */}
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Email</p>
                  {editing ? (
                    <input
                      type="email"
                      name="email"
                      value={editForm.email || ''}
                      onChange={handleEditChange}
                      className="w-full mt-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-redrock-500"
                    />
                  ) : (
                    <p className="text-sm text-gray-900 break-all">{contact.email || '—'}</p>
                  )}
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</p>
                  {editing ? (
                    <input
                      type="tel"
                      name="phone"
                      value={editForm.phone || ''}
                      onChange={handleEditChange}
                      className="w-full mt-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-redrock-500"
                    />
                  ) : (
                    <p className="text-sm text-gray-900">{contact.phone || '—'}</p>
                  )}
                </div>
              </div>

              {/* Address */}
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Address</p>
                  {editing ? (
                    <input
                      type="text"
                      name="address"
                      value={editForm.address || ''}
                      onChange={handleEditChange}
                      className="w-full mt-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-redrock-500"
                    />
                  ) : (
                    <p className="text-sm text-gray-900 break-words">{contact.address || '—'}</p>
                  )}
                </div>
              </div>

              {/* Type */}
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Type</p>
                  {editing ? (
                    <select
                      name="type"
                      value={editForm.type || ''}
                      onChange={handleEditChange}
                      className="w-full mt-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-redrock-500"
                    >
                      <option value="tenant">Tenant</option>
                      <option value="owner">Owner</option>
                      <option value="vendor">Vendor</option>
                      <option value="lead">Lead</option>
                    </select>
                  ) : (
                    <p className="text-sm text-gray-900">
                      {contact.type ? contact.type.charAt(0).toUpperCase() + contact.type.slice(1) : '—'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="mt-4 flex items-start gap-3">
              <Tag className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tags</p>
                {editing ? (
                  <input
                    type="text"
                    name="tags"
                    value={
                      typeof editForm.tags === 'string'
                        ? editForm.tags
                        : (editForm.tags || []).join(', ')
                    }
                    onChange={handleEditChange}
                    placeholder="Comma-separated tags"
                    className="w-full mt-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-redrock-500"
                  />
                ) : tagsArray.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {tagsArray.map((tag, idx) => (
                      <span
                        key={idx}
                        className="inline-block px-2.5 py-0.5 bg-sandstone-400/20 text-sandstone-400 rounded-full text-xs font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 mt-1">No tags</p>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="mt-4 flex items-start gap-3">
              <MessageSquare className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</p>
                {editing ? (
                  <textarea
                    name="notes"
                    value={editForm.notes || ''}
                    onChange={handleEditChange}
                    rows={3}
                    className="w-full mt-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-redrock-500 resize-none"
                  />
                ) : (
                  <p className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">
                    {contact.notes || '—'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Lead Pipeline Visualization */}
          {contact.type === 'lead' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-slate-500 mb-4">Lead Pipeline</h2>
              {updatingStage && (
                <div className="flex items-center gap-2 mb-3 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating stage...
                </div>
              )}
              <div className="flex items-center gap-0 overflow-x-auto pb-2">
                {PIPELINE_STAGES.map((stage, index) => {
                  const isActive = index <= currentStageIndex;
                  const isCurrent = stage.key === contact.lead_stage;
                  const colors = STAGE_COLORS[stage.color];

                  return (
                    <React.Fragment key={stage.key}>
                      {index > 0 && (
                        <div
                          className={`h-1 w-8 flex-shrink-0 ${
                            isActive ? colors.connector : colors.connectorInactive
                          }`}
                        />
                      )}
                      <button
                        onClick={() => handleStageUpdate(stage.key)}
                        disabled={updatingStage}
                        className={`relative flex-shrink-0 flex flex-col items-center gap-1.5 px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all disabled:cursor-wait ${
                          isCurrent
                            ? colors.active + ' ring-2 ring-offset-2 ring-' + stage.color + '-300'
                            : isActive
                            ? colors.active
                            : colors.inactive
                        } cursor-pointer`}
                      >
                        {isCurrent && (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        <span className="whitespace-nowrap text-xs">{stage.label}</span>
                      </button>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          )}

          {/* Activity Log */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-slate-500 mb-4">Activity Log</h2>

            {/* Add Activity Form */}
            <form onSubmit={handleAddActivity} className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Add Activity</h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  value={activityType}
                  onChange={(e) => setActivityType(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-redrock-500 focus:border-redrock-500 sm:w-36"
                >
                  {ACTIVITY_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <textarea
                  value={activityDescription}
                  onChange={(e) => setActivityDescription(e.target.value)}
                  placeholder="Describe the activity..."
                  rows={2}
                  required
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-redrock-500 focus:border-redrock-500 resize-none"
                />
                <button
                  type="submit"
                  disabled={submittingActivity || !activityDescription.trim()}
                  className="self-end inline-flex items-center gap-2 px-4 py-2 bg-redrock-500 text-white rounded-md text-sm font-medium hover:bg-redrock-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                >
                  {submittingActivity ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  {submittingActivity ? 'Adding...' : 'Add Activity'}
                </button>
              </div>
            </form>

            {/* Activity List */}
            {activities.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No activities recorded yet.</p>
              </div>
            ) : (
              <div className="space-y-0">
                {activities.map((activity, index) => {
                  const IconComponent = ACTIVITY_ICONS[activity.type] || FileText;
                  const isLast = index === activities.length - 1;

                  return (
                    <div key={activity.id || index} className="relative flex gap-4">
                      {/* Timeline connector */}
                      {!isLast && (
                        <div className="absolute left-5 top-10 bottom-0 w-px bg-gray-200" />
                      )}

                      {/* Icon */}
                      <div className="relative z-10 flex-shrink-0 h-10 w-10 rounded-full bg-sandstone-400/20 flex items-center justify-center">
                        <IconComponent className="h-4 w-4 text-sandstone-400" />
                      </div>

                      {/* Content */}
                      <div className={`flex-1 pb-6 ${isLast ? 'pb-0' : ''}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium capitalize">
                            {activity.type}
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatDate(activity.created_at || activity.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{activity.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - Quick Info */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Quick Info
            </h3>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500">Full Name</p>
                <p className="text-sm font-medium text-gray-900">
                  {contact.first_name} {contact.last_name}
                </p>
              </div>

              {contact.email && (
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <a
                    href={`mailto:${contact.email}`}
                    className="text-sm text-redrock-500 hover:underline break-all"
                  >
                    {contact.email}
                  </a>
                </div>
              )}

              {contact.phone && (
                <div>
                  <p className="text-xs text-gray-500">Phone</p>
                  <a
                    href={`tel:${contact.phone}`}
                    className="text-sm text-redrock-500 hover:underline"
                  >
                    {contact.phone}
                  </a>
                </div>
              )}

              <div>
                <p className="text-xs text-gray-500">Type</p>
                <span
                  className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    TYPE_BADGE_CLASSES[contact.type] || 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {contact.type ? contact.type.charAt(0).toUpperCase() + contact.type.slice(1) : '—'}
                </span>
              </div>

              {contact.type === 'lead' && contact.lead_stage && (
                <div>
                  <p className="text-xs text-gray-500">Lead Stage</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    {contact.lead_stage
                      .replace(/_/g, ' ')
                      .replace(/\b\w/g, (c) => c.toUpperCase())}
                  </p>
                </div>
              )}

              {contact.address && (
                <div>
                  <p className="text-xs text-gray-500">Address</p>
                  <p className="text-sm text-gray-900 break-words">{contact.address}</p>
                </div>
              )}

              <div>
                <p className="text-xs text-gray-500">Activities</p>
                <p className="text-sm font-medium text-gray-900">{activities.length} recorded</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Quick Actions
              </h3>
              <div className="space-y-2">
                {contact.email && (
                  <a
                    href={`mailto:${contact.email}`}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-500 hover:bg-gray-50 rounded-md transition-colors"
                  >
                    <Mail className="h-4 w-4" />
                    Send Email
                  </a>
                )}
                {contact.phone && (
                  <a
                    href={`tel:${contact.phone}`}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-500 hover:bg-gray-50 rounded-md transition-colors"
                  >
                    <Phone className="h-4 w-4" />
                    Call
                  </a>
                )}
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-500 hover:bg-gray-50 rounded-md transition-colors"
                >
                  <Edit2 className="h-4 w-4" />
                  Edit Contact
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
