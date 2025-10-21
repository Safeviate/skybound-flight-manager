
'use client';

import React, { useEffect, useRef } from 'react';
import { useUser } from '@/context/user-provider';
import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import type { Aircraft } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface LiveLocationTrackerProps {
  aircraft: Aircraft;
  enabled: boolean;
}

export function LiveLocationTracker({ aircraft, enabled }: LiveLocationTrackerProps) {
  const { company } = useUser();
  const watchId = useRef<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!enabled || !company || !aircraft) {
      // If tracking is disabled, or we are missing context, clean up any existing watcher.
      if (watchId.current) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
        
        // Also remove the document from Firestore to take it off the map
        const trackingRef = doc(db, `companies/${company?.id}/live-tracking`, aircraft.id);
        deleteDoc(trackingRef).catch(e => console.error("Error removing tracking document:", e));
      }
      return;
    }

    // --- Start tracking ---
    if ("geolocation" in navigator && !watchId.current) {
      const trackingRef = doc(db, `companies/${company.id}/live-tracking`, aircraft.id);
      
      watchId.current = navigator.geolocation.watchPosition(
        async (position) => {
          const { latitude, longitude, heading, speed } = position.coords;
          try {
            await setDoc(trackingRef, {
              latitude,
              longitude,
              heading,
              speed,
              timestamp: serverTimestamp(),
            }, { merge: true });
          } catch (error) {
            console.error("Error writing location to Firestore:", error);
            // Consider adding a toast notification for persistent errors
          }
        },
        (error) => {
          console.error("Error getting geolocation:", error);
          toast({
            variant: 'destructive',
            title: 'GPS Tracking Error',
            description: `Could not get location: ${error.message}. Tracking will be disabled.`,
          });
          // Stop tracking on error
          if (watchId.current) {
            navigator.geolocation.clearWatch(watchId.current);
            watchId.current = null;
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
        }
      );
    }

    // --- Cleanup function ---
    return () => {
      if (watchId.current) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
        // Optionally remove the tracking doc on unmount/cleanup
        const trackingRef = doc(db, `companies/${company.id}/live-tracking`, aircraft.id);
        deleteDoc(trackingRef).catch(e => console.error("Error removing tracking doc on cleanup:", e));
      }
    };
  }, [enabled, company, aircraft, toast]);

  return null; // This component does not render anything
}
