import React, { useEffect, useState } from 'react';
import { ref, onValue, onChildAdded, set } from 'firebase/database';
import { db } from '../firebase';
import Navbar from '../components/Navbar';
import LoadingSpinner from '../components/LoadingSpinner';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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
    const secRef = ref(db, 'hive_001/security');
    const unsub = onValue(secRef, (snap) => {
      const val = snap.val() || {};
      setIntrusion(val.intrusion || false);
      setIntrusionTs(val.intrusion_ts || null);
      setIntrusionSource(val.intrusion_source || '');
    });
    return () => unsub();
  }, []);

  // Buzzer
  useEffect(() => {
    const buzRef = ref(db, 'hive_001/buzzer_control/state');
    const unsub = onValue(buzRef, (snap) => {
      setBuzzerState(snap.val() || false);
    });
    return () => unsub();
  }, []);

  // Alerts
  useEffect(() => {
    let alertMap = { intrusion: {}, theft: {}, threshold: {} };
    const paths = [
      { path: 'hive_001/alerts/intrusion_alerts', key: 'intrusion' },
      { path: 'hive_001/alerts/weight_alerts', key: 'theft' },
      { path: 'hive_001/alerts/threshold_alerts', key: 'threshold' },
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
  }, []);

  const toggleBuzzer = async () => {
    const newState = !buzzerState;
    await set(ref(db, 'hive_001/buzzer_control/state'), newState);
    setBuzzerTs(Date.now());
  };

  const clearIntrusion = async () => {
    await set(ref(db, 'hive_001/security/intrusion'), false);
  };

  const todayStart = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);
  const weekStart = Math.floor(Date.now() / 1000) - 7 * 86400;
  const todayAlerts = allAlerts.filter((a) => a.timestamp >= todayStart);
  const weekAlerts = allAlerts.filter((a) => a.timestamp >= weekStart);

  const pieData = [
    { name: 'Intrusion', value: allAlerts.filter((a) => a.alertType === 'intrusion').length, color: '#DC2626' },
    { name: 'Theft', value: allAlerts.filter((a) => a.alertType === 'theft').length, color: '#EA580C' },
    { name: 'Threshold', value: allAlerts.filter((a) => a.alertType === 'threshold').length, color: '#D97706' },
  ].filter((d) => d.value > 0);

  const filteredAlerts = allAlerts.filter((a) =>
    filter === 'All' ? true : a.alertType === filter.toLowerCase()
  );

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar title="Security" />
      <main className="flex-1 p-4 md:p-6 flex flex-col gap-6">

        {/* Intrusion Banner */}
        <div
          className={`rounded-xl p-5 flex items-center justify-between ${
            intrusion
              ? 'bg-red-600 text-white pulse-alert'
              : 'bg-green-50 border-2 border-green-200'
          }`}
        >
          <div>
            <div className={`text-2xl font-bold ${intrusion ? 'text-white' : 'text-green-700'}`}>
              {intrusion ? `⚠ INTRUSION DETECTED — ${intrusionSource}` : '✅ ALL CLEAR'}
            </div>
            <div className={`text-sm mt-1 ${intrusion ? 'text-red-100' : 'text-green-600'}`}>
              {intrusion
                ? `Detected at ${intrusionTs ? new Date(intrusionTs * 1000).toLocaleString() : 'unknown time'}`
                : 'No active intrusion alerts'}
            </div>
          </div>
          {intrusion && (
            <button
              onClick={clearIntrusion}
              className="bg-white text-red-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-50 transition"
            >
              Clear Alert
            </button>
          )}
        </div>

        {/* Buzzer Toggle */}
        <div className="bg-white rounded-xl shadow-md p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-stone-700 text-lg">Buzzer Control</h3>
              <p className="text-xs text-stone-400 mt-1">
                {buzzerTs ? `Last changed: ${new Date(buzzerTs).toLocaleTimeString()}` : 'Not changed this session'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span
                className={`text-sm font-bold px-3 py-1 rounded-full ${
                  buzzerState ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {buzzerState ? '🔊 ARMED' : '🔇 DISARMED'}
              </span>
              <button
                onClick={toggleBuzzer}
                className={`relative w-14 h-7 rounded-full transition-colors focus:outline-none ${
                  buzzerState ? 'bg-red-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                    buzzerState ? 'translate-x-7' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Stats + Pie */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-md p-4 flex flex-col items-center justify-center">
            <div className="text-4xl font-bold text-stone-800">{todayAlerts.length}</div>
            <div className="text-xs text-stone-400 mt-1">Alerts Today</div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4 flex flex-col items-center justify-center">
            <div className="text-4xl font-bold text-stone-800">{weekAlerts.length}</div>
            <div className="text-xs text-stone-400 mt-1">Alerts This Week</div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4">
            <div className="text-xs font-semibold text-stone-500 mb-2 uppercase tracking-wider">Alert Breakdown</div>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={100}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={40} label={({ name, value }) => `${name}: ${value}`} labelLine={false} fontSize={9}>
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-24 flex items-center justify-center text-stone-400 text-xs">No alerts yet</div>
            )}
          </div>
        </div>

        {/* Alert Log */}
        <div className="bg-white rounded-xl shadow-md p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="font-bold text-stone-700">Alert Log</h3>
            <div className="flex gap-1 flex-wrap">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                    filter === f
                      ? 'bg-amber-600 text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <LoadingSpinner className="py-8" />
          ) : filteredAlerts.length === 0 ? (
            <div className="text-center py-8 text-stone-400 text-sm">No alerts found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-stone-500 uppercase tracking-wider border-b border-stone-100">
                    <th className="py-2 text-left">Type</th>
                    <th className="py-2 text-left">Source/Parameter</th>
                    <th className="py-2 text-left hidden md:table-cell">Message</th>
                    <th className="py-2 text-left">Time</th>
                    <th className="py-2 text-left hidden md:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAlerts.map((alert) => (
                    <tr key={alert.id} className="border-b border-stone-50 hover:bg-amber-50/50">
                      <td className="py-2 pr-2">
                        <span
                          className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                            alert.alertType === 'intrusion' ? 'bg-red-100 text-red-700' :
                            alert.alertType === 'theft' ? 'bg-orange-100 text-orange-700' :
                            'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {alert.alertType.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2 pr-2 text-stone-600">{alert.source || alert.parameter || '—'}</td>
                      <td className="py-2 pr-2 text-stone-500 hidden md:table-cell max-w-xs truncate">{alert.message || '—'}</td>
                      <td className="py-2 pr-2 text-stone-500 whitespace-nowrap">{timeAgo(alert.timestamp)}</td>
                      <td className="py-2 text-stone-400 text-xs hidden md:table-cell">
                        {alert.timestamp ? new Date(alert.timestamp * 1000).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
