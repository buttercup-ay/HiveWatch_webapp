import React, { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase';
import Navbar from '../components/Navbar';
import LoadingSpinner from '../components/LoadingSpinner';

// Lazy import Leaflet to avoid SSR issues
let MapContainer, TileLayer, Marker, Popup, L;

export default function Location() {
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
    const locRef = ref(db, 'hive_001/location');
    const unsub = onValue(locRef, (snap) => {
      setLocation(snap.val());
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const hasValidLocation = location?.lat && location?.lng &&
    location.lat !== 0 && location.lng !== 0;

  // Default: Ilorin, Nigeria
  const center = hasValidLocation
    ? [location.lat, location.lng]
    : [8.4799, 4.5418];

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar title="Location" />
      <main className="flex-1 p-4 md:p-6 flex flex-col gap-6">

        {loading ? (
          <LoadingSpinner className="py-20" />
        ) : !hasValidLocation ? (
          <div className="bg-white rounded-xl shadow-md p-10 text-center">
            <div className="text-4xl mb-3">📡</div>
            <div className="text-stone-500 font-medium">GPS signal not yet acquired</div>
            <div className="text-stone-400 text-sm mt-1">Waiting for NEO-6M GPS module to lock</div>
          </div>
        ) : (
          <>
            {/* Map */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden" style={{ height: 400 }}>
              {mapReady ? (
                <MapContainerWrapper center={center} location={location} />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <LoadingSpinner />
                </div>
              )}
            </div>

            {/* Coordinate cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl shadow-md p-4">
                <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Latitude</div>
                <div className="text-2xl font-bold text-stone-800">{location.lat?.toFixed(6)}</div>
                <div className="text-xs text-stone-400 mt-1">degrees N</div>
              </div>
              <div className="bg-white rounded-xl shadow-md p-4">
                <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Longitude</div>
                <div className="text-2xl font-bold text-stone-800">{location.lng?.toFixed(6)}</div>
                <div className="text-xs text-stone-400 mt-1">degrees E</div>
              </div>
              <div className="bg-white rounded-xl shadow-md p-4">
                <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Last Updated</div>
                <div className="text-lg font-bold text-stone-800">
                  {location.timestamp
                    ? new Date(location.timestamp * 1000).toLocaleTimeString()
                    : '—'}
                </div>
                <div className="text-xs text-stone-400 mt-1">
                  {location.timestamp
                    ? new Date(location.timestamp * 1000).toLocaleDateString()
                    : '—'}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// Separate component to use hooks from react-leaflet
function MapContainerWrapper({ center, location }) {
  const [RL, setRL] = useState(null);

  useEffect(() => {
    import('react-leaflet').then((module) => setRL(module));
  }, []);

  if (!RL) return <LoadingSpinner className="h-full" />;

  const { MapContainer, TileLayer, Marker, Popup, useMap } = RL;

  return (
    <MapContainer
      center={center}
      zoom={15}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={center}>
        <Popup>
          <div className="text-sm font-semibold">🍯 Hive 001</div>
          <div className="text-xs text-gray-500 mt-1">
            {location.timestamp
              ? `Updated: ${new Date(location.timestamp * 1000).toLocaleString()}`
              : 'Location tracked'}
          </div>
        </Popup>
      </Marker>
      <MapRecenter center={center} RL={RL} />
    </MapContainer>
  );
}

function MapRecenter({ center, RL }) {
  const map = RL.useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center]);
  return null;
}
