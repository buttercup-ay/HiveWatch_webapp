import React, { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase';
import { useThresholds } from '../hooks/useThresholds';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import SensorCard from '../components/SensorCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, CartesianGrid
} from 'recharts';

function timeAgo(unixSeconds) {
  if (!unixSeconds) return 'Never';
  const diff = Math.floor(Date.now() / 1000) - unixSeconds;
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function formatAlertTime(ts) {
  if (!ts) return '';
  return new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function Dashboard() {
  const { hiveId } = useAuth();
  const thresholds = useThresholds();
  
  const [sensors, setSensors] = useState(null);
  const [prevSensors, setPrevSensors] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [weightHistory, setWeightHistory] = useState([]);
  const [todayTraffic, setTodayTraffic] = useState({ in: 0, out: 0 });
  const [recentAlerts, setRecentAlerts] = useState([]);

  // 1. Subscribe to Live Sensors
  useEffect(() => {
    if (!hiveId) return;
    const sensRef = ref(db, `${hiveId}/sensors`);
    const unsub = onValue(sensRef, (snap) => {
      const val = snap.val();
      setSensors((prev) => {
        setPrevSensors(prev);
        return val;
      });
      setLoading(false);
    });
    return () => unsub();
  }, [hiveId]);

  // 2. Unified History Fetch (Weight Chart & Bee Traffic)
  useEffect(() => {
    if (!hiveId) return;
    const histRef = ref(db, `${hiveId}/history`);
    const unsub = onValue(histRef, (snap) => {
      const val = snap.val();
      if (!val) return;
      
      const now = Math.floor(Date.now() / 1000);
      const sixHAgo = now - 6 * 3600;
      const todayStart = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);

      let tIn = 0; let tOut = 0;
      const records = Object.values(val);

      // Process Weight History
      const wHistory = records
        .filter((r) => r.timestamp >= sixHAgo)
        .sort((a, b) => a.timestamp - b.timestamp)
        .map((r) => ({
          time: new Date(r.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          weight: r.weight,
        }));
      
      // Process Today's Bee Traffic
      records.forEach((r) => {
        if (r.timestamp >= todayStart) {
          tIn += (r.bee_in || 0);
          tOut += (r.bee_out || 0);
        }
      });

      setWeightHistory(wHistory);
      setTodayTraffic({ in: tIn, out: tOut });
    });
    return () => unsub();
  }, [hiveId]);

  // 3. Subscribe to Recent Alerts
  useEffect(() => {
    if (!hiveId) return;
    const paths = [
      { path: `${hiveId}/alerts/intrusion_alerts`, type: 'intrusion' },
      { path: `${hiveId}/alerts/weight_alerts`, type: 'theft' },
      { path: `${hiveId}/alerts/threshold_alerts`, type: 'threshold' },
    ];

    let allAlerts = {};
    const unsubs = paths.map(({ path, type }) => {
      const r = ref(db, path);
      return onValue(r, (snap) => {
        const val = snap.val() || {};
        allAlerts[type] = Object.entries(val).map(([k, v]) => ({
          ...v, id: k, alertType: type,
        }));
        
        const combined = [
          ...(allAlerts.intrusion || []),
          ...(allAlerts.theft || []),
          ...(allAlerts.threshold || []),
        ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
        
        setRecentAlerts(combined);
      });
    });
    return () => unsubs.forEach((u) => u());
  }, [hiveId]);

  const isLive = sensors?.last_updated && (Math.floor(Date.now() / 1000) - sensors.last_updated) < 90;

  // Added dark-mode variants for the dynamic color assignment
  const weightColor =
    sensors?.weight_kg > 5 ? 'text-green-600 dark:text-green-500' :
    sensors?.weight_kg > 2 ? 'text-amber-600 dark:text-amber-500' :
    'text-red-600 dark:text-red-500';

  return (
    <div className="flex flex-col min-h-screen bg-stone-50/50 dark:bg-stone-950 pb-20 md:pb-0 transition-colors duration-300">
      <Navbar title="Dashboard" />
      <main className="flex-1 p-4 md:p-6 flex flex-col gap-6 max-w-7xl mx-auto w-full">

        {loading ? (
          <div className="flex-1 flex items-center justify-center bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 min-h-[400px] transition-colors">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <>
            {/* ROW 1: Hero Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              
              {/* Card 1: Main Weight & Theft Status */}
              <Link 
                to="/trends" 
                className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 p-5 flex flex-col hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700/50 transition-all group"
              >
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-500 flex items-center justify-center text-xl border border-amber-100/50 dark:border-amber-800/30 transition-colors">
                      ⚖️
                    </div>
                    <h3 className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider transition-colors">Current Weight</h3>
                  </div>
                  <span className="text-stone-300 dark:text-stone-600 group-hover:text-amber-500 dark:group-hover:text-amber-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </span>
                </div>
                
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className={`text-4xl sm:text-5xl font-extrabold tracking-tight transition-colors ${weightColor}`}>
                    {sensors?.weight_kg != null ? sensors.weight_kg.toFixed(2) : '—'}
                  </span>
                  <span className="text-stone-400 dark:text-stone-500 font-medium text-lg transition-colors">kg</span>
                </div>
                
                <div className="mt-4 pt-4 border-t border-stone-100 dark:border-stone-800 transition-colors">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-md transition-colors ${
                    sensors?.weight_kg > 5 ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 
                    sensors?.weight_kg > 2 ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' : 
                    'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                  }`}>
                    {sensors?.weight_kg > 5 ? '✅ Healthy Capacity' : sensors?.weight_kg > 2 ? '⚠️ Moderate Status' : '🚨 Critical Low (Theft Risk)'}
                  </span>
                </div>
              </Link>

              {/* Card 2: Bee Activity Summary */}
              <Link 
                to="/bee-activity" 
                className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 p-5 flex flex-col hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700/50 transition-all group"
              >
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-500 flex items-center justify-center text-xl border border-green-100/50 dark:border-green-800/30 transition-colors">
                      🐝
                    </div>
                    <h3 className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider transition-colors">Today's Traffic</h3>
                  </div>
                  <span className="text-stone-300 dark:text-stone-600 group-hover:text-amber-500 dark:group-hover:text-amber-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </span>
                </div>
                
                <div className="flex items-center gap-6 mt-2">
                  <div className="flex flex-col">
                    <span className="text-3xl sm:text-4xl font-extrabold text-green-600 dark:text-green-500 tracking-tight transition-colors">{todayTraffic.in}</span>
                    <span className="text-[10px] uppercase font-bold text-stone-400 dark:text-stone-500 mt-0.5 transition-colors">Entries</span>
                  </div>
                  <div className="h-10 w-px bg-stone-200 dark:bg-stone-700 transition-colors"></div>
                  <div className="flex flex-col">
                    <span className="text-3xl sm:text-4xl font-extrabold text-amber-500 dark:text-amber-400 tracking-tight transition-colors">{todayTraffic.out}</span>
                    <span className="text-[10px] uppercase font-bold text-stone-400 dark:text-stone-500 mt-0.5 transition-colors">Exits</span>
                  </div>
                </div>
                
                <div className="mt-auto pt-4 border-t border-stone-100 dark:border-stone-800 transition-colors">
                  <span className="text-xs font-semibold text-stone-400 dark:text-stone-500 flex items-center gap-1.5 transition-colors">
                    <span className="w-1.5 h-1.5 rounded-full bg-stone-300 dark:bg-stone-600"></span> Break Beam Analytics
                  </span>
                </div>
              </Link>

              {/* Card 3: System Health */}
              <Link 
                to="/location" 
                className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 p-5 flex flex-col hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700/50 transition-all group md:col-span-2 lg:col-span-1"
              >
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-500 flex items-center justify-center text-xl border border-blue-100/50 dark:border-blue-800/30 transition-colors">
                      📡
                    </div>
                    <h3 className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider transition-colors">System Health</h3>
                  </div>
                  <span className="text-stone-300 dark:text-stone-600 group-hover:text-amber-500 dark:group-hover:text-amber-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </span>
                </div>
                
                <div className="flex flex-col gap-1 mt-1">
                  <div className="flex items-center gap-3">
                    <span className={`relative flex h-3.5 w-3.5`}>
                      {isLive && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 dark:opacity-50"></span>}
                      <span className={`relative inline-flex rounded-full h-3.5 w-3.5 ${isLive ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    </span>
                    <span className="text-2xl font-extrabold tracking-tight text-stone-800 dark:text-stone-100 transition-colors">
                      {isLive ? 'Node Online' : 'Node Offline'}
                    </span>
                  </div>
                  <div className="text-sm text-stone-500 dark:text-stone-400 font-medium pl-6 transition-colors">
                    Last ping: <span className="text-stone-800 dark:text-stone-300">{timeAgo(sensors?.last_updated)}</span>
                  </div>
                </div>
                
                <div className="mt-auto pt-4 border-t border-stone-100 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3 transition-colors">
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2.5 py-1 rounded border border-amber-200/50 dark:border-amber-800/50 uppercase tracking-wider transition-colors">
                    ID: {hiveId?.toUpperCase()}
                  </span>
                </div>
              </Link>

            </div>

            {/* ROW 2: Environmental Matrix */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              
              {/* Brood Box Panel */}
              <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden transition-colors">
                <div className="bg-stone-50/80 dark:bg-stone-950/80 border-b border-stone-200 dark:border-stone-800 px-5 py-3 flex items-center gap-2 transition-colors">
                  <span className="text-lg">🧫</span>
                  <h3 className="font-bold text-stone-800 dark:text-stone-100 transition-colors">Brood Box Environment</h3>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <SensorCard label="Temperature" value={sensors?.temp_brood} unit="°C" min={thresholds.temp_brood?.min} max={thresholds.temp_brood?.max} prevValue={prevSensors?.temp_brood} className="shadow-none border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/50" />
                    <SensorCard label="Humidity" value={sensors?.hum_brood} unit="%" min={thresholds.hum_brood?.min} max={thresholds.hum_brood?.max} prevValue={prevSensors?.hum_brood} className="shadow-none border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/50" />
                    <SensorCard label="Pressure" value={sensors?.pres_brood} unit="hPa" min={thresholds.pres_brood?.min} max={thresholds.pres_brood?.max} prevValue={prevSensors?.pres_brood} className="shadow-none border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/50" />
                  </div>
                  
                  {/* Internal Wall Matrix */}
                  <h4 className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest mb-2 border-b border-stone-100 dark:border-stone-800 pb-1 transition-colors">DS18B20 Wall Temperatures</h4>
                  <div className="grid grid-cols-4 gap-2">
                    {['front', 'back', 'left', 'right'].map((side) => (
                      <div key={side} className="bg-stone-50 dark:bg-stone-950/50 rounded-lg p-2 text-center border border-stone-100 dark:border-stone-800 transition-colors">
                        <div className="text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase transition-colors">{side}</div>
                        <div className="text-sm font-extrabold text-stone-800 dark:text-stone-200 mt-0.5 transition-colors">
                          {sensors?.[`temp_${side}`] != null ? `${parseFloat(sensors[`temp_${side}`]).toFixed(1)}°` : '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Super Box Panel */}
              <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden flex flex-col transition-colors">
                <div className="bg-stone-50/80 dark:bg-stone-950/80 border-b border-stone-200 dark:border-stone-800 px-5 py-3 flex items-center gap-2 transition-colors">
                  <span className="text-lg">🍯</span>
                  <h3 className="font-bold text-stone-800 dark:text-stone-100 transition-colors">Super Box Environment</h3>
                </div>
                <div className="p-5 flex-1 flex flex-col justify-center">
                  <div className="grid grid-cols-3 gap-3">
                    <SensorCard label="Temperature" value={sensors?.temp_super} unit="°C" min={thresholds.temp_super?.min} max={thresholds.temp_super?.max} prevValue={prevSensors?.temp_super} className="shadow-none border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/50" />
                    <SensorCard label="Humidity" value={sensors?.hum_super} unit="%" min={thresholds.hum_super?.min} max={thresholds.hum_super?.max} prevValue={prevSensors?.hum_super} className="shadow-none border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/50" />
                    <SensorCard label="Pressure" value={sensors?.pres_super} unit="hPa" min={thresholds.pres_super?.min} max={thresholds.pres_super?.max} prevValue={prevSensors?.pres_super} className="shadow-none border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/50" />
                  </div>
                </div>
              </div>

            </div>

            {/* ROW 3: Charts & Security */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              
              {/* Weight Area Chart (Spans 2 columns) */}
              <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 p-5 lg:col-span-2 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-stone-800 dark:text-stone-100 transition-colors">Weight Trend — Last 6 Hours</h3>
                </div>
                {weightHistory.length > 0 ? (
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={weightHistory} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="weightDashGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#D97706" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#D97706" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" strokeOpacity={0.2} vertical={false} />
                      <XAxis dataKey="time" hide />
                      <Tooltip 
                        contentStyle={{ fontSize: 11, borderRadius: 8, border: 'none', backgroundColor: 'rgba(28, 25, 23, 0.9)', color: '#fff' }} 
                        itemStyle={{ color: '#e7e5e4' }}
                        formatter={(v) => [`${v?.toFixed(2)} kg`, 'Weight']} 
                      />
                      <Area type="monotone" dataKey="weight" stroke="#D97706" strokeWidth={2.5} fill="url(#weightDashGrad)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[160px] flex items-center justify-center text-stone-400 dark:text-stone-500 text-sm bg-stone-50 dark:bg-stone-950/50 rounded-xl border border-dashed border-stone-200 dark:border-stone-800 transition-colors">
                    Awaiting historical data sync...
                  </div>
                )}
              </div>

              {/* Recent Alerts Feed */}
              <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 flex flex-col transition-colors">
                <div className="bg-stone-50/80 dark:bg-stone-950/80 border-b border-stone-200 dark:border-stone-800 px-5 py-3 flex items-center justify-between transition-colors">
                  <h3 className="font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2 transition-colors"><span className="text-lg">🛡️</span> Security Feed</h3>
                  <Link to="/security" className="text-[11px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider hover:underline transition-colors">See All</Link>
                </div>
                <div className="p-2 flex-1">
                  {recentAlerts.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-stone-400 dark:text-stone-500 text-sm py-10 transition-colors">
                      <span className="text-3xl mb-2 opacity-30 dark:opacity-10">✅</span>
                      No recent security alerts
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      {recentAlerts.map((alert) => (
                        <div key={alert.id} className="flex items-start gap-3 p-3 hover:bg-stone-50 dark:hover:bg-stone-800/50 rounded-lg transition-colors border-b border-stone-100 dark:border-stone-800/50 last:border-0">
                          <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${alert.alertType === 'threshold' ? 'bg-amber-500' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider transition-colors ${alert.alertType === 'intrusion' || alert.alertType === 'theft' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                                {alert.alertType}
                              </span>
                              <span className="text-[10px] font-semibold text-stone-400 dark:text-stone-500 transition-colors">{formatAlertTime(alert.timestamp)}</span>
                            </div>
                            <span className="text-xs font-semibold text-stone-700 dark:text-stone-300 truncate block transition-colors">
                              {alert.message || alert.parameter}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </>
        )}
      </main>
    </div>
  );
}