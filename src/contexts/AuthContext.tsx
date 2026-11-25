"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { GLPIUser, glpiService } from '@/lib/glpi';

interface AuthContextType {
  user: GLPIUser | null;
  login: (userData: GLPIUser) => void;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<GLPIUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    localStorage.removeItem('glpi_user');
    let active = true;
    glpiService.me().then(data => { if (active) setUser(data); })
      .catch(() => { if (active) setUser(null); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, []);

  const login = (userData: GLPIUser) => {
    setUser(userData);

  };

  const logout = async () => {
    try { await glpiService.logout(); setUser(null); }
    catch { window.alert('Nao foi possivel encerrar a sessao. Tente novamente.'); }
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