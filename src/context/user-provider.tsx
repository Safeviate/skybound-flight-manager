
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User } from '@/lib/types';
import { userData } from '@/lib/mock-data';

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
        const currentUser = userData.find(u => u.id === storedUserId) || null;
        setUser(currentUser);
      }
    } catch (error) {
        console.error("Could not access localStorage. User session will not persist.");
    } finally {
        setLoading(false);
    }
  }, []);

  const login = useCallback((userId: string) => {
    const userToLogin = userData.find(u => u.id === userId) || null;
    setUser(userToLogin);
    try {
      if (userToLogin) {
        localStorage.setItem('currentUserId', userId);
      } else {
        localStorage.removeItem('currentUserId');
      }
    } catch (error) {
        console.error("Could not access localStorage to set user session.");
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    try {
        localStorage.removeItem('currentUserId');
    } catch (error) {
        console.error("Could not access localStorage to clear user session.");
    }
    // No router push here to keep context decoupled from routing
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
