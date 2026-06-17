import React, { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase';
import { useThresholds } from '../hooks/useThresholds';
import Navbar from '../components/Navbar';
import SensorCard from '../components/SensorCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis
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
  const thresholds = useThresholds();
  const [sensors, setSensors] = useState(null);
  const [prevSensors, setPrevSensors] = useState(null);
  const [loading, setLoading] = useState(true);
  const [weightHistory, setWeightHistory] = useState([]);
  const [recentAlerts, setRecentAlerts] = useState([]);

  // Subscribe to sensors
  useEffect(() => {
    const sensRef = ref(db, 'hive_001/sensors');
    const unsub = onValue(sensRef, (snap) => {
      const val = snap.val();
      setSensors((prev) => {
        setPrevSensors(prev);
        return val;
      });
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Subscribe to weight history (last 6h)
  useEffect(() => {
    const histRef = ref(db, 'hive_001/history');
    const unsub = onValue(histRef, (snap) => {
      const val = snap.val();
      if (!val) return;
      const sixHAgo = Math.floor(Date.now() / 1000) - 6 * 3600;
      const records = Object.values(val)
        .filter((r) => r.timestamp >= sixHAgo)
        .sort((a, b) => a.timestamp - b.timestamp)
        .map((r) => ({
          time: new Date(r.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          weight: r.hive_weight,
        }));
      setWeightHistory(records);
    });
    return () => unsub();
  }, []);

  // Subscribe to recent alerts
  useEffect(() => {
    const paths = [
      { path: 'hive_001/alerts/intrusion_alerts', type: 'intrusion' },
      { path: 'hive_001/alerts/weight_alerts', type: 'theft' },
      { path: 'hive_001/alerts/threshold_alerts', type: 'threshold' },
    ];

    let allAlerts = {};
    const unsubs = paths.map(({ path, type }) => {
      const r = ref(db, path);
      return onValue(r, (snap) => {
        const val = snap.val() || {};
        allAlerts[type] = Object.entries(val).map(([k, v]) => ({
          ...v,
          id: k,
          alertType: type,
        }));
        const combined = [
          ...(allAlerts.intrusion || []),
          ...(allAlerts.theft || []),
          ...(allAlerts.threshold || []),
        ]
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 5);
        setRecentAlerts(combined);
      });
    });
    return () => unsubs.forEach((u) => u());
  }, []);

  const isLive = sensors?.timestamp && (Math.floor(Date.now() / 1000) - sensors.timestamp) < 90;

  const weightColor =
    sensors?.hive_weight > 5 ? 'text-green-600' :
    sensors?.hive_weight > 2 ? 'text-amber-600' :
    'text-red-600';

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar title="Dashboard" />
      <main className="flex-1 p-4 md:p-6 flex flex-col gap-6">

        {/* Status bar */}
        <div className="flex items-center justify-between bg-white rounded-xl shadow-sm px-4 py-3 border border-amber-100">
          <div className="flex items-center gap-3">
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                isLive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
              }`}
            >
              {isLive ? '● LIVE' : '● OFFLINE'}
            </span>
            <span className="text-sm text-stone-500">
              Updated {timeAgo(sensors?.timestamp)}
            </span>
          </div>
          <span className="text-xs text-stone-400">
            {sensors?.timestamp ? new Date(sensors.timestamp * 1000).toLocaleString() : '—'}
          </span>
        </div>

        {loading ? (
          <LoadingSpinner className="py-20" />
        ) : (
          <>
            {/* Brood Wall Temperatures */}
            <section>
              <h2 className="text-sm font-bold text-stone-600 uppercase tracking-wider mb-3">
                🌡️ Brood Wall Temperatures
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['front', 'back', 'left', 'right'].map((side) => (
                  <SensorCard
                    key={side}
                    label={`${side.charAt(0).toUpperCase() + side.slice(1)} Wall`}
                    value={sensors?.[`ds18_${side}`]}
                    unit="°C"
                    icon={side === 'front' ? '⬆️' : side === 'back' ? '⬇️' : side === 'left' ? '⬅️' : '➡️'}
                    prevValue={prevSensors?.[`ds18_${side}`]}
                  />
                ))}
              </div>
            </section>

            {/* BME680 Sensors */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Brood Box */}
              <div className="bg-white rounded-xl shadow-md p-5 border-2 border-transparent">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">🧫</span>
                  <h3 className="font-bold text-stone-700">Brood Box (BME680)</h3>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <SensorCard
                    label="Temperature"
                    value={sensors?.temp_brood}
                    unit="°C"
                    min={thresholds.temp_brood?.min}
                    max={thresholds.temp_brood?.max}
                    prevValue={prevSensors?.temp_brood}
                  />
                  <SensorCard
                    label="Humidity"
                    value={sensors?.hum_brood}
                    unit="%"
                    min={thresholds.hum_brood?.min}
                    max={thresholds.hum_brood?.max}
                    prevValue={prevSensors?.hum_brood}
                  />
                  <SensorCard
                    label="Pressure"
                    value={sensors?.pres_brood}
                    unit="hPa"
                    min={thresholds.pres_brood?.min}
                    max={thresholds.pres_brood?.max}
                    prevValue={prevSensors?.pres_brood}
                  />
                </div>
              </div>

              {/* Super Box */}
              <div className="bg-white rounded-xl shadow-md p-5 border-2 border-transparent">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">🍯</span>
                  <h3 className="font-bold text-stone-700">Super Box (BME680)</h3>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <SensorCard
                    label="Temperature"
                    value={sensors?.temp_super}
                    unit="°C"
                    min={thresholds.temp_super?.min}
                    max={thresholds.temp_super?.max}
                    prevValue={prevSensors?.temp_super}
                  />
                  <SensorCard
                    label="Humidity"
                    value={sensors?.hum_super}
                    unit="%"
                    min={thresholds.hum_super?.min}
                    max={thresholds.hum_super?.max}
                    prevValue={prevSensors?.hum_super}
                  />
                  <SensorCard
                    label="Pressure"
                    value={sensors?.pres_super}
                    unit="hPa"
                    min={thresholds.pres_super?.min}
                    max={thresholds.pres_super?.max}
                    prevValue={prevSensors?.pres_super}
                  />
                </div>
              </div>
            </div>

            {/* Weight Card + Mini Chart */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl shadow-md p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">⚖️</span>
                  <h3 className="font-bold text-stone-700">Hive Weight</h3>
                </div>
                <div className={`text-5xl font-bold mt-2 ${weightColor}`}>
                  {sensors?.hive_weight != null ? sensors.hive_weight.toFixed(2) : '—'}
                  <span className="text-lg font-normal text-stone-400 ml-1">kg</span>
                </div>
                <div className="text-xs text-stone-400 mt-2">
                  {sensors?.hive_weight > 5 ? '✅ Good weight' :
                   sensors?.hive_weight > 2 ? '⚠️ Moderate — monitor closely' :
                   sensors?.hive_weight != null ? '🚨 Low weight — possible theft' : 'No data'}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-stone-700 text-sm">Weight — Last 6 Hours</h3>
                </div>
                {weightHistory.length > 0 ? (
                  <ResponsiveContainer width="100%" height={100}>
                    <AreaChart data={weightHistory}>
                      <defs>
                        <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#D97706" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#D97706" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="time" hide />
                      <Tooltip
                        contentStyle={{ fontSize: 11, borderRadius: 8 }}
                        formatter={(v) => [`${v?.toFixed(2)} kg`, 'Weight']}
                      />
                      <Area
                        type="monotone"
                        dataKey="weight"
                        stroke="#D97706"
                        strokeWidth={2}
                        fill="url(#weightGrad)"
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-24 flex items-center justify-center text-stone-400 text-sm">
                    No history data yet
                  </div>
                )}
              </div>
            </div>

            {/* Recent Alerts */}
            <div className="bg-white rounded-xl shadow-md p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-stone-700">Recent Alerts</h3>
                <Link
                  to="/security"
                  className="text-xs text-amber-600 hover:underline font-medium"
                >
                  View All →
                </Link>
              </div>
              {recentAlerts.length === 0 ? (
                <div className="text-sm text-stone-400 text-center py-4">No recent alerts</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {recentAlerts.map((alert) => (
                    <div key={alert.id} className="flex items-start gap-3 py-2 border-b border-stone-100 last:border-0">
                      <span
                        className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                          alert.alertType === 'threshold' ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <span
                          className={`text-xs font-bold px-1.5 py-0.5 rounded mr-2 ${
                            alert.alertType === 'intrusion' ? 'bg-red-100 text-red-700' :
                            alert.alertType === 'theft' ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {alert.alertType.toUpperCase()}
                        </span>
                        <span className="text-sm text-stone-700">{alert.message || alert.parameter}</span>
                      </div>
                      <span className="text-xs text-stone-400 flex-shrink-0">{formatAlertTime(alert.timestamp)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
