import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import {
  LayoutDashboard, Users, Mail, Calendar, CheckSquare,
  MessageCircle, Megaphone, Building2, Settings, ChevronLeft,
  ChevronRight, LogOut, UserCog, CloudSun
} from 'lucide-react';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/contacts', icon: Users, label: 'CRM' },
  { path: '/email', icon: Mail, label: 'Email' },
  { path: '/calendar', icon: Calendar, label: 'Calendar' },
  { path: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { path: '/chat', icon: MessageCircle, label: 'Chat' },
  { path: '/marketing', icon: Megaphone, label: 'Marketing' },
  { path: '/rentvine', icon: Building2, label: 'Rentvine' },
];

const bottomItems = [
  { path: '/settings', icon: Settings, label: 'Settings' },
  { path: '/users', icon: UserCog, label: 'Users', roles: ['admin', 'manager'] },
];

export default function Sidebar({ open, onToggle }) {
  const { user, logout } = useAuth();

  const linkClasses = (isActive) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
      isActive
        ? 'bg-redrock-500 text-white'
        : 'text-gray-300 hover:bg-white/10 hover:text-white'
    }`;

  return (
    <div
      className={`${
        open ? 'w-64' : 'w-20'
      } bg-slate-500 text-white flex flex-col transition-all duration-300 relative`}
    >
      {/* Logo */}
      <div className="p-4 flex items-center gap-3 border-b border-white/10">
        <div className="w-10 h-10 bg-redrock-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <Building2 size={22} />
        </div>
        {open && (
          <div className="overflow-hidden">
            <h1 className="text-sm font-bold leading-tight">Red Rock</h1>
            <p className="text-xs text-gray-400">Property Management</p>
          </div>
        )}
      </div>

      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 w-6 h-6 bg-slate-500 border-2 border-gray-200 rounded-full flex items-center justify-center text-white hover:bg-slate-600 z-10"
      >
        {open ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) => linkClasses(isActive)}
            title={!open ? item.label : undefined}
          >
            <item.icon size={20} className="flex-shrink-0" />
            {open && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom items */}
      <div className="p-3 border-t border-white/10 space-y-1">
        {bottomItems
          .filter((item) => !item.roles || item.roles.includes(user?.role))
          .map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => linkClasses(isActive)}
              title={!open ? item.label : undefined}
            >
              <item.icon size={20} className="flex-shrink-0" />
              {open && <span>{item.label}</span>}
            </NavLink>
          ))}
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium text-gray-300 hover:bg-white/10 hover:text-white w-full"
          title={!open ? 'Logout' : undefined}
        >
          <LogOut size={20} className="flex-shrink-0" />
          {open && <span>Logout</span>}
        </button>
      </div>

      {/* User info */}
      {open && user && (
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-sandstone-400 rounded-full flex items-center justify-center text-sm font-semibold text-white">
              {user.first_name?.[0]}{user.last_name?.[0]}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{user.first_name} {user.last_name}</p>
              <p className="text-xs text-gray-400 capitalize">{user.role}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
