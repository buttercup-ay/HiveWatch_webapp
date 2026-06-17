# 🍯 HiveWatch — Real-Time Beehive Monitoring Dashboard

A production-ready React.js + Firebase web application for the HiveWatch IoT beehive monitoring and security system.

## Tech Stack
- **React 18** + Vite
- **Firebase v10** (Realtime Database + Authentication)
- **React Router v6**
- **Recharts** — all charts
- **React-Leaflet** — GPS map (OpenStreetMap, no API key)
- **React-Toastify** — live alert toasts
- **Tailwind CSS** — styling

---

## 🚀 Setup Instructions

### 1. Install dependencies
```bash
npm install
```

### 2. Configure Firebase
Edit `src/firebase.js` and replace the placeholder values with your actual Firebase project config:

```js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

Get this from: Firebase Console → Project Settings → Your apps → Web app config.

### 3. Firebase Realtime Database Rules
Set your database rules to allow authenticated reads/writes:

```json
{
  "rules": {
    "hive_001": {
      ".read": "auth != null",
      "sensors": { ".write": false },
      "history": { ".write": false },
      "bee_traffic": { ".write": false },
      "alerts": { ".write": false },
      "location": { ".write": false },
      "security": {
        ".write": "auth != null"
      },
      "buzzer_control": {
        ".write": "auth != null"
      },
      "thresholds": {
        ".write": "auth != null"
      },
      "status": { ".write": false }
    }
  }
}
```

### 4. Enable Firebase Authentication
In Firebase Console → Authentication → Sign-in method → Enable **Email/Password**.

### 5. Run the development server
```bash
npm run dev
```

### 6. Build for production
```bash
npm run build
```

---

## 📁 File Structure

```
src/
├── firebase.js              ← Firebase init (edit this with your config)
├── thresholds.js            ← Default threshold constants
├── App.jsx                  ← Router + ToastContainer
├── context/
│   └── AuthContext.jsx      ← Auth state provider
├── hooks/
│   ├── useAuth.js
│   └── useThresholds.js     ← Live threshold sync from Firebase
├── components/
│   ├── Sidebar.jsx          ← Desktop left nav
│   ├── BottomNav.jsx        ← Mobile bottom tabs
│   ├── Navbar.jsx           ← Top bar with LIVE/OFFLINE badge
│   ├── SensorCard.jsx       ← Reusable sensor value card
│   ├── AlertToast.jsx       ← Real-time toast notifications
│   ├── ProtectedRoute.jsx   ← Auth guard
│   └── LoadingSpinner.jsx
└── pages/
    ├── Login.jsx            ← Sign in / Sign up
    ├── Dashboard.jsx        ← Live sensor overview
    ├── Trends.jsx           ← Historical charts (6H/24H/7D/30D)
    ├── BeeActivity.jsx      ← Bee traffic bar charts
    ├── Security.jsx         ← Intrusion alerts + buzzer
    ├── Location.jsx         ← GPS map (react-leaflet)
    └── Settings.jsx         ← Thresholds + account + status
```

---

## 🔌 Firebase Database Structure

The app reads from (hardware writes to):
- `hive_001/sensors/` — live sensor data (overwritten every 60s)
- `hive_001/history/` — pushed records every 60s
- `hive_001/bee_traffic/` — bee count windows every 30min
- `hive_001/alerts/intrusion_alerts/`, `weight_alerts/`, `threshold_alerts/`
- `hive_001/security/` — intrusion status
- `hive_001/location/` — GPS coordinates
- `hive_001/status` — "ONLINE"/"OFFLINE"

The app writes to:
- `hive_001/buzzer_control/state` — arm/disarm buzzer
- `hive_001/thresholds/` — configurable alert thresholds
- `hive_001/security/intrusion` — clear intrusion flag

---

## 🎓 Project Info
- **Student**: University of Ilorin, Computer Engineering
- **Supervisor**: Engr. H.O. Mahmud
- **Hardware**: ATmega328P + ESP32, BME680 × 2, DS18B20 × 4, HX711, PIR, IR break-beam × 2, NEO-6M GPS, DS3231 RTC
