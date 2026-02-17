import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { ChevronLeft, ChevronRight, Plus, X, Clock, MapPin } from 'lucide-react';

const CATEGORY_COLORS = {
  showing: '#3B82F6',
  inspection: '#F59E0B',
  maintenance: '#EF4444',
  meeting: '#8B5CF6',
  deadline: '#EC4899',
  other: '#6B7280',
};

const PRESET_COLORS = [
  '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#6B7280', '#10B981', '#F97316',
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatTime(hour) {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}

function formatDateTimeLocal(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${h}:${min}`;
}

function isSameDay(d1, d2) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function getStartOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getEndOfWeek(date) {
  const d = getStartOfWeek(date);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

function getViewRange(currentDate, view) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  if (view === 'month') {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const start = new Date(firstDay);
    start.setDate(start.getDate() - firstDay.getDay());
    const end = new Date(lastDay);
    end.setDate(end.getDate() + (6 - lastDay.getDay()));
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  if (view === 'week') {
    return { start: getStartOfWeek(currentDate), end: getEndOfWeek(currentDate) };
  }

  // day
  const start = new Date(year, month, currentDate.getDate(), 0, 0, 0, 0);
  const end = new Date(year, month, currentDate.getDate(), 23, 59, 59, 999);
  return { start, end };
}

const defaultFormData = {
  title: '',
  description: '',
  start: '',
  end: '',
  all_day: false,
  location: '',
  category: 'other',
  color: '#6B7280',
};

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month');
  const [events, setEvents] = useState([]);
  const [showEventForm, setShowEventForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [formData, setFormData] = useState({ ...defaultFormData });
  const [googleStatus, setGoogleStatus] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch events when currentDate or view changes
  useEffect(() => {
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, view]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const { start, end } = getViewRange(currentDate, view);
      const res = await api.get('/calendar', {
        params: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
      });
      setEvents(Array.isArray(res.data) ? res.data : res.data.events || []);
    } catch (err) {
      console.error('Failed to fetch events:', err);
    } finally {
      setLoading(false);
    }
  };

  const navigatePrev = () => {
    const d = new Date(currentDate);
    if (view === 'month') d.setMonth(d.getMonth() - 1);
    else if (view === 'week') d.setDate(d.getDate() - 7);
    else d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };

  const navigateNext = () => {
    const d = new Date(currentDate);
    if (view === 'month') d.setMonth(d.getMonth() + 1);
    else if (view === 'week') d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  const goToday = () => setCurrentDate(new Date());

  const openNewEvent = (date) => {
    const startDate = date || new Date();
    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + 1);
    setSelectedEvent(null);
    setFormData({
      ...defaultFormData,
      start: formatDateTimeLocal(startDate),
      end: formatDateTimeLocal(endDate),
    });
    setShowEventForm(true);
  };

  const openEditEvent = (event) => {
    setSelectedEvent(event);
    setFormData({
      title: event.title || '',
      description: event.description || '',
      start: event.start ? formatDateTimeLocal(new Date(event.start)) : '',
      end: event.end ? formatDateTimeLocal(new Date(event.end)) : '',
      all_day: event.all_day || false,
      location: event.location || '',
      category: event.category || 'other',
      color: event.color || CATEGORY_COLORS[event.category] || '#6B7280',
    });
    setShowEventForm(true);
  };

  const closeForm = () => {
    setShowEventForm(false);
    setSelectedEvent(null);
    setFormData({ ...defaultFormData });
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: type === 'checkbox' ? checked : value };
      if (name === 'category') {
        updated.color = CATEGORY_COLORS[value] || '#6B7280';
      }
      return updated;
    });
  };

  const handleColorSelect = (color) => {
    setFormData((prev) => ({ ...prev, color }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        start: new Date(formData.start).toISOString(),
        end: new Date(formData.end).toISOString(),
      };
      if (selectedEvent && selectedEvent._id) {
        await api.put(`/calendar/${selectedEvent._id}`, payload);
      } else {
        await api.post('/calendar', payload);
      }
      closeForm();
      fetchEvents();
    } catch (err) {
      console.error('Failed to save event:', err);
    }
  };

  const handleDelete = async () => {
    if (!selectedEvent || !selectedEvent._id) return;
    try {
      await api.delete(`/calendar/${selectedEvent._id}`);
      closeForm();
      fetchEvents();
    } catch (err) {
      console.error('Failed to delete event:', err);
    }
  };

  const connectGoogleCalendar = async () => {
    try {
      setGoogleStatus('Connecting...');
      const res = await api.get('/calendar/google/connect');
      setGoogleStatus(res.data.message || res.data.url || 'Connected successfully');
      if (res.data.url) {
        window.open(res.data.url, '_blank');
      }
    } catch (err) {
      setGoogleStatus('Failed to connect to Google Calendar');
      console.error('Google Calendar connect error:', err);
    }
  };

  const getEventsForDate = (date) => {
    return events.filter((ev) => {
      const evStart = new Date(ev.start);
      const evEnd = new Date(ev.end);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
      const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
      return evStart <= dayEnd && evEnd >= dayStart;
    });
  };

  const getEventsForHour = (date, hour) => {
    return events.filter((ev) => {
      const evStart = new Date(ev.start);
      const evEnd = new Date(ev.end);
      const hourStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, 0, 0);
      const hourEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, 59, 59);
      return evStart <= hourEnd && evEnd >= hourStart;
    });
  };

  const today = new Date();

  // --------------- Header Label ---------------
  const getHeaderLabel = () => {
    if (view === 'month') {
      return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }
    if (view === 'week') {
      const ws = getStartOfWeek(currentDate);
      const we = getEndOfWeek(currentDate);
      if (ws.getMonth() === we.getMonth()) {
        return `${MONTH_NAMES[ws.getMonth()]} ${ws.getDate()} – ${we.getDate()}, ${ws.getFullYear()}`;
      }
      return `${MONTH_NAMES[ws.getMonth()]} ${ws.getDate()} – ${MONTH_NAMES[we.getMonth()]} ${we.getDate()}, ${we.getFullYear()}`;
    }
    return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getDate()}, ${currentDate.getFullYear()}`;
  };

  // --------------- Month View ---------------
  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const prevMonthDays = getDaysInMonth(year, month - 1);
    const cells = [];

    // Previous month trailing days
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = prevMonthDays - i;
      const date = new Date(year, month - 1, day);
      cells.push({ date, inMonth: false, day });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      cells.push({ date, inMonth: true, day: d });
    }

    // Next month leading days
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const date = new Date(year, month + 1, d);
      cells.push({ date, inMonth: false, day: d });
    }

    return (
      <div className="flex-1 overflow-auto">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {DAY_NAMES.map((name) => (
            <div key={name} className="py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {name}
            </div>
          ))}
        </div>
        {/* Calendar grid */}
        <div className="grid grid-cols-7 flex-1" style={{ minHeight: '480px' }}>
          {cells.map((cell, idx) => {
            const isToday = isSameDay(cell.date, today);
            const dayEvents = getEventsForDate(cell.date);
            return (
              <div
                key={idx}
                className={`border border-gray-100 p-1 min-h-[80px] cursor-pointer hover:bg-gray-50 transition-colors ${
                  !cell.inMonth ? 'bg-gray-50/50' : 'bg-white'
                }`}
                onClick={() => {
                  const d = new Date(cell.date);
                  d.setHours(9, 0, 0, 0);
                  openNewEvent(d);
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-sm font-medium inline-flex items-center justify-center w-7 h-7 rounded-full ${
                      isToday
                        ? 'bg-red-700 text-white'
                        : cell.inMonth
                        ? 'text-gray-900'
                        : 'text-gray-400'
                    }`}
                  >
                    {cell.day}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map((ev) => (
                    <div
                      key={ev._id || ev.id}
                      className="text-xs px-1.5 py-0.5 rounded truncate text-white font-medium cursor-pointer"
                      style={{ backgroundColor: ev.color || CATEGORY_COLORS[ev.category] || '#6B7280' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditEvent(ev);
                      }}
                      title={ev.title}
                    >
                      {ev.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-gray-500 pl-1">+{dayEvents.length - 3} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // --------------- Week View ---------------
  const renderWeekView = () => {
    const weekStart = getStartOfWeek(currentDate);
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });

    return (
      <div className="flex-1 overflow-auto">
        {/* Day headers */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="py-2" />
          {weekDays.map((day, i) => {
            const isToday = isSameDay(day, today);
            return (
              <div key={i} className="py-2 text-center border-l border-gray-200">
                <div className="text-xs font-semibold text-gray-500 uppercase">{DAY_NAMES[day.getDay()]}</div>
                <div
                  className={`text-lg font-bold inline-flex items-center justify-center w-9 h-9 rounded-full ${
                    isToday ? 'bg-red-700 text-white' : 'text-gray-900'
                  }`}
                >
                  {day.getDate()}
                </div>
              </div>
            );
          })}
        </div>
        {/* Time grid */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)]">
          {HOURS.map((hour) => (
            <React.Fragment key={hour}>
              <div className="h-14 text-xs text-gray-400 text-right pr-2 pt-1 border-b border-gray-100">
                {formatTime(hour)}
              </div>
              {weekDays.map((day, di) => {
                const hourEvents = getEventsForHour(day, hour);
                return (
                  <div
                    key={di}
                    className="h-14 border-l border-b border-gray-100 relative cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => {
                      const d = new Date(day);
                      d.setHours(hour, 0, 0, 0);
                      openNewEvent(d);
                    }}
                  >
                    {hourEvents.map((ev) => (
                      <div
                        key={ev._id || ev.id}
                        className="absolute inset-x-0.5 top-0.5 text-xs px-1 py-0.5 rounded text-white truncate z-10 cursor-pointer"
                        style={{ backgroundColor: ev.color || CATEGORY_COLORS[ev.category] || '#6B7280' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditEvent(ev);
                        }}
                        title={ev.title}
                      >
                        {ev.title}
                      </div>
                    ))}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  // --------------- Day View ---------------
  const renderDayView = () => {
    return (
      <div className="flex-1 overflow-auto">
        {/* Day header */}
        <div className="sticky top-0 bg-white z-10 border-b border-gray-200 py-3 px-4">
          <div className="text-xs font-semibold text-gray-500 uppercase">{DAY_NAMES[currentDate.getDay()]}</div>
          <div
            className={`text-2xl font-bold inline-flex items-center justify-center w-11 h-11 rounded-full ${
              isSameDay(currentDate, today) ? 'bg-red-700 text-white' : 'text-gray-900'
            }`}
          >
            {currentDate.getDate()}
          </div>
        </div>
        {/* Time grid */}
        <div className="grid grid-cols-[60px_1fr]">
          {HOURS.map((hour) => {
            const hourEvents = getEventsForHour(currentDate, hour);
            return (
              <React.Fragment key={hour}>
                <div className="h-16 text-xs text-gray-400 text-right pr-2 pt-1 border-b border-gray-100">
                  {formatTime(hour)}
                </div>
                <div
                  className="h-16 border-b border-gray-100 relative cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => {
                    const d = new Date(currentDate);
                    d.setHours(hour, 0, 0, 0);
                    openNewEvent(d);
                  }}
                >
                  {hourEvents.map((ev) => (
                    <div
                      key={ev._id || ev.id}
                      className="absolute inset-x-1 top-0.5 text-sm px-2 py-1 rounded text-white truncate z-10 cursor-pointer flex items-center gap-2"
                      style={{ backgroundColor: ev.color || CATEGORY_COLORS[ev.category] || '#6B7280' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditEvent(ev);
                      }}
                    >
                      <span className="font-medium">{ev.title}</span>
                      {ev.location && (
                        <span className="flex items-center gap-0.5 text-white/80 text-xs">
                          <MapPin className="w-3 h-3" />
                          {ev.location}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  };

  // --------------- Event Form Modal ---------------
  const renderEventForm = () => {
    if (!showEventForm) return null;
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">
              {selectedEvent ? 'Edit Event' : 'New Event'}
            </h2>
            <button
              onClick={closeForm}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="p-4 space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleFormChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-red-700 outline-none transition-colors"
                placeholder="Event title"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleFormChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-red-700 outline-none transition-colors resize-none"
                placeholder="Event description"
              />
            </div>

            {/* All Day */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                name="all_day"
                id="all_day"
                checked={formData.all_day}
                onChange={handleFormChange}
                className="w-4 h-4 text-red-700 border-gray-300 rounded focus:ring-red-700"
              />
              <label htmlFor="all_day" className="text-sm font-medium text-gray-700">
                All day event
              </label>
            </div>

            {/* Start / End */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Clock className="w-3.5 h-3.5 inline mr-1" />
                  Start
                </label>
                <input
                  type={formData.all_day ? 'date' : 'datetime-local'}
                  name="start"
                  value={formData.all_day ? formData.start.split('T')[0] : formData.start}
                  onChange={handleFormChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-red-700 outline-none transition-colors text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Clock className="w-3.5 h-3.5 inline mr-1" />
                  End
                </label>
                <input
                  type={formData.all_day ? 'date' : 'datetime-local'}
                  name="end"
                  value={formData.all_day ? formData.end.split('T')[0] : formData.end}
                  onChange={handleFormChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-red-700 outline-none transition-colors text-sm"
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <MapPin className="w-3.5 h-3.5 inline mr-1" />
                Location
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-red-700 outline-none transition-colors"
                placeholder="Event location"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-700 focus:border-red-700 outline-none transition-colors bg-white"
              >
                <option value="showing">Showing</option>
                <option value="inspection">Inspection</option>
                <option value="maintenance">Maintenance</option>
                <option value="meeting">Meeting</option>
                <option value="deadline">Deadline</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Color Picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
              <div className="flex items-center gap-2 flex-wrap">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => handleColorSelect(color)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      formData.color === color
                        ? 'border-gray-900 scale-110 shadow-md'
                        : 'border-transparent hover:border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
              <div>
                {selectedEvent && selectedEvent._id && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Delete Event
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-medium text-white bg-red-700 hover:bg-red-800 rounded-lg transition-colors shadow-sm"
                >
                  {selectedEvent ? 'Update' : 'Create'} Event
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        {/* Left: navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={goToday}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Today
          </button>
          <button
            onClick={navigatePrev}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={navigateNext}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
          <h2 className="text-lg font-bold text-gray-900 ml-2">{getHeaderLabel()}</h2>
          {loading && (
            <div className="ml-2 w-4 h-4 border-2 border-red-700 border-t-transparent rounded-full animate-spin" />
          )}
        </div>

        {/* Right: view toggle + add */}
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
            {['month', 'week', 'day'].map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                  view === v
                    ? 'bg-red-700 text-white'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <button
            onClick={() => openNewEvent(null)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-red-700 hover:bg-red-800 rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Event
          </button>
        </div>
      </div>

      {/* Calendar body */}
      <div className="flex-1 overflow-hidden flex flex-col bg-white">
        {view === 'month' && renderMonthView()}
        {view === 'week' && renderWeekView()}
        {view === 'day' && renderDayView()}
      </div>

      {/* Google Calendar Connect Section */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={connectGoogleCalendar}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Connect Google Calendar
          </button>
          {googleStatus && (
            <span className="text-sm text-gray-600">{googleStatus}</span>
          )}
        </div>
      </div>

      {/* Event Form Modal */}
      {renderEventForm()}
    </div>
  );
}
