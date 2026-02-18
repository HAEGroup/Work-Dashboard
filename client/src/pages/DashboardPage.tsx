import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Mail,
  Calendar,
  CheckSquare,
  Building2,
  Clock,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';
import { format } from 'date-fns';
import api from '../services/api';
import type { DashboardData } from '../types';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import PageHeader from '../components/shared/PageHeader';

const priorityColors: Record<string, string> = {
  URGENT: 'badge-red',
  HIGH: 'badge-yellow',
  MEDIUM: 'badge-blue',
  LOW: 'badge-gray',
};

const statusColors: Record<string, string> = {
  TODO: 'badge-blue',
  IN_PROGRESS: 'badge-yellow',
  IN_REVIEW: 'badge-green',
  DONE: 'badge-green',
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard')
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (!data) return <div className="text-gray-500">Failed to load dashboard</div>;

  const totalTasks = Object.values(data.tasks.summary).reduce((a, b) => a + b, 0);

  return (
    <div>
      <PageHeader title="Dashboard" description="Your work at a glance" />

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Link to="/tasks" className="card card-body hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <CheckSquare className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalTasks}</p>
              <p className="text-sm text-gray-500">Total Tasks</p>
            </div>
          </div>
          <div className="mt-3 flex gap-2 text-xs">
            <span className="badge-yellow">{data.tasks.summary.IN_PROGRESS || 0} in progress</span>
            <span className="badge-green">{data.tasks.summary.DONE || 0} done</span>
          </div>
        </Link>

        <Link to="/email" className="card card-body hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
              <Mail className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{data.email.unreadCount}</p>
              <p className="text-sm text-gray-500">Unread Emails</p>
            </div>
          </div>
        </Link>

        <Link to="/properties" className="card card-body hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <Building2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{data.properties.total}</p>
              <p className="text-sm text-gray-500">Properties</p>
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-500">
            {data.properties.activeTenants} active tenants
          </div>
        </Link>

        <Link to="/calendar" className="card card-body hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
              <Calendar className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{data.calendar.upcomingEvents.length}</p>
              <p className="text-sm text-gray-500">Upcoming Events</p>
            </div>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Tasks */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">My Tasks</h2>
            <Link to="/tasks" className="text-sm text-primary-600 hover:text-primary-700">View all</Link>
          </div>
          <div className="divide-y divide-gray-100">
            {data.tasks.myTasks.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">No active tasks</div>
            ) : (
              data.tasks.myTasks.map(task => (
                <div key={task.id} className="flex items-center gap-3 px-6 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                    {task.project && (
                      <p className="text-xs text-gray-500">{task.project.name}</p>
                    )}
                  </div>
                  <span className={statusColors[task.status] || 'badge-gray'}>{task.status.replace('_', ' ')}</span>
                  <span className={priorityColors[task.priority] || 'badge-gray'}>{task.priority}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Upcoming Events</h2>
            <Link to="/calendar" className="text-sm text-primary-600 hover:text-primary-700">View calendar</Link>
          </div>
          <div className="divide-y divide-gray-100">
            {data.calendar.upcomingEvents.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">No upcoming events</div>
            ) : (
              data.calendar.upcomingEvents.map(event => (
                <div key={event.id} className="flex items-center gap-3 px-6 py-3">
                  <div
                    className="h-2 w-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: event.color || '#3b82f6' }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{event.title}</p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(event.startTime), 'MMM d, h:mm a')}
                      {event.location && ` - ${event.location}`}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Active Timer */}
        {data.timeTracking.activeTimer && (
          <div className="card card-body">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Timer Running</p>
                <p className="text-xs text-gray-500">
                  {data.timeTracking.activeTimer.task?.title} - Started{' '}
                  {format(new Date(data.timeTracking.activeTimer.startTime), 'h:mm a')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Maintenance Requests */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Open Maintenance</h2>
            <Link to="/properties" className="text-sm text-primary-600 hover:text-primary-700">View all</Link>
          </div>
          <div className="divide-y divide-gray-100">
            {data.properties.recentMaintenanceRequests.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">No open requests</div>
            ) : (
              data.properties.recentMaintenanceRequests.map(req => (
                <div key={req.id} className="flex items-center gap-3 px-6 py-3">
                  <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{req.title}</p>
                    <p className="text-xs text-gray-500">{req.property?.name}</p>
                  </div>
                  {req.priority && (
                    <span className={`badge ${req.priority === 'high' || req.priority === 'urgent' ? 'badge-red' : 'badge-yellow'}`}>
                      {req.priority}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
