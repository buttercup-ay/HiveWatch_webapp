import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Login() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-amber-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (user) return <Navigate to="/dashboard" replace />;

  const getErrorMessage = (code, message) => {
    switch (code) {
      case 'auth/user-not-found': return 'No account found with this email.';
      case 'auth/wrong-password': return 'Incorrect password.';
      case 'auth/email-already-in-use': return 'This email is already registered.';
      case 'auth/invalid-email': return 'Invalid email address.';
      case 'auth/weak-password': return 'Password must be at least 6 characters.';
      case 'auth/invalid-credential': return 'Invalid email or password.';
      case 'auth/network-request-failed': return 'Network error — check your internet connection.';
      case 'auth/too-many-requests': return 'Too many attempts. Please wait a moment and try again.';
      case 'auth/operation-not-allowed': return 'Email/password sign-in is not enabled. Please enable it in Firebase Console → Authentication → Sign-in method.';
      case 'auth/configuration-not-found': return 'Firebase Auth is not configured. Check your firebase.js config values.';
      default: return `Error (${code || 'unknown'}): ${message || 'Please try again.'}`;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setPending(true);
    try {
      if (mode === 'signin') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      navigate('/dashboard');
    } catch (err) {
      console.error('Firebase Auth error:', err.code, err.message);
      setError(getErrorMessage(err.code, err.message));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🍯</div>
          <h1 className="text-4xl font-bold text-amber-600 tracking-tight">HiveWatch</h1>
          <p className="text-stone-500 mt-1 text-sm">Beehive Monitoring & Security System</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-amber-100 p-8">
          <h2 className="text-xl font-bold text-stone-800 mb-6">
            {mode === 'signin' ? 'Sign In' : 'Create Account'}
          </h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition"
              />
            </div>

            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition"
                />
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {pending ? (
                <LoadingSpinner size="sm" />
              ) : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="mt-5 text-center text-sm text-stone-500">
            {mode === 'signin' ? (
              <>
                Don't have an account?{' '}
                <button
                  onClick={() => { setMode('signup'); setError(''); }}
                  className="text-amber-600 hover:underline font-medium"
                >
                  Create one
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => { setMode('signin'); setError(''); }}
                  className="text-amber-600 hover:underline font-medium"
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-stone-400 mt-6">
          HiveWatch 2026~
        </p>
      </div>
    </div>
  );
}
