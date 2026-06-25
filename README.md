# 🍯 HiveWatch — Enterprise Beehive Intelligence System

A production-ready React.js + Firebase web application and dual-microcontroller IoT telemetry array engineered to track beehive microclimates, evaluate traffic velocity, and deliver continuous security auditing.

## 💻 Web App Tech Stack
- **React 18** + Vite
- **Firebase v10** (Realtime Database + Authentication)
- **React Router v6** (Protected Routing)
- **Context API** (Global State for Auth & System/Dark Theme)
- **Recharts** — Responsive, theme-aware data visualization
- **React-Leaflet** — GPS map (OpenStreetMap with dynamic Dark Mode inversion)
- **React-Toastify** — Live alert notifications
- **Tailwind CSS** — "Light SaaS" styling framework

## 🛠 Hardware Architecture Ecosystem
- **Master Edge Processor:** ATmega32 Mainframe Controller (9600 Baud UART Link).
- **Cloud Uplink Gateway:** DOIT ESP32 DevKit V1 (30-Pin Framework).
- **Environmental Arrays:** Dual-Instance Adafruit BME680 (I2C) + 4-Zone DS18B20 Digital Bus.
- **Mass Acquisition:** HX711 Signal Converter utilizing a non-blocking Exponential Moving Average (EMA) Digital Filter.
- **Intrusion Detection:** 4-Quadrant hardware-latched PIR Arrays mapped across discrete Pin-Change Interrupt vectors.

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

*(Get this from: Firebase Console → Project Settings → Your apps → Web app config.)*

### 3. Firebase Realtime Database Rules

Set your database rules to allow authenticated reads and strictly scoped writes:

```json
{
  "rules": {
    "hive_001": {
      ".read": "auth != null",
      "sensors": { ".write": "auth != null" },
      "history": { ".write": "auth != null" },
      "location": { ".write": "auth != null" },
      "status": { ".write": "auth != null" },
      "buzzer_control": {
        ".write": "auth != null"
      },
      "calibration": {
        ".write": "auth != null"
      },
      "thresholds": {
        ".write": "auth != null"
      },
      "security": {
        ".write": "auth != null"
      },
      "alerts": { ".write": false }
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

```text
src/
├── firebase.js              ← Firebase init & config
├── thresholds.js            ← Default threshold constants
├── App.jsx                  ← Router + ToastContainer + Main Layout
├── context/
│   ├── AuthContext.jsx      ← Auth state provider
│   └── ThemeContext.jsx     ← Global Light/Dark mode state engine
├── hooks/
│   ├── useAuth.js
│   └── useThresholds.js     ← Live threshold sync from Firebase
├── components/
│   ├── Sidebar.jsx          ← Desktop left nav
│   ├── BottomNav.jsx        ← Mobile bottom tabs
│   ├── Navbar.jsx           ← Top bar with Theme Cycler & LIVE badge
│   ├── SensorCard.jsx       ← Reusable metric cards
│   ├── AlertToast.jsx       ← Real-time toast container logic
│   ├── ProtectedRoute.jsx   ← Auth guard
│   └── LoadingSpinner.jsx   
└── pages/
    ├── Login.jsx            ← Sign in / Register (with REST Countries API)
    ├── Dashboard.jsx        ← Command Center overview
    ├── Trends.jsx           ← Historical charts (6H/24H/7D/30D/Custom)
    ├── BeeActivity.jsx      ← Bee traffic bar charts (30-min buckets)
    ├── Security.jsx         ← Intrusion alerts + siren toggle
    ├── Location.jsx         ← GPS map (React-Leaflet)
    └── Settings.jsx         ← Thresholds, Hardware Calibration, Account

```

---

## 🔌 Firebase Database Schema & Telemetry

The ESP32 platform updates real-time values every **10 seconds**. The web application automatically subscribes to these paths:

### System & Security Status

* `/hive_001/status` — `ONLINE` / `OFFLINE` heartbeat indicator.
* `/hive_001/security/intrusion` — Active intrusion flag (Web app clears this).
* `/hive_001/alerts/` — Intrusion, theft, and threshold event logs.
* `/hive_001/location/` — `lat`, `lng`, and `timestamp` updated dynamically via GPS module.

### Live Telemetry (Overwritten every 10s)

* `/hive_001/sensors/temp_brood`, `hum_brood`, `pres_brood` — Core BME680 metrics.
* `/hive_001/sensors/temp_super`, `hum_super`, `pres_super` — Upper BME680 metrics.
* `/hive_001/sensors/temp_front`, `_back`, `_left`, `_right` — DS18B20 wall matrix.
* `/hive_001/sensors/weight_kg` — EMA-smoothed load cell mass.
* `/hive_001/sensors/pir_front`, `_back`, `_left`, `_right` — Motion intercept statuses.

### Historical Logging (Pushed every 10s)

* `/hive_001/history/` — Comprehensive snapshot object containing all sensor data, total weight, and cumulative `bee_in` / `bee_out` counts for the 10-second window.

### Web-to-Hardware Control (App Writes)

* `/hive_001/buzzer_control/state` — Manual boolean toggle for the physical siren.
* `/hive_001/calibration/weight_factor` — Dynamic float multiplier streamed to the HX711 scale without requiring hardware re-flashing.
* `/hive_001/thresholds/` — User-defined minimum/maximum bounds for dynamic alerting.


## 🎓 Project Info
- **Student**: University of Ilorin, Computer Engineering
- **Supervisor**: Engr. H.O. Mahmud
- **Hardware**: ATmega328P + ESP32, BME680 × 2, DS18B20 × 4, HX711, PIR, IR break-beam × 2, NEO-6M GPS, DS3231 RTC
