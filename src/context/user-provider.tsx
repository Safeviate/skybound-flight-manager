
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

// A hardcoded fallback company object to prevent startup crashes.
const fallbackCompany: Company = {
    id: 'skybound-aero',
    name: 'SkyBound Flight Manager',
    trademark: 'Your Trusted Partner in Aviation',
    enabledFeatures: ['Safety', 'Quality', 'Bookings', 'Aircraft', 'Students', 'Personnel', 'AdvancedAnalytics'],
    theme: {
        primary: '#4287f5',
        background: '#f0f0f0',
        accent: '#ffa500',
    }
};

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
      if (companySnap.exists()) {
        setCompany(companySnap.data() as Company);
      } else {
        // If the live listener fails to find the doc, use the fallback.
        console.warn("Company doc not found by listener, using fallback.");
        setCompany(fallbackCompany);
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
                const companyDocRef = doc(db, 'companies', companyId);
                const companyDocSnap = await getDoc(companyDocRef);

                if (!companyDocSnap.exists()) {
                    console.warn(`Company document with ID "${companyId}" does not exist. Using fallback.`);
                    setCompany(fallbackCompany);
                } else {
                    setCompany(companyDocSnap.data() as Company);
                }

                const userDocRef = doc(db, 'companies', companyId, 'users', userId);
                const userDocSnap = await getDoc(userDocRef);

                if (!userDocSnap.exists()) {
                    console.error(`User document for user ID "${userId}" not found in company "${companyId}".`);
                    logout();
                    return;
                }
                
                setupListeners(userId, companyId);

            } catch (error) {
                console.error("Error during initial data fetch:", error);
                // If there's any error, we still use the fallback company data to prevent a crash.
                setCompany(fallbackCompany);
                // We still need to check if the user exists though.
                const userDocRef = doc(db, 'companies', companyId, 'users', userId);
                const userDocSnap = await getDoc(userDocRef).catch(() => null);
                if (userDocSnap?.exists()) {
                    setupListeners(userId, companyId);
                } else {
                   logout();
                }
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
