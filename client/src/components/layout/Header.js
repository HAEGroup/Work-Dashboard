import React from 'react';
import { useAuth } from '../../store/AuthContext';
import { Menu, Bell } from 'lucide-react';

export default function Header({ onMenuToggle }) {
  const { user } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
        >
          <Menu size={20} />
        </button>
        <div>
          <h2 className="text-lg font-semibold text-slate-500">
            Welcome back, {user?.first_name}
          </h2>
          <p className="text-sm text-gray-500">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button className="relative p-2 rounded-lg hover:bg-gray-100">
          <Bell size={20} className="text-gray-600" />
        </button>
        <div className="w-9 h-9 bg-redrock-500 rounded-full flex items-center justify-center text-sm font-semibold text-white">
          {user?.first_name?.[0]}{user?.last_name?.[0]}
        </div>
      </div>
    </header>
  );
}
