import React, { useEffect, useState, useMemo } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase';
import { useThresholds } from '../hooks/useThresholds';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ReferenceLine, ResponsiveContainer,
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

export default function Trends() {
  const { hiveId } = useAuth();
  const thresholds = useThresholds();
  
  const [selectedRange, setSelectedRange] = useState('24H');
  const [customDates, setCustomDates] = useState({ start: '', end: '' });
  const [loading, setLoading] = useState(true);
  const [rawHistory, setRawHistory] = useState([]);

  useEffect(() => {
    if (!hiveId) return;
    setLoading(true);
    
    const histRef = ref(db, `${hiveId}/history`);
    const unsub = onValue(histRef, (snap) => {
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

  const chartData = useMemo(() => {
    if (rawHistory.length === 0) return [];

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
        if (cutoff > limit) return [];
      } else {
        return []; 
      }
    } else {
      const rangeObj = RANGES.find((r) => r.value === selectedRange) || RANGES[1];
      spanHours = rangeObj.hours;
      cutoff = limit - (spanHours * 3600);
    }

    return rawHistory
      .filter((r) => r.timestamp >= cutoff && r.timestamp <= limit)
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((r) => ({
        ...r,
        label: formatX(r.timestamp, spanHours),
      }));
  }, [rawHistory, selectedRange, customDates]);

  // Chart Properties designed for Light/Dark Mode
  const chartProps = { data: chartData, margin: { top: 15, right: 20, left: -15, bottom: 5 } };
  const axisProps = { dataKey: 'label', tick: { fontSize: 10, fill: '#8a8a8a' }, interval: 'preserveStartEnd', tickMargin: 8 };
  const yAxisProps = { tick: { fontSize: 10, fill: '#8a8a8a' }, width: 45, axisLine: false, tickLine: false };
  const tooltipProps = { contentStyle: { fontSize: 12, borderRadius: 8, border: 'none', backgroundColor: 'rgba(28, 25, 23, 0.9)', color: '#fff' }, itemStyle: { color: '#e7e5e4' } };

  return (
    <div className="flex flex-col min-h-screen bg-stone-50/50 dark:bg-stone-950 pb-20 md:pb-0 transition-colors duration-300">
      <Navbar title="Historical Trends" />
      
      <main className="flex-1 p-4 md:p-6 flex flex-col gap-6 max-w-7xl mx-auto w-full">
        
        {/* Responsive Control Bar */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 p-4 flex flex-col md:flex-row md:items-center gap-4 justify-between transition-colors">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full md:w-auto">
            
            {/* Dropdown Selector */}
            <div className="w-full md:w-auto">
              <label className="block text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1">Time Range</label>
              <select
                value={selectedRange}
                onChange={(e) => setSelectedRange(e.target.value)}
                className="w-full md:w-auto pl-3 pr-8 py-2 border border-stone-200 dark:border-stone-700 rounded-lg text-sm font-semibold text-stone-700 dark:text-stone-200 bg-stone-50 dark:bg-stone-950 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors appearance-none cursor-pointer"
                style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right 0.5rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em` }}
              >
                {RANGES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            {/* Custom Date Inputs */}
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
            {chartData.length} points
          </div>
        </div>

        {/* Loading & Empty States */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 min-h-[400px] transition-colors">
            <LoadingSpinner size="lg" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 min-h-[400px] text-stone-400 dark:text-stone-500 p-6 text-center transition-colors">
            <span className="text-4xl mb-3 grayscale opacity-30 dark:opacity-10">📉</span>
            <p className="font-medium">No historical data found for this time period.</p>
            {selectedRange === 'CUSTOM' && <p className="text-xs mt-2">Ensure you have selected complete Start and End dates.</p>}
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* 1. Brood Temperatures */}
            <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden transition-colors">
              <div className="bg-stone-50/80 dark:bg-stone-950/80 border-b border-stone-200 dark:border-stone-800 px-4 sm:px-5 py-3 flex items-center gap-2 transition-colors">
                <span className="text-lg">🌡️</span>
                <h3 className="font-bold text-stone-800 dark:text-stone-100 text-sm sm:text-base">Brood Box & Wall Temperatures</h3>
              </div>
              <div className="p-2 sm:p-5">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart {...chartProps}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" strokeOpacity={0.2} vertical={false} />
                    <XAxis {...axisProps} />
                    <YAxis {...yAxisProps} unit="°C" domain={['dataMin - 2', 'dataMax + 2']} />
                    <Tooltip {...tooltipProps} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: '10px' }} iconType="circle" />
                    
                    <ReferenceLine y={thresholds.temp_brood?.min} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Min', fontSize: 9, fill: '#ef4444', position: 'insideTopLeft' }} />
                    <ReferenceLine y={thresholds.temp_brood?.max} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Max', fontSize: 9, fill: '#ef4444', position: 'insideBottomLeft' }} />
                    
                    <Line type="monotone" dataKey="temp_brood" name="Core (BME680)" stroke="#ef4444" dot={false} strokeWidth={2.5} />
                    <Line type="monotone" dataKey="ds18_front" name="Front Wall" stroke="#f97316" dot={false} strokeWidth={1.5} opacity={0.8} />
                    <Line type="monotone" dataKey="ds18_back" name="Back Wall" stroke="#f59e0b" dot={false} strokeWidth={1.5} opacity={0.8} />
                    <Line type="monotone" dataKey="ds18_left" name="Left Wall" stroke="#84cc16" dot={false} strokeWidth={1.5} opacity={0.8} />
                    <Line type="monotone" dataKey="ds18_right" name="Right Wall" stroke="#10b981" dot={false} strokeWidth={1.5} opacity={0.8} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 2. Grid for Humidity & Pressure */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Humidity */}
              <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden transition-colors">
                <div className="bg-stone-50/80 dark:bg-stone-950/80 border-b border-stone-200 dark:border-stone-800 px-4 sm:px-5 py-3 flex items-center gap-2 transition-colors">
                  <span className="text-lg">💧</span>
                  <h3 className="font-bold text-stone-800 dark:text-stone-100 text-sm sm:text-base">Humidity Comparison</h3>
                </div>
                <div className="p-2 sm:p-5">
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart {...chartProps}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" strokeOpacity={0.2} vertical={false} />
                      <XAxis {...axisProps} />
                      <YAxis {...yAxisProps} unit="%" domain={['dataMin - 5', 'dataMax + 5']} />
                      <Tooltip {...tooltipProps} />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: '10px' }} iconType="circle" />
                      <ReferenceLine y={thresholds.hum_brood?.min} stroke="#3b82f6" strokeDasharray="4 4" opacity={0.5} />
                      <ReferenceLine y={thresholds.hum_brood?.max} stroke="#3b82f6" strokeDasharray="4 4" opacity={0.5} />
                      <Line type="monotone" dataKey="hum_brood" name="Brood Box" stroke="#3b82f6" dot={false} strokeWidth={2.5} />
                      <Line type="monotone" dataKey="hum_super" name="Super Box" stroke="#93c5fd" dot={false} strokeWidth={2.5} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Pressure */}
              <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden transition-colors">
                <div className="bg-stone-50/80 dark:bg-stone-950/80 border-b border-stone-200 dark:border-stone-800 px-4 sm:px-5 py-3 flex items-center gap-2 transition-colors">
                  <span className="text-lg">🔵</span>
                  <h3 className="font-bold text-stone-800 dark:text-stone-100 text-sm sm:text-base">Atmospheric Pressure</h3>
                </div>
                <div className="p-2 sm:p-5">
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart {...chartProps}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" strokeOpacity={0.2} vertical={false} />
                      <XAxis {...axisProps} />
                      <YAxis {...yAxisProps} unit="hPa" domain={['auto', 'auto']} />
                      <Tooltip {...tooltipProps} />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: '10px' }} iconType="circle" />
                      <Line type="monotone" dataKey="pres_brood" name="Brood Box" stroke="#8b5cf6" dot={false} strokeWidth={2.5} />
                      <Line type="monotone" dataKey="pres_super" name="Super Box" stroke="#c4b5fd" dot={false} strokeWidth={2.5} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

            {/* 3. Weight Area Chart */}
            <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden transition-colors">
              <div className="bg-stone-50/80 dark:bg-stone-950/80 border-b border-stone-200 dark:border-stone-800 px-4 sm:px-5 py-3 flex items-center gap-2 transition-colors">
                <span className="text-lg">⚖️</span>
                <h3 className="font-bold text-stone-800 dark:text-stone-100 text-sm sm:text-base">Hive Weight Diagnostics</h3>
              </div>
              <div className="p-2 sm:p-5">
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart {...chartProps}>
                    <defs>
                      <linearGradient id="wGradFull" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#d97706" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" strokeOpacity={0.2} vertical={false} />
                    <XAxis {...axisProps} />
                    <YAxis {...yAxisProps} unit="kg" domain={['dataMin - 1', 'dataMax + 1']} />
                    <Tooltip {...tooltipProps} formatter={(v) => [`${v?.toFixed(2)} kg`, 'Weight']} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: '10px' }} iconType="circle" />
                    <Area
                      type="monotone"
                      dataKey="weight"
                      name="Total Hive Mass"
                      stroke="#d97706"
                      fill="url(#wGradFull)"
                      strokeWidth={2.5}
                      dot={(props) => {
                        const { cx, cy, index } = props;
                        if (index > 0 && chartData[index] && chartData[index - 1]) {
                          const drop = (chartData[index - 1].weight || 0) - (chartData[index].weight || 0);
                          if (drop > 2) {
                            return <circle key={index} cx={cx} cy={cy} r={5} fill="#ef4444" stroke="#fff" strokeWidth={2} />;
                          }
                        }
                        return null;
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}