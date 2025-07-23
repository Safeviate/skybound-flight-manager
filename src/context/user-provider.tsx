
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, Alert, Company } from '@/lib/types';
import { allAlerts } from '@/lib/data-provider';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

interface UserContextType {
  user: User | null;
  company: Company | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (updatedUser: User) => void;
  getUnacknowledgedAlerts: (user: User) => Alert[];
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const getUnacknowledgedAlerts = useCallback((currentUser: User): Alert[] => {
    if (!currentUser) return [];
    try {
        const acknowledgedIds = JSON.parse(sessionStorage.getItem('acknowledgedAlertIds') || '[]');
        return allAlerts.filter(alert => !acknowledgedIds.includes(alert.id));
    } catch (e) {
        return allAlerts;
    }
  }, []);

  const fetchUserData = async (firebaseUser: any): Promise<[User | null, Company | null]> => {
    if (!firebaseUser) return [null, null];

    const companiesRef = collection(db, "companies");
    const q = query(companiesRef);
    const querySnapshot = await getDocs(q);

    for (const companyDoc of querySnapshot.docs) {
        const userDocRef = doc(db, `companies/${companyDoc.id}/users`, firebaseUser.uid);
        const userSnap = await getDoc(userDocRef);

        if (userSnap.exists()) {
            const userData = userSnap.data() as User;
            const companyData = companyDoc.data() as Company;
            return [userData, companyData];
        }
    }
    return [null, null];
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
            const [userData, companyData] = await fetchUserData(firebaseUser);
            setUser(userData);
            setCompany(companyData);
        } else {
            setUser(null);
            setCompany(null);
        }
        setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password?: string): Promise<boolean> => {
    if (!password) return false;
    try {
        await signInWithEmailAndPassword(auth, email, password);
        return true;
    } catch (error) {
        console.error("Login failed:", error);
        return false;
    }
  };

  const logout = useCallback(async () => {
    await signOut(auth);
    setUser(null);
    setCompany(null);
    router.push('/corporate');
  }, [router]);
  
  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser);
  }, []);

  return (
    <UserContext.Provider value={{ user, company, loading, login, logout, updateUser, getUnacknowledgedAlerts }}>
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
