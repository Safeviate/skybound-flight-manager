
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useUser } from '@/context/user-provider';
import { Loader2, Plane, Power } from 'lucide-react';
import type { Aircraft } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import getConfig from 'next/config';

interface LiveLocation {
  id: string; // aircraftId
  latitude: number;
  longitude: number;
  timestamp: any;
  heading?: number;
}

const { publicRuntimeConfig } = getConfig();

const MapDisplay = ({ locations, aircraft, isDevMode, onStartTracking, trackingAircraftId, isLoaded, loadError }: { locations: LiveLocation[], aircraft: Aircraft[], isDevMode: boolean, onStartTracking: (id: string | null) => void, trackingAircraftId: string | null, isLoaded: boolean, loadError?: Error }) => {
  const mapRef = React.useRef<any | null>(null);

  const onMapLoad = useCallback((map: any) => {
    mapRef.current = map;
    if (locations.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      locations.forEach(loc => {
        bounds.extend(new window.google.maps.LatLng(loc.latitude, loc.longitude));
      });
      map.fitBounds(bounds);
    }
  }, [locations]);

  if (loadError) {
    return (
        <div className="flex items-center justify-center h-full text-destructive">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            <span>Map Error: {loadError.message}</span>
        </div>
    )
  }

  if (!isLoaded) {
    return (
        <div className="flex items-center justify-center h-full text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            <span>Loading map...</span>
        </div>
    );
  }

  if (locations.length === 0) {
     return (
        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <Plane className="h-10 w-10 mb-2" />
            <p className="font-medium">No aircraft are currently transmitting their position.</p>
            {isDevMode && (
                <div className="mt-4 flex flex-col items-center gap-2">
                    <p className="text-xs">Or, for testing:</p>
                    <Select onValueChange={(value) => onStartTracking(value)}>
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
      <GoogleMap
        onLoad={onMapLoad}
        mapContainerStyle={{ height: "100%", width: "100%" }}
        zoom={8}
        center={locations.length > 0 ? { lat: locations[0].latitude, lng: locations[0].longitude } : { lat: 0, lng: 0 }}
        options={{ mapTypeControl: true }}
      >
        {locations.map(loc => {
            const ac = aircraft.find(a => a.id === loc.id);
            if (!ac) return null;

            const icon = {
                path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                fillColor: '#2563eb', // blue-600
                fillOpacity: 1,
                strokeWeight: 1,
                strokeColor: 'white',
                rotation: loc.heading || 0,
                scale: 6,
                anchor: new window.google.maps.Point(0, 2.5),
            };

            return (
                 <Marker
                    key={loc.id}
                    position={{ lat: loc.latitude, lng: loc.longitude }}
                    label={{
                        text: ac.tailNumber,
                        color: 'black',
                        fontWeight: 'bold',
                        className: 'map-label bg-white/70 px-1.5 py-0.5 rounded-md border text-xs shadow-md'
                    }}
                    icon={icon}
                />
            )
        })}
      </GoogleMap>
      {isDevMode && isTrackingInDev && (
            <div className="absolute bottom-2 right-2 z-10">
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
  
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: publicRuntimeConfig.googleMapsApiKey,
    preventGoogleFontsLoading: true,
  });

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
    <Card className="h-[calc(100vh-12rem)] flex flex-col">
        <CardHeader>
            <CardTitle>Live Fleet Map</CardTitle>
            <CardDescription>Real-time positions of aircraft in flight.</CardDescription>
        </CardHeader>
        <CardContent className="flex-1">
            {loading ? (
                 <div className="flex items-center justify-center h-full text-muted-foreground">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    <span>Connecting to tracking data...</span>
                </div>
            ) : (
                <MapDisplay 
                    locations={locations} 
                    aircraft={aircraft}
                    isDevMode={isDevMode}
                    onStartTracking={onStartTracking}
                    trackingAircraftId={trackingAircraftId}
                    isLoaded={isLoaded}
                    loadError={loadError}
                />
            )}
        </CardContent>
    </Card>
  );
}
