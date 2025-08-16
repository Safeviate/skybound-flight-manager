
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, Alert, Company, QualityAudit, Permission, ThemeColors, UserDocument } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from 'firebase/auth';
import { getFirestore, getDoc, updateDoc, onSnapshot, collection, query, where, arrayUnion, writeBatch, getDocs, setDoc, doc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { differenceInDays, parseISO, startOfDay } from 'date-fns';

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
  getUnacknowledgedAlerts: (types?: Alert['type'][]) => Alert[];
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
        sidebarBackground: '#0c0a09', // Dark Gray for sidebar
        sidebarAccent: '#1f2937' // Slightly lighter gray for highlight
    }
};

const hexToHSL = (hex: string): { h: number, s: number, l: number, hslString: string } | null => {
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

    return { h, s, l, hslString: `${h} ${s}% ${l}%` };
};


const defaultSettings = {
    expiryWarningOrangeDays: 30,
    expiryWarningYellowDays: 60,
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

        const primary = theme.primary ? hexToHSL(theme.primary)?.hslString : null;
        const background = theme.background ? hexToHSL(theme.background)?.hslString : null;
        const accent = theme.accent ? hexToHSL(theme.accent)?.hslString : null;
        
        const sidebarBackgroundResult = theme.sidebarBackground ? hexToHSL(theme.sidebarBackground) : null;
        const sidebarBackground = sidebarBackgroundResult?.hslString;

        // Determine foreground color based on background lightness
        const sidebarLightness = sidebarBackgroundResult?.l ?? 0; // Default to dark
        const sidebarForeground = sidebarLightness > 50 ? '222.2 84% 4.9%' : '210 40% 98%'; // Black or White

        const sidebarAccent = theme.sidebarAccent ? hexToHSL(theme.sidebarAccent)?.hslString : null;

        const css = `
        :root {
          ${primary ? `--primary: ${primary};` : ''}
          ${background ? `--background: ${background};` : ''}
          ${accent ? `--accent: ${accent};` : ''}
          ${sidebarBackground ? `--sidebar-background: ${sidebarBackground};` : ''}
          ${sidebarForeground ? `--sidebar-foreground: ${sidebarForeground};` : ''}
          ${sidebarAccent ? `--sidebar-accent: ${sidebarAccent};` : ''}
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

  const checkExpiringDocuments = useCallback(async (user: User, companyId: string) => {
    if (!user.documents || user.documents.length === 0) return;

    let settings = defaultSettings;
    try {
        const storedSettings = localStorage.getItem('operationalSettings');
        if (storedSettings) {
            const parsed = JSON.parse(storedSettings);
            settings = { ...defaultSettings, ...parsed };
        }
    } catch(e) {
        console.error("Could not read settings from local storage for expiry check.");
    }
    
    const today = startOfDay(new Date());
    const batch = writeBatch(db);
    const alertsCollection = collection(db, 'companies', companyId, 'alerts');
    
    for (const docItem of user.documents) {
        if (!docItem.expiryDate) continue;
        
        const expiryDate = startOfDay(parseISO(docItem.expiryDate));
        const daysUntil = differenceInDays(expiryDate, today);

        let alertLevel: 'orange' | 'yellow' | null = null;
        if (daysUntil <= settings.expiryWarningOrangeDays) {
            alertLevel = 'orange';
        } else if (daysUntil <= settings.expiryWarningYellowDays) {
            alertLevel = 'yellow';
        }
        
        const title = `Document Expiry: ${docItem.type}`;
        
        // Check if an alert with this exact title already exists for this user
        const existingAlertsQuery = query(
            alertsCollection, 
            where('targetUserId', '==', user.id), 
            where('title', '==', title)
        );
        const existingAlertsSnap = await getDocs(existingAlertsQuery);

        if (alertLevel && existingAlertsSnap.empty) {
            // Pass the date in the description to be parsed by the display component
            const description = `Your ${docItem.type} is expiring on ${docItem.expiryDate}. Please take action.`;

            const newAlertRef = doc(alertsCollection);
            batch.set(newAlertRef, {
                companyId: companyId,
                type: 'Task',
                title: title,
                description: description,
                author: 'System',
                date: new Date().toISOString(),
                readBy: [],
                targetUserId: user.id,
            });
        }
    }
    await batch.commit();

  }, []);
  
  const setupListeners = useCallback((userDocRef: any, companyId: string, userId: string) => {
    const companyDocRef = doc(db, 'companies', companyId);

    const unsubUser = onSnapshot(userDocRef, (userSnap) => {
      if (!userSnap.exists()) {
        console.error("User document not found for listener at", userDocRef.path);
        logout();
      } else {
        const userData = userSnap.data() as User;
        setUser(userData);
        checkExpiringDocuments(userData, companyId);
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
  }, [logout, checkExpiringDocuments]);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser && firebaseUser.email) {
            const companyId = 'skybound-aero';

            try {
                // Try fetching from 'users' collection first
                let userDocRef = doc(db, 'companies', companyId, 'users', firebaseUser.uid);
                let userSnap = await getDoc(userDocRef);

                // If not found in 'users', try 'students' collection
                if (!userSnap.exists()) {
                    userDocRef = doc(db, 'companies', companyId, 'students', firebaseUser.uid);
                    userSnap = await getDoc(userDocRef);
                }

                if (userSnap.exists()) {
                    setupListeners(userDocRef, companyId, firebaseUser.uid);
                } else {
                    console.error(`User document for email "${firebaseUser.email}" not found in company "${companyId}" in users or students. Logging out.`);
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
        const collectionName = user.role === 'Student' ? 'students' : 'users';
        const userRef = doc(db, 'companies', company.id, collectionName, user.id);
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

  const getUnacknowledgedAlerts = useCallback((types?: Alert['type'][]): Alert[] => {
    if (!user) return [];

    let filteredAlerts = allAlerts.filter(alert =>
        !alert.readBy.includes(user.id) && 
        (!alert.targetUserId || alert.targetUserId === user.id)
    );

    if (types && types.length > 0) {
        filteredAlerts = filteredAlerts.filter(alert => types.includes(alert.type));
    }
    
    return filteredAlerts;
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
