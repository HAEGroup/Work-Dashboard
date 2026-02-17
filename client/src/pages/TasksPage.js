import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  Plus,
  X,
  List,
  LayoutGrid,
  Filter,
  AlertCircle,
  Clock,
  ChevronDown,
  GripVertical,
  MoreVertical
} from 'lucide-react';

const KANBAN_COLUMNS = [
  { key: 'todo', label: 'To Do', color: 'bg-gray-400', accent: 'border-gray-400' },
  { key: 'in_progress', label: 'In Progress', color: 'bg-blue-500', accent: 'border-blue-500' },
  { key: 'waiting', label: 'Waiting', color: 'bg-yellow-500', accent: 'border-yellow-500' },
  { key: 'complete', label: 'Complete', color: 'bg-green-500', accent: 'border-green-500' }
];

const PRIORITY_CONFIG = {
  low: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
  medium: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  high: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
  urgent: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' }
};

const STATUS_CONFIG = {
  todo: { bg: 'bg-gray-100', text: 'text-gray-700' },
  in_progress: { bg: 'bg-blue-100', text: 'text-blue-700' },
  waiting: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  complete: { bg: 'bg-green-100', text: 'text-green-700' }
};

const STATUS_LABELS = {
  todo: 'To Do',
  in_progress: 'In Progress',
  waiting: 'Waiting',
  complete: 'Complete'
};

function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function isOverdue(task) {
  if (!task.due_date || task.status === 'complete') return false;
  return new Date(task.due_date) < new Date();
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const emptyFormData = {
  title: '',
  description: '',
  status: 'todo',
  priority: 'medium',
  due_date: '',
  assignee: '',
  related_property: '',
  related_contact: ''
};

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [view, setView] = useState('kanban');
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [filters, setFilters] = useState({ status: '', priority: '', assignee: '' });
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState(emptyFormData);
  const [dragState, setDragState] = useState({ taskId: null, sourceColumn: null });
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const [openCardMenu, setOpenCardMenu] = useState(null);

  useEffect(() => {
    fetchTasks();
    fetchTemplates();
    fetchUsers();
  }, []);

  async function fetchTasks() {
    try {
      setLoading(true);
      const response = await api.get('/tasks');
      setTasks(response.data);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTemplates() {
    try {
      const response = await api.get('/tasks/templates');
      setTemplates(response.data);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    }
  }

  async function fetchUsers() {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  }

  function openNewTaskForm(prefillStatus) {
    setEditingTask(null);
    setFormData({ ...emptyFormData, status: prefillStatus || 'todo' });
    setShowForm(true);
  }

  function openEditTaskForm(task) {
    setEditingTask(task);
    setFormData({
      title: task.title || '',
      description: task.description || '',
      status: task.status || 'todo',
      priority: task.priority || 'medium',
      due_date: task.due_date ? task.due_date.slice(0, 10) : '',
      assignee: task.assignee || '',
      related_property: task.related_property || '',
      related_contact: task.related_contact || ''
    });
    setShowForm(true);
    setOpenCardMenu(null);
  }

  function closeForm() {
    setShowForm(false);
    setEditingTask(null);
    setFormData(emptyFormData);
  }

  async function handleSave(e) {
    e.preventDefault();
    try {
      if (editingTask) {
        await api.put(`/tasks/${editingTask.id}`, formData);
      } else {
        await api.post('/tasks', formData);
      }
      closeForm();
      fetchTasks();
    } catch (err) {
      console.error('Failed to save task:', err);
    }
  }

  async function handleDelete(taskId) {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      closeForm();
      setOpenCardMenu(null);
      fetchTasks();
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  }

  async function applyTemplate(templateId) {
    try {
      await api.post(`/tasks/templates/${templateId}/apply`);
      setShowTemplateDropdown(false);
      fetchTasks();
    } catch (err) {
      console.error('Failed to apply template:', err);
    }
  }

  // Drag and drop handlers
  function handleDragStart(e, task) {
    setDragState({ taskId: task.id, sourceColumn: task.status });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  async function handleDrop(e, targetStatus, dropIndex) {
    e.preventDefault();
    const taskId = dragState.taskId;
    if (!taskId) return;

    const columnTasks = tasks
      .filter((t) => t.status === targetStatus)
      .sort((a, b) => (a.position || 0) - (b.position || 0));

    const position = dropIndex !== undefined ? dropIndex : columnTasks.length;

    try {
      await api.put(`/tasks/${taskId}/position`, {
        status: targetStatus,
        position
      });
      fetchTasks();
    } catch (err) {
      console.error('Failed to update task position:', err);
    }

    setDragState({ taskId: null, sourceColumn: null });
  }

  // Filtering
  function getFilteredTasks() {
    return tasks.filter((task) => {
      if (filters.status && task.status !== filters.status) return false;
      if (filters.priority && task.priority !== filters.priority) return false;
      if (filters.assignee && task.assignee !== filters.assignee) return false;
      return true;
    });
  }

  // Sorting for list view
  function getSortedTasks(filtered) {
    if (!sortConfig.key) return filtered;
    const sorted = [...filtered].sort((a, b) => {
      const aVal = a[sortConfig.key] || '';
      const bVal = b[sortConfig.key] || '';
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }

  function handleSort(key) {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  }

  function getSortIndicator(key) {
    if (sortConfig.key !== key) return '';
    return sortConfig.direction === 'asc' ? ' ▲' : ' ▼';
  }

  // Unique assignees for filter dropdown
  const uniqueAssignees = [...new Set(tasks.map((t) => t.assignee).filter(Boolean))];

  const filteredTasks = getFilteredTasks();

  // Priority badge
  function PriorityBadge({ priority }) {
    const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.medium;
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.bg} ${config.text} border ${config.border}`}
      >
        {priority}
      </span>
    );
  }

  // Status badge
  function StatusBadge({ status }) {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.todo;
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.bg} ${config.text}`}
      >
        {STATUS_LABELS[status] || status}
      </span>
    );
  }

  // Kanban task card
  function TaskCard({ task }) {
    const overdue = isOverdue(task);
    return (
      <div
        draggable
        onDragStart={(e) => handleDragStart(e, task)}
        className={`bg-white rounded-lg shadow-sm p-3 mb-2 cursor-grab active:cursor-grabbing border ${
          overdue ? 'border-red-500 ring-1 ring-red-300' : 'border-gray-200'
        } hover:shadow-md transition-shadow relative group`}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <GripVertical className="w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
            <h4 className="text-sm font-medium text-gray-900 leading-tight">{task.title}</h4>
          </div>
          <div className="relative">
            <button
              onClick={() => setOpenCardMenu(openCardMenu === task.id ? null : task.id)}
              className="p-1 rounded hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="w-4 h-4 text-gray-400" />
            </button>
            {openCardMenu === task.id && (
              <div className="absolute right-0 top-6 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-32">
                <button
                  onClick={() => openEditTaskForm(task)}
                  className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(task.id)}
                  className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <PriorityBadge priority={task.priority} />
          {overdue && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
              <AlertCircle className="w-3 h-3" />
              Overdue
            </span>
          )}
        </div>

        {task.related_property && (
          <p className="text-xs text-gray-500 mt-2 truncate">{task.related_property}</p>
        )}

        <div className="flex items-center justify-between mt-3">
          {task.due_date ? (
            <span className={`flex items-center gap-1 text-xs ${overdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
              <Clock className="w-3 h-3" />
              {formatDate(task.due_date)}
            </span>
          ) : (
            <span />
          )}
          {task.assignee && (
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-700 text-white text-xs font-semibold">
              {getInitials(task.assignee)}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Kanban column
  function KanbanColumn({ column }) {
    const columnTasks = filteredTasks
      .filter((t) => t.status === column.key)
      .sort((a, b) => (a.position || 0) - (b.position || 0));

    return (
      <div
        className="flex-1 min-w-[280px] max-w-[350px]"
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, column.key)}
      >
        <div className={`border-t-4 ${column.accent} bg-gray-50 rounded-t-lg`}>
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-800 text-sm">{column.label}</h3>
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 text-gray-600 text-xs font-medium">
                {columnTasks.length}
              </span>
            </div>
            <button
              onClick={() => openNewTaskForm(column.key)}
              className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
              title={`Add task to ${column.label}`}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="bg-gray-50 rounded-b-lg p-2 min-h-[200px]">
          {columnTasks.map((task, index) => (
            <div
              key={task.id}
              onDragOver={handleDragOver}
              onDrop={(e) => {
                e.stopPropagation();
                handleDrop(e, column.key, index);
              }}
            >
              <TaskCard task={task} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Filter bar
  function FilterBar() {
    return (
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-sm text-gray-600">
          <Filter className="w-4 h-4" />
          <span>Filters:</span>
        </div>

        <div className="relative">
          <select
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
            className="appearance-none bg-white border border-gray-300 rounded-lg px-3 py-1.5 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          >
            <option value="">All Statuses</option>
            {KANBAN_COLUMNS.map((col) => (
              <option key={col.key} value={col.key}>
                {col.label}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={filters.priority}
            onChange={(e) => setFilters((prev) => ({ ...prev, priority: e.target.value }))}
            className="appearance-none bg-white border border-gray-300 rounded-lg px-3 py-1.5 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          >
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={filters.assignee}
            onChange={(e) => setFilters((prev) => ({ ...prev, assignee: e.target.value }))}
            className="appearance-none bg-white border border-gray-300 rounded-lg px-3 py-1.5 pr-8 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          >
            <option value="">All Assignees</option>
            {uniqueAssignees.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        {(filters.status || filters.priority || filters.assignee) && (
          <button
            onClick={() => setFilters({ status: '', priority: '', assignee: '' })}
            className="text-sm text-red-600 hover:text-red-800 underline"
          >
            Clear filters
          </button>
        )}
      </div>
    );
  }

  // List view
  function ListView() {
    const sorted = getSortedTasks(filteredTasks);

    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th
                  onClick={() => handleSort('title')}
                  className="text-left px-4 py-3 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 select-none"
                >
                  Title{getSortIndicator('title')}
                </th>
                <th
                  onClick={() => handleSort('status')}
                  className="text-left px-4 py-3 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 select-none"
                >
                  Status{getSortIndicator('status')}
                </th>
                <th
                  onClick={() => handleSort('priority')}
                  className="text-left px-4 py-3 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 select-none"
                >
                  Priority{getSortIndicator('priority')}
                </th>
                <th
                  onClick={() => handleSort('due_date')}
                  className="text-left px-4 py-3 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 select-none"
                >
                  Due Date{getSortIndicator('due_date')}
                </th>
                <th
                  onClick={() => handleSort('assignee')}
                  className="text-left px-4 py-3 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 select-none"
                >
                  Assignee{getSortIndicator('assignee')}
                </th>
                <th
                  onClick={() => handleSort('related_property')}
                  className="text-left px-4 py-3 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 select-none"
                >
                  Property{getSortIndicator('related_property')}
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((task) => {
                const overdue = isOverdue(task);
                return (
                  <tr
                    key={task.id}
                    className={`border-b border-gray-100 hover:bg-gray-50 ${
                      overdue ? 'bg-red-50' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{task.title}</span>
                        {overdue && (
                          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={task.status} />
                    </td>
                    <td className="px-4 py-3">
                      <PriorityBadge priority={task.priority} />
                    </td>
                    <td className={`px-4 py-3 ${overdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                      {formatDate(task.due_date)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{task.assignee || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{task.related_property || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditTaskForm(task)}
                          className="text-sm text-red-700 hover:text-red-900 font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(task.id)}
                          className="text-sm text-gray-400 hover:text-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                    No tasks found. Create one to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Task form modal
  function TaskFormModal() {
    if (!showForm) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={closeForm} />
        <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">
              {editingTask ? 'Edit Task' : 'New Task'}
            </h2>
            <button
              onClick={closeForm}
              className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSave} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Enter task title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                placeholder="Describe the task..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <div className="relative">
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}
                    className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    {KANBAN_COLUMNS.map((col) => (
                      <option key={col.key} value={col.key}>
                        {col.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <div className="relative">
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData((prev) => ({ ...prev, priority: e.target.value }))}
                    className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData((prev) => ({ ...prev, due_date: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
                <div className="relative">
                  <select
                    value={formData.assignee}
                    onChange={(e) => setFormData((prev) => ({ ...prev, assignee: e.target.value }))}
                    className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="">Unassigned</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.name}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Related Property</label>
              <input
                type="text"
                value={formData.related_property}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, related_property: e.target.value }))
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Property name or address"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Related Contact</label>
              <input
                type="text"
                value={formData.related_contact}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, related_contact: e.target.value }))
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Contact name"
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div>
                {editingTask && (
                  <button
                    type="button"
                    onClick={() => handleDelete(editingTask.id)}
                    className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Delete Task
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-red-700 rounded-lg hover:bg-red-800 transition-colors"
                >
                  {editingTask ? 'Update Task' : 'Create Task'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-red-700" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-full">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage property management tasks and assignments
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Template button */}
          <div className="relative">
            <button
              onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Use Template
              <ChevronDown className="w-4 h-4" />
            </button>
            {showTemplateDropdown && (
              <div className="absolute right-0 top-full mt-1 z-30 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-64">
                {templates.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-gray-500">No templates available</p>
                ) : (
                  templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => applyTemplate(template.id)}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <span className="font-medium">{template.name}</span>
                      {template.description && (
                        <span className="block text-xs text-gray-400 mt-0.5">
                          {template.description}
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Add task button */}
          <button
            onClick={() => openNewTaskForm()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-700 rounded-lg hover:bg-red-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>
        </div>
      </div>

      {/* View toggle and filters */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
        <div className="flex items-center bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setView('kanban')}
            className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              view === 'kanban'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            Board
          </button>
          <button
            onClick={() => setView('list')}
            className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              view === 'list'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <List className="w-4 h-4" />
            List
          </button>
        </div>

        <FilterBar />
      </div>

      {/* Main content */}
      {view === 'kanban' ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {KANBAN_COLUMNS.map((column) => (
            <KanbanColumn key={column.key} column={column} />
          ))}
        </div>
      ) : (
        <ListView />
      )}

      {/* Task form modal */}
      <TaskFormModal />

      {/* Close card menu on outside click */}
      {openCardMenu && (
        <div className="fixed inset-0 z-10" onClick={() => setOpenCardMenu(null)} />
      )}

      {/* Close template dropdown on outside click */}
      {showTemplateDropdown && (
        <div className="fixed inset-0 z-20" onClick={() => setShowTemplateDropdown(false)} />
      )}
    </div>
  );
}
