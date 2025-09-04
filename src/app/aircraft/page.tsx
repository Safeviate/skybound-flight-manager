
'use client';

import { AircraftPageContent } from './aircraft-page-content';
import { getAircraftPageData } from './data';
import type { Aircraft, Booking, ExternalContact } from '@/lib/types';
import { useUser } from '@/context/user-provider';
import { useState, useEffect } from 'react';
import Loading from '../loading';


export default function AircraftPageContainer() {
    const { company, user, loading: userLoading } = useUser();
    const [initialData, setInitialData] = useState<{
        aircraft: Aircraft[],
        bookings: Booking[],
        contacts: ExternalContact[]
    }>({ aircraft: [], bookings: [], contacts: [] });
    const [dataLoading, setDataLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            if (company) {
                const data = await getAircraftPageData(company.id);
                setInitialData(data);
                setDataLoading(false);
            } else if (!userLoading) {
                // If user isn't loading and there's still no company, stop loading.
                setDataLoading(false);
            }
        }
        loadData();
    }, [company, userLoading, user]);

    if (userLoading || dataLoading) {
        return <Loading />;
    }

    return <AircraftPageContent 
                initialAircraft={initialData.aircraft} 
                initialBookings={initialData.bookings} 
                initialExternalContacts={initialData.contacts} 
            />;
}

AircraftPageContainer.title = "Aircraft Management";
