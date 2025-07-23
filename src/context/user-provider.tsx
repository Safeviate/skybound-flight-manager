
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, Alert, Company } from '@/lib/types';
import { userData, allAlerts, companyData } from '@/lib/data-provider';
import { ROLE_PERMISSIONS } from '@/lib/types';

interface UserContextType {
  user: User | null;
  company: Company | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => void;
  getUnacknowledgedAlerts: (user: User) => Alert[];
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  const getUnacknowledgedAlerts = useCallback((currentUser: User): Alert[] => {
    if (!currentUser) return [];
    try {
        const acknowledgedIds = JSON.parse(sessionStorage.getItem('acknowledgedAlertIds') || '[]');
        return allAlerts.filter(alert => !acknowledgedIds.includes(alert.id));
    } catch (e) {
        // If sessionStorage is not available, all alerts are considered unacknowledged.
        return allAlerts;
    }
  }, []);

  const login = useCallback(async (email: string, password?: string): Promise<boolean> => {
    // In a real app, you would make an API call to your backend for authentication.
    // For this mock, we'll find the user by email.
    const userToLogin = userData.find(u => u.email.toLowerCase() === email.toLowerCase());

    // Password check (for a real app, this would be a hashed comparison on the server)
    if (userToLogin && userToLogin.password === password) {
        const permissions = ROLE_PERMISSIONS[userToLogin.role] || [];
        const userWithPermissions = { ...userToLogin, permissions };
        setUser(userWithPermissions);
        
        const foundCompany = companyData.find(c => c.id === userToLogin.companyId);
        setCompany(foundCompany || null);

        try {
            sessionStorage.setItem('currentUserId', userToLogin.id);
        } catch (error) {
            console.error("Could not access sessionStorage to set user session.");
        }
        return true;
    }
    
    // If password check fails, but the user was just verified via 2FA, allow login
    // This is a simplified demo flow. A real app would manage session state differently.
    if (user && user.email === email && password === undefined) {
        return true;
    }

    // If login fails
    setUser(null);
    setCompany(null);
    try {
        sessionStorage.removeItem('currentUserId');
    } catch (error) {
        console.error("Could not access sessionStorage to clear user session.");
    }
    return false;
  }, [user]);

  const logout = useCallback(() => {
    setUser(null);
    setCompany(null);
    try {
        sessionStorage.removeItem('currentUserId');
        sessionStorage.removeItem('acknowledgedAlertIds');
    } catch (error) {
        console.error("Could not access sessionStorage to clear user session.");
    }
  }, []);
  
  // Re-hydrate user from sessionStorage on initial load
  useEffect(() => {
    const rehydrateUser = async () => {
        try {
            const storedUserId = sessionStorage.getItem('currentUserId');
            if (storedUserId) {
                const userToLogin = userData.find(u => u.id === storedUserId);
                 if (userToLogin) {
                    const permissions = ROLE_PERMISSIONS[userToLogin.role] || [];
                    const userWithPermissions = { ...userToLogin, permissions };
                    setUser(userWithPermissions);
                    const foundCompany = companyData.find(c => c.id === userToLogin.companyId);
                    setCompany(foundCompany || null);
                }
            }
        } catch (error) {
            console.error("Could not access sessionStorage. User session will not persist.");
        } finally {
            setLoading(false);
        }
    }
    rehydrateUser();
  }, []);

  return (
    <UserContext.Provider value={{ user, company, loading, login, logout, getUnacknowledgedAlerts }}>
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
