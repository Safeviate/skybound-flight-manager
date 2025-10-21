
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import type { Aircraft } from '@/lib/types';
import { useSettings } from '@/context/settings-provider';
import { LiveFleetMap } from './live-fleet-map';
import { LiveLocationTracker } from '../training-schedule/live-location-tracker';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Power, Radio } from 'lucide-react';
import { Label } from '@/components/ui/label';

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

            {settings.liveTrackingDevMode && (
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Radio className="h-5 w-5 text-primary" />
                            Development Tracking
                        </CardTitle>
                        <CardDescription>
                            Manually start or stop tracking an aircraft for testing purposes. Your device's GPS will be used.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {activeTrackingAircraft ? (
                             <div className="flex items-center justify-between">
                                <p>Currently tracking: <span className="font-semibold">{activeTrackingAircraft.tailNumber}</span></p>
                                <Button variant="destructive" onClick={() => setDevTrackingAircraftId(null)}>
                                    <Power className="mr-2 h-4 w-4" />
                                    Stop Tracking
                                </Button>
                            </div>
                        ) : (
                             <div className="flex items-end gap-4">
                                <div className="flex-1">
                                    <Label>Select an aircraft to start tracking:</Label>
                                     <Select onValueChange={setDevTrackingAircraftId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select aircraft..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {initialAircraft.filter(ac => ac.status === 'Available').map(ac => (
                                                <SelectItem key={ac.id} value={ac.id}>
                                                    {ac.tailNumber} ({ac.make})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

             <LiveFleetMap 
                aircraft={initialAircraft} 
            />
        </main>
    );
}
