import React, { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase';
import { useThresholds } from '../hooks/useThresholds';
import Navbar from '../components/Navbar';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ReferenceLine, ResponsiveContainer, Dot,
} from 'recharts';

const RANGES = [
  { label: '6H', hours: 6 },
  { label: '24H', hours: 24 },
  { label: '7D', hours: 168 },
  { label: '30D', hours: 720 },
];

function formatX(ts, hours) {
  const d = new Date(ts * 1000);
  if (hours <= 24) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function Trends() {
  const thresholds = useThresholds();
  const [range, setRange] = useState(RANGES[1]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const histRef = ref(db, 'hive_001/history');
    const unsub = onValue(histRef, (snap) => {
      const val = snap.val();
      if (!val) { setData([]); setLoading(false); return; }
      const cutoff = Math.floor(Date.now() / 1000) - range.hours * 3600;
      const records = Object.values(val)
        .filter((r) => r.timestamp >= cutoff)
        .sort((a, b) => a.timestamp - b.timestamp)
        .map((r) => ({
          ...r,
          label: formatX(r.timestamp, range.hours),
        }));
      setData(records);
      setLoading(false);
    });
    return () => unsub();
  }, [range]);

  const chartProps = {
    data,
    margin: { top: 10, right: 20, left: 0, bottom: 0 },
  };

  const axisProps = {
    dataKey: 'label',
    tick: { fontSize: 10 },
    interval: 'preserveStartEnd',
  };

  const yAxisProps = {
    tick: { fontSize: 10 },
    width: 45,
  };

  const tooltipProps = {
    contentStyle: { fontSize: 11, borderRadius: 8 },
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar title="Trends" />
      <main className="flex-1 p-4 md:p-6 flex flex-col gap-6">
        {/* Range selector */}
        <div className="flex gap-2">
          {RANGES.map((r) => (
            <button
              key={r.label}
              onClick={() => setRange(r)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                range.label === r.label
                  ? 'bg-amber-600 text-white shadow'
                  : 'bg-white text-stone-600 border border-stone-200 hover:border-amber-400'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {loading ? (
          <LoadingSpinner className="py-20" />
        ) : data.length === 0 ? (
          <div className="text-center py-20 text-stone-400">No data in selected range</div>
        ) : (
          <>
            {/* Brood Temperatures */}
            <div className="bg-white rounded-xl shadow-md p-5">
              <h3 className="font-bold text-stone-700 mb-4">🌡️ Brood Temperatures</h3>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart {...chartProps}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0ede9" />
                  <XAxis {...axisProps} />
                  <YAxis {...yAxisProps} unit="°C" />
                  <Tooltip {...tooltipProps} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <ReferenceLine y={thresholds.temp_brood?.min} stroke="#DC2626" strokeDasharray="4 4" label={{ value: 'Min', fontSize: 9, fill: '#DC2626' }} />
                  <ReferenceLine y={thresholds.temp_brood?.max} stroke="#DC2626" strokeDasharray="4 4" label={{ value: 'Max', fontSize: 9, fill: '#DC2626' }} />
                  <Line type="monotone" dataKey="temp_brood" name="Brood (BME)" stroke="#DC2626" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="ds18_front" name="Front Wall" stroke="#EA580C" dot={false} strokeWidth={1.5} />
                  <Line type="monotone" dataKey="ds18_back" name="Back Wall" stroke="#D97706" dot={false} strokeWidth={1.5} />
                  <Line type="monotone" dataKey="ds18_left" name="Left Wall" stroke="#CA8A04" dot={false} strokeWidth={1.5} />
                  <Line type="monotone" dataKey="ds18_right" name="Right Wall" stroke="#65A30D" dot={false} strokeWidth={1.5} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Humidity */}
            <div className="bg-white rounded-xl shadow-md p-5">
              <h3 className="font-bold text-stone-700 mb-4">💧 Humidity</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart {...chartProps}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0ede9" />
                  <XAxis {...axisProps} />
                  <YAxis {...yAxisProps} unit="%" />
                  <Tooltip {...tooltipProps} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <ReferenceLine y={thresholds.hum_brood?.min} stroke="#2563EB" strokeDasharray="4 4" />
                  <ReferenceLine y={thresholds.hum_brood?.max} stroke="#2563EB" strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="hum_brood" name="Brood Humidity" stroke="#2563EB" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="hum_super" name="Super Humidity" stroke="#93C5FD" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Pressure */}
            <div className="bg-white rounded-xl shadow-md p-5">
              <h3 className="font-bold text-stone-700 mb-4">🔵 Atmospheric Pressure</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart {...chartProps}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0ede9" />
                  <XAxis {...axisProps} />
                  <YAxis {...yAxisProps} unit="hPa" domain={['auto', 'auto']} />
                  <Tooltip {...tooltipProps} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="pres_brood" name="Brood Pressure" stroke="#7C3AED" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="pres_super" name="Super Pressure" stroke="#C4B5FD" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Weight */}
            <div className="bg-white rounded-xl shadow-md p-5">
              <h3 className="font-bold text-stone-700 mb-4">⚖️ Hive Weight</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart {...chartProps}>
                  <defs>
                    <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D97706" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#D97706" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0ede9" />
                  <XAxis {...axisProps} />
                  <YAxis {...yAxisProps} unit="kg" />
                  <Tooltip {...tooltipProps} formatter={(v) => [`${v?.toFixed(2)} kg`, 'Weight']} />
                  <Area
                    type="monotone"
                    dataKey="hive_weight"
                    name="Weight"
                    stroke="#D97706"
                    fill="url(#wGrad)"
                    strokeWidth={2}
                    dot={(props) => {
                      const { cx, cy, index } = props;
                      if (index > 0 && data[index] && data[index - 1]) {
                        const drop = (data[index - 1].hive_weight || 0) - (data[index].hive_weight || 0);
                        if (drop > 2) {
                          return <circle key={index} cx={cx} cy={cy} r={5} fill="#DC2626" stroke="white" strokeWidth={2} />;
                        }
                      }
                      return null;
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
