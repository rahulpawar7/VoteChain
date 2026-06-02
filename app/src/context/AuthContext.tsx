'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

// ===== Types =====
interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'voter';
  walletAddress: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isVoter: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, role: string) => Promise<void>;
  logout: () => void;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

// ===== Context =====
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ===== Provider =====
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Computed booleans
  const isAuthenticated = !!user && !!token;
  const isAdmin = user?.role === 'admin';
  const isVoter = user?.role === 'voter';

  // Authenticated fetch helper
  const authFetch = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
      return fetch(fullUrl, { ...options, headers });
    },
    [token]
  );

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      const storedToken = localStorage.getItem('votechain_token');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${storedToken}` },
        });

        if (res.ok) {
          const data = await res.json();
          setUser(data.user || data);
          setToken(storedToken);
        } else {
          localStorage.removeItem('votechain_token');
        }
      } catch {
        localStorage.removeItem('votechain_token');
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, []);

  // Login
  const login = async (email: string, password: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Login failed');
    }

    const newToken = data.token;
    const userData = data.user;

    localStorage.setItem('votechain_token', newToken);
    setToken(newToken);
    setUser(userData);
  };

  // Register
  const register = async (
    username: string,
    email: string,
    password: string,
    role: string
  ): Promise<void> => {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, role }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Registration failed');
    }

    const newToken = data.token;
    const userData = data.user;

    localStorage.setItem('votechain_token', newToken);
    setToken(newToken);
    setUser(userData);
  };

  // Logout
  const logout = () => {
    localStorage.removeItem('votechain_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated,
        isAdmin,
        isVoter,
        login,
        register,
        logout,
        authFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ===== Hook =====
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
