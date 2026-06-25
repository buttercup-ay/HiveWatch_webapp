import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/trends', label: 'Trends', icon: '📈' },
  { path: '/bee-activity', label: 'Bee Activity', icon: '🐝' },
  { path: '/security', label: 'Security', icon: '🛡️' },
  { path: '/location', label: 'Location', icon: '📍' },
  { path: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function Sidebar() {
  const { user, userProfile, hiveId } = useAuth();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  // Get first letter of name for the Avatar, fallback to email letter
  const initial = userProfile?.name 
    ? userProfile.name.charAt(0).toUpperCase() 
    : user?.email?.charAt(0).toUpperCase() || '?';

  return (
    <aside className="hidden md:flex flex-col w-64 bg-stone-50 dark:bg-stone-950 text-stone-800 dark:text-stone-200 min-h-screen fixed left-0 top-0 z-40 border-r border-amber-200/60 dark:border-stone-800 shadow-sm transition-colors">
      
      {/* Logo & Node Assignment Area */}
      <div className="px-5 py-6 border-b border-amber-200/60 dark:border-stone-800 flex flex-col gap-5 transition-colors">
        <div className="flex items-center gap-3 px-1">
          <span className="text-3xl drop-shadow-sm">🍯</span>
          <div>
            <div className="text-stone-800 dark:text-stone-100 font-extrabold text-xl tracking-tight transition-colors">HiveWatch</div>
            <div className="text-stone-500 dark:text-stone-400 text-[10px] uppercase tracking-widest font-bold mt-0.5 transition-colors">Monitoring System</div>
          </div>
        </div>
        
        {/* Relocated Hive ID Badge */}
        <div className="flex items-center justify-between bg-white dark:bg-stone-900 border border-amber-200 dark:border-stone-700 px-3 py-2 rounded-lg shadow-sm transition-colors">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider">Node</span>
          </div>
          <span className="text-xs font-bold font-mono text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded transition-colors">
            {hiveId ? hiveId.toUpperCase() : 'NONE'}
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-6 flex flex-col gap-1.5 px-3">
        {NAV_ITEMS.map(({ path, label, icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 text-sm font-semibold transition-all rounded-lg ${
                isActive
                  ? 'bg-amber-100/80 dark:bg-amber-900/30 text-amber-800 dark:text-amber-500 shadow-sm border border-amber-200/50 dark:border-amber-800/50' 
                  : 'text-stone-500 dark:text-stone-400 hover:bg-stone-200/50 dark:hover:bg-stone-900 hover:text-stone-800 dark:hover:text-stone-200 border border-transparent'
              }`
            }
          >
            <span className="text-lg opacity-90 grayscale-[0.2]">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Operator Account Footer */}
      <div className="relative p-4 border-t border-amber-200/60 dark:border-stone-800 bg-white dark:bg-stone-950 transition-colors">
        
        {/* Floating Popover Menu */}
        {showMenu && (
          <div className="absolute bottom-[72px] right-4 w-40 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 shadow-xl rounded-lg py-1 z-50 transition-colors">
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 font-semibold transition-colors flex items-center gap-2"
            >
              <span className="text-base">🚪</span> Sign Out
            </button>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            {/* Avatar Circle */}
            <div className="w-9 h-9 rounded-full bg-amber-200 dark:bg-amber-900/60 text-amber-800 dark:text-amber-400 flex items-center justify-center font-bold text-sm flex-shrink-0 border border-amber-300 dark:border-amber-700/50 shadow-sm transition-colors">
              {initial}
            </div>
            
            {/* Name and Email */}
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-stone-800 dark:text-stone-200 truncate transition-colors">
                {userProfile?.name || 'Administrator'}
              </span>
              <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 truncate transition-colors">
                {user?.email}
              </span>
            </div>
          </div>

          {/* 3-Dot Menu Button */}
          <button
            onClick={() => setShowMenu(!showMenu)}
            className={`p-1.5 rounded-md transition-colors flex-shrink-0 ${showMenu ? 'bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200' : 'text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-900'}`}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Overlay to close menu when clicking outside */}
      {showMenu && (
        <div 
          className="fixed inset-0 z-40 bg-transparent" 
          onClick={() => setShowMenu(false)}
        />
      )}
    </aside>
  );
}