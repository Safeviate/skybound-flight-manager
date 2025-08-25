
'use client';

import { AircraftPageContent } from './aircraft-page-content';
import { getAircraftPageData } from './data';
import type { Aircraft, Booking, ExternalContact } from '@/lib/types';
import { useUser } from '@/context/user-provider';
import { useState, useEffect } from 'react';


export default function AircraftPageContainer() {
    const { company, loading: userLoading } = useUser();
    const [initialData, setInitialData] = useState<{
        aircraft: Aircraft[],
        bookings: Booking[],
        contacts: ExternalContact[]
    }>({ aircraft: [], bookings: [], contacts: [] });

    useEffect(() => {
        async function loadData() {
            if (company) {
                const data = await getAircraftPageData(company.id);
                setInitialData(data);
            }
        }
        if (!userLoading) {
            loadData();
        }
    }, [company, userLoading]);

    return <AircraftPageContent 
                initialAircraft={initialData.aircraft} 
                initialBookings={initialData.bookings} 
                initialExternalContacts={initialData.contacts} 
            />;
}

AircraftPageContainer.title = "Aircraft Management";
