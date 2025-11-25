/**
 * LoginOverlay - Simple Client-Side Login
 *
 * Basic authentication overlay to restrict access
 * Username: duwe
 * Password: preview
 */

'use client';

import React, { useState, useEffect } from 'react';

const VALID_USERNAME = 'duwe';
const VALID_PASSWORD = 'preview';
const LOGIN_SESSION_KEY = 'pontoon_configurator_auth';

interface LoginOverlayProps {
  children: React.ReactNode;
}

export function LoginOverlay({ children }: LoginOverlayProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const session = sessionStorage.getItem(LOGIN_SESSION_KEY);
    if (session === 'authenticated') {
      setIsAuthenticated(true);
    }
    setIsChecking(false);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (username === VALID_USERNAME && password === VALID_PASSWORD) {
      sessionStorage.setItem(LOGIN_SESSION_KEY, 'authenticated');
      setIsAuthenticated(true);
    } else {
      setError('Benutzername oder Passwort falsch');
      setPassword('');
    }
  };

  // Don't show anything while checking session
  if (isChecking) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center">
        <div className="text-white text-lg">Lädt...</div>
      </div>
    );
  }

  // Show children if authenticated
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // Show login form
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Pontoon Konfigurator</h1>
          <p className="text-gray-600">Bitte melden Sie sich an</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Benutzername
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="Benutzername eingeben"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Passwort
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="Passwort eingeben"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-sm">{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors shadow-lg hover:shadow-xl"
          >
            Anmelden
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Preview-Zugang für Kunden</p>
        </div>
      </div>
    </div>
  );
}
