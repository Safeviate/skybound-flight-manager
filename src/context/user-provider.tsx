
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, Alert, Company } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, orderBy, arrayUnion } from 'firebase/firestore';

interface UserContextType {
  user: User | null;
  company: Company | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (updatedData: Partial<User>) => Promise<boolean>;
  getUnacknowledgedAlerts: () => Alert[];
  acknowledgeAlerts: (alertIds: string[]) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [allAlerts, setAllAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchUserDataByUid = async (firebaseUser: any): Promise<[User | null, Company | null]> => {
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

  const fetchUserByEmail = async (email: string): Promise<[User | null, Company | null]> => {
      const companiesSnapshot = await getDocs(collection(db, 'companies'));

      for (const companyDoc of companiesSnapshot.docs) {
          const usersRef = collection(db, `companies/${companyDoc.id}/users`);
          const q = query(usersRef, where('email', '==', email));
          const userSnapshot = await getDocs(q);
          if (!userSnapshot.empty) {
              const userData = userSnapshot.docs[0].data() as User;
              const companyData = companyDoc.data() as Company;
              return [userData, companyData];
          }
      }
      return [null, null];
  }


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        setLoading(true);
        if (firebaseUser) {
            const [userData, companyData] = await fetchUserDataByUid(firebaseUser);
            setUser(userData);
            setCompany(companyData);

            if(companyData && userData) {
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
    return allAlerts.filter(alert => !alert.readBy.includes(user.id || ''));
  }, [user, allAlerts]);

  const acknowledgeAlerts = async (alertIds: string[]): Promise<void> => {
      if (!user || !company) return;

      const promises = alertIds.map(alertId => {
          const alertRef = doc(db, `companies/${company.id}/alerts`, alertId);
          return updateDoc(alertRef, {
              readBy: arrayUnion(user.id)
          });
      });
      
      await Promise.all(promises);

      // Refresh local alerts state to reflect the change
      setAllAlerts(prevAlerts =>
        prevAlerts.map(alert =>
            alertIds.includes(alert.id)
                ? { ...alert, readBy: [...alert.readBy, user.id] }
                : alert
        )
      );
  };


  const login = async (email: string): Promise<boolean> => {
    // This is a simplified, passwordless login for development purposes.
    // It finds the user by email and sets them as the current user.
    setLoading(true);
    try {
        const [userData, companyData] = await fetchUserByEmail(email);
        if (userData && companyData) {
            setUser(userData);
            setCompany(companyData);
            
            // Fetch alerts for the logged-in user's company
            const alertsCol = collection(db, `companies/${companyData.id}/alerts`);
            const alertsQuery = query(alertsCol, orderBy('date', 'desc'));
            const alertsSnapshot = await getDocs(alertsQuery);
            const fetchedAlerts = alertsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Alert));
            setAllAlerts(fetchedAlerts);
            
            setLoading(false);
            return true;
        }
    } catch (error) {
        console.error("Passwordless login failed:", error);
    }
    setLoading(false);
    return false;
  };

  const logout = useCallback(async () => {
    // Keep signOut for sessions that might have been started via traditional auth
    if (auth.currentUser) {
      await signOut(auth);
    }
    setUser(null);
    setCompany(null);
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
