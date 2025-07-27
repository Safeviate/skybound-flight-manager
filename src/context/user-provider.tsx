

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, Alert, Company, QualityAudit } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, orderBy, arrayUnion, onSnapshot } from 'firebase/firestore';

interface UserContextType {
  user: User | null;
  company: Company | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (updatedData: Partial<User>) => Promise<boolean>;
  getUnacknowledgedAlerts: (audits: QualityAudit[]) => Alert[];
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
    const companiesColRef = collection(db, 'companies');
    const companiesSnapshot = await getDocs(companiesColRef);

    for (const companyDoc of companiesSnapshot.docs) {
      const usersColRef = collection(db, 'companies', companyDoc.id, 'users');
      const userQuery = query(usersColRef, where('email', '==', email));
      const userSnapshot = await getDocs(userQuery);

      if (!userSnapshot.empty) {
        const userData = userSnapshot.docs[0].data() as User;
        const companyData = companyDoc.data() as Company;
        return [userData, companyData, userSnapshot.docs[0].id];
      }
    }
    return [null, null, null];
  };
  
  useEffect(() => {
    let alertsUnsubscribe: () => void = () => {};

    if (company) {
        const alertsCol = collection(db, `companies/${company.id}/alerts`);
        const alertsQuery = query(alertsCol, orderBy('date', 'desc'));
        
        alertsUnsubscribe = onSnapshot(alertsQuery, (snapshot) => {
            const updatedAlerts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Alert));
            setAllAlerts(updatedAlerts);
        }, (error) => {
            console.error("Error listening to alerts collection:", error);
        });
    }

    return () => {
        alertsUnsubscribe(); // Cleanup the listener when company changes or component unmounts
    };
  }, [company]);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
            // The company ID is stored in the photoURL field during the registration process.
            // This is a workaround to associate the auth user with their company.
            const companyId = firebaseUser.photoURL;
            if (companyId) {
                const [userData, companyData] = await fetchUserDataById(companyId, firebaseUser.uid);
                setUser(userData);
                setCompany(companyData);
                if (companyData) {
                    localStorage.setItem(LAST_USER_ID_KEY, firebaseUser.uid);
                    localStorage.setItem(LAST_COMPANY_ID_KEY, companyData.id);
                }
            } else {
                 console.error("Could not determine company for authenticated user.");
                 setUser(null);
                 setCompany(null);
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

  const getUnacknowledgedAlerts = useCallback((audits: QualityAudit[]): Alert[] => {
    if (!user || !user.id) return [];
    
    return allAlerts.filter(alert => {
        const isUnread = !alert.readBy.includes(user.id!);
        const isTargetedToUser = !alert.targetUserId || alert.targetUserId === user.id;
        
        return isUnread && isTargetedToUser;
    });
  }, [user, allAlerts]);

  const acknowledgeAlerts = async (alertIds: string[]): Promise<void> => {
      if (!user || !company || !user.id) return;

      const promises = alertIds.map(alertId => {
          const alertRef = doc(db, `companies/${company.id}/alerts`, alertId);
          return updateDoc(alertRef, {
              readBy: arrayUnion(user.id)
          });
      });
      
      await Promise.all(promises);
  };


  const login = async (email: string, password?: string): Promise<boolean> => {
    setLoading(true);
    try {
        if (password) {
            // This is a real login attempt with credentials
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            // After successful sign-in, onAuthStateChanged will trigger and fetch user data.
            return true;
        } else {
            // This is for the demo environment for non-admin users without real auth
            const [userData, companyData] = await fetchUserDataByEmail(email);
            if (userData && companyData) {
                setUser(userData);
                setCompany(companyData);
                localStorage.setItem(LAST_USER_ID_KEY, userData.id);
                localStorage.setItem(LAST_COMPANY_ID_KEY, companyData.id);
                return true;
            }
        }
        return false;
    } catch (error) {
        console.error("Authentication or login process failed:", error);
        // Clear any potentially partial state on failure
        setUser(null);
        setCompany(null);
        return false;
    } finally {
        setLoading(false);
    }
  };


  const logout = useCallback(async () => {
    setLoading(true);
    try {
      if (auth.currentUser) {
          await signOut(auth);
      }
    } catch (error) {
      console.error("Error signing out from Firebase:", error);
    } finally {
      localStorage.removeItem(LAST_USER_ID_KEY);
      localStorage.removeItem(LAST_COMPANY_ID_KEY);
      setUser(null);
      setCompany(null);
      setAllAlerts([]);
      setLoading(false);
      router.push('/login');
    }
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
