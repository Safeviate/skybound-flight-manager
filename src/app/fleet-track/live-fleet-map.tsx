
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
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';

interface LiveLocation {
  id: string; // aircraftId
  latitude: number;
  longitude: number;
  timestamp: any;
  heading?: number;
}

const containerStyle = {
  width: '100%',
  height: '100%',
};

const MapDisplay = ({ locations, aircraft, isDevMode, onStartTracking, trackingAircraftId }: { locations: LiveLocation[], aircraft: Aircraft[], isDevMode: boolean, onStartTracking: (id: string | null) => void, trackingAircraftId: string | null }) => {
  const mapRef = React.useRef<google.maps.Map | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  });

  const onMapLoad = React.useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);
  
  const onMapUnmount = React.useCallback(() => {
    mapRef.current = null;
  }, []);

  useEffect(() => {
    if (mapRef.current && locations.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      locations.forEach(loc => {
        bounds.extend(new window.google.maps.LatLng(loc.latitude, loc.longitude));
      });
      mapRef.current.fitBounds(bounds);
    }
  }, [locations]);
  
  if (loadError) {
    return <div className="flex items-center justify-center h-full text-destructive">Error loading maps. Please check your API key.</div>;
  }
  
  if (!isLoaded) {
    return <div className="flex items-center justify-center h-full text-muted-foreground"><Loader2 className="animate-spin mr-2" /> Loading map...</div>
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
        mapContainerStyle={containerStyle}
        center={{ lat: locations[0].latitude, lng: locations[0].longitude }}
        zoom={12}
        onLoad={onMapLoad}
        onUnmount={onMapUnmount}
        options={{
            disableDefaultUI: true,
            zoomControl: true,
            mapTypeControl: true,
        }}
      >
        {locations.map(loc => {
            const ac = aircraft.find(a => a.id === loc.id);
            if (!ac) return null;
            return (
                 <Marker
                    key={loc.id}
                    position={{ lat: loc.latitude, lng: loc.longitude }}
                    label={{
                        text: ac.tailNumber,
                        color: 'black',
                        fontWeight: 'bold',
                        className: 'map-label bg-white/70 px-1 py-0.5 rounded-md border text-xs'
                    }}
                    icon={{
                        path: 'M4.5 10.5 2 7.5l-2-2.5 1.5-3.5 3-1.5 13.5 13.5-1.5 3-3.5 1.5-2.5-2z',
                        fillColor: '#2563eb', // blue-600
                        fillOpacity: 1,
                        strokeWeight: 1,
                        strokeColor: 'white',
                        rotation: loc.heading || 0,
                        scale: 1.5,
                        anchor: new window.google.maps.Point(7, 7)
                    }}
                />
            )
        })}
      </GoogleMap>
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
    <Card className="h-[calc(100vh-12rem)] flex flex-col">
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
