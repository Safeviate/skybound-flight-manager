
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, Alert, Company, QualityAudit, Permission } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from 'firebase/auth';
import { getFirestore, doc, getDoc, updateDoc, onSnapshot, collection, query, where, arrayUnion, writeBatch, getDocs, setDoc, and } from 'firebase/firestore';
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
    name: 'Safeviate',
    trademark: 'Your Trusted Partner in Aviation',
    enabledFeatures: ['Safety', 'Quality', 'Bookings', 'Aircraft', 'Students', 'Personnel', 'AdvancedAnalytics'],
    theme: {
        primary: '#2563eb', // Default Blue
        background: '#f4f4f5', // Light Gray
        accent: '#f59e0b', // Amber
    }
};

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(fallbackCompany);
  const [userCompanies, setUserCompanies] = useState<Company[]>([]);
  const [allAlerts, setAllAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const logout = useCallback(async () => {
    await signOut(auth);
    setUser(null);
    setCompany(null);
    setUserCompanies([]);
    setAllAlerts([]);
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
    }, (error) => {
        console.error("User listener error:", error);
        logout();
    });

    const unsubCompany = onSnapshot(companyDocRef, (companySnap) => {
      if (companySnap.exists() && Object.keys(companySnap.data()).length > 0) {
        setCompany(companySnap.data() as Company);
      } else {
        // If the company doc has no fields, it won't "exist" in a meaningful way.
        // We use the fallback but keep the listener active for future updates.
        setCompany(fallbackCompany);
      }
    });

    const alertsQuery = query(
        collection(db, `companies/${companyId}/alerts`)
    );
    const unsubAlerts = onSnapshot(alertsQuery, (snapshot) => {
        const alertsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Alert));
        const filteredAlerts = alertsData.filter(alert => 
            !alert.readBy.includes(userId) && 
            (!alert.targetUserId || alert.targetUserId === userId)
        );
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
            // Hardcode companyId to 'skybound-aero'
            const companyId = 'skybound-aero';

            try {
                // The company document doesn't need to exist with fields for the app to function,
                // but the user document does.
                const userDocRef = doc(db, 'companies', companyId, 'users', userId);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    setupListeners(userId, companyId);
                } else {
                    console.error(`User document for user ID "${userId}" not found in company "${companyId}". Logging out.`);
                    logout();
                }

            } catch (error) {
                console.error("Error during initial data fetch:", error);
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
        if (!password) return false;
        // This is a normal password-based login
        await signInWithEmailAndPassword(auth, email, password);
        // onAuthStateChanged will handle the rest
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
        await setDoc(companyRef, updatedData, { merge: true });
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
    if (!user) return [];

    return allAlerts.filter(alert =>
        !alert.readBy.includes(user.id) && 
        (!alert.targetUserId || alert.targetUserId === user.id)
    );
  }, [allAlerts, user]);

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
