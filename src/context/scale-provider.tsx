'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface ScaleContextType {
  scale: number;
  setScale: (scale: number) => void;
}

const ScaleContext = createContext<ScaleContextType | undefined>(undefined);

export function ScaleProvider({ children }: { children: React.ReactNode }) {
  const [scale, setScale] = useState<number>(1);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    try {
      const storedScale = localStorage.getItem('appScale');
      if (storedScale) {
        setScale(parseFloat(storedScale));
      }
    } catch (error) {
      console.error("Could not access localStorage for scale settings.");
    }
  }, []);

  useEffect(() => {
    if (isMounted) {
      try {
        localStorage.setItem('appScale', scale.toString());
        // Use a CSS variable to apply the scale globally
        document.documentElement.style.setProperty('--app-scale', scale.toString());
      } catch (error) {
        console.error("Could not access localStorage for scale settings.");
      }
    }
  }, [scale, isMounted]);

  const value = { scale, setScale };

  return (
    <ScaleContext.Provider value={value}>
      {children}
    </ScaleContext.Provider>
  );
}

export function useScale() {
  const context = useContext(ScaleContext);
  if (context === undefined) {
    throw new Error('useScale must be used within a ScaleProvider');
  }
  return context;
}
