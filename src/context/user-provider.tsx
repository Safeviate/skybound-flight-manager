
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, Alert, Company, QualityAudit, Permission } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, updateDoc, onSnapshot, collection, query, where, arrayUnion, writeBatch, getDocs } from 'firebase/firestore';
import { getFirebaseApp } from '@/lib/firebase';

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
  
  const setupListeners = useCallback((userId: string, companyId?: string | null) => {
    const db = getFirestore(getFirebaseApp());
    const userDocRef = doc(db, `users`, userId);

    const unsubUser = onSnapshot(userDocRef, async (userSnap) => {
      if (userSnap.exists()) {
        const userData = userSnap.data() as User;
        setUser(userData);
        
        const currentCompanyId = companyId || userData.companyId;

        if (currentCompanyId) {
             const companyDocRef = doc(db, 'companies', currentCompanyId);
             const unsubCompany = onSnapshot(companyDocRef, (companySnap) => {
                if (companySnap.exists()) {
                    setCompany(companySnap.data() as Company);
                }
             });
            
             const alertsQuery = query(
                collection(db, `companies/${currentCompanyId}/alerts`),
                where('readBy', 'not-in', [userId || ' '])
            );
            const unsubAlerts = onSnapshot(alertsQuery, (snapshot) => {
                const alertsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Alert));
                const filteredAlerts = alertsData.filter(alert => !alert.targetUserId || alert.targetUserId === userId);
                setAllAlerts(filteredAlerts);
            });

            // Return a function to unsubscribe from company-specific listeners
            return () => {
                unsubCompany();
                unsubAlerts();
            };
        }
        
        if (userData.role === 'Super User') {
          const companiesQuery = query(collection(db, 'companies'));
          const companiesSnapshot = await getDocs(companiesQuery);
          setUserCompanies(companiesSnapshot.docs.map(d => d.data() as Company));
        }

      } else {
        console.error("User document not found for listener");
      }
      setLoading(false);
    }, (error) => {
        console.error("User listener error:", error);
        setLoading(false);
    });

    return () => {
        unsubUser();
    };
  }, []);
  

  useEffect(() => {
    const auth = getAuth(getFirebaseApp());
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
            const userId = firebaseUser.uid;
            
            // For a superuser, companyId is not needed immediately.
            // For others, we get it from their user document.
            // The setupListeners function will handle fetching company details.
            setupListeners(userId, getCookie('skybound_last_company_id'));
            setCookie('skybound_last_user_id', userId, 7);
        } else {
            // If no user is found via auth state, check cookies for a session
            const userId = getCookie('skybound_last_user_id');
            const companyId = getCookie('skybound_last_company_id');
            if (userId) {
                setupListeners(userId, companyId);
            } else {
                setUser(null);
                setCompany(null);
                setLoading(false);
            }
        }
    });

    return () => unsubscribe();
  }, [setupListeners]); 


  const login = async (email: string, password?: string): Promise<boolean> => {
    setLoading(true);
    const auth = getAuth(getFirebaseApp());
    const db = getFirestore(getFirebaseApp());
    try {
        if (!password) throw new Error("Password is required.");
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;
        const userId = firebaseUser.uid;

        // Fetch user document to get companyId and role
        const userDocRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userDocRef);

        if (!userSnap.exists()) {
             throw new Error("User data not found in Firestore.");
        }
        const userData = userSnap.data() as User;
        
        // Listeners are now set up by onAuthStateChanged.
        // We just need to set cookies for session persistence.
        setCookie('skybound_last_user_id', userId, 7);
        if (userData.companyId) {
            setCookie('skybound_last_company_id', userData.companyId, 7);
        }

        return true;
    } catch (error) {
        console.error("Login failed:", error);
        setLoading(false);
        return false;
    }
  };

  const logout = useCallback(async () => {
    const auth = getAuth(getFirebaseApp());
    await signOut(auth);
    setUser(null);
    setCompany(null);
    setUserCompanies([]);
    eraseCookie('skybound_last_company_id');
    eraseCookie('skybound_last_user_id');
    router.push('/login');
  }, [router]);
  
  const updateUser = async (updatedData: Partial<User>): Promise<boolean> => {
    if (!user) return false;
    const db = getFirestore(getFirebaseApp());
    try {
        const userRef = doc(db, `users`, user.id);
        await updateDoc(userRef, updatedData);
        return true;
    } catch (error) {
        console.error("Failed to update user:", error);
        return false;
    }
  };

  const updateCompany = async (updatedData: Partial<Company>): Promise<boolean> => {
    if (!company) return false;
    const db = getFirestore(getFirebaseApp());
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
    setCompany(companyToSet);
    if(companyToSet) {
        setCookie('skybound_last_company_id', companyToSet.id, 7);
    } else {
        eraseCookie('skybound_last_company_id');
    }
  }

  const getUnacknowledgedAlerts = useCallback((): Alert[] => {
    return allAlerts;
  }, [allAlerts]);

  const acknowledgeAlerts = async (alertIds: string[]): Promise<void> => {
    if (!user || !company) return;
    const db = getFirestore(getFirebaseApp());
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
