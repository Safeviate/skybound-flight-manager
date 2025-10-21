
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Construction } from 'lucide-react';
import { LiveFleetMap } from './live-fleet-map';
import { useSettings } from '@/context/settings-provider';
import { useState } from 'react';
import type { Aircraft } from '@/lib/types';


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
             <div className="flex items-center justify-center h-96 border-2 border-dashed rounded-lg mb-8">
                <div className="text-center text-muted-foreground">
                    <Construction className="mx-auto h-12 w-12 mb-4" />
                    <h2 className="text-2xl font-semibold">Under Construction</h2>
                    <p className="mt-2">This feature is currently being worked on. Please check back later.</p>
                </div>
            </div>
             <LiveFleetMap 
                aircraft={initialAircraft}
                isDevMode={settings.liveTrackingDevMode}
                onStartTracking={setTrackingAircraftId}
                trackingAircraftId={trackingAircraftId}
                googleMapsApiKey={googleMapsApiKey}
            />
        </main>
    );
}
