import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AlertToast from './components/AlertToast';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Trends from './pages/Trends';
import BeeActivity from './pages/BeeActivity';
import Security from './pages/Security';
import Location from './pages/Location';
import Settings from './pages/Settings';

function AppLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-stone-50/50 dark:bg-stone-950 transition-colors duration-300">
      <Sidebar />
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen pb-16 md:pb-0">
        {children}
      </div>
      <BottomNav />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AlertToast />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
          <Route path="/trends" element={<ProtectedRoute><AppLayout><Trends /></AppLayout></ProtectedRoute>} />
          <Route path="/bee-activity" element={<ProtectedRoute><AppLayout><BeeActivity /></AppLayout></ProtectedRoute>} />
          <Route path="/security" element={<ProtectedRoute><AppLayout><Security /></AppLayout></ProtectedRoute>} />
          <Route path="/location" element={<ProtectedRoute><AppLayout><Location /></AppLayout></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><AppLayout><Settings /></AppLayout></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        <ToastContainer
          position="bottom-right"
          limit={3}
          theme="colored" // Allows React-Toastify to adapt better
          toastClassName="text-sm font-medium"
        />
      </BrowserRouter>
    </AuthProvider>
  );
}
