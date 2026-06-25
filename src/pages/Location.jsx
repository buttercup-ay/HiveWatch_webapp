import React, { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import LoadingSpinner from '../components/LoadingSpinner';

// Lazy import Leaflet to avoid SSR issues
let MapContainer, TileLayer, Marker, Popup, L;

export default function Location() {
  const { hiveId } = useAuth();
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    // Dynamically import Leaflet
    Promise.all([
      import('react-leaflet'),
      import('leaflet'),
      import('leaflet/dist/leaflet.css'),
    ]).then(([rl, leaflet]) => {
      MapContainer = rl.MapContainer;
      TileLayer = rl.TileLayer;
      Marker = rl.Marker;
      Popup = rl.Popup;
      L = leaflet.default;

      // Fix default marker icons
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
      setMapReady(true);
    });
  }, []);

  useEffect(() => {
    if (!hiveId) return;

    // Dynamic database pathing for GPS Module
    const locRef = ref(db, `${hiveId}/location`);
    const unsub = onValue(locRef, (snap) => {
      setLocation(snap.val());
      setLoading(false);
    });
    
    return () => unsub();
  }, [hiveId]);

  const hasValidLocation = location?.lat && location?.lng &&
    location.lat !== 0 && location.lng !== 0;

  // Default: Ilorin, Nigeria (fallback if NEO-6M hasn't locked yet)
  const center = hasValidLocation
    ? [location.lat, location.lng]
    : [8.4799, 4.5418];

  return (
    <div className="flex flex-col min-h-screen bg-stone-50/50 dark:bg-stone-950 pb-20 md:pb-0 transition-colors duration-300">
      <Navbar title="GPS Tracking" />
      
      <main className="flex-1 p-4 md:p-6 flex flex-col gap-6 max-w-7xl mx-auto w-full">

        {loading ? (
          <div className="flex-1 flex items-center justify-center bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 min-h-[400px] transition-colors">
            <LoadingSpinner size="lg" />
          </div>
        ) : !hasValidLocation ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 min-h-[400px] text-center p-6 transition-colors">
            <span className="text-5xl mb-4 grayscale opacity-30 dark:opacity-10">📡</span>
            <h3 className="text-lg font-bold text-stone-700 dark:text-stone-200 mb-1">GPS Signal Not Acquired</h3>
            <p className="text-sm font-medium text-stone-400 dark:text-stone-500">Waiting for the NEO-6M GPS module to achieve satellite lock.</p>
          </div>
        ) : (
          <>
            {/* Coordinate Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 p-5 flex flex-col justify-center transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg opacity-80 text-stone-500 dark:text-stone-400">🌐</span>
                  <span className="text-[11px] text-stone-500 dark:text-stone-400 font-bold uppercase tracking-wider">Latitude</span>
                </div>
                <div className="text-3xl font-extrabold tracking-tight text-stone-800 dark:text-stone-100">
                  {location.lat?.toFixed(6)}
                </div>
                <div className="text-xs font-medium text-stone-400 dark:text-stone-500 mt-1">Degrees North</div>
              </div>

              <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 p-5 flex flex-col justify-center transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg opacity-80 text-stone-500 dark:text-stone-400">🌐</span>
                  <span className="text-[11px] text-stone-500 dark:text-stone-400 font-bold uppercase tracking-wider">Longitude</span>
                </div>
                <div className="text-3xl font-extrabold tracking-tight text-stone-800 dark:text-stone-100">
                  {location.lng?.toFixed(6)}
                </div>
                <div className="text-xs font-medium text-stone-400 dark:text-stone-500 mt-1">Degrees East</div>
              </div>

              <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 p-5 flex flex-col justify-center transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg opacity-80 text-stone-500 dark:text-stone-400">⏱️</span>
                  <span className="text-[11px] text-stone-500 dark:text-stone-400 font-bold uppercase tracking-wider">Last Fixed</span>
                </div>
                <div className="text-2xl font-extrabold tracking-tight text-stone-800 dark:text-stone-100">
                  {location.timestamp ? new Date(location.timestamp * 1000).toLocaleTimeString() : '—'}
                </div>
                <div className="text-xs font-medium text-stone-400 dark:text-stone-500 mt-1">
                  {location.timestamp ? new Date(location.timestamp * 1000).toLocaleDateString() : '—'}
                </div>
              </div>
            </div>

            {/* Map Panel */}
            <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 overflow-hidden mb-6 flex flex-col transition-colors">
              <div className="bg-stone-50/80 dark:bg-stone-950/80 border-b border-stone-200 dark:border-stone-800 px-4 sm:px-5 py-3 flex items-center justify-between transition-colors">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📍</span>
                  <h3 className="font-bold text-stone-800 dark:text-stone-100 text-sm sm:text-base">Live Node Location</h3>
                </div>
                <span className="text-[10px] font-bold text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded uppercase tracking-wider">
                  Signal Locked
                </span>
              </div>
              
              <div className="h-[400px] md:h-[500px] w-full relative z-0">
                {mapReady ? (
                  <MapContainerWrapper center={center} location={location} hiveId={hiveId} />
                ) : (
                  <div className="h-full flex items-center justify-center bg-stone-50 dark:bg-stone-950 transition-colors">
                    <LoadingSpinner />
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// Separate component to use hooks from react-leaflet
function MapContainerWrapper({ center, location, hiveId }) {
  const [RL, setRL] = useState(null);

  useEffect(() => {
    import('react-leaflet').then((module) => setRL(module));
  }, []);

  if (!RL) return <LoadingSpinner className="h-full" />;

  const { MapContainer, TileLayer, Marker, Popup, useMap } = RL;

  return (
    <div className="h-full w-full [&_.leaflet-tile-pane]:dark:invert [&_.leaflet-tile-pane]:dark:hue-rotate-180 [&_.leaflet-tile-pane]:dark:contrast-75 [&_.leaflet-popup-content-wrapper]:dark:bg-stone-800 [&_.leaflet-popup-tip]:dark:bg-stone-800">
      <MapContainer
        center={center}
        zoom={16} // Zoomed in slightly for better local context
        style={{ height: '100%', width: '100%', zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={center}>
          <Popup>
            <div className="text-sm font-bold text-stone-800 dark:text-stone-100">🍯 {hiveId ? hiveId.toUpperCase() : 'Hive'}</div>
            <div className="text-xs text-stone-500 dark:text-stone-400 mt-1 font-medium">
              {location.timestamp
                ? `Updated: ${new Date(location.timestamp * 1000).toLocaleString()}`
                : 'Location tracked'}
            </div>
          </Popup>
        </Marker>
        <MapRecenter center={center} RL={RL} />
      </MapContainer>
    </div>
  );
}

function MapRecenter({ center, RL }) {
  const map = RL.useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center]);
  return null;
}