import React, { useEffect, useState } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import LoadingSpinner from '../components/LoadingSpinner';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const FILTERS = ['All', 'Intrusion', 'Theft', 'Threshold'];

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function Security() {
  const { hiveId } = useAuth();
  const [intrusion, setIntrusion] = useState(false);
  const [intrusionTs, setIntrusionTs] = useState(null);
  const [intrusionSource, setIntrusionSource] = useState('');
  const [buzzerState, setBuzzerState] = useState(false);
  const [buzzerTs, setBuzzerTs] = useState(null);
  const [allAlerts, setAllAlerts] = useState([]);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  // Security status
  useEffect(() => {
    if (!hiveId) return;
    const secRef = ref(db, `${hiveId}/security`);
    const unsub = onValue(secRef, (snap) => {
      const val = snap.val() || {};
      setIntrusion(val.intrusion || false);
      setIntrusionTs(val.intrusion_ts || null);
      setIntrusionSource(val.intrusion_source || '');
    });
    return () => unsub();
  }, [hiveId]);

  // Buzzer
  useEffect(() => {
    if (!hiveId) return;
    const buzRef = ref(db, `${hiveId}/buzzer_control/state`);
    const unsub = onValue(buzRef, (snap) => {
      setBuzzerState(snap.val() || false);
    });
    return () => unsub();
  }, [hiveId]);

  // Alerts
  useEffect(() => {
    if (!hiveId) return;
    let alertMap = { intrusion: {}, theft: {}, threshold: {} };
    const paths = [
      { path: `${hiveId}/alerts/intrusion_alerts`, key: 'intrusion' },
      { path: `${hiveId}/alerts/weight_alerts`, key: 'theft' },
      { path: `${hiveId}/alerts/threshold_alerts`, key: 'threshold' },
    ];

    const unsubs = paths.map(({ path, key }) =>
      onValue(ref(db, path), (snap) => {
        alertMap[key] = snap.val() || {};
        const combined = [
          ...Object.entries(alertMap.intrusion).map(([id, v]) => ({ ...v, id, alertType: 'intrusion' })),
          ...Object.entries(alertMap.theft).map(([id, v]) => ({ ...v, id, alertType: 'theft' })),
          ...Object.entries(alertMap.threshold).map(([id, v]) => ({ ...v, id, alertType: 'threshold' })),
        ].sort((a, b) => b.timestamp - a.timestamp);
        setAllAlerts(combined);
        setLoading(false);
      })
    );
    return () => unsubs.forEach((u) => u());
  }, [hiveId]);

  const toggleBuzzer = async () => {
    if (!hiveId) return;
    const newState = !buzzerState;
    await set(ref(db, `${hiveId}/buzzer_control/state`), newState);
    setBuzzerTs(Date.now());
  };

  const clearIntrusion = async () => {
    if (!hiveId) return;
    await set(ref(db, `${hiveId}/security/intrusion`), false);
  };

  const todayStart = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);
  const weekStart = Math.floor(Date.now() / 1000) - 7 * 86400;
  const todayAlerts = allAlerts.filter((a) => a.timestamp >= todayStart);
  const weekAlerts = allAlerts.filter((a) => a.timestamp >= weekStart);

  const pieData = [
    { name: 'Intrusion', value: allAlerts.filter((a) => a.alertType === 'intrusion').length, color: '#ef4444' }, // red-500
    { name: 'Theft', value: allAlerts.filter((a) => a.alertType === 'theft').length, color: '#f97316' },     // orange-500
    { name: 'Threshold', value: allAlerts.filter((a) => a.alertType === 'threshold').length, color: '#f59e0b' }, // amber-500
  ].filter((d) => d.value > 0);

  const filteredAlerts = allAlerts.filter((a) =>
    filter === 'All' ? true : a.alertType === filter.toLowerCase()
  );

  return (
    <div className="flex flex-col min-h-screen bg-stone-50/50 dark:bg-stone-950 pb-20 md:pb-0 transition-colors duration-300">
      <Navbar title="Security Controls" />
      
      <main className="flex-1 p-4 md:p-6 flex flex-col gap-6 max-w-7xl mx-auto w-full">

        {/* Top Action Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Intrusion Banner */}
          <div
            className={`rounded-2xl p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300 lg:col-span-2 ${
              intrusion
                ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)] animate-in fade-in zoom-in-95'
                : 'bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm'
            }`}
          >
            <div className="flex items-start gap-4">
              <span className={`text-4xl ${intrusion ? 'animate-pulse' : 'grayscale opacity-50 dark:opacity-20'}`}>
                {intrusion ? '🚨' : '🛡️'}
              </span>
              <div>
                <div className={`text-xl font-extrabold tracking-tight ${intrusion ? 'text-white' : 'text-stone-800 dark:text-stone-100'}`}>
                  {intrusion ? `INTRUSION DETECTED — ${intrusionSource.toUpperCase()}` : 'Perimeter Secure'}
                </div>
                <div className={`text-sm mt-1 font-medium ${intrusion ? 'text-red-100' : 'text-stone-400 dark:text-stone-500'}`}>
                  {intrusion
                    ? `Motion detected at ${intrusionTs ? new Date(intrusionTs * 1000).toLocaleString() : 'unknown time'}`
                    : 'No active break-ins or perimeter breaches detected.'}
                </div>
              </div>
            </div>
            
            {intrusion && (
              <button
                onClick={clearIntrusion}
                className="bg-white dark:bg-stone-800 text-red-600 dark:text-red-400 px-6 py-3 rounded-xl text-sm font-bold shadow-md hover:bg-red-50 dark:hover:bg-stone-700 hover:scale-105 active:scale-95 transition-all w-full sm:w-auto flex-shrink-0"
              >
                Acknowledge & Clear
              </button>
            )}
          </div>

          {/* Buzzer Control Card */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 p-5 md:p-6 flex flex-col justify-between transition-colors">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg opacity-80">🔊</span>
                <h3 className="font-bold text-stone-700 dark:text-stone-200">Siren Control</h3>
              </div>
              <p className="text-xs text-stone-400 dark:text-stone-500 font-medium mb-4">
                {buzzerTs ? `Last changed: ${new Date(buzzerTs).toLocaleTimeString()}` : 'Manual override available'}
              </p>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-stone-50 dark:bg-stone-950/50 rounded-xl border border-stone-100 dark:border-stone-800 transition-colors">
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded uppercase tracking-wider ${
                  buzzerState ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-stone-200 text-stone-500 dark:bg-stone-800 dark:text-stone-400'
                }`}
              >
                {buzzerState ? 'ARMED' : 'DISARMED'}
              </span>
              
              <button
                onClick={toggleBuzzer}
                className={`relative w-12 h-6 rounded-full transition-colors focus:outline-none shadow-inner ${
                  buzzerState ? 'bg-red-500' : 'bg-stone-300 dark:bg-stone-700'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ease-in-out ${
                    buzzerState ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 p-5 flex flex-col justify-center items-center text-center transition-colors">
            <span className="text-sm font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2">Alerts Today</span>
            <span className="text-5xl font-extrabold text-stone-800 dark:text-stone-100">{todayAlerts.length}</span>
            {todayAlerts.length === 0 && <span className="text-xs text-green-500 dark:text-green-400 font-semibold mt-2">All quiet</span>}
          </div>
          
          <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 p-5 flex flex-col justify-center items-center text-center transition-colors">
            <span className="text-sm font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2">Alerts This Week</span>
            <span className="text-5xl font-extrabold text-stone-800 dark:text-stone-100">{weekAlerts.length}</span>
            <span className="text-xs text-stone-400 dark:text-stone-500 font-medium mt-2">Past 7 days</span>
          </div>
          
          <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 p-5 flex flex-col items-center transition-colors">
            <span className="text-sm font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1 w-full text-left">Incident Breakdown</span>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie 
                    data={pieData} 
                    dataKey="value" 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={30} 
                    outerRadius={50} 
                    paddingAngle={3}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ fontSize: 11, borderRadius: 8, border: 'none', backgroundColor: 'rgba(28, 25, 23, 0.9)', color: '#fff' }}
                    itemStyle={{ color: '#e7e5e4' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex-1 w-full flex items-center justify-center">
                <span className="text-xs font-semibold text-stone-300 dark:text-stone-600 bg-stone-50 dark:bg-stone-800/50 px-3 py-1 rounded-lg border border-dashed border-stone-200 dark:border-stone-700">
                  No data to chart
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Alert Log Section */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden mb-6 transition-colors">
          <div className="bg-stone-50/80 dark:bg-stone-950/80 border-b border-stone-200 dark:border-stone-800 px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
            <h3 className="font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2">
              <span className="text-lg">📋</span> Incident Log
            </h3>
            
            {/* Pill Filters */}
            <div className="flex gap-2 flex-wrap">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                    filter === f
                      ? 'bg-amber-100/80 dark:bg-amber-900/40 text-amber-800 dark:text-amber-400 border-amber-200/50 dark:border-amber-800/50 shadow-sm'
                      : 'bg-white dark:bg-stone-950 text-stone-500 dark:text-stone-400 border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-700 dark:hover:text-stone-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="p-0 sm:p-2">
            {loading ? (
              <div className="py-12 flex justify-center"><LoadingSpinner /></div>
            ) : filteredAlerts.length === 0 ? (
              <div className="text-center py-12 flex flex-col items-center text-stone-400 dark:text-stone-500">
                <span className="text-4xl mb-3 grayscale opacity-30 dark:opacity-10">📋</span>
                <span className="text-sm font-medium">No incidents match this filter.</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-widest border-b border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 transition-colors">
                      <th className="py-3 px-4 text-left font-bold rounded-tl-lg">Type</th>
                      <th className="py-3 px-4 text-left font-bold">Source/Trigger</th>
                      <th className="py-3 px-4 text-left font-bold hidden md:table-cell">Message</th>
                      <th className="py-3 px-4 text-left font-bold">Time Detected</th>
                      <th className="py-3 px-4 text-left font-bold hidden sm:table-cell rounded-tr-lg">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAlerts.map((alert) => (
                      <tr key={alert.id} className="border-b border-stone-50 dark:border-stone-800/50 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors last:border-0 group">
                        <td className="py-3 px-4">
                          <span
                            className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider ${
                              alert.alertType === 'intrusion' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                              alert.alertType === 'theft' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                              'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                            }`}
                          >
                            {alert.alertType}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-stone-700 dark:text-stone-300 font-medium transition-colors">
                          {alert.source || alert.parameter || '—'}
                        </td>
                        <td className="py-3 px-4 text-stone-500 dark:text-stone-400 hidden md:table-cell max-w-xs truncate group-hover:text-stone-700 dark:group-hover:text-stone-200 transition-colors">
                          {alert.message || '—'}
                        </td>
                        <td className="py-3 px-4 text-stone-500 dark:text-stone-400 font-medium whitespace-nowrap transition-colors">
                          {timeAgo(alert.timestamp)}
                        </td>
                        <td className="py-3 px-4 text-stone-400 dark:text-stone-500 text-xs hidden sm:table-cell transition-colors">
                          {alert.timestamp ? new Date(alert.timestamp * 1000).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}