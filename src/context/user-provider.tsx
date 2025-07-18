
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User } from '@/lib/types';
import { userData } from '@/lib/mock-data';
import { ROLE_PERMISSIONS } from '@/lib/types';

interface UserContextType {
  user: User | null;
  loading: boolean;
  login: (userId: string) => void;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const storedUserId = localStorage.getItem('currentUserId');
      if (storedUserId) {
        const foundUser = userData.find(u => u.id === storedUserId);
        if (foundUser) {
            const permissions = ROLE_PERMISSIONS[foundUser.role] || [];
            setUser({ ...foundUser, permissions });
        }
      }
    } catch (error) {
        console.error("Could not access localStorage. User session will not persist.");
    } finally {
        setLoading(false);
    }
  }, []);

  const login = useCallback((userId: string) => {
    const userToLogin = userData.find(u => u.id === userId) || null;
    if (userToLogin) {
        const permissions = ROLE_PERMISSIONS[userToLogin.role] || [];
        const userWithPermissions = { ...userToLogin, permissions };
        setUser(userWithPermissions);
        try {
            localStorage.setItem('currentUserId', userId);
        } catch (error) {
            console.error("Could not access localStorage to set user session.");
        }
    } else {
        setUser(null);
        try {
            localStorage.removeItem('currentUserId');
        } catch (error) {
            console.error("Could not access localStorage to clear user session.");
        }
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    try {
        localStorage.removeItem('currentUserId');
    } catch (error) {
        console.error("Could not access localStorage to clear user session.");
    }
  }, []);

  return (
    <UserContext.Provider value={{ user, loading, login, logout }}>
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
