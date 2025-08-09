
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, Alert, Company, QualityAudit, Permission } from '@/lib/types';
import { useRouter } from 'next/navigation';

interface UserContextType {
  user: User | null;
  company: Company | null;
  setCompany: (company: Company | null) => void;
  userCompanies: Company[];
  loading: boolean;
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (updatedData: Partial<User>) => Promise<boolean>;
  updateCompany: (updatedData: Partial<Company>) => Promise<boolean>;
  getUnacknowledgedAlerts: (audits?: QualityAudit[]) => Alert[];
  acknowledgeAlerts: (alertIds: string[]) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const MOCK_USER: User = {
    id: 'super-admin-id',
    companyId: 'skybound-aero',
    name: 'Super Admin',
    role: 'Admin',
    email: 'admin@skybound.com',
    phone: '555-123-4567',
    permissions: ['Super User'],
    status: 'Active',
};

const MOCK_COMPANY: Company = {
    id: 'skybound-aero',
    name: 'SkyBound Aero',
    trademark: 'Excellence in Aviation',
};


export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(MOCK_USER);
  const [company, setCompany] = useState<Company | null>(MOCK_COMPANY);
  const [userCompanies, setUserCompanies] = useState<Company[]>([MOCK_COMPANY]);
  const [allAlerts, setAllAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const setActiveCompany = (newCompany: Company | null) => {
    setCompany(newCompany);
  }

  const login = async (email: string, password?: string): Promise<boolean> => {
    console.log("Mock login successful");
    return true;
  };

  const logout = useCallback(() => {
    setUser(null);
    setCompany(null);
    // Use window.location to force a full page reload and redirect to the login page.
    // This is more reliable than router.push for logout sequences.
    window.location.href = '/login';
  }, []);
  
  const updateUser = async (updatedData: Partial<User>): Promise<boolean> => {
    setUser(prev => prev ? { ...prev, ...updatedData } : null);
    console.log("Mock user update successful");
    return true;
  };

  const updateCompany = async (updatedData: Partial<Company>): Promise<boolean> => {
    setCompany(prev => prev ? { ...prev, ...updatedData } : null);
    console.log("Mock company update successful");
    return true;
  };

  const getUnacknowledgedAlerts = useCallback((): Alert[] => {
    if (!user || !user.id) return [];
    return allAlerts.filter(alert => !alert.readBy.includes(user.id!));
  }, [user, allAlerts]);

  const acknowledgeAlerts = async (alertIds: string[]): Promise<void> => {
    console.log(`Acknowledged alerts: ${alertIds.join(', ')}`);
  };

  return (
    <UserContext.Provider value={{ user, company, setCompany: setActiveCompany, userCompanies, loading, login, logout, updateUser, updateCompany, getUnacknowledgedAlerts, acknowledgeAlerts }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
