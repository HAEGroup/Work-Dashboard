import React, { useState, useEffect } from 'react';
import {
  Plus,
  X,
  Edit2,
  Trash2,
  BarChart3,
  Calendar,
  FileText,
  Home,
  DollarSign,
  TrendingUp,
  Eye,
} from 'lucide-react';
import api from '../services/api';

const TABS = [
  { key: 'campaigns', label: 'Campaigns', icon: TrendingUp },
  { key: 'content', label: 'Content Calendar', icon: Calendar },
  { key: 'listings', label: 'Listings', icon: Home },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
];

const CAMPAIGN_TYPE_COLORS = {
  social_media: 'bg-blue-100 text-blue-800',
  email_blast: 'bg-green-100 text-green-800',
  print: 'bg-orange-100 text-orange-800',
  online_ad: 'bg-purple-100 text-purple-800',
};

const CAMPAIGN_TYPE_LABELS = {
  social_media: 'Social Media',
  email_blast: 'Email Blast',
  print: 'Print',
  online_ad: 'Online Ad',
};

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-800',
  active: 'bg-green-100 text-green-800',
  paused: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-blue-100 text-blue-800',
  available: 'bg-green-100 text-green-800',
  rented: 'bg-blue-100 text-blue-800',
  pending: 'bg-yellow-100 text-yellow-800',
  scheduled: 'bg-blue-100 text-blue-800',
  published: 'bg-green-100 text-green-800',
};

const defaultCampaignForm = {
  name: '',
  type: 'social_media',
  budget: '',
  start_date: '',
  end_date: '',
  status: 'draft',
  notes: '',
};

const defaultContentForm = {
  title: '',
  content: '',
  platform: '',
  scheduled_date: '',
  campaign_id: '',
  status: 'draft',
};

const defaultListingForm = {
  title: '',
  description: '',
  address: '',
  price: '',
  bedrooms: '',
  bathrooms: '',
  sqft: '',
  available_date: '',
  status: 'available',
  photos: '',
};

export default function MarketingPage() {
  const [activeTab, setActiveTab] = useState('campaigns');
  const [campaigns, setCampaigns] = useState([]);
  const [content, setContent] = useState([]);
  const [listings, setListings] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});

  // Fetch all data on mount
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [campaignsRes, contentRes, listingsRes, analyticsRes] =
        await Promise.all([
          api.get('/marketing/campaigns'),
          api.get('/marketing/content'),
          api.get('/marketing/listings'),
          api.get('/marketing/analytics'),
        ]);
      setCampaigns(campaignsRes.data || []);
      setContent(contentRes.data || []);
      setListings(listingsRes.data || []);
      setAnalytics(analyticsRes.data || null);
    } catch (err) {
      console.error('Failed to fetch marketing data:', err);
    } finally {
      setLoading(false);
    }
  };

  // ---- CRUD helpers ----

  const openAddForm = () => {
    setEditingItem(null);
    if (activeTab === 'campaigns') setFormData({ ...defaultCampaignForm });
    else if (activeTab === 'content') setFormData({ ...defaultContentForm });
    else if (activeTab === 'listings') setFormData({ ...defaultListingForm });
    setShowForm(true);
  };

  const openEditForm = (item) => {
    setEditingItem(item);
    if (activeTab === 'campaigns') {
      setFormData({
        name: item.name || '',
        type: item.type || 'social_media',
        budget: item.budget || '',
        start_date: item.start_date || '',
        end_date: item.end_date || '',
        status: item.status || 'draft',
        notes: item.notes || '',
      });
    } else if (activeTab === 'content') {
      setFormData({
        title: item.title || '',
        content: item.content || '',
        platform: item.platform || '',
        scheduled_date: item.scheduled_date || '',
        campaign_id: item.campaign_id || '',
        status: item.status || 'draft',
      });
    } else if (activeTab === 'listings') {
      setFormData({
        title: item.title || '',
        description: item.description || '',
        address: item.address || '',
        price: item.price || '',
        bedrooms: item.bedrooms || '',
        bathrooms: item.bathrooms || '',
        sqft: item.sqft || '',
        available_date: item.available_date || '',
        status: item.status || 'available',
        photos: Array.isArray(item.photos) ? item.photos.join(', ') : item.photos || '',
      });
    }
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingItem(null);
    setFormData({});
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (activeTab === 'campaigns') {
        const payload = { ...formData, budget: parseFloat(formData.budget) || 0 };
        if (editingItem) {
          await api.put(`/marketing/campaigns/${editingItem.id}`, payload);
        } else {
          await api.post('/marketing/campaigns', payload);
        }
        const res = await api.get('/marketing/campaigns');
        setCampaigns(res.data || []);
      } else if (activeTab === 'content') {
        const payload = {
          ...formData,
          campaign_id: formData.campaign_id ? parseInt(formData.campaign_id, 10) : null,
        };
        if (editingItem) {
          await api.put(`/marketing/content/${editingItem.id}`, payload);
        } else {
          await api.post('/marketing/content', payload);
        }
        const res = await api.get('/marketing/content');
        setContent(res.data || []);
      } else if (activeTab === 'listings') {
        const payload = {
          ...formData,
          price: parseFloat(formData.price) || 0,
          bedrooms: parseInt(formData.bedrooms, 10) || 0,
          bathrooms: parseInt(formData.bathrooms, 10) || 0,
          sqft: parseInt(formData.sqft, 10) || 0,
          photos: formData.photos
            ? formData.photos.split(',').map((s) => s.trim()).filter(Boolean)
            : [],
        };
        if (editingItem) {
          await api.put(`/marketing/listings/${editingItem.id}`, payload);
        } else {
          await api.post('/marketing/listings', payload);
        }
        const res = await api.get('/marketing/listings');
        setListings(res.data || []);
      }
      closeForm();
      // Refresh analytics after any change
      const analyticsRes = await api.get('/marketing/analytics');
      setAnalytics(analyticsRes.data || null);
    } catch (err) {
      console.error('Failed to save:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      if (activeTab === 'campaigns') {
        await api.delete(`/marketing/campaigns/${id}`);
        const res = await api.get('/marketing/campaigns');
        setCampaigns(res.data || []);
      } else if (activeTab === 'content') {
        await api.delete(`/marketing/content/${id}`);
        const res = await api.get('/marketing/content');
        setContent(res.data || []);
      } else if (activeTab === 'listings') {
        await api.delete(`/marketing/listings/${id}`);
        const res = await api.get('/marketing/listings');
        setListings(res.data || []);
      }
      const analyticsRes = await api.get('/marketing/analytics');
      setAnalytics(analyticsRes.data || null);
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  // ---- Render helpers ----

  const renderStatusBadge = (status) => {
    const colorClass = STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';
    return (
      <span
        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${colorClass}`}
      >
        {status}
      </span>
    );
  };

  const renderTypeBadge = (type) => {
    const colorClass = CAMPAIGN_TYPE_COLORS[type] || 'bg-gray-100 text-gray-800';
    const label = CAMPAIGN_TYPE_LABELS[type] || type;
    return (
      <span
        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}
      >
        {label}
      </span>
    );
  };

  // ---- Campaigns Tab ----

  const renderCampaigns = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {campaigns.length === 0 && (
        <p className="text-gray-500 col-span-full text-center py-12">
          No campaigns yet. Click &quot;Add New&quot; to create one.
        </p>
      )}
      {campaigns.map((c) => (
        <div
          key={c.id}
          className="bg-white rounded-lg shadow border border-gray-200 p-5 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900 truncate pr-2">
              {c.name}
            </h3>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => openEditForm(c)}
                className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors"
                title="Edit"
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={() => handleDelete(c.id)}
                className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 mb-3">
            {renderTypeBadge(c.type)}
            {renderStatusBadge(c.status)}
          </div>
          <div className="flex items-center text-sm text-gray-600 mb-2">
            <DollarSign size={14} className="mr-1 text-gray-400" />
            <span className="font-medium">
              ${parseFloat(c.budget || 0).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <Calendar size={14} className="mr-1 text-gray-400" />
            <span>
              {c.start_date || 'N/A'} &mdash; {c.end_date || 'N/A'}
            </span>
          </div>
          {c.notes && (
            <p className="mt-3 text-sm text-gray-500 line-clamp-2">{c.notes}</p>
          )}
        </div>
      ))}
    </div>
  );

  const renderCampaignForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Campaign Name
        </label>
        <input
          type="text"
          name="name"
          value={formData.name || ''}
          onChange={handleChange}
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
          placeholder="e.g. Spring Leasing Push"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Type
          </label>
          <select
            name="type"
            value={formData.type || 'social_media'}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
          >
            <option value="social_media">Social Media</option>
            <option value="email_blast">Email Blast</option>
            <option value="print">Print</option>
            <option value="online_ad">Online Ad</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Budget ($)
          </label>
          <input
            type="number"
            name="budget"
            value={formData.budget || ''}
            onChange={handleChange}
            min="0"
            step="0.01"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
            placeholder="0.00"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Date
          </label>
          <input
            type="date"
            name="start_date"
            value={formData.start_date || ''}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Date
          </label>
          <input
            type="date"
            name="end_date"
            value={formData.end_date || ''}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Status
        </label>
        <select
          name="status"
          value={formData.status || 'draft'}
          onChange={handleChange}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
        >
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="completed">Completed</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          name="notes"
          value={formData.notes || ''}
          onChange={handleChange}
          rows={3}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none"
          placeholder="Additional notes..."
        />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={closeForm}
          className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
        >
          {editingItem ? 'Update Campaign' : 'Create Campaign'}
        </button>
      </div>
    </form>
  );

  // ---- Content Calendar Tab ----

  const getCampaignName = (campaignId) => {
    const c = campaigns.find((camp) => camp.id === campaignId);
    return c ? c.name : '—';
  };

  const renderContent = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {content.length === 0 && (
        <p className="text-gray-500 col-span-full text-center py-12">
          No content items yet. Click &quot;Add New&quot; to create one.
        </p>
      )}
      {content.map((item) => (
        <div
          key={item.id}
          className="bg-white rounded-lg shadow border border-gray-200 p-5 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900 truncate pr-2">
              {item.title}
            </h3>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => openEditForm(item)}
                className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors"
                title="Edit"
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={() => handleDelete(item.id)}
                className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 mb-3">
            {item.platform && (
              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                {item.platform}
              </span>
            )}
            {renderStatusBadge(item.status)}
          </div>
          <div className="flex items-center text-sm text-gray-500 mb-2">
            <Calendar size={14} className="mr-1 text-gray-400" />
            <span>{item.scheduled_date || 'Not scheduled'}</span>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <FileText size={14} className="mr-1 text-gray-400" />
            <span>Campaign: {getCampaignName(item.campaign_id)}</span>
          </div>
        </div>
      ))}
    </div>
  );

  const renderContentForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Title
        </label>
        <input
          type="text"
          name="title"
          value={formData.title || ''}
          onChange={handleChange}
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
          placeholder="Content title"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Content
        </label>
        <textarea
          name="content"
          value={formData.content || ''}
          onChange={handleChange}
          rows={4}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none"
          placeholder="Write content here..."
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Platform
          </label>
          <input
            type="text"
            name="platform"
            value={formData.platform || ''}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
            placeholder="e.g. Instagram, Facebook"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Scheduled Date
          </label>
          <input
            type="date"
            name="scheduled_date"
            value={formData.scheduled_date || ''}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Campaign
          </label>
          <select
            name="campaign_id"
            value={formData.campaign_id || ''}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
          >
            <option value="">— No Campaign —</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            name="status"
            value={formData.status || 'draft'}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
          >
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="published">Published</option>
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={closeForm}
          className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
        >
          {editingItem ? 'Update Content' : 'Create Content'}
        </button>
      </div>
    </form>
  );

  // ---- Listings Tab ----

  const renderListings = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {listings.length === 0 && (
        <p className="text-gray-500 col-span-full text-center py-12">
          No listings yet. Click &quot;Add New&quot; to create one.
        </p>
      )}
      {listings.map((l) => (
        <div
          key={l.id}
          className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
        >
          {l.photos && l.photos.length > 0 && (
            <div className="h-40 bg-gray-200 overflow-hidden">
              <img
                src={l.photos[0]}
                alt={l.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
          )}
          <div className="p-5">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900 truncate pr-2">
                {l.title}
              </h3>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => openEditForm(l)}
                  className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors"
                  title="Edit"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(l.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            {l.address && (
              <p className="text-sm text-gray-500 mb-2">{l.address}</p>
            )}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl font-bold text-red-700">
                ${parseFloat(l.price || 0).toLocaleString()}
              </span>
              <span className="text-sm text-gray-400">/mo</span>
              {renderStatusBadge(l.status)}
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
              {l.bedrooms != null && (
                <span>{l.bedrooms} bed{l.bedrooms !== 1 ? 's' : ''}</span>
              )}
              {l.bathrooms != null && (
                <span>{l.bathrooms} bath{l.bathrooms !== 1 ? 's' : ''}</span>
              )}
              {l.sqft != null && <span>{parseInt(l.sqft).toLocaleString()} sqft</span>}
            </div>
            {l.available_date && (
              <div className="flex items-center text-sm text-gray-500">
                <Calendar size={14} className="mr-1 text-gray-400" />
                <span>Available {l.available_date}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  const renderListingForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Title
        </label>
        <input
          type="text"
          name="title"
          value={formData.title || ''}
          onChange={handleChange}
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
          placeholder="e.g. 2BR Apartment at Red Rock Village"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          name="description"
          value={formData.description || ''}
          onChange={handleChange}
          rows={3}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none"
          placeholder="Property description..."
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Address
        </label>
        <input
          type="text"
          name="address"
          value={formData.address || ''}
          onChange={handleChange}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
          placeholder="Full property address"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Price ($/mo)
          </label>
          <input
            type="number"
            name="price"
            value={formData.price || ''}
            onChange={handleChange}
            min="0"
            step="0.01"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Available Date
          </label>
          <input
            type="date"
            name="available_date"
            value={formData.available_date || ''}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bedrooms
          </label>
          <input
            type="number"
            name="bedrooms"
            value={formData.bedrooms || ''}
            onChange={handleChange}
            min="0"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bathrooms
          </label>
          <input
            type="number"
            name="bathrooms"
            value={formData.bathrooms || ''}
            onChange={handleChange}
            min="0"
            step="0.5"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sqft
          </label>
          <input
            type="number"
            name="sqft"
            value={formData.sqft || ''}
            onChange={handleChange}
            min="0"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Status
        </label>
        <select
          name="status"
          value={formData.status || 'available'}
          onChange={handleChange}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
        >
          <option value="available">Available</option>
          <option value="pending">Pending</option>
          <option value="rented">Rented</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Photos (comma-separated URLs)
        </label>
        <input
          type="text"
          name="photos"
          value={formData.photos || ''}
          onChange={handleChange}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
          placeholder="https://example.com/photo1.jpg, https://example.com/photo2.jpg"
        />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={closeForm}
          className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
        >
          {editingItem ? 'Update Listing' : 'Create Listing'}
        </button>
      </div>
    </form>
  );

  // ---- Analytics Tab ----

  const renderAnalytics = () => {
    if (!analytics) {
      return (
        <p className="text-gray-500 text-center py-12">
          No analytics data available.
        </p>
      );
    }

    const leadsSources = analytics.leads_by_source || {};
    const campaignStats = analytics.campaigns_by_status || {};
    const listingStats = analytics.listings_by_status || {};
    const totalBudget = analytics.total_active_budget || 0;

    const maxLeads = Math.max(...Object.values(leadsSources), 1);

    const sourceColors = [
      'bg-red-500',
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-purple-500',
      'bg-indigo-500',
      'bg-pink-500',
      'bg-teal-500',
    ];

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Total Active Budget */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-100 rounded-lg">
              <DollarSign size={20} className="text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              Total Active Budget
            </h3>
          </div>
          <p className="text-3xl font-bold text-red-700">
            ${parseFloat(totalBudget).toLocaleString()}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Combined budget of all active campaigns
          </p>
        </div>

        {/* Campaign Stats */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp size={20} className="text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              Campaigns by Status
            </h3>
          </div>
          {Object.keys(campaignStats).length === 0 ? (
            <p className="text-sm text-gray-500">No campaign data.</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(campaignStats).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="capitalize text-sm text-gray-700">
                    {status}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Listing Stats */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <Home size={20} className="text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              Listings by Status
            </h3>
          </div>
          {Object.keys(listingStats).length === 0 ? (
            <p className="text-sm text-gray-500">No listing data.</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(listingStats).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="capitalize text-sm text-gray-700">
                    {status}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Leads by Source - Bar Chart */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Eye size={20} className="text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              Leads by Source
            </h3>
          </div>
          {Object.keys(leadsSources).length === 0 ? (
            <p className="text-sm text-gray-500">No lead source data.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(leadsSources).map(([source, count], idx) => (
                <div key={source}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700 capitalize">
                      {source}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {count}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${sourceColors[idx % sourceColors.length]} transition-all duration-500`}
                      style={{
                        width: `${(count / maxLeads) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ---- Form Modal ----

  const renderFormModal = () => {
    if (!showForm) return null;

    const titles = {
      campaigns: editingItem ? 'Edit Campaign' : 'New Campaign',
      content: editingItem ? 'Edit Content' : 'New Content',
      listings: editingItem ? 'Edit Listing' : 'New Listing',
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              {titles[activeTab]}
            </h2>
            <button
              onClick={closeForm}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          <div className="px-6 py-4">
            {activeTab === 'campaigns' && renderCampaignForm()}
            {activeTab === 'content' && renderContentForm()}
            {activeTab === 'listings' && renderListingForm()}
          </div>
        </div>
      </div>
    );
  };

  // ---- Main render ----

  const showAddButton = activeTab !== 'analytics';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <BarChart3 size={22} className="text-red-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Marketing</h1>
            </div>
            {showAddButton && (
              <button
                onClick={openAddForm}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors shadow-sm"
              >
                <Plus size={16} />
                Add New
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-6 -mb-px" aria-label="Tabs">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'border-red-600 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600" />
          </div>
        ) : (
          <>
            {activeTab === 'campaigns' && renderCampaigns()}
            {activeTab === 'content' && renderContent()}
            {activeTab === 'listings' && renderListings()}
            {activeTab === 'analytics' && renderAnalytics()}
          </>
        )}
      </div>

      {/* Form Modal */}
      {renderFormModal()}
    </div>
  );
}
