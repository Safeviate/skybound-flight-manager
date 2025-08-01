
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface Settings {
  enforcePostFlightCheck: boolean;
  enforcePreFlightCheck: boolean;
  enforcePostMaintenanceCheck: boolean;
  dutyLimitDaily: number;
  dutyLimitWeekly: number;
  dutyLimitMonthly: number;
  expiryWarningOrangeDays: number;
  expiryWarningYellowDays: number;
}

interface SettingsContextType {
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const defaultSettings: Settings = {
    enforcePostFlightCheck: true,
    enforcePreFlightCheck: true,
    enforcePostMaintenanceCheck: true,
    dutyLimitDaily: 8,
    dutyLimitWeekly: 30,
    dutyLimitMonthly: 100,
    expiryWarningOrangeDays: 30,
    expiryWarningYellowDays: 60,
};

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    try {
      const storedSettings = localStorage.getItem('operationalSettings');
      if (storedSettings) {
        // Merge stored settings with defaults to ensure new settings are present
        const parsedSettings = JSON.parse(storedSettings);
        setSettings({ ...defaultSettings, ...parsedSettings });
      }
    } catch (error) {
        // If localStorage is not available or parsing fails, it will use defaultSettings
        console.error("Could not access localStorage. Default settings will be used.");
    }
  }, []);
  
  useEffect(() => {
    if (isMounted) {
        try {
            localStorage.setItem('operationalSettings', JSON.stringify(settings));
        } catch (error) {
            console.error("Could not access localStorage. Settings will not be persisted.");
        }
    }
  }, [settings, isMounted]);
  
  // To avoid hydration mismatch, we can return a loading state or the children with default values
  // until the component is mounted on the client. Here, we pass the default values initially.
  // The useEffect will then trigger a re-render with the correct client-side values.
  
  return (
    <SettingsContext.Provider value={{ settings, setSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
