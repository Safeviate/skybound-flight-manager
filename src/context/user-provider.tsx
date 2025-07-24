
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, Alert, Company } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, orderBy } from 'firebase/firestore';

interface UserContextType {
  user: User | null;
  company: Company | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<User | null>;
  logout: () => void;
  updateUser: (updatedData: Partial<User>) => Promise<boolean>;
  getUnacknowledgedAlerts: () => Alert[];
  acknowledgeAlerts: (alertIds: string[]) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [allAlerts, setAllAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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
        setLoading(true);
        if (firebaseUser) {
            const [userData, companyData] = await fetchUserData(firebaseUser);
            setUser(userData);
            setCompany(companyData);

            if(companyData) {
                const alertsCol = collection(db, `companies/${companyData.id}/alerts`);
                const alertsQuery = query(alertsCol, orderBy('date', 'desc'));
                const alertsSnapshot = await getDocs(alertsQuery);
                const fetchedAlerts = alertsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Alert));
                setAllAlerts(fetchedAlerts);
            }

        } else {
            setUser(null);
            setCompany(null);
            setAllAlerts([]);
        }
        setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getUnacknowledgedAlerts = useCallback((): Alert[] => {
    if (!user) return [];
    try {
        const acknowledgedIds = JSON.parse(sessionStorage.getItem('acknowledgedAlerts') || '[]');
        return allAlerts.filter(alert => !acknowledgedIds.includes(alert.id));
    } catch (e) {
        return allAlerts;
    }
  }, [user, allAlerts]);

  const acknowledgeAlerts = (alertIds: string[]) => {
      try {
        const acknowledged = JSON.parse(sessionStorage.getItem('acknowledgedAlerts') || '[]');
        const newAcknowledged = [...new Set([...acknowledged, ...alertIds])];
        sessionStorage.setItem('acknowledgedAlerts', JSON.stringify(newAcknowledged));
      } catch (e) {
          console.error("Could not acknowledge alerts in sessionStorage", e);
      }
  };


  const login = async (email: string, password?: string): Promise<User | null> => {
    if (password) {
        try {
            await signInWithEmailAndPassword(auth, email, password);
            // onAuthStateChanged will handle setting user state
            // we return a promise that resolves with the user after state is set
            return new Promise((resolve) => {
                const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
                    if (fbUser) {
                        const [userData] = await fetchUserData(fbUser);
                        resolve(userData);
                        unsubscribe();
                    }
                });
            });
        } catch (error) {
            console.error("Login failed:", error);
            return null;
        }
    } else {
        // This case is for finalizing the login after OTP
        if(auth.currentUser){
            const [userData] = await fetchUserData(auth.currentUser);
            return userData;
        }
        return null;
    }
  };

  const logout = useCallback(async () => {
    await signOut(auth);
    setUser(null);
    setCompany(null);
    try {
        sessionStorage.removeItem('acknowledgedAlerts');
    } catch (e) {
        console.error("Could not clear sessionStorage on logout", e);
    }
    router.push('/corporate');
  }, [router]);
  
  const updateUser = useCallback(async (updatedData: Partial<User>): Promise<boolean> => {
    if (!user || !company) {
        console.error("No user or company context available for update.");
        return false;
    }
    try {
        const userDocRef = doc(db, `companies/${company.id}/users`, user.id);
        await updateDoc(userDocRef, updatedData);
        // Update local state after successful DB write
        setUser(prevUser => prevUser ? { ...prevUser, ...updatedData } : null);
        return true;
    } catch (error) {
        console.error("Error updating user profile in Firestore:", error);
        return false;
    }
  }, [user, company]);

  return (
    <UserContext.Provider value={{ user, company, loading, login, logout, updateUser, getUnacknowledgedAlerts, acknowledgeAlerts }}>
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
