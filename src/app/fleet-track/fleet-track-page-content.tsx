
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import type { Aircraft } from '@/lib/types';
import { useSettings } from '@/context/settings-provider';
import { LiveFleetMap } from './live-fleet-map';
import { LiveLocationTracker } from '../training-schedule/live-location-tracker';

interface FleetTrackPageContentProps {
    initialAircraft: Aircraft[];
}

export function FleetTrackPageContent({
    initialAircraft,
}: FleetTrackPageContentProps) {
    const { settings } = useSettings();
    const [devTrackingAircraftId, setDevTrackingAircraftId] = useState<string | null>(null);

    const activeTrackingAircraft = useMemo(() => {
        if (!devTrackingAircraftId) return null;
        return initialAircraft.find(a => a.id === devTrackingAircraftId) || null;
    }, [devTrackingAircraftId, initialAircraft]);

    return (
        <main className="flex-1 p-4 md:p-8 space-y-6">
             {settings.liveTrackingDevMode && activeTrackingAircraft && (
                <LiveLocationTracker 
                    aircraft={activeTrackingAircraft} 
                    enabled={true} 
                />
            )}
             <LiveFleetMap 
                aircraft={initialAircraft} 
                isDevMode={settings.liveTrackingDevMode}
                onStartTracking={setDevTrackingAircraftId}
                trackingAircraftId={devTrackingAircraftId}
            />
        </main>
    );
}
