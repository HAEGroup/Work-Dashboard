import { useEffect, useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, RefreshCw } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import api from '../services/api';
import type { CalendarEvent } from '../types';
import PageHeader from '../components/shared/PageHeader';

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [googleStatus, setGoogleStatus] = useState<{ connected: boolean } | null>(null);

  const [form, setForm] = useState({
    title: '', description: '', location: '',
    startTime: '', endTime: '', allDay: false, color: '#3b82f6',
  });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  useEffect(() => {
    loadEvents();
    loadGoogleStatus();
  }, [currentDate]);

  async function loadEvents() {
    try {
      const { data } = await api.get('/calendar/events', {
        params: {
          from: calendarStart.toISOString(),
          to: calendarEnd.toISOString(),
        },
      });
      setEvents(data.events);
    } catch (err) {
      console.error('Failed to load events:', err);
    }
  }

  async function loadGoogleStatus() {
    try {
      const { data } = await api.get('/calendar/google/status');
      setGoogleStatus(data);
    } catch { /* ignore if not configured */ }
  }

  async function connectGoogle() {
    try {
      const { data } = await api.get('/calendar/google/auth-url');
      window.location.href = data.url;
    } catch (err) {
      console.error('Failed to get auth URL:', err);
    }
  }

  async function syncGoogle() {
    try {
      await api.post('/calendar/google/sync');
      await loadEvents();
    } catch (err) {
      console.error('Failed to sync:', err);
    }
  }

  function openForm(date?: Date) {
    const d = date || new Date();
    setForm({
      title: '', description: '', location: '',
      startTime: format(d, "yyyy-MM-dd'T'HH:mm"),
      endTime: format(new Date(d.getTime() + 3600000), "yyyy-MM-dd'T'HH:mm"),
      allDay: false, color: '#3b82f6',
    });
    setEditingEvent(null);
    setShowForm(true);
  }

  function openEdit(event: CalendarEvent) {
    setForm({
      title: event.title,
      description: event.description || '',
      location: event.location || '',
      startTime: format(new Date(event.startTime), "yyyy-MM-dd'T'HH:mm"),
      endTime: format(new Date(event.endTime), "yyyy-MM-dd'T'HH:mm"),
      allDay: event.allDay,
      color: event.color || '#3b82f6',
    });
    setEditingEvent(event);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload = {
        title: form.title,
        description: form.description || undefined,
        location: form.location || undefined,
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
        allDay: form.allDay,
        color: form.color,
      };

      if (editingEvent) {
        await api.patch(`/calendar/events/${editingEvent.id}`, payload);
      } else {
        await api.post('/calendar/events', payload);
      }
      setShowForm(false);
      loadEvents();
    } catch (err) {
      console.error('Failed to save event:', err);
    }
  }

  async function deleteEvent(id: string) {
    try {
      await api.delete(`/calendar/events/${id}`);
      setShowForm(false);
      setEditingEvent(null);
      loadEvents();
    } catch (err) {
      console.error('Failed to delete event:', err);
    }
  }

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const event of events) {
      const key = format(new Date(event.startTime), 'yyyy-MM-dd');
      if (!map[key]) map[key] = [];
      map[key].push(event);
    }
    return map;
  }, [events]);

  const selectedDateEvents = selectedDate
    ? events.filter(e => isSameDay(new Date(e.startTime), selectedDate))
    : [];

  return (
    <div>
      <PageHeader
        title="Calendar"
        actions={
          <div className="flex gap-2">
            {googleStatus?.connected ? (
              <button onClick={syncGoogle} className="btn-secondary">
                <RefreshCw className="h-4 w-4 mr-2" /> Sync Google
              </button>
            ) : (
              <button onClick={connectGoogle} className="btn-secondary">
                Connect Google Calendar
              </button>
            )}
            <button onClick={() => openForm()} className="btn-primary">
              <Plus className="h-4 w-4 mr-2" /> New Event
            </button>
          </div>
        }
      />

      {/* Event Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowForm(false)}>
          <div className="card w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="card-header flex items-center justify-between">
              <h3 className="font-semibold">{editingEvent ? 'Edit Event' : 'New Event'}</h3>
              <button onClick={() => setShowForm(false)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="label">Title</label>
                  <input className="input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
                </div>
                <div>
                  <label className="label">Description</label>
                  <textarea className="input" rows={2} value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                </div>
                <div>
                  <label className="label">Location</label>
                  <input className="input" value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Start</label>
                    <input className="input" type="datetime-local" value={form.startTime} onChange={e => setForm({...form, startTime: e.target.value})} required />
                  </div>
                  <div>
                    <label className="label">End</label>
                    <input className="input" type="datetime-local" value={form.endTime} onChange={e => setForm({...form, endTime: e.target.value})} required />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.allDay} onChange={e => setForm({...form, allDay: e.target.checked})} className="rounded" />
                    All day
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Color</label>
                    <input type="color" value={form.color} onChange={e => setForm({...form, color: e.target.value})} className="h-8 w-8 rounded cursor-pointer" />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="submit" className="btn-primary">{editingEvent ? 'Update' : 'Create'}</button>
                  {editingEvent && (
                    <button type="button" onClick={() => deleteEvent(editingEvent.id)} className="btn-danger">Delete</button>
                  )}
                  <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar grid */}
        <div className="lg:col-span-3 card">
          <div className="card-header flex items-center justify-between">
            <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="btn-ghost btn-sm">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-semibold">{format(currentDate, 'MMMM yyyy')}</h2>
            <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="btn-ghost btn-sm">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-7 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="text-center text-xs font-medium text-gray-500 py-2">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
              {calendarDays.map(day => {
                const key = format(day, 'yyyy-MM-dd');
                const dayEvents = eventsByDate[key] || [];
                const isToday = isSameDay(day, new Date());
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isCurrentMonth = isSameMonth(day, currentDate);

                return (
                  <div
                    key={key}
                    onClick={() => setSelectedDate(day)}
                    onDoubleClick={() => openForm(day)}
                    className={`min-h-[80px] p-1 cursor-pointer bg-white hover:bg-gray-50 ${
                      !isCurrentMonth ? 'opacity-40' : ''
                    } ${isSelected ? 'ring-2 ring-primary-500 ring-inset' : ''}`}
                  >
                    <div className={`text-xs font-medium mb-1 flex items-center justify-center h-6 w-6 rounded-full ${
                      isToday ? 'bg-primary-600 text-white' : 'text-gray-700'
                    }`}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 3).map(evt => (
                        <div
                          key={evt.id}
                          onClick={e => { e.stopPropagation(); openEdit(evt); }}
                          className="text-xs px-1 py-0.5 rounded truncate cursor-pointer text-white"
                          style={{ backgroundColor: evt.color || '#3b82f6' }}
                        >
                          {evt.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-gray-500 px-1">+{dayEvents.length - 3} more</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Selected day detail */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold">
              {selectedDate ? format(selectedDate, 'EEEE, MMM d') : 'Select a day'}
            </h3>
          </div>
          <div className="divide-y divide-gray-100">
            {selectedDate && selectedDateEvents.length === 0 && (
              <div className="p-4 text-sm text-gray-500 text-center">No events</div>
            )}
            {selectedDateEvents.map(event => (
              <div
                key={event.id}
                onClick={() => openEdit(event)}
                className="px-4 py-3 cursor-pointer hover:bg-gray-50"
              >
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: event.color || '#3b82f6' }} />
                  <p className="text-sm font-medium text-gray-900">{event.title}</p>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 ml-4">
                  {event.allDay ? 'All day' : `${format(new Date(event.startTime), 'h:mm a')} - ${format(new Date(event.endTime), 'h:mm a')}`}
                </p>
                {event.location && (
                  <p className="text-xs text-gray-400 mt-0.5 ml-4">{event.location}</p>
                )}
              </div>
            ))}
            {selectedDate && (
              <div className="p-4">
                <button onClick={() => openForm(selectedDate)} className="btn-secondary btn-sm w-full">
                  <Plus className="h-3 w-3 mr-1" /> Add Event
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
