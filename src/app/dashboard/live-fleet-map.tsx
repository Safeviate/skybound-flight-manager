
'use client';

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useUser } from '@/context/user-provider';
import { Loader2, Plane, Power } from 'lucide-react';
import type { Aircraft } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

// Note: A proper map library like Leaflet or Google Maps would be better for a real implementation.
// This is a simplified visual representation.

interface LiveLocation {
  id: string; // aircraftId
  latitude: number;
  longitude: number;
  timestamp: any;
  heading?: number;
}

const MapDisplay = ({ locations, aircraft, isDevMode, onStartTracking, trackingAircraftId }: { locations: LiveLocation[], aircraft: Aircraft[], isDevMode: boolean, onStartTracking: (id: string | null) => void, trackingAircraftId: string | null }) => {
  const [bounds, setBounds] = React.useState({ minLat: 90, maxLat: -90, minLon: 180, maxLon: -180 });

  useEffect(() => {
    if (locations.length > 0) {
      const newBounds = locations.reduce((acc, loc) => ({
        minLat: Math.min(acc.minLat, loc.latitude),
        maxLat: Math.max(acc.maxLat, loc.latitude),
        minLon: Math.min(acc.minLon, loc.longitude),
        maxLon: Math.max(acc.maxLon, loc.longitude),
      }), { minLat: 90, maxLat: -90, minLon: 180, maxLon: -180 });
      setBounds(newBounds);
    }
  }, [locations]);

  const getPosition = (lat: number, lon: number) => {
    const latRange = bounds.maxLat - bounds.minLat || 1;
    const lonRange = bounds.maxLon - bounds.minLon || 1;
    const top = ((bounds.maxLat - lat) / latRange) * 100;
    const left = ((lon - bounds.minLon) / lonRange) * 100;
    return { top: `${top}%`, left: `${left}%` };
  };

  if (locations.length === 0) {
     return (
        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <Plane className="h-10 w-10 mb-2" />
            <p className="font-medium">No aircraft are currently transmitting their position.</p>
            {isDevMode && (
                <div className="mt-4 flex flex-col items-center gap-2">
                    <p className="text-xs">Or, for testing:</p>
                    <Select onValueChange={onStartTracking}>
                        <SelectTrigger className="w-[280px]">
                            <SelectValue placeholder="Start Dev Tracking for an aircraft..." />
                        </SelectTrigger>
                        <SelectContent>
                            {aircraft.filter(ac => ac.status === 'Available').map(ac => (
                                <SelectItem key={ac.id} value={ac.id} disabled={trackingAircraftId === ac.id}>
                                    {ac.tailNumber} ({ac.make})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
        </div>
    );
  }

  const isTrackingInDev = trackingAircraftId && locations.some(l => l.id === trackingAircraftId);

  return (
    <div className="relative w-full h-full bg-muted/30 rounded-md overflow-hidden border">
      {locations.map(loc => {
        const ac = aircraft.find(a => a.id === loc.id);
        if (!ac) return null;
        const { top, left } = getPosition(loc.latitude, loc.longitude);
        return (
          <div key={loc.id} className="absolute transition-all duration-1000 ease-linear" style={{ top, left }}>
            <div className="group flex flex-col items-center">
                <Plane className="h-6 w-6 text-primary -rotate-45" style={{ transform: `rotate(${loc.heading || -45}deg)` }}/>
                <div className="text-xs font-bold bg-background/80 px-1.5 py-0.5 rounded-full border shadow-sm">
                    {ac.tailNumber}
                </div>
            </div>
          </div>
        );
      })}
       {isDevMode && isTrackingInDev && (
            <div className="absolute bottom-2 right-2">
                <Button variant="destructive" size="sm" onClick={() => onStartTracking(null)}>
                    <Power className="mr-2 h-4 w-4" />
                    Stop Tracking
                </Button>
            </div>
        )}
    </div>
  );
};


export function LiveFleetMap({ aircraft, isDevMode, onStartTracking, trackingAircraftId }: { aircraft: Aircraft[], isDevMode: boolean, onStartTracking: (id: string | null) => void, trackingAircraftId: string | null }) {
  const { company } = useUser();
  const [locations, setLocations] = useState<LiveLocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!company) return;

    setLoading(true);
    const q = query(collection(db, `companies/${company.id}/live-tracking`));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const liveData: LiveLocation[] = [];
      snapshot.forEach((doc) => {
        liveData.push({ id: doc.id, ...doc.data() } as LiveLocation);
      });
      setLocations(liveData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching live locations:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [company]);

  return (
    <Card className="h-[400px] flex flex-col">
        <CardHeader>
            <CardTitle>Live Fleet Map</CardTitle>
            <CardDescription>Real-time positions of aircraft in flight.</CardDescription>
        </CardHeader>
        <CardContent className="flex-1">
            {loading ? (
                 <div className="flex items-center justify-center h-full text-muted-foreground">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    <span>Loading map...</span>
                </div>
            ) : (
                <MapDisplay 
                    locations={locations} 
                    aircraft={aircraft}
                    isDevMode={isDevMode}
                    onStartTracking={onStartTracking}
                    trackingAircraftId={trackingAircraftId}
                />
            )}
        </CardContent>
    </Card>
  );
}
