import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Mail,
  Calendar,
  BookOpen,
  CheckSquare,
  Building2,
  Settings,
  LogOut,
} from 'lucide-react';
import { useAuthStore } from '../../store/auth';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/email', icon: Mail, label: 'Email' },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/accounting', icon: BookOpen, label: 'Accounting' },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/properties', icon: Building2, label: 'Properties' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-gray-200 bg-white">
      <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-6">
        <Building2 className="h-7 w-7 text-primary-600" />
        <span className="text-lg font-bold text-gray-900">WorkDash</span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-sm font-medium">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
          <button onClick={logout} className="text-gray-400 hover:text-gray-600" title="Logout">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
