import React, { useEffect, useState } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { signOut } from 'firebase/auth';
import { db, auth } from '../firebase';
import { useThresholds } from '../hooks/useThresholds';
import { THRESHOLDS } from '../thresholds';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

const PARAM_KEYS = Object.keys(THRESHOLDS);

export default function Settings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const thresholds = useThresholds();

  const [buzzerState, setBuzzerState] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [editValues, setEditValues] = useState({ min: '', max: '' });
  const [savedRow, setSavedRow] = useState(null);
  const [saveError, setSaveError] = useState('');
  const [fbConnected, setFbConnected] = useState(false);
  const [lastSeen, setLastSeen] = useState(null);

  // Buzzer
  useEffect(() => {
    const buzRef = ref(db, 'hive_001/buzzer_control/state');
    const unsub = onValue(buzRef, (snap) => setBuzzerState(snap.val() || false));
    return () => unsub();
  }, []);

  // Firebase connection status
  useEffect(() => {
    const connRef = ref(db, '.info/connected');
    const unsub = onValue(connRef, (snap) => {
      const connected = snap.val();
      setFbConnected(connected);
      if (connected) setLastSeen(new Date());
    });
    return () => unsub();
  }, []);

  const toggleBuzzer = async () => {
    await set(ref(db, 'hive_001/buzzer_control/state'), !buzzerState);
  };

  const startEdit = (key) => {
    setEditingRow(key);
    setEditValues({
      min: thresholds[key]?.min ?? '',
      max: thresholds[key]?.max ?? '',
    });
    setSaveError('');
    setSavedRow(null);
  };

  const cancelEdit = () => {
    setEditingRow(null);
    setSaveError('');
  };

  const saveEdit = async (key) => {
    const min = parseFloat(editValues.min);
    const max = parseFloat(editValues.max);
    if (isNaN(min) || isNaN(max)) {
      setSaveError('Please enter valid numbers.');
      return;
    }
    if (min >= max) {
      setSaveError('Min must be less than Max.');
      return;
    }
    await set(ref(db, `hive_001/thresholds/${key}`), { min, max });
    setEditingRow(null);
    setSaveError('');
    setSavedRow(key);
    setTimeout(() => setSavedRow(null), 2000);
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar title="Settings" />
      <main className="flex-1 p-4 md:p-6 flex flex-col gap-6 max-w-3xl mx-auto w-full">

        {/* Section A — Buzzer */}
        <div className="bg-white rounded-xl shadow-md p-5">
          <h2 className="font-bold text-stone-700 text-lg mb-4">🔊 Buzzer Control</h2>
          <div className="flex items-center justify-between">
            <div>
              <div className={`font-semibold ${buzzerState ? 'text-red-600' : 'text-stone-500'}`}>
                {buzzerState ? '🔊 ARMED — Buzzer Active' : '🔇 DISARMED — Buzzer Off'}
              </div>
            </div>
            <button
              onClick={toggleBuzzer}
              className={`relative w-14 h-7 rounded-full transition-colors ${
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

        {/* Section B — Thresholds */}
        <div className="bg-white rounded-xl shadow-md p-5">
          <h2 className="font-bold text-stone-700 text-lg mb-4">⚙️ Alert Thresholds</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-stone-500 uppercase tracking-wider border-b border-stone-100">
                  <th className="py-2 text-left">Parameter</th>
                  <th className="py-2 text-left">Min</th>
                  <th className="py-2 text-left">Max</th>
                  <th className="py-2 text-left">Unit</th>
                  <th className="py-2 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {PARAM_KEYS.map((key) => {
                  const t = thresholds[key];
                  const isEditing = editingRow === key;
                  const isSaved = savedRow === key;
                  return (
                    <tr key={key} className="border-b border-stone-50">
                      <td className="py-3 pr-3 font-medium text-stone-700">{THRESHOLDS[key].label}</td>
                      <td className="py-3 pr-3">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editValues.min}
                            onChange={(e) => setEditValues((v) => ({ ...v, min: e.target.value }))}
                            className="w-20 border border-amber-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"
                          />
                        ) : (
                          <span>{t?.min}</span>
                        )}
                      </td>
                      <td className="py-3 pr-3">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editValues.max}
                            onChange={(e) => setEditValues((v) => ({ ...v, max: e.target.value }))}
                            className="w-20 border border-amber-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"
                          />
                        ) : (
                          <span>{t?.max}</span>
                        )}
                      </td>
                      <td className="py-3 pr-3 text-stone-400">{THRESHOLDS[key].unit}</td>
                      <td className="py-3">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => saveEdit(key)}
                              className="text-xs bg-amber-600 text-white px-3 py-1 rounded hover:bg-amber-700 transition"
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="text-xs text-stone-500 hover:text-stone-700"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : isSaved ? (
                          <span className="text-xs text-green-600 font-semibold">Saved ✓</span>
                        ) : (
                          <button
                            onClick={() => startEdit(key)}
                            className="text-xs text-amber-600 hover:underline font-medium"
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {saveError && (
              <div className="mt-2 text-sm text-red-600 bg-red-50 rounded px-3 py-2">{saveError}</div>
            )}
          </div>
        </div>

        {/* Section C — Account */}
        <div className="bg-white rounded-xl shadow-md p-5">
          <h2 className="font-bold text-stone-700 text-lg mb-4">👤 Account</h2>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-stone-600 font-medium">{user?.email}</div>
              <div className="text-xs text-stone-400 mt-1">Signed in via Firebase Auth</div>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-100 transition"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Section D — System Status */}
        <div className="bg-white rounded-xl shadow-md p-5">
          <h2 className="font-bold text-stone-700 text-lg mb-4">📡 System Status</h2>
          <div className="flex items-center gap-3 mb-3">
            <span
              className={`w-3 h-3 rounded-full ${fbConnected ? 'bg-green-500' : 'bg-red-500'}`}
            />
            <span className={`font-medium text-sm ${fbConnected ? 'text-green-700' : 'text-red-600'}`}>
              Firebase {fbConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          {lastSeen && (
            <div className="text-xs text-stone-400">
              Last connected: {lastSeen.toLocaleString()}
            </div>
          )}
          <div className="mt-4 text-xs text-stone-400 border-t border-stone-100 pt-3">
            <div>HiveWatch 2026~</div>
          </div>
        </div>
      </main>
    </div>
  );
}
