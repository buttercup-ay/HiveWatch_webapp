import React from 'react';
import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Home', icon: '🏠' },
  { path: '/trends', label: 'Trends', icon: '📈' },
  { path: '/bee-activity', label: 'Bees', icon: '🐝' },
  { path: '/security', label: 'Security', icon: '🔒' },
  { path: '/location', label: 'Location', icon: '📍' },
  { path: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-stone-900 border-t border-stone-700 z-40 flex">
      {NAV_ITEMS.map(({ path, label, icon }) => (
        <NavLink
          key={path}
          to={path}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center py-2 gap-0.5 text-xs transition-colors ${
              isActive ? 'text-amber-400' : 'text-stone-400'
            }`
          }
        >
          <span className="text-lg">{icon}</span>
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
