// hooks/useAuth.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { setAuthToken, removeAuthToken, isAuthenticated as checkIsAuthenticated, getUser, setUser as saveUser, removeUser } from '../lib/api/storage';
import { apiFetch } from '../lib/api/client';
import { User } from '../types/user';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (name: string, email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- Auth API calls ---
const apiLogin = async (email: string, password: string) => {
  return apiFetch<{ token: string, user: User }>('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
};

// Assuming /api/auth/register
const apiRegister = async (name: string, email: string, password: string) => {
  return apiFetch<any>('/auth/register', {
    method: 'POST',
    body: { name, email, password },
  });
};


// --------------------------------------------------------------------------

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (checkIsAuthenticated()) {
        setUser(getUser()); 
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await apiLogin(email, password);
      setAuthToken(data.token);
      saveUser(data.user);
      setUser(data.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    removeAuthToken();
    removeUser();
    setUser(null);
    // Force a full page refresh/redirect to ensure all state is cleared
    window.location.href = '/auth/login'; 
  };

  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      return await apiRegister(name, email, password);
    } finally {
      setIsLoading(false);
      return null;
    }
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    register
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Hook to use the authentication context.
 * @returns The authentication context object.
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};