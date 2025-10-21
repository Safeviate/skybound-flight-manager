
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Construction } from 'lucide-react';

export function FleetTrackPageContent({
    initialAircraft
}: {
    initialAircraft: any[];
}) {
    return (
        <main className="flex-1 p-4 md:p-8">
            <div className="flex items-center justify-center h-96 border-2 border-dashed rounded-lg">
                <div className="text-center text-muted-foreground">
                    <Construction className="mx-auto h-12 w-12 mb-4" />
                    <h2 className="text-2xl font-semibold">Under Construction</h2>
                    <p className="mt-2">This feature is currently being worked on. Please check back later.</p>
                </div>
            </div>
        </main>
    );
}
