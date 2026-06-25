import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { toast } from 'react-toastify';

export default function Login() {
  const { user, loading, loginUser, registerUser } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('signin'); 
  
  // Auth Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Profile Fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [hiveIdInput, setHiveIdInput] = useState('');
  
  // Dynamic Country API State
  const [countryList, setCountryList] = useState([]);
  const [countryCode, setCountryCode] = useState('+234'); // Defaulting to Nigeria
  const [showCountryDrop, setShowCountryDrop] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const dropdownRef = useRef(null);

  // Validation States
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Password Requirements Logic
  const passReqs = {
    length: password.length >= 6,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password)
  };
  const allReqsMet = Object.values(passReqs).every(Boolean);

  // Fetch Country Codes from API
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const response = await fetch('https://restcountries.com/v3.1/all?fields=name,idd,flag');
        const data = await response.json();
        
        const formatted = data
          .map(c => {
            let callingCode = c.idd?.root || '';
            if (c.idd?.suffixes) {
              callingCode += c.idd.suffixes.length === 1 ? c.idd.suffixes[0] : '';
            }
            return {
              name: c.name.common,
              code: callingCode,
              flag: c.flag
            };
          })
          .filter(c => c.code !== '')
          .sort((a, b) => a.name.localeCompare(b.name));

        setCountryList(formatted);
      } catch (err) {
        console.error("Failed to fetch country codes via API, using fallbacks.", err);
        setCountryList([
          { name: 'Nigeria', code: '+234', flag: '🇳🇬' },
          { name: 'United States', code: '+1', flag: '🇺🇸' },
          { name: 'United Kingdom', code: '+44', flag: '🇬🇧' },
        ]);
      }
    };

    fetchCountries();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowCountryDrop(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50/50 dark:bg-stone-950 transition-colors">
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
      default: return `Error (${code || 'unknown'}): ${message || 'Please try again.'}`;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setHasSubmitted(true);
    setError('');

    // Highlight validation check
    if (mode === 'signup') {
      if (!name || !phone || !hiveIdInput || !email || !password || !confirmPassword) {
        toast.error('Please complete all highlighted fields.');
        return;
      }
      if (!allReqsMet) {
        toast.error('Please ensure all password requirements are met.');
        return;
      }
      if (password !== confirmPassword) {
        toast.error('Passwords do not match.');
        return;
      }
    } else {
      if (!email || !password) {
        toast.error('Please enter your email and password.');
        return;
      }
    }

    setPending(true);
    try {
      if (mode === 'signin') {
        await loginUser(email, password);
        toast.success('Successfully signed in! Welcome back.');
      } else {
        const fullPhone = `${countryCode} ${phone}`;
        await registerUser(name, email, fullPhone, hiveIdInput, password);
        toast.success('Account created! Welcome to HiveWatch.');
      }
      navigate('/dashboard');
    } catch (err) {
      console.error('Firebase Auth error:', err.code, err.message);
      const errorMessage = getErrorMessage(err.code, err.message);
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setPending(false);
    }
  };

  // Helper for dynamic input styling based on validation (Fully mapped for Dark Mode)
  const inputStyle = (value) => `
    w-full px-4 py-2.5 rounded-lg text-sm transition-all focus:outline-none focus:ring-2 
    ${hasSubmitted && !value 
      ? 'border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/30 focus:ring-red-400 dark:focus:ring-red-500/50 text-stone-800 dark:text-stone-100' 
      : 'border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 focus:ring-amber-500 focus:border-amber-500 text-stone-800 dark:text-stone-100'
    }
  `;

  // Search filter for the API data
  const filteredCountries = countryList.filter(c => 
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) || 
    c.code.includes(countrySearch)
  );

  return (
    <div className="min-h-screen bg-stone-50/50 dark:bg-stone-950 flex items-center justify-center p-4 transition-colors duration-300">
      <div className={`w-full transition-all duration-300 ${mode === 'signup' ? 'max-w-2xl' : 'max-w-md'}`}>
        
        {/* Logo Header */}
        <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-6xl mb-3 drop-shadow-sm">🍯</div>
          <h1 className="text-4xl font-extrabold text-stone-800 dark:text-stone-100 tracking-tight transition-colors">HiveWatch</h1>
          <p className="text-stone-500 dark:text-stone-400 mt-1 text-sm font-medium uppercase tracking-widest transition-colors">Command Center</p>
        </div>

        {/* Auth Card */}
        <div className="bg-white/80 dark:bg-stone-900/80 backdrop-blur-md rounded-2xl shadow-xl border border-stone-200 dark:border-stone-800 p-6 md:p-8 animate-in zoom-in-95 duration-300 transition-colors">
          <h2 className="text-xl font-bold text-stone-800 dark:text-stone-100 mb-6 border-b border-stone-100 dark:border-stone-800 pb-4 transition-colors">
            {mode === 'signin' ? 'Sign In to Account' : 'Register Operator Node'}
          </h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            
            {/* SIGNUP GRID LAYOUT */}
            {mode === 'signup' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                
                <div>
                  <label className="block text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1.5 transition-colors">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    className={inputStyle(name)}
                  />
                </div>
                
                <div>
                  <label className="block text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1.5 transition-colors">Hive ID</label>
                  <input
                    type="text"
                    value={hiveIdInput}
                    onChange={(e) => setHiveIdInput(e.target.value)}
                    placeholder="hive_001"
                    className={`${inputStyle(hiveIdInput)} font-mono text-amber-700 dark:text-amber-500`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1.5 transition-colors">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="operator@domain.com"
                    className={inputStyle(email)}
                  />
                </div>
                
                {/* Phone Input with Dynamic Searchable API Dropdown */}
                <div>
                  <label className="block text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1.5 transition-colors">Phone Number</label>
                  <div className="flex relative" ref={dropdownRef}>
                    
                    <button
                      type="button"
                      onClick={() => setShowCountryDrop(!showCountryDrop)}
                      className={`flex-shrink-0 flex items-center justify-between gap-1 px-3 py-2.5 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 border-r-0 rounded-l-lg text-sm font-medium text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors w-24 ${hasSubmitted && !phone ? 'border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/30' : ''}`}
                    >
                      <span className="truncate">{countryCode}</span>
                      <svg className="w-3 h-3 text-stone-400 dark:text-stone-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>

                    {showCountryDrop && (
                      <div className="absolute top-12 left-0 w-64 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xl rounded-xl z-50 overflow-hidden transition-colors">
                        <div className="p-2 border-b border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/50 transition-colors">
                          <input
                            type="search"
                            autoFocus
                            placeholder="Search country or code..."
                            value={countrySearch}
                            onChange={(e) => setCountrySearch(e.target.value)}
                            className="w-full px-3 py-1.5 text-sm bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors"
                          />
                        </div>
                        <ul className="max-h-48 overflow-y-auto py-1">
                          {filteredCountries.map(c => (
                            <li 
                              key={c.name}
                              onClick={() => { setCountryCode(c.code); setShowCountryDrop(false); setCountrySearch(''); }}
                              className="px-3 py-2 text-sm hover:bg-stone-50 dark:hover:bg-stone-800 cursor-pointer flex justify-between items-center transition-colors"
                            >
                              <span className="text-stone-700 dark:text-stone-300 truncate mr-2" title={c.name}>{c.flag} {c.name}</span>
                              <span className="font-mono text-stone-400 dark:text-stone-500 font-medium flex-shrink-0">{c.code}</span>
                            </li>
                          ))}
                          {filteredCountries.length === 0 && <li className="px-3 py-3 text-xs text-stone-400 dark:text-stone-500 text-center">No results found</li>}
                        </ul>
                      </div>
                    )}
                    
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="800 000 0000"
                      className={`w-full px-3 py-2.5 rounded-r-lg text-sm transition-all focus:outline-none focus:ring-2 border bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-100 ${hasSubmitted && !phone ? 'border-red-300 dark:border-red-900 focus:ring-red-400 bg-red-50 dark:bg-red-950/30' : 'border-stone-200 dark:border-stone-800 focus:ring-amber-500 focus:border-amber-500'}`}
                    />
                  </div>
                </div>

              </div>
            )}

            {/* SIGNIN ONLY LAYOUT */}
            {mode === 'signin' && (
              <div>
                <label className="block text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1.5 transition-colors">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operator@domain.com"
                  className={inputStyle(email)}
                />
              </div>
            )}

            {/* Password Section (Both Modes) */}
            <div className={`grid ${mode === 'signup' ? 'grid-cols-1 sm:grid-cols-2 gap-5' : 'grid-cols-1'}`}>
              <div>
                <label className="block text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1.5 transition-colors">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={inputStyle(password)}
                />
              </div>

              {mode === 'signup' && (
                <div>
                  <label className="block text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1.5 transition-colors">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full px-4 py-2.5 rounded-lg text-sm transition-all focus:outline-none focus:ring-2 border text-stone-800 dark:text-stone-100 ${hasSubmitted && (!confirmPassword || password !== confirmPassword) ? 'border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/30 focus:ring-red-400 dark:focus:ring-red-500/50' : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 focus:ring-amber-500 focus:border-amber-500'}`}
                  />
                  {hasSubmitted && confirmPassword && password !== confirmPassword && (
                    <div className="text-[10px] font-bold text-red-500 dark:text-red-400 mt-1 animate-in slide-in-from-top-1">Passwords do not match</div>
                  )}
                </div>
              )}
            </div>

            {/* Real-time Password Security Checklist (Signup Only) */}
            {mode === 'signup' && (
              <div className="bg-stone-50 dark:bg-stone-950/50 p-4 rounded-xl border border-stone-100 dark:border-stone-800 mt-1 transition-colors">
                <h4 className="text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-3 transition-colors">Password Security Requirements</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] text-white transition-colors duration-300 ${passReqs.length ? 'bg-green-500 dark:bg-green-600' : 'bg-stone-200 dark:bg-stone-800'}`}>{passReqs.length && '✓'}</span>
                    <span className={`text-xs font-medium transition-colors ${passReqs.length ? 'text-stone-700 dark:text-stone-300' : 'text-stone-400 dark:text-stone-500'}`}>At least 6 characters</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] text-white transition-colors duration-300 ${passReqs.uppercase ? 'bg-green-500 dark:bg-green-600' : 'bg-stone-200 dark:bg-stone-800'}`}>{passReqs.uppercase && '✓'}</span>
                    <span className={`text-xs font-medium transition-colors ${passReqs.uppercase ? 'text-stone-700 dark:text-stone-300' : 'text-stone-400 dark:text-stone-500'}`}>One uppercase letter (A-Z)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] text-white transition-colors duration-300 ${passReqs.lowercase ? 'bg-green-500 dark:bg-green-600' : 'bg-stone-200 dark:bg-stone-800'}`}>{passReqs.lowercase && '✓'}</span>
                    <span className={`text-xs font-medium transition-colors ${passReqs.lowercase ? 'text-stone-700 dark:text-stone-300' : 'text-stone-400 dark:text-stone-500'}`}>One lowercase letter (a-z)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] text-white transition-colors duration-300 ${passReqs.number ? 'bg-green-500 dark:bg-green-600' : 'bg-stone-200 dark:bg-stone-800'}`}>{passReqs.number && '✓'}</span>
                    <span className={`text-xs font-medium transition-colors ${passReqs.number ? 'text-stone-700 dark:text-stone-300' : 'text-stone-400 dark:text-stone-500'}`}>One number (0-9)</span>
                  </div>
                </div>
              </div>
            )}

            {error && mode === 'signin' && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg px-4 py-3 text-sm font-medium text-red-700 dark:text-red-400 flex items-start gap-2 animate-in fade-in slide-in-from-top-2 transition-colors">
                <span>⚠️</span> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full bg-stone-800 dark:bg-amber-600 hover:bg-stone-900 dark:hover:bg-amber-500 text-white font-bold py-3 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 mt-3"
            >
              {pending ? (
                <LoadingSpinner size="sm" />
              ) : mode === 'signin' ? 'Login' : 'Sign up'}
            </button>
          </form>

          <div className="mt-3 pt-6 border-stone-100 dark:border-stone-800 text-center text-sm font-medium text-stone-500 dark:text-stone-400 transition-colors">
            {mode === 'signin' ? (
              <>
                Don't have an account?{' '}
                <button
                  onClick={() => { setMode('signup'); setError(''); setHasSubmitted(false); }}
                  className="text-amber-600 dark:text-amber-500 hover:text-amber-700 dark:hover:text-amber-400 font-bold hover:underline transition-colors"
                >
                  Register here
                </button>
              </>
            ) : (
              <>
                Already configured your node?{' '}
                <button
                  onClick={() => { setMode('signin'); setError(''); setHasSubmitted(false); }}
                  className="text-amber-600 dark:text-amber-500 hover:text-amber-700 dark:hover:text-amber-400 font-bold hover:underline transition-colors"
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>

        <p className="text-center text-xs font-medium text-stone-400 dark:text-stone-500 mt-8 transition-colors">
          HiveWatch 2026~
        </p>
      </div>
    </div>
  );
}