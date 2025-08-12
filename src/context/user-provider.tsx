
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, Alert, Company, QualityAudit, Permission, ThemeColors } from '@/lib/types';
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

const hexToHSL = (hex: string): string | null => {
    if (!hex) return null;
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
        r = parseInt(hex.substring(1, 3), 16);
        g = parseInt(hex.substring(3, 5), 16);
        b = parseInt(hex.substring(5, 7), 16);
    } else {
        return null;
    }

    r /= 255; g /= 255; b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    h = Math.round(h * 360);
    s = Math.round(s * 100);
    l = Math.round(l * 100);

    return `${h} ${s}% ${l}%`;
};


export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(fallbackCompany);
  const [userCompanies, setUserCompanies] = useState<Company[]>([]);
  const [allAlerts, setAllAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const applyTheme = (theme: Partial<ThemeColors> | undefined) => {
        if (typeof window === 'undefined') return;

        const styleId = 'dynamic-theme-style';
        let styleElement = document.getElementById(styleId);
        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = styleId;
            document.head.appendChild(styleElement);
        }

        if (!theme) {
            styleElement.innerHTML = '';
            return;
        }

        const primary = theme.primary ? hexToHSL(theme.primary) : null;
        const background = theme.background ? hexToHSL(theme.background) : null;
        const accent = theme.accent ? hexToHSL(theme.accent) : null;

        const css = `
        :root {
          ${primary ? `--primary: ${primary};` : ''}
          ${background ? `--background: ${background};` : ''}
          ${accent ? `--accent: ${accent};` : ''}
        }
      `;
      styleElement.innerHTML = css;
    };
    applyTheme(company?.theme);
  }, [company]);

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
        setCompany({ id: companySnap.id, ...companySnap.data() } as Company);
      } else {
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
            const companyId = 'skybound-aero';

            try {
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
