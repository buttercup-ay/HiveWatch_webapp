import React, { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase';
import Navbar from '../components/Navbar';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

export default function BeeActivity() {
  const [trafficData, setTrafficData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('today'); // 'today' | '7d'

  useEffect(() => {
    const trafficRef = ref(db, 'hive_001/bee_traffic');
    const unsub = onValue(trafficRef, (snap) => {
      const val = snap.val();
      if (!val) { setTrafficData([]); setLoading(false); return; }
      const records = Object.values(val).sort((a, b) => a.window_start - b.window_start);
      setTrafficData(records);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const now = Math.floor(Date.now() / 1000);
  const todayStart = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);
  const sevenDaysAgo = now - 7 * 86400;

  const filteredData = trafficData.filter((r) =>
    viewMode === 'today' ? r.window_start >= todayStart : r.window_start >= sevenDaysAgo
  );

  const chartData = filteredData.map((r) => ({
    ...r,
    label: new Date(r.window_start * 1000).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
  }));

  const todayData = trafficData.filter((r) => r.window_start >= todayStart);
  const totalIn = todayData.reduce((s, r) => s + (r.count_in || 0), 0);
  const totalOut = todayData.reduce((s, r) => s + (r.count_out || 0), 0);

  const peak = todayData.reduce(
    (best, r) => ((r.count_total || 0) > (best?.count_total || 0) ? r : best),
    null
  );

  const sevenDayData = trafficData.filter((r) => r.window_start >= sevenDaysAgo);
  const dailyTotals = {};
  sevenDayData.forEach((r) => {
    const day = new Date(r.window_start * 1000).toLocaleDateString();
    dailyTotals[day] = (dailyTotals[day] || 0) + (r.count_total || 0);
  });
  const avgDaily = Object.values(dailyTotals).length > 0
    ? Math.round(Object.values(dailyTotals).reduce((s, v) => s + v, 0) / Object.values(dailyTotals).length)
    : 0;

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar title="Bee Activity" />
      <main className="flex-1 p-4 md:p-6 flex flex-col gap-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Today's Entries", value: totalIn, icon: '🐝', color: 'text-green-600' },
            { label: "Today's Exits", value: totalOut, icon: '🍯', color: 'text-amber-600' },
            {
              label: 'Peak 30-min Window',
              value: peak ? peak.count_total : 0,
              sub: peak ? new Date(peak.window_start * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—',
              icon: '📊',
              color: 'text-blue-600',
            },
            { label: '7-Day Daily Avg', value: avgDaily, icon: '📅', color: 'text-purple-600' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl shadow-md p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">{stat.icon}</span>
                <span className="text-xs text-stone-500 font-medium">{stat.label}</span>
              </div>
              <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
              {stat.sub && <div className="text-xs text-stone-400 mt-1">{stat.sub}</div>}
            </div>
          ))}
        </div>

        {/* View toggle */}
        <div className="flex gap-2">
          {['today', '7d'].map((m) => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                viewMode === m
                  ? 'bg-amber-600 text-white'
                  : 'bg-white border border-stone-200 text-stone-600 hover:border-amber-400'
              }`}
            >
              {m === 'today' ? 'Today' : 'Last 7 Days'}
            </button>
          ))}
        </div>

        {/* Chart */}
        <div className="bg-white rounded-xl shadow-md p-5">
          <h3 className="font-bold text-stone-700 mb-4">🐝 Bee Traffic — 30-Minute Windows</h3>
          {loading ? (
            <LoadingSpinner className="py-10" />
          ) : chartData.length === 0 ? (
            <div className="text-center py-10 text-stone-400">No bee traffic data available</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0ede9" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10 }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8 }}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="count_in" name="Entries" fill="#16A34A" radius={[3, 3, 0, 0]} />
                <Bar dataKey="count_out" name="Exits" fill="#D97706" radius={[3, 3, 0, 0]} />
                <Bar dataKey="count_total" name="Total" fill="#94A3B8" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </main>
    </div>
  );
}
