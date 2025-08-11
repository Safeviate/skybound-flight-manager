
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, Alert, Company, QualityAudit, Permission } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from 'firebase/auth';
import { getFirestore, doc, getDoc, updateDoc, onSnapshot, collection, query, where, arrayUnion, writeBatch, getDocs, setDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';

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

function setCookie(name: string, value: string, days: number) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days*24*60*60*1000));
        expires = "; expires=" + date.toUTCString();
    }
    if (typeof document !== 'undefined') {
        document.cookie = name + "=" + (value || "")  + expires + "; path=/";
    }
}

function getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for(let i=0;i < ca.length;i++) {
        let c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}

function eraseCookie(name: string) {   
    if (typeof document !== 'undefined') {
        document.cookie = name +'=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    }
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [userCompanies, setUserCompanies] = useState<Company[]>([]);
  const [allAlerts, setAllAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const logout = useCallback(async () => {
    await signOut(auth);
    setUser(null);
    setCompany(null);
    setUserCompanies([]);
    eraseCookie('skybound_last_user_id');
    router.push('/login');
  }, [router]);
  
  const setupListeners = useCallback((userId: string, companyId: string) => {
    const userDocRef = doc(db, 'companies', companyId, 'users', userId);
    const companyDocRef = doc(db, 'companies', companyId);

    const unsubUser = onSnapshot(userDocRef, (userSnap) => {
      if (!userSnap.exists()) {
        console.error("User document not found for listener at", userDocRef.path);
        logout();
      } else {
        setUser(userSnap.data() as User);
      }
    }, (error) => console.error("User listener error:", error));

    const unsubCompany = onSnapshot(companyDocRef, (companySnap) => {
      if (!companySnap.exists()) {
        console.error("Company document not found for listener at", companyDocRef.path);
        logout();
      } else {
        setCompany(companySnap.data() as Company);
      }
    });

    const alertsQuery = query(
        collection(db, `companies/${companyId}/alerts`),
        where('readBy', 'not-in', [userId || ' '])
    );
    const unsubAlerts = onSnapshot(alertsQuery, (snapshot) => {
        const alertsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Alert));
        const filteredAlerts = alertsData.filter(alert => !alert.targetUserId || alert.targetUserId === userId);
        setAllAlerts(filteredAlerts);
    });

    return () => {
        unsubUser();
        unsubCompany();
        unsubAlerts();
    };
  }, [logout]);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
            const userId = firebaseUser.uid;
            const companyId = 'skybound-aero';

            try {
                // First, check if the company document exists before setting up listeners
                const companyDocRef = doc(db, 'companies', companyId);
                const companyDocSnap = await getDoc(companyDocRef);

                if (!companyDocSnap.exists()) {
                    console.error(`Company document with ID "${companyId}" does not exist.`);
                    logout();
                    return;
                }

                // Next, check if the user document exists within that company
                const userDocRef = doc(db, 'companies', companyId, 'users', userId);
                const userDocSnap = await getDoc(userDocRef);

                if (!userDocSnap.exists()) {
                    console.error(`User document for user ID "${userId}" not found in company "${companyId}".`);
                    logout();
                    return;
                }
                
                // If both exist, proceed to set up real-time listeners
                setupListeners(userId, companyId);
                setCookie('skybound_last_user_id', userId, 7);

            } catch (error) {
                console.error("Error during initial data fetch on auth state change:", error);
                logout();
            }

        } else {
            setUser(null);
            setCompany(null);
        }
        setLoading(false);
    });

    return () => unsubscribe();
  }, [logout, setupListeners]);


  const login = async (email: string, password?: string): Promise<boolean> => {
    setLoading(true);
    try {
        if (!password) throw new Error("Password is required.");
        await signInWithEmailAndPassword(auth, email, password);
        // The onAuthStateChanged listener will handle everything else once this completes.
        return true;
    } catch (error) {
        console.error("Login failed:", error);
        setLoading(false);
        return false;
    }
  };
  
  const updateUser = async (updatedData: Partial<User>): Promise<boolean> => {
    if (!user || !company) return false;
    try {
        const userRef = doc(db, 'companies', company.id, 'users', user.id);
        await updateDoc(userRef, updatedData);
        return true;
    } catch (error) {
        console.error("Failed to update user:", error);
        return false;
    }
  };

  const updateCompany = async (updatedData: Partial<Company>): Promise<boolean> => {
    if (!company) return false;
    try {
        const companyRef = doc(db, 'companies', company.id);
        await updateDoc(companyRef, updatedData);
        return true;
    } catch (error) {
        console.error("Failed to update company:", error);
        return false;
    }
  };
  
  const setActiveCompany = (companyToSet: Company | null) => {
    // This function is kept for potential future use but is no longer
    // relevant in a single-company context.
    if(companyToSet?.id !== company?.id) {
        setCompany(companyToSet);
    }
  }

  const getUnacknowledgedAlerts = useCallback((): Alert[] => {
    return allAlerts;
  }, [allAlerts]);

  const acknowledgeAlerts = async (alertIds: string[]): Promise<void> => {
    if (!user || !company) return;
    try {
        const batch = writeBatch(db);
        alertIds.forEach(alertId => {
            const alertRef = doc(db, `companies/${company.id}/alerts`, alertId);
            batch.update(alertRef, {
                readBy: arrayUnion(user.id)
            });
        });
        await batch.commit();
        setAllAlerts(prev => prev.filter(a => !alertIds.includes(a.id)));
    } catch (error) {
        console.error("Failed to acknowledge alerts:", error);
    }
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
