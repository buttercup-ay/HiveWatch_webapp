import React, { useEffect, useState } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { signOut } from 'firebase/auth';
import { db, auth } from '../firebase';
import { useThresholds } from '../hooks/useThresholds';
import { THRESHOLDS } from '../thresholds';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

const PARAM_KEYS = Object.keys(THRESHOLDS);

export default function Settings() {
  const { user, userProfile, hiveId } = useAuth();
  const navigate = useNavigate();
  const thresholds = useThresholds(); 

  // UI States
  const [editingRow, setEditingRow] = useState(null);
  const [editValues, setEditValues] = useState({ min: '', max: '' });
  const [savedRow, setSavedRow] = useState(null);
  const [saveError, setSaveError] = useState('');
  
  // Hardware States
  const [buzzerState, setBuzzerState] = useState(false);
  const [calibrationFactor, setCalibrationFactor] = useState(null);
  const [isEditingCal, setIsEditingCal] = useState(false);
  const [calInput, setCalInput] = useState('');
  const [calSaved, setCalSaved] = useState(false);

  // System States
  const [fbConnected, setFbConnected] = useState(false);
  const [lastSeen, setLastSeen] = useState(null);

  // 1. Buzzer Listener
  useEffect(() => {
    if (!hiveId) return;
    const buzRef = ref(db, `${hiveId}/buzzer_control/state`);
    const unsub = onValue(buzRef, (snap) => setBuzzerState(snap.val() || false));
    return () => unsub();
  }, [hiveId]);

  // 2. Calibration Listener
  useEffect(() => {
    if (!hiveId) return;
    const calRef = ref(db, `${hiveId}/calibration/weight_factor`);
    const unsub = onValue(calRef, (snap) => {
      setCalibrationFactor(snap.val() !== null ? snap.val() : 2280.0);
    });
    return () => unsub();
  }, [hiveId]);

  // 3. Firebase Connection Status
  useEffect(() => {
    const connRef = ref(db, '.info/connected');
    const unsub = onValue(connRef, (snap) => {
      const connected = snap.val();
      setFbConnected(connected);
      if (connected) setLastSeen(new Date());
    });
    return () => unsub();
  }, []);

  // --- Handlers ---
  const toggleBuzzer = async () => {
    if (!hiveId) return;
    await set(ref(db, `${hiveId}/buzzer_control/state`), !buzzerState);
  };

  const saveCalibration = async () => {
    if (!hiveId) return;
    const val = parseFloat(calInput);
    if (isNaN(val)) return;
    
    await set(ref(db, `${hiveId}/calibration/weight_factor`), val);
    setIsEditingCal(false);
    setCalSaved(true);
    setTimeout(() => setCalSaved(false), 2000);
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

  const saveEdit = async (key) => {
    if (!hiveId) return;
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
    await set(ref(db, `${hiveId}/thresholds/${key}`), { min, max });
    setEditingRow(null);
    setSaveError('');
    setSavedRow(key);
    setTimeout(() => setSavedRow(null), 2000);
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const initial = userProfile?.name 
    ? userProfile.name.charAt(0).toUpperCase() 
    : user?.email?.charAt(0).toUpperCase() || '?';

  return (
    <div className="flex flex-col min-h-screen bg-stone-50/50 dark:bg-stone-950 pb-20 md:pb-0 transition-colors duration-300">
      <Navbar title="System Settings" />
      <main className="flex-1 p-4 md:p-6 flex flex-col gap-6 max-w-7xl mx-auto w-full">

        {/* Top Row: Quick Hardware Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Buzzer Control */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden flex flex-col transition-colors">
            <div className="bg-stone-50/80 dark:bg-stone-950/80 border-b border-stone-200 dark:border-stone-800 px-5 py-3 flex items-center gap-2 transition-colors">
              <span className="text-lg">🔊</span>
              <h3 className="font-bold text-stone-800 dark:text-stone-100">Siren Control</h3>
            </div>
            <div className="p-5 flex-1 flex flex-col justify-center">
              <div className="flex items-center justify-between p-4 bg-stone-50 dark:bg-stone-950/50 rounded-xl border border-stone-100 dark:border-stone-800 transition-colors">
                <div>
                  <div className={`text-sm font-bold uppercase tracking-wider mb-0.5 ${buzzerState ? 'text-red-600 dark:text-red-400' : 'text-stone-500 dark:text-stone-400'}`}>
                    {buzzerState ? 'ARMED (ACTIVE)' : 'DISARMED'}
                  </div>
                  <div className="text-xs text-stone-400 dark:text-stone-500 font-medium">Manual hardware override</div>
                </div>
                
                {/* Native Toggle Switch */}
                <button
                  onClick={toggleBuzzer}
                  className={`relative w-14 h-7 rounded-full transition-colors focus:outline-none shadow-inner ${
                    buzzerState ? 'bg-red-500' : 'bg-stone-300 dark:bg-stone-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-200 ease-in-out ${
                      buzzerState ? 'translate-x-7' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Load Cell Calibration */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden flex flex-col transition-colors">
            <div className="bg-stone-50/80 dark:bg-stone-950/80 border-b border-stone-200 dark:border-stone-800 px-5 py-3 flex items-center gap-2 transition-colors">
              <span className="text-lg">⚖️</span>
              <h3 className="font-bold text-stone-800 dark:text-stone-100">Load Cell Calibration</h3>
            </div>
            <div className="p-5 flex-1 flex flex-col justify-center">
              <div className="flex items-center justify-between p-4 bg-stone-50 dark:bg-stone-950/50 rounded-xl border border-stone-100 dark:border-stone-800 transition-colors">
                <div className="flex-1 mr-4">
                  <div className="text-sm font-bold text-stone-700 dark:text-stone-200 uppercase tracking-wider mb-0.5">HX711 Factor</div>
                  <div className="text-xs text-stone-400 dark:text-stone-500 font-medium">Divides raw sensor value to get KG.</div>
                </div>
                
                {isEditingCal ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={calInput}
                      onChange={(e) => setCalInput(e.target.value)}
                      placeholder={calibrationFactor}
                      className="w-24 px-3 py-1.5 bg-white dark:bg-stone-950 border border-amber-300 dark:border-amber-700 rounded-lg text-sm font-bold text-stone-700 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                    <button onClick={saveCalibration} className="text-xs bg-amber-600 dark:bg-amber-700 text-white font-bold px-3 py-2 rounded-lg shadow-sm hover:bg-amber-700 dark:hover:bg-amber-600 transition">Save</button>
                    <button onClick={() => setIsEditingCal(false)} className="text-xs text-stone-500 dark:text-stone-400 font-bold hover:text-stone-700 dark:hover:text-stone-200">Cancel</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <span className="text-xl font-extrabold text-stone-800 dark:text-stone-100 font-mono">
                      {calibrationFactor !== null ? calibrationFactor : '—'}
                    </span>
                    {calSaved ? (
                      <span className="text-xs font-bold text-green-600 dark:text-green-400">Saved ✓</span>
                    ) : (
                      <button 
                        onClick={() => { setCalInput(calibrationFactor); setIsEditingCal(true); }}
                        className="text-xs font-bold text-amber-600 dark:text-amber-500 hover:underline"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          
        </div>

        {/* Section B — Thresholds Table */}
        <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden transition-colors">
          <div className="bg-stone-50/80 dark:bg-stone-950/80 border-b border-stone-200 dark:border-stone-800 px-5 py-3 flex items-center gap-2 transition-colors">
            <span className="text-lg">⚙️</span>
            <h3 className="font-bold text-stone-800 dark:text-stone-100">Alert Thresholds Configuration</h3>
          </div>
          
          <div className="overflow-x-auto p-1">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-widest border-b border-stone-100 dark:border-stone-800">
                  <th className="py-3 px-5 font-bold">Parameter</th>
                  <th className="py-3 px-5 font-bold w-24">Minimum</th>
                  <th className="py-3 px-5 font-bold w-24">Maximum</th>
                  <th className="py-3 px-5 font-bold">Unit</th>
                  <th className="py-3 px-5 font-bold w-32">Action</th>
                </tr>
              </thead>
              <tbody>
                {PARAM_KEYS.map((key) => {
                  const t = thresholds[key];
                  const isEditing = editingRow === key;
                  const isSaved = savedRow === key;
                  
                  return (
                    <tr key={key} className="border-b border-stone-50 dark:border-stone-800/60 hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-colors last:border-0">
                      <td className="py-3 px-5 font-semibold text-stone-700 dark:text-stone-300">{THRESHOLDS[key].label}</td>
                      <td className="py-3 px-5">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editValues.min}
                            onChange={(e) => setEditValues((v) => ({ ...v, min: e.target.value }))}
                            className="w-full px-2 py-1 bg-white dark:bg-stone-950 border border-amber-300 dark:border-amber-700 rounded text-sm font-bold text-stone-700 dark:text-stone-200 focus:outline-none focus:ring-1 focus:ring-amber-400 shadow-sm"
                          />
                        ) : (
                          <span className="font-mono text-stone-600 dark:text-stone-400">{t?.min}</span>
                        )}
                      </td>
                      <td className="py-3 px-5">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editValues.max}
                            onChange={(e) => setEditValues((v) => ({ ...v, max: e.target.value }))}
                            className="w-full px-2 py-1 bg-white dark:bg-stone-950 border border-amber-300 dark:border-amber-700 rounded text-sm font-bold text-stone-700 dark:text-stone-200 focus:outline-none focus:ring-1 focus:ring-amber-400 shadow-sm"
                          />
                        ) : (
                          <span className="font-mono text-stone-600 dark:text-stone-400">{t?.max}</span>
                        )}
                      </td>
                      <td className="py-3 px-5 text-stone-400 dark:text-stone-500 font-medium">{THRESHOLDS[key].unit}</td>
                      <td className="py-3 px-5">
                        {isEditing ? (
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => saveEdit(key)}
                              className="text-xs font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-3 py-1.5 rounded shadow-sm hover:bg-amber-200 dark:hover:bg-amber-900/60 transition"
                            >
                              Save
                            </button>
                            <button onClick={() => setEditingRow(null)} className="text-xs font-bold text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300">
                              Cancel
                            </button>
                          </div>
                        ) : isSaved ? (
                          <span className="text-xs text-green-600 dark:text-green-400 font-bold">Saved ✓</span>
                        ) : (
                          <button
                            onClick={() => startEdit(key)}
                            className="text-xs text-amber-600 dark:text-amber-500 font-bold hover:underline"
                          >
                            Edit Limit
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {saveError && (
              <div className="m-4 text-sm font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-lg px-4 py-3">
                {saveError}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Row: Account & Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Operator Account */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden flex flex-col transition-colors">
            <div className="bg-stone-50/80 dark:bg-stone-950/80 border-b border-stone-200 dark:border-stone-800 px-5 py-3 flex items-center gap-2 transition-colors">
              <span className="text-lg">👤</span>
              <h3 className="font-bold text-stone-800 dark:text-stone-100">Operator Account</h3>
            </div>
            <div className="p-5 flex-1 flex flex-col justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/40 border-2 border-amber-200 dark:border-amber-700/50 text-amber-800 dark:text-amber-400 flex items-center justify-center font-extrabold text-xl shadow-sm transition-colors">
                  {initial}
                </div>
                <div>
                  <div className="text-stone-800 dark:text-stone-100 font-extrabold text-lg tracking-tight transition-colors">{userProfile?.name || 'Administrator'}</div>
                  <div className="text-stone-500 dark:text-stone-400 font-medium text-sm transition-colors">{user?.email}</div>
                  <div className="text-stone-400 dark:text-stone-500 text-xs mt-0.5 transition-colors">{userProfile?.phone || 'No phone registered'}</div>
                </div>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-stone-100 dark:border-stone-800 transition-colors">
                <div className="text-[10px] font-bold text-amber-700 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 px-2.5 py-1 rounded uppercase tracking-wider transition-colors">
                  Node: {hiveId ? hiveId : 'UNKNOWN'}
                </div>
                <button
                  onClick={handleLogout}
                  className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition shadow-sm"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>

          {/* System Status */}
          <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden flex flex-col transition-colors">
            <div className="bg-stone-50/80 dark:bg-stone-950/80 border-b border-stone-200 dark:border-stone-800 px-5 py-3 flex items-center gap-2 transition-colors">
              <span className="text-lg">📡</span>
              <h3 className="font-bold text-stone-800 dark:text-stone-100">Cloud Connection</h3>
            </div>
            <div className="p-5 flex-1 flex flex-col justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="relative flex h-4 w-4 items-center justify-center">
                  {fbConnected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60 dark:opacity-40"></span>}
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${fbConnected ? 'bg-green-500 dark:bg-green-500' : 'bg-red-500 dark:bg-red-500'}`}></span>
                </div>
                <div>
                  <div className={`font-extrabold text-lg tracking-tight transition-colors ${fbConnected ? 'text-stone-800 dark:text-stone-100' : 'text-red-600 dark:text-red-400'}`}>
                    {fbConnected ? 'Database Connected' : 'Connection Lost'}
                  </div>
                  <div className="text-sm font-medium text-stone-400 dark:text-stone-500 transition-colors">
                    {lastSeen ? `Last heartbeat: ${lastSeen.toLocaleTimeString()}` : 'Awaiting heartbeat...'}
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between transition-colors">
                <span className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest transition-colors">Platform Version</span>
                <span className="text-[10px] font-bold text-stone-600 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 px-2 py-1 rounded uppercase tracking-wider transition-colors">HiveWatch v4.1</span>
              </div>
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}