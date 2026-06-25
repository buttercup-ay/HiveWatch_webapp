import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  // Check local storage first, default to 'system' if nothing is saved
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'system');

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Determine what the 'system' actually prefers right now
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const activeTheme = theme === 'system' ? (systemPrefersDark ? 'dark' : 'light') : theme;
    
    // Apply the correct class to the HTML tag
    root.classList.remove('light', 'dark');
    root.classList.add(activeTheme);
    
    // Save the user's explicit choice
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Listen for real-time system theme changes (e.g., user changes OS settings from day to night)
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(mediaQuery.matches ? 'dark' : 'light');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);