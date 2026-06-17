import React, { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';

export default function Navbar({ title }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState('OFFLINE');
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    const statusRef = ref(db, 'hive_001/status');
    const unsub = onValue(statusRef, (snap) => {
      setStatus(snap.val() || 'OFFLINE');
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    let count = 0;
    const paths = [
      'hive_001/alerts/intrusion_alerts',
      'hive_001/alerts/weight_alerts',
      'hive_001/alerts/threshold_alerts',
    ];
    const unsubs = paths.map((path) => {
      const r = ref(db, path);
      return onValue(r, (snap) => {
        const val = snap.val();
        count = Object.keys(val || {}).length;
        setAlertCount((prev) => prev); // trigger only after all loaded
      });
    });
    // Simple count of today's alerts
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayTs = Math.floor(todayStart.getTime() / 1000);

    const intrRef = ref(db, 'hive_001/alerts/intrusion_alerts');
    const wtRef = ref(db, 'hive_001/alerts/weight_alerts');
    const thrRef = ref(db, 'hive_001/alerts/threshold_alerts');

    let counts = [0, 0, 0];
    const makeHandler = (idx) => (snap) => {
      const val = snap.val() || {};
      counts[idx] = Object.values(val).filter((a) => a.timestamp >= todayTs).length;
      setAlertCount(counts[0] + counts[1] + counts[2]);
    };

    const u1 = onValue(intrRef, makeHandler(0));
    const u2 = onValue(wtRef, makeHandler(1));
    const u3 = onValue(thrRef, makeHandler(2));

    return () => { u1(); u2(); u3(); unsubs.forEach(u => u()); };
  }, []);

  return (
    <header className="bg-white border-b border-amber-100 px-4 md:px-6 py-3 flex items-center justify-between shadow-sm">
      <h1 className="text-lg font-bold text-stone-800">{title}</h1>
      <div className="flex items-center gap-3">
        <span
          className={`text-xs font-bold px-2.5 py-1 rounded-full ${
            status === 'ONLINE'
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-600'
          }`}
        >
          {status === 'ONLINE' ? '● LIVE' : '● OFFLINE'}
        </span>
        {alertCount > 0 && (
          <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {alertCount} alerts
          </span>
        )}
        <span className="hidden md:block text-xs text-stone-500 truncate max-w-[160px]">{user?.email}</span>
      </div>
    </header>
  );
}
