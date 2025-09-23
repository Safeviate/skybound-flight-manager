

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, Alert, Company, QualityAudit, Permission, ThemeColors, UserDocument, AlertAcknowledgement } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, setPersistence, browserSessionPersistence } from 'firebase/auth';
import { getFirestore, getDoc, updateDoc, onSnapshot, collection, query, where, arrayUnion, writeBatch, getDocs, setDoc, doc, collectionGroup } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { differenceInDays, parseISO, startOfDay } from 'date-fns';

interface UserContextType {
  user: User | null;
  company: Company | null;
  setCompany: (company: Company | null) => void;
  userCompanies: Company[];
  setUserCompanies: React.Dispatch<React.SetStateAction<Company[]>>;
  loading: boolean;
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUser: (updatedData: Partial<User>) => Promise<boolean>;
  updateCompany: (companyId: string, updatedData: Partial<Company>) => Promise<boolean>;
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
        primary: '#0d6efd',
        background: '#f8f9fa',
        card: '#ffffff',
        accent: '#ffc107',
        foreground: '#212529',
        cardForeground: '#212529',
        headerForeground: '#212529',
        sidebarBackground: '#0c0a09',
        sidebarForeground: '#f8f9fa',
        sidebarAccent: '#1f2937',
        font: 'var(--font-inter)',
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

        if (theme?.font) {
            document.body.style.fontFamily = theme.font;
        } else {
            document.body.style.fontFamily = 'var(--font-inter)'; // fallback
        }

        if (!theme) {
            styleElement.innerHTML = '';
            return;
        }
        
        const primary = theme.primary ? hexToHSL(theme.primary)?.hslString : null;
        const background = theme.background ? hexToHSL(theme.background)?.hslString : null;
        const accent = theme.accent ? hexToHSL(theme.accent)?.hslString : null;
        const foreground = theme.foreground ? hexToHSL(theme.foreground)?.hslString : null;
        const card = theme.card ? hexToHSL(theme.card)?.hslString : null;
        const cardForeground = theme.cardForeground ? hexToHSL(theme.cardForeground)?.hslString : null;
        const headerForeground = theme.headerForeground ? hexToHSL(theme.headerForeground)?.hslString : null;
        
        const sidebarBackground = theme.sidebarBackground ? hexToHSL(theme.sidebarBackground)?.hslString : null;
        const sidebarForeground = theme.sidebarForeground ? hexToHSL(theme.sidebarForeground)?.hslString : null;
        const sidebarAccent = theme.sidebarAccent ? hexToHSL(theme.sidebarAccent)?.hslString : null;

        const css = `
        :root {
          ${primary ? `--primary: ${primary};` : ''}
          ${background ? `--background: ${background};` : ''}
          ${accent ? `--accent: ${accent};` : ''}
          ${foreground ? `--foreground: ${foreground};` : ''}
          ${card ? `--card: ${card};` : ''}
          ${cardForeground ? `--card-foreground: ${cardForeground};` : ''}
          ${headerForeground ? `--header-foreground: ${headerForeground};` : ''}
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
    try {
        await signOut(auth);
        setUser(null);
        setCompany(null);
        setUserCompanies([]);
        setAllAlerts([]);
        router.push('/login');
    } catch (error) {
        console.error("Logout failed:", error);
    }
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
        
        // Check if an alert with this exact title already exists for this user in this company
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
        if (auth.currentUser?.uid === userData.id) {
            setUser(userData);
            checkExpiringDocuments(userData, companyId);
        }
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
            !alert.readBy.some(ack => ack.userId === userId) && 
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
            if (firebaseUser) {
                try {
                    // This logic is designed to find the user's document regardless of whether they are in 'users' or 'students'.
                    const findUserDoc = async () => {
                        const userRef = doc(db, 'users', firebaseUser.uid);
                        const userSnap = await getDoc(userRef);
                        if (userSnap.exists()) return { snap: userSnap, type: 'users' };

                        const studentRef = doc(db, 'students', firebaseUser.uid);
                        const studentSnap = await getDoc(studentRef);
                        if (studentSnap.exists()) return { snap: studentSnap, type: 'students' };
                        
                        // If not found at top level, check within companies (this is the main path)
                        const companiesSnapshot = await getDocs(collection(db, 'companies'));
                        for (const companyDoc of companiesSnapshot.docs) {
                            const companyId = companyDoc.id;
                            
                            const companyUserRef = doc(db, 'companies', companyId, 'users', firebaseUser.uid);
                            const companyUserSnap = await getDoc(companyUserRef);
                            if (companyUserSnap.exists()) return { snap: companyUserSnap, type: 'users', companyId };

                            const companyStudentRef = doc(db, 'companies', companyId, 'students', firebaseUser.uid);
                            const companyStudentSnap = await getDoc(companyStudentSnap);
                            if (companyStudentSnap.exists()) return { snap: companyStudentSnap, type: 'students', companyId };
                        }
                        return null;
                    }
                    
                    const userLocation = await findUserDoc();

                    if (userLocation && userLocation.companyId) {
                        const { snap, type, companyId } = userLocation;
                        const userDocRef = doc(db, 'companies', companyId, type, firebaseUser.uid);
                        setupListeners(userDocRef, companyId, firebaseUser.uid);

                        if (snap.data().permissions?.includes('Super User')) {
                            const companiesQuery = query(collection(db, 'companies'));
                            const companiesSnapshot = await getDocs(companiesQuery);
                            setUserCompanies(companiesSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()} as Company)));
                        }

                    } else {
                        console.error(`User document for UID ${firebaseUser.uid} not found in any company.`);
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
        await setPersistence(auth, browserSessionPersistence);
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

  const updateCompany = async (companyId: string, updatedData: Partial<Company>): Promise<boolean> => {
    try {
        const companyRef = doc(db, 'companies', companyId);
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

  const getUnacknowledgedAlerts = useCallback((types?: Alert['type'][]): Alert[] => {
    if (!user) return [];

    let filteredAlerts = allAlerts.filter(alert =>
        !alert.readBy.some(ack => ack.userId === user.id) && 
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
        const acknowledgement: AlertAcknowledgement = {
            userId: user.id,
            date: new Date().toISOString(),
        };
        alertIds.forEach(alertId => {
            const alertRef = doc(db, `companies/${company.id}/alerts`, alertId);
            batch.update(alertRef, {
                readBy: arrayUnion(acknowledgement)
            });
        });
        await batch.commit();
    } catch (error) {
        console.error("Failed to acknowledge alerts:", error);
    }
  };

  return (
    <UserContext.Provider value={{ user, company, setCompany: setActiveCompany, userCompanies, setUserCompanies, loading, login, logout, updateUser, updateCompany, getUnacknowledgedAlerts, acknowledgeAlerts }}>
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

    