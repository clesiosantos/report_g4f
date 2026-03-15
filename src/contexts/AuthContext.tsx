"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { GLPIUser } from '@/lib/glpi';

interface AuthContextType {
  user: GLPIUser | null;
  login: (userData: GLPIUser) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<GLPIUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('glpi_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('glpi_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = (userData: GLPIUser) => {
    setUser(userData);
    localStorage.setItem('glpi_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('glpi_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};