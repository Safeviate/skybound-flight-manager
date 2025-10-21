
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
}: {
    initialAircraft: any[];
}) {
    const { settings } = useSettings();
    const [trackingAircraftId, setTrackingAircraftId] = useState<string | null>(null);
    const [googleMapsApiKey, setGoogleMapsApiKey] = useState('');
    const { company } = useUser();

    useEffect(() => {
        if (company) {
            // This is a client-side workaround to get the key.
            // A better solution would involve a dedicated API route or loading it securely.
            // For now, we assume it's exposed as a public env var for client-side maps.
            setGoogleMapsApiKey(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '');
        }
    }, [company]);

    return (
        <main className="flex-1 p-4 md:p-8">
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
