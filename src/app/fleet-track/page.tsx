
'use client';

import { FleetTrackPageContent } from './fleet-track-page-content';
import { getFleetTrackPageData } from './data';
import { useUser } from '@/context/user-provider';
import { useState, useEffect } from 'react';
import type { Aircraft } from '@/lib/types';


export default function FleetTrackPage() {
    const { company, loading: userLoading } = useUser();
    const [initialData, setInitialData] = useState<{ aircraft: Aircraft[] }>({
        aircraft: [],
    });
    const [googleMapsApiKey, setGoogleMapsApiKey] = useState('');

    useEffect(() => {
        async function loadData() {
            if (company) {
                const data = await getFleetTrackPageData(company.id);
                setInitialData(data);
            }
        }
        if (!userLoading) {
            loadData();
        }
        
        // This is a workaround to get the environment variable on the client.
        // In a real app, this would be better handled via a dedicated API route or initial props.
        setGoogleMapsApiKey(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '');

    }, [company, userLoading]);

    return <FleetTrackPageContent 
            initialAircraft={initialData.aircraft}
            googleMapsApiKey={googleMapsApiKey}
         />;
}

FleetTrackPage.title = "Fleet Track";
