import React, { useEffect, useState, useMemo } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const RANGES = [
  { value: '6H', label: 'Last 6 Hours', hours: 6 },
  { value: '24H', label: 'Last 24 Hours', hours: 24 },
  { value: '7D', label: 'Last 7 Days', hours: 168 },
  { value: '30D', label: 'Last 30 Days', hours: 720 },
  { value: 'CUSTOM', label: 'Custom Range...', hours: 0 },
];

function formatX(ts, totalHours) {
  const d = new Date(ts * 1000);
  if (totalHours <= 24) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (totalHours <= 168) {
    return d.toLocaleDateString([], { weekday: 'short' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (totalHours <= 8760) {
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } else {
    return d.toLocaleDateString([], { month: 'short', year: 'numeric' });
  }
}

export default function BeeActivity() {
  const { hiveId } = useAuth();
  
  // UI State
  const [selectedRange, setSelectedRange] = useState('24H');
  const [customDates, setCustomDates] = useState({ start: '', end: '' });
  const [loading, setLoading] = useState(true);
  
  // Data State
  const [rawHistory, setRawHistory] = useState([]);

  // Fetch raw data ONCE
  useEffect(() => {
    if (!hiveId) return;
    setLoading(true);
    
    const historyRef = ref(db, `${hiveId}/history`);
    const unsub = onValue(historyRef, (snap) => {
      const val = snap.val();
      if (!val) { 
        setRawHistory([]); 
      } else {
        setRawHistory(Object.values(val));
      }
      setLoading(false);
    });
    
    return () => unsub();
  }, [hiveId]);

  // Filter and Group data instantly based on date selection
  const { chartData, stats } = useMemo(() => {
    if (rawHistory.length === 0) return { chartData: [], stats: {} };

    let cutoff = 0;
    let limit = Math.floor(Date.now() / 1000);
    let spanHours = 24;

    if (selectedRange === 'CUSTOM') {
      const startTs = new Date(customDates.start).getTime();
      const endTs = new Date(customDates.end).getTime();

      if (!isNaN(startTs) && !isNaN(endTs)) {
        cutoff = Math.floor(startTs / 1000);
        limit = Math.floor(endTs / 1000) + 86399; 
        spanHours = (limit - cutoff) / 3600;
        if (cutoff > limit) return { chartData: [], stats: {} };
      } else {
        return { chartData: [], stats: {} };
      }
    } else {
      const rangeObj = RANGES.find((r) => r.value === selectedRange) || RANGES[1];
      spanHours = rangeObj.hours;
      cutoff = limit - (spanHours * 3600);
    }

    const filteredRaw = rawHistory.filter((r) => r.timestamp >= cutoff && r.timestamp <= limit);
    const groupedData = {};
    let totalIn = 0;
    let totalOut = 0;
    const uniqueDays = new Set();

    filteredRaw.forEach(r => {
      if (!r.timestamp || (r.bee_in === 0 && r.bee_out === 0)) return;
      
      const bucketStart = Math.floor(r.timestamp / 1800) * 1800;
      
      if (!groupedData[bucketStart]) {
        groupedData[bucketStart] = {
          window_start: bucketStart,
          count_in: 0,
          count_out: 0,
          count_total: 0
        };
      }
      
      groupedData[bucketStart].count_in += (r.bee_in || 0);
      groupedData[bucketStart].count_out += (r.bee_out || 0);
      groupedData[bucketStart].count_total += ((r.bee_in || 0) + (r.bee_out || 0));

      totalIn += (r.bee_in || 0);
      totalOut += (r.bee_out || 0);
      uniqueDays.add(new Date(r.timestamp * 1000).toLocaleDateString());
    });

    const aggregatedRecords = Object.values(groupedData)
      .sort((a, b) => a.window_start - b.window_start)
      .map(r => ({
        ...r,
        label: formatX(r.window_start, spanHours)
      }));

    const peak = aggregatedRecords.reduce((best, r) => (r.count_total > (best?.count_total || 0) ? r : best), null);
    const avgDaily = uniqueDays.size > 0 ? Math.round((totalIn + totalOut) / uniqueDays.size) : 0;

    return {
      chartData: aggregatedRecords,
      stats: { totalIn, totalOut, peak, avgDaily }
    };
  }, [rawHistory, selectedRange, customDates]);

  // Chart Properties (Neutral grays for dark/light mode compatibility)
  const axisProps = { dataKey: 'label', tick: { fontSize: 10, fill: '#8a8a8a' }, interval: 'preserveStartEnd', tickMargin: 8 };
  const yAxisProps = { tick: { fontSize: 10, fill: '#8a8a8a' }, width: 45, axisLine: false, tickLine: false };

  return (
    <div className="flex flex-col min-h-screen bg-stone-50/50 dark:bg-stone-950 pb-20 md:pb-0 transition-colors duration-300">
      <Navbar title="Traffic Logs" />
      
      <main className="flex-1 p-4 md:p-6 flex flex-col gap-6 max-w-7xl mx-auto w-full">
        
        {/* Responsive Control Bar */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 p-4 flex flex-col md:flex-row md:items-center gap-4 justify-between transition-colors">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full md:w-auto">
            
            <div className="w-full md:w-auto">
              <label className="block text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1">Time Range</label>
              <select
                value={selectedRange}
                onChange={(e) => setSelectedRange(e.target.value)}
                className="w-full md:w-auto pl-3 pr-8 py-2 border border-stone-200 dark:border-stone-700 rounded-lg text-sm font-semibold text-stone-700 dark:text-stone-200 bg-stone-50 dark:bg-stone-950 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors appearance-none cursor-pointer"
                style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right 0.5rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em` }}
              >
                {RANGES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            {selectedRange === 'CUSTOM' && (
              <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3 w-full md:w-auto animate-in fade-in slide-in-from-left-4 duration-300">
                <div className="w-full sm:w-auto">
                  <label className="block text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1">Start Date</label>
                  <input
                    type="date"
                    value={customDates.start}
                    onChange={(e) => setCustomDates({ ...customDates, start: e.target.value })}
                    className="w-full sm:w-auto px-3 py-2 border border-stone-200 dark:border-stone-700 rounded-lg text-sm text-stone-700 dark:text-stone-200 bg-white dark:bg-stone-950 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors"
                  />
                </div>
                
                <span className="hidden sm:block mb-2 text-stone-400 dark:text-stone-600 text-sm font-medium">to</span>
                
                <div className="w-full sm:w-auto">
                  <label className="block text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1">End Date</label>
                  <input
                    type="date"
                    max={new Date().toISOString().split('T')[0]}
                    value={customDates.end}
                    onChange={(e) => setCustomDates({ ...customDates, end: e.target.value })}
                    className="w-full sm:w-auto px-3 py-2 border border-stone-200 dark:border-stone-700 rounded-lg text-sm text-stone-700 dark:text-stone-200 bg-white dark:bg-stone-950 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors"
                  />
                </div>
              </div>
            )}
          </div>
          
          <div className="text-xs font-semibold text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 px-3 py-1.5 rounded-full self-start md:self-auto flex-shrink-0 transition-colors">
            {chartData.length} 30-min windows
          </div>
        </div>

        {/* Dynamic Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Period Entries", value: stats.totalIn || 0, icon: '🐝', color: 'text-green-600 dark:text-green-500' },
            { label: "Period Exits", value: stats.totalOut || 0, icon: '🍯', color: 'text-amber-600 dark:text-amber-500' },
            {
              label: 'Peak 30-min Window',
              value: stats.peak ? stats.peak.count_total : 0,
              sub: stats.peak ? new Date(stats.peak.window_start * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—',
              icon: '📊',
              color: 'text-stone-700 dark:text-stone-300',
            },
            { label: 'Daily Average', value: stats.avgDaily || 0, icon: '📅', color: 'text-stone-700 dark:text-stone-300' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 p-5 flex flex-col justify-center transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg opacity-80">{stat.icon}</span>
                <span className="text-[11px] text-stone-500 dark:text-stone-400 font-bold uppercase tracking-wider">{stat.label}</span>
              </div>
              <div className={`text-3xl font-extrabold tracking-tight ${stat.color}`}>{stat.value}</div>
              {stat.sub && <div className="text-xs font-medium text-stone-400 dark:text-stone-500 mt-1">{stat.sub}</div>}
            </div>
          ))}
        </div>

        {/* Loading & Empty States */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 min-h-[400px] transition-colors">
            <LoadingSpinner size="lg" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 min-h-[400px] text-stone-400 dark:text-stone-500 p-6 text-center transition-colors">
            <span className="text-4xl mb-3 grayscale opacity-30 dark:opacity-10">🐝</span>
            <p className="font-medium">No bee traffic data recorded in this time range.</p>
            {selectedRange === 'CUSTOM' && <p className="text-xs mt-2">Ensure you have selected complete Start and End dates.</p>}
          </div>
        ) : (
          /* Chart Panel */
          <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden mb-6 transition-colors">
            <div className="bg-stone-50/80 dark:bg-stone-950/80 border-b border-stone-200 dark:border-stone-800 px-4 sm:px-5 py-3 flex items-center gap-2 transition-colors">
              <span className="text-lg">📊</span>
              <h3 className="font-bold text-stone-800 dark:text-stone-100 text-sm sm:text-base">Break-Beam Activity Profile (30-Min Buckets)</h3>
            </div>
            <div className="p-2 sm:p-5">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={chartData} margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" strokeOpacity={0.2} vertical={false} />
                  <XAxis {...axisProps} />
                  <YAxis {...yAxisProps} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', backgroundColor: 'rgba(28, 25, 23, 0.9)', color: '#fff' }}
                    itemStyle={{ color: '#e7e5e4' }}
                    cursor={{ fill: 'rgba(120, 113, 108, 0.1)' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: '10px' }} iconType="circle" />
                  <Bar dataKey="count_in" name="Entries" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="count_out" name="Exits" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="count_total" name="Total Activity" fill="#64748b" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}