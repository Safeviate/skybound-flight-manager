

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, Alert, Company, QualityAudit } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, orderBy, arrayUnion, onSnapshot, setDoc } from 'firebase/firestore';

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
  getUnacknowledgedAlerts: (audits: QualityAudit[]) => Alert[];
  acknowledgeAlerts: (alertIds: string[]) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const LAST_USER_ID_KEY = 'skybound_last_user_id';
const LAST_COMPANY_ID_KEY = 'skybound_last_company_id';

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [userCompanies, setUserCompanies] = useState<Company[]>([]);
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


  const fetchUserDataAndCompaniesByEmail = async (email: string): Promise<[User | null, Company[], string | null]> => {
    const companiesColRef = collection(db, 'companies');
    const companiesSnapshot = await getDocs(companiesColRef);

    let mainUser: User | null = null;
    let userId: string | null = null;
    const allCompanies: Company[] = [];
    const associatedCompanies: Company[] = [];

    for (const companyDoc of companiesSnapshot.docs) {
        const companyData = companyDoc.data() as Company;
        allCompanies.push(companyData);

        const usersColRef = collection(db, 'companies', companyDoc.id, 'users');
        const userQuery = query(usersColRef, where('email', '==', email));
        const userSnapshot = await getDocs(userQuery);

        if (!userSnapshot.empty) {
            associatedCompanies.push(companyData);
            // Assuming the first one found is the "primary" user for simplicity.
            if (!mainUser) {
                mainUser = userSnapshot.docs[0].data() as User;
                userId = userSnapshot.docs[0].id;
            }
        }
    }
    
    // For a super user, they have access to all companies.
    if (mainUser?.permissions.includes('Super User')) {
        return [mainUser, allCompanies, userId];
    }

    return [mainUser, associatedCompanies, userId];
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
            let userData: User | null = null;
            let companyData: Company | null = null;
            let allUserCompanies: Company[] = [];

            if (companyId && false) { // Temporarily disable direct lookup to favor multi-company fetch
                // [userData, companyData] = await fetchUserDataById(companyId, firebaseUser.uid);
            }

            // Fallback: If companyId lookup fails, try finding user by email across all companies.
            if (!userData && firebaseUser.email) {
                const [foundUser, foundCompanies] = await fetchUserDataAndCompaniesByEmail(firebaseUser.email);
                userData = foundUser;
                allUserCompanies = foundCompanies;
                
                // Set the initial active company
                const lastCompanyId = localStorage.getItem(LAST_COMPANY_ID_KEY);
                companyData = foundCompanies.find(c => c.id === lastCompanyId) || foundCompanies[0] || null;
            }
            
            if(userData && companyData) {
                setUser(userData);
                setCompany(companyData);
                setUserCompanies(allUserCompanies);
                localStorage.setItem(LAST_USER_ID_KEY, userData.id);
                localStorage.setItem(LAST_COMPANY_ID_KEY, companyData.id);
            } else {
                 console.error("Could not determine company for authenticated user.");
                 setUser(null);
                 setCompany(null);
                 setUserCompanies([]);
            }
        } else {
            setUser(null);
            setCompany(null);
            setAllAlerts([]);
            setUserCompanies([]);
        }
        setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const setActiveCompany = (newCompany: Company | null) => {
    if (newCompany) {
        setCompany(newCompany);
        localStorage.setItem(LAST_COMPANY_ID_KEY, newCompany.id);
    }
  }

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
            // This is a real login attempt with credentials for Admins or other auth users
            await signInWithEmailAndPassword(auth, email, password);
            // onAuthStateChanged will handle setting the user state, so we just return true
            return true;
        } else {
            // This is for the demo environment for non-admin users without real auth
            const [userData, companyDataList] = await fetchUserDataAndCompaniesByEmail(email);
            if (userData && companyDataList.length > 0) {
                setUser(userData);
                setCompany(companyDataList[0]);
                setUserCompanies(companyDataList);
                localStorage.setItem(LAST_USER_ID_KEY, userData.id);
                localStorage.setItem(LAST_COMPANY_ID_KEY, companyDataList[0].id);
                return true;
            }
        }
        return false;
    } catch (error) {
        console.error("Authentication or login process failed:", error);
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
      setUserCompanies([]);
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

  const updateCompany = useCallback(async (updatedData: Partial<Company>): Promise<boolean> => {
    if (!company) {
        console.error("No company context available for update.");
        return false;
    }
    try {
        const companyDocRef = doc(db, `companies`, company.id);
        await setDoc(companyDocRef, updatedData, { merge: true });
        setCompany(prevCompany => prevCompany ? { ...prevCompany, ...updatedData } : null);
        return true;
    } catch (error) {
        console.error("Error updating company profile in Firestore:", error);
        return false;
    }
  }, [company]);


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
