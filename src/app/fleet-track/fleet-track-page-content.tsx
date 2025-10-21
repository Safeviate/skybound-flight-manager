
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Construction } from 'lucide-react';
import { LiveFleetMap } from './live-fleet-map';
import { useSettings } from '@/context/settings-provider';
import { useState, useEffect } from 'react';
import type { Aircraft } from '@/lib/types';
import { useUser } from '@/context/user-provider';


export function FleetTrackPageContent({
    initialAircraft,
    googleMapsApiKey,
}: {
    initialAircraft: any[];
    googleMapsApiKey: string;
}) {
    const { settings } = useSettings();
    const [trackingAircraftId, setTrackingAircraftId] = useState<string | null>(null);

    return (
        <main className="flex-1 p-4 md:p-8">
             {googleMapsApiKey ? (
                <LiveFleetMap 
                    aircraft={initialAircraft}
                    isDevMode={settings.liveTrackingDevMode}
                    onStartTracking={setTrackingAircraftId}
                    trackingAircraftId={trackingAircraftId}
                    googleMapsApiKey={googleMapsApiKey}
                />
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>Live Fleet Map</CardTitle>
                        <CardDescription>Real-time positions of aircraft in flight.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center h-[calc(100vh-18rem)]">
                        <div className="text-center text-muted-foreground">
                            <p>Loading map configuration...</p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </main>
    );
}
