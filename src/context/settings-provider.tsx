
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface Settings {
  enforcePostFlightCheck: boolean;
  enforcePreFlightCheck: boolean;
}

interface SettingsContextType {
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const defaultSettings: Settings = {
    enforcePostFlightCheck: true,
    enforcePreFlightCheck: true,
};

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const storedSettings = localStorage.getItem('operationalSettings');
      return storedSettings ? JSON.parse(storedSettings) : defaultSettings;
    } catch (error) {
      return defaultSettings;
    }
  });

  useEffect(() => {
    try {
        localStorage.setItem('operationalSettings', JSON.stringify(settings));
    } catch (error) {
        console.error("Could not access localStorage. Settings will not be persisted.");
    }
  }, [settings]);

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
