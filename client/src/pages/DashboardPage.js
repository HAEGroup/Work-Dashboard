import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  Mail,
  CheckSquare,
  Calendar,
  Users,
  CloudSun,
  Plus,
  UserPlus,
  PenSquare,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { Link } from 'react-router-dom';

const weatherEmojis = {
  clear: '☀️',
  sunny: '☀️',
  'partly cloudy': '⛅',
  cloudy: '☁️',
  overcast: '☁️',
  rain: '🌧️',
  drizzle: '🌦️',
  thunderstorm: '⛈️',
  snow: '🌨️',
  fog: '🌫️',
  mist: '🌫️',
  windy: '💨',
  haze: '🌫️',
};

function getWeatherEmoji(description) {
  if (!description) return '🌤️';
  const lower = description.toLowerCase();
  for (const [key, emoji] of Object.entries(weatherEmojis)) {
    if (lower.includes(key)) return emoji;
  }
  return '🌤️';
}

function formatRelativeTime(timestamp) {
  if (!timestamp) return '';
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return then.toLocaleDateString();
}

function formatTodayDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function SkeletonCard() {
  return (
    <div className="rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
      <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
    </div>
  );
}

function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState({
    unread_emails: 0,
    today_tasks: 0,
    upcoming_events: 0,
    open_leads: 0,
    recent_activities: [],
  });
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      try {
        const [summaryRes, weatherRes] = await Promise.all([
          api.get('/dashboard/summary'),
          api.get('/weather').catch(() => null),
        ]);
        setSummary(summaryRes.data);
        if (weatherRes) {
          setWeather(weatherRes.data);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, []);

  const quickActions = [
    {
      label: 'New Contact',
      icon: UserPlus,
      to: '/contacts',
      color: 'bg-[#8B2500] hover:bg-[#6E1D00]',
    },
    {
      label: 'New Task',
      icon: Plus,
      to: '/tasks',
      color: 'bg-[#D4A574] hover:bg-[#C49464]',
    },
    {
      label: 'Compose Email',
      icon: PenSquare,
      to: '/email',
      color: 'bg-[#2D3436] hover:bg-[#1E2324]',
    },
    {
      label: 'New Event',
      icon: Calendar,
      to: '/calendar',
      color: 'bg-[#8B2500] hover:bg-[#6E1D00]',
    },
  ];

  const summaryCards = [
    {
      label: 'Unread Emails',
      count: summary.unread_emails,
      icon: Mail,
      to: '/email',
      iconColor: 'text-[#8B2500]',
      bgColor: 'bg-red-50',
    },
    {
      label: "Today's Tasks",
      count: summary.today_tasks,
      icon: CheckSquare,
      to: '/tasks',
      iconColor: 'text-[#D4A574]',
      bgColor: 'bg-amber-50',
    },
    {
      label: 'Upcoming Events',
      count: summary.upcoming_events,
      icon: Calendar,
      to: '/calendar',
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Open Leads',
      count: summary.open_leads,
      icon: Users,
      to: '/contacts',
      iconColor: 'text-[#2D3436]',
      bgColor: 'bg-slate-50',
    },
  ];

  const activityTypeIcons = {
    email: Mail,
    task: CheckSquare,
    event: Calendar,
    contact: Users,
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Skeleton welcome banner */}
        <div className="rounded-xl shadow-sm border border-gray-200 p-8 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        </div>

        {/* Skeleton quick actions */}
        <div className="flex gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-10 bg-gray-200 rounded-lg animate-pulse flex-1"
            ></div>
          ))}
        </div>

        {/* Skeleton summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>

        {/* Skeleton weather + activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-12 bg-gray-200 rounded w-2/3 mb-3"></div>
            <div className="h-3 bg-gray-200 rounded w-full"></div>
          </div>
          <div className="lg:col-span-2 rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-gray-200 rounded w-full mb-3"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-xl shadow-sm border border-gray-200 bg-gradient-to-r from-[#8B2500] to-[#6E1D00] p-8 text-white">
        <h1 className="text-2xl font-bold mb-1">
          Welcome back, {user?.name || user?.first_name || 'User'}
        </h1>
        <p className="text-white/80 text-sm">{formatTodayDate()}</p>
      </div>

      {/* Quick Action Buttons */}
      <div className="flex flex-wrap gap-3">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              to={action.to}
              className={`${action.color} text-white px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors`}
            >
              <Icon className="w-4 h-4" />
              {action.label}
            </Link>
          );
        })}
      </div>

      {/* Summary Widget Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              to={card.to}
              className="rounded-xl shadow-sm border border-gray-200 p-6 bg-white hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`${card.bgColor} p-3 rounded-lg`}>
                  <Icon className={`w-5 h-5 ${card.iconColor}`} />
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">
                {card.count}
              </p>
              <p className="text-sm text-gray-500">{card.label}</p>
            </Link>
          );
        })}
      </div>

      {/* Weather + Recent Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Weather Widget */}
        <div className="rounded-xl shadow-sm border border-gray-200 bg-white p-6">
          <div className="flex items-center gap-2 mb-4">
            <CloudSun className="w-5 h-5 text-[#D4A574]" />
            <h2 className="text-lg font-semibold text-gray-900">Weather</h2>
          </div>

          {weather && weather.current ? (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-4xl">
                  {getWeatherEmoji(weather.current.description)}
                </span>
                <div>
                  <p className="text-3xl font-bold text-gray-900">
                    {weather.current.temp}°
                  </p>
                  <p className="text-sm text-gray-500 capitalize">
                    {weather.current.description}
                  </p>
                </div>
              </div>

              {weather.forecast && weather.forecast.length > 0 && (
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs text-gray-400 uppercase font-medium mb-3">
                    5-Day Forecast
                  </p>
                  <div className="flex justify-between">
                    {weather.forecast.slice(0, 5).map((day, idx) => (
                      <div key={idx} className="text-center">
                        <p className="text-xs text-gray-500 mb-1">
                          {day.day || day.date}
                        </p>
                        <span className="text-lg">
                          {getWeatherEmoji(day.description)}
                        </span>
                        <p className="text-xs font-medium text-gray-700 mt-1">
                          {day.high}°
                        </p>
                        {day.low !== undefined && (
                          <p className="text-xs text-gray-400">{day.low}°</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-400">
              <CloudSun className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">Configure weather in settings</p>
            </div>
          )}
        </div>

        {/* Recent Activity Feed */}
        <div className="lg:col-span-2 rounded-xl shadow-sm border border-gray-200 bg-white p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-[#8B2500]" />
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Activity
            </h2>
          </div>

          {summary.recent_activities && summary.recent_activities.length > 0 ? (
            <ul className="space-y-3">
              {summary.recent_activities.map((activity, idx) => {
                const ActivityIcon =
                  activityTypeIcons[activity.type] || Clock;
                return (
                  <li
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="bg-gray-100 p-2 rounded-lg mt-0.5">
                      <ActivityIcon className="w-4 h-4 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatRelativeTime(activity.timestamp)}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 capitalize whitespace-nowrap">
                      {activity.type}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Clock className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No recent activity</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
