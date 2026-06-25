import React, { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Navbar({ title }) {
  const { user, userProfile, hiveId } = useAuth();
  const { theme, setTheme } = useTheme(); 
  const [status, setStatus] = useState('OFFLINE');
  const [alertCount, setAlertCount] = useState(0);

  // Status Listener
  useEffect(() => {
    if (!hiveId) return;
    const statusRef = ref(db, `${hiveId}/status`);
    const unsub = onValue(statusRef, (snap) => {
      setStatus(snap.val() || 'OFFLINE');
    });
    return () => unsub();
  }, [hiveId]);

  // Alert Counter Listener
  useEffect(() => {
    if (!hiveId) return;
    
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayTs = Math.floor(todayStart.getTime() / 1000);

    const intrRef = ref(db, `${hiveId}/alerts/intrusion_alerts`);
    const wtRef = ref(db, `${hiveId}/alerts/weight_alerts`);
    const thrRef = ref(db, `${hiveId}/alerts/threshold_alerts`);

    let counts = [0, 0, 0];
    const makeHandler = (idx) => (snap) => {
      const val = snap.val() || {};
      counts[idx] = Object.values(val).filter((a) => a.timestamp >= todayTs).length;
      setAlertCount(counts[0] + counts[1] + counts[2]);
    };

    const u1 = onValue(intrRef, makeHandler(0));
    const u2 = onValue(wtRef, makeHandler(1));
    const u3 = onValue(thrRef, makeHandler(2));

    return () => { u1(); u2(); u3(); };
  }, [hiveId]);

  // --- Simplified Theme Toggle Logic ---
  // Evaluate the actual current mode, even if the state is set to "system"
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  // Generate initial for Avatar
  const initial = userProfile?.name 
    ? userProfile.name.charAt(0).toUpperCase() 
    : user?.email?.charAt(0).toUpperCase() || '?';

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-stone-950/80 backdrop-blur-md border-b border-amber-200/60 dark:border-stone-800 px-5 md:px-8 py-4 flex items-center justify-between transition-all">
      <h1 className="text-xl font-extrabold text-stone-800 dark:text-stone-100 tracking-tight">
        {title}
      </h1>
      
      <div className="flex items-center gap-3 md:gap-4">
        
        {/* Connection Status Badge */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-sm transition-colors ${
            status === 'ONLINE'
              ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-800/60 dark:text-green-400'
              : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-800/60 dark:text-red-400'
          }`}
        >
          <div className="relative flex h-2.5 w-2.5 items-center justify-center">
            {status === 'ONLINE' && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-60 dark:opacity-40"></span>
            )}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${status === 'ONLINE' ? 'bg-green-600 dark:bg-green-500' : 'bg-red-600 dark:bg-red-500'}`}></span>
          </div>
          <span className="text-[11px] font-bold tracking-wider uppercase">
            {status === 'ONLINE' ? 'Live' : 'Offline'}
          </span>
        </div>

        {/* Daily Alerts Badge */}
        {alertCount > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-400 shadow-sm">
            <span className="text-xs">🔔</span>
            <span className="text-[11px] font-bold tracking-wider">{alertCount} New</span>
          </div>
        )}

        {/* Theme Toggle & User Info */}
        <div className="flex items-center gap-3 pl-2 md:pl-4 border-l border-amber-200/60 dark:border-stone-800 transition-colors">
           
           {/* Interactive Theme Toggle */}
           <button 
             onClick={toggleTheme}
             title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
             className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors text-sm border border-transparent hover:border-stone-200 dark:hover:border-stone-700"
           >
             {isDark ? '☀️' : '🌙'}
           </button>

           {/* User Avatar (Hidden on very small screens) */}
           <div className="hidden sm:flex items-center gap-2.5">
             <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700/50 text-amber-800 dark:text-amber-400 flex items-center justify-center font-bold text-xs shadow-sm transition-colors">
               {initial}
             </div>
             <span className="text-sm font-semibold text-stone-600 dark:text-stone-300 truncate max-w-[120px] transition-colors">
               {userProfile?.name || user?.email?.split('@')[0]}
             </span>
           </div>
        </div>

      </div>
    </header>
  );
}