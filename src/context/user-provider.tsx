
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, Alert, Company, QualityAudit, Permission } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc, onSnapshot, collection, query, where, arrayUnion, writeBatch } from 'firebase/firestore';

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
  
  const setupListeners = useCallback((companyId: string, userId: string) => {
    const userDocRef = doc(db, `companies/${companyId}/users`, userId);
    const companyDocRef = doc(db, 'companies', companyId);
    
    // Alerts query: unread by the user, and either global or targeted to them
    const alertsQuery = query(
        collection(db, `companies/${companyId}/alerts`),
        where('readBy', 'not-in', [userId || ' ']) // Use a placeholder if userId is transiently falsy
    );

    const unsubUser = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        setUser(doc.data() as User);
      } else {
        console.error("User document not found for listener");
      }
      setLoading(false);
    }, (error) => {
        console.error("User listener error:", error);
        setLoading(false);
    });

    const unsubCompany = onSnapshot(companyDocRef, (doc) => {
      if (doc.exists()) {
        setCompany(doc.data() as Company);
      } else {
        console.error("Company document not found for listener");
      }
    }, (error) => console.error("Company listener error:", error));
    
    const unsubAlerts = onSnapshot(alertsQuery, (snapshot) => {
        const alertsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Alert));
        const filteredAlerts = alertsData.filter(alert => !alert.targetUserId || alert.targetUserId === userId);
        setAllAlerts(filteredAlerts);
    }, (error) => console.error("Alerts listener error:", error));

    // TODO: Fetch all companies for a super admin
    getDoc(companyDocRef).then(doc => {
      if (doc.exists()) {
        setUserCompanies([doc.data() as Company]);
      }
    });

    return () => {
        unsubUser();
        unsubCompany();
        unsubAlerts();
    };
  }, []);
  

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
            // There's a delay between user creation and profile update (photoURL).
            // We'll give it a moment to become available.
            const checkProfile = async (attempts: number): Promise<void> => {
                await firebaseUser.reload(); // Refresh user data
                const companyId = firebaseUser.photoURL;
                const userId = firebaseUser.uid;

                if (companyId && userId) {
                    setupListeners(companyId, userId);
                    setCookie('skybound_last_company_id', companyId, 7);
                    setCookie('skybound_last_user_id', userId, 7);
                    return; // Success
                }

                if (attempts > 0) {
                    // If no companyId, wait and try again.
                    setTimeout(() => checkProfile(attempts - 1), 500);
                } else {
                    console.error("Auth user missing companyId or userId after multiple attempts.");
                    setLoading(false);
                    // Consider logging out the user here if this state is invalid
                    logout();
                }
            };

            checkProfile(5); // Try up to 5 times over 2.5 seconds
        } else {
            // If no user is found via auth state, check cookies for a session
            const companyId = getCookie('skybound_last_company_id');
            const userId = getCookie('skybound_last_user_id');
            if (companyId && userId) {
                setupListeners(companyId, userId);
            } else {
                setUser(null);
                setCompany(null);
                setLoading(false);
            }
        }
    });

    return () => unsubscribe();
  }, [setupListeners]); // setupListeners is now stable


  const login = async (email: string, password?: string): Promise<boolean> => {
    setLoading(true);
    try {
        if (!password) throw new Error("Password is required.");
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;
        const companyId = firebaseUser.photoURL;

        if (!companyId) {
            throw new Error("Company ID not found on user profile.");
        }
        
        // Listeners are now set up by onAuthStateChanged, so we just need to set cookies.
        setCookie('skybound_last_company_id', companyId, 7);
        setCookie('skybound_last_user_id', firebaseUser.uid, 7);

        return true;
    } catch (error) {
        console.error("Login failed:", error);
        setLoading(false);
        return false;
    }
  };

  const logout = useCallback(async () => {
    await signOut(auth);
    setUser(null);
    setCompany(null);
    setUserCompanies([]);
    eraseCookie('skybound_last_company_id');
    eraseCookie('skybound_last_user_id');
    router.push('/login');
  }, [router]);
  
  const updateUser = async (updatedData: Partial<User>): Promise<boolean> => {
    if (!user || !company) return false;
    try {
        const userRef = doc(db, `companies/${company.id}/users`, user.id);
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
    <UserContext.Provider value={{ user, company, setCompany, userCompanies, loading, login, logout, updateUser, updateCompany, getUnacknowledgedAlerts, acknowledgeAlerts }}>
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
