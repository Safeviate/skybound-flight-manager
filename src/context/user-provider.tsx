
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

const LAST_USER_ID_KEY = 'skybound_last_user_id';
const LAST_COMPANY_ID_KEY = 'skybound_last_company_id';

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [allAlerts, setAllAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchUserDataById = async (companyId: string, userId: string): Promise<[User | null, Company | null]> => {
     try {
        const companyDocRef = doc(db, 'companies', companyId);
        const userDocRef = doc(db, `companies/${companyId}/users`, userId);

        const [companySnap, userSnap] = await Promise.all([
            getDoc(companyDocRef),
            getDoc(userDocRef)
        ]);

        if (userSnap.exists() && companySnap.exists()) {
            return [userSnap.data() as User, companySnap.data() as Company];
        }
     } catch (error) {
        console.error("Error fetching user data by ID:", error);
     }
     return [null, null];
  }


  const fetchUserDataByEmail = async (email: string): Promise<[User | null, Company | null, string | null]> => {
    const companiesRef = collection(db, "companies");
    const q = query(companiesRef);
    const querySnapshot = await getDocs(q);

    for (const companyDoc of querySnapshot.docs) {
        const usersRef = collection(db, `companies/${companyDoc.id}/users`);
        const userQuery = query(usersRef, where("email", "==", email));
        const userSnapshot = await getDocs(userQuery);
        
        if (!userSnapshot.empty) {
            const userData = userSnapshot.docs[0].data() as User;
            const companyData = companyDoc.data() as Company;
            return [userData, companyData, userSnapshot.docs[0].id];
        }
    }
    return [null, null, null];
  };

  const fetchCompanyAlerts = async (companyId: string) => {
    try {
        const alertsCol = collection(db, `companies/${companyId}/alerts`);
        const alertsQuery = query(alertsCol, orderBy('date', 'desc'));
        const alertsSnapshot = await getDocs(alertsQuery);
        return alertsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Alert));
    } catch (error) {
        console.error("Error fetching alerts:", error);
        return [];
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
            // Admin user with a persistent session
            const [userData, companyData] = await fetchUserDataById(firebaseUser.photoURL || '', firebaseUser.uid);
            setUser(userData);
            setCompany(companyData);
            if (companyData) {
                setAllAlerts(await fetchCompanyAlerts(companyData.id));
                localStorage.setItem(LAST_USER_ID_KEY, firebaseUser.uid);
                localStorage.setItem(LAST_COMPANY_ID_KEY, companyData.id);
            }
        } else {
             // Non-admin user, or user logged out
            const lastUserId = localStorage.getItem(LAST_USER_ID_KEY);
            const lastCompanyId = localStorage.getItem(LAST_COMPANY_ID_KEY);

            if (lastUserId && lastCompanyId) {
                const [userData, companyData] = await fetchUserDataById(lastCompanyId, lastUserId);
                setUser(userData);
                setCompany(companyData);
                if (companyData) {
                    setAllAlerts(await fetchCompanyAlerts(companyData.id));
                }
            } else {
                setUser(null);
                setCompany(null);
                setAllAlerts([]);
            }
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

      setAllAlerts(prevAlerts =>
        prevAlerts.map(alert =>
            alertIds.includes(alert.id)
                ? { ...alert, readBy: [...alert.readBy, user.id] }
                : alert
        )
      );
  };


  const login = async (email: string): Promise<boolean> => {
    setLoading(true);
    try {
        const [userData, companyData, userId] = await fetchUserDataByEmail(email);

        if (userData?.role === 'Admin') {
            await signInWithEmailAndPassword(auth, email, "password");
            // onAuthStateChanged will handle setting state
        } else if (userData && companyData && userId) {
            // For non-admins, we just set the local state and localStorage
            setUser(userData);
            setCompany(companyData);
            setAllAlerts(await fetchCompanyAlerts(companyData.id));
            localStorage.setItem(LAST_USER_ID_KEY, userId);
            localStorage.setItem(LAST_COMPANY_ID_KEY, companyData.id);
        } else {
            return false;
        }
        return true;
    } catch (error) {
        console.error("Authentication or login process failed:", error);
        return false;
    } finally {
        setLoading(false);
    }
  };

  const logout = useCallback(async () => {
    if (auth.currentUser) {
        await signOut(auth);
    }
    localStorage.removeItem(LAST_USER_ID_KEY);
    localStorage.removeItem(LAST_COMPANY_ID_KEY);
    setUser(null);
    setCompany(null);
    setAllAlerts([]);
    router.push('/login');
  }, [router]);
  
  const updateUser = useCallback(async (updatedData: Partial<User>): Promise<boolean> => {
    if (!user || !company) {
        console.error("No user or company context available for update.");
        return false;
    }
    try {
        const userDocRef = doc(db, `companies/${company.id}/users`, user.id);
        await updateDoc(userDocRef, updatedData);
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
