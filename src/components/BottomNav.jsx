import React from 'react';
import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Home', icon: '📊' },
  { path: '/trends', label: 'Trends', icon: '📈' },
  { path: '/bee-activity', label: 'Bees', icon: '🐝' },
  { path: '/security', label: 'Security', icon: '🛡️' },
  { path: '/location', label: 'Location', icon: '📍' },
  { path: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-stone-950/90 backdrop-blur-md border-t border-amber-200/60 dark:border-stone-800 z-40 flex pb-safe transition-colors">
      {NAV_ITEMS.map(({ path, label, icon }) => (
        <NavLink
          key={path}
          to={path}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center pt-2 pb-3 gap-1 text-[10px] transition-all ${
              isActive 
                ? 'text-amber-800 dark:text-amber-500' 
                : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
            }`
          }
        >
          {({ isActive }) => (
            <>
              {/* Icon Container with Pill Highlight for Active State */}
              <div 
                className={`relative px-4 py-1 rounded-full transition-all duration-200 ${
                  isActive ? 'bg-amber-100/80 dark:bg-amber-900/40 scale-110' : 'bg-transparent'
                }`}
              >
                <span className={`text-lg block transition-all ${!isActive && 'grayscale-[0.2] opacity-80'}`}>
                  {icon}
                </span>
              </div>
              
              {/* Label */}
              <span className={isActive ? 'font-bold tracking-tight' : 'font-medium'}>
                {label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}