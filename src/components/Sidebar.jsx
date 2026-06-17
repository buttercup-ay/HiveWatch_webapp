import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../hooks/useAuth';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { path: '/trends', label: 'Trends', icon: '📈' },
  { path: '/bee-activity', label: 'Bee Activity', icon: '🐝' },
  { path: '/security', label: 'Security', icon: '🔒' },
  { path: '/location', label: 'Location', icon: '📍' },
  { path: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function Sidebar() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  return (
    <aside className="hidden md:flex flex-col w-64 bg-stone-900 text-white min-h-screen fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-stone-700">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🍯</span>
          <div>
            <div className="text-amber-400 font-bold text-xl tracking-tight">HiveWatch</div>
            <div className="text-stone-400 text-xs">Beehive Monitoring System</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-6 flex flex-col gap-1">
        {NAV_ITEMS.map(({ path, label, icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/30'
                  : 'text-stone-300 hover:bg-stone-800 hover:text-white'
              }`
            }
          >
            <span className="text-base">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="px-4 py-4 border-t border-stone-700">
        <div className="text-xs text-stone-400 mb-2 px-2 truncate">{user?.email}</div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm text-stone-300 hover:bg-red-900/50 hover:text-red-300 transition-colors"
        >
          <span>🚪</span> Sign Out
        </button>
      </div>
    </aside>
  );
}
