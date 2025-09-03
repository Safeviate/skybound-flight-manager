
'use client';

import { getFlightLogsPageData } from './data';
import { FlightLogsPageContent } from './flight-logs-page-content';
import { useUser } from '@/context/user-provider';
import { useState, useEffect } from 'react';
import type { Booking, User } from '@/lib/types';

export default function FlightLogsPage() {
    const { company, loading: userLoading } = useUser();
    const [initialData, setInitialData] = useState<{ bookings: Booking[], users: User[] }>({
        bookings: [],
        users: [],
    });

    useEffect(() => {
        async function loadData() {
            if (company) {
                const data = await getFlightLogsPageData(company.id);
                setInitialData(data);
            }
        }
        if (!userLoading) {
            loadData();
        }
    }, [company, userLoading]);

    return <FlightLogsPageContent 
        initialBookings={initialData.bookings}
        initialUsers={initialData.users}
    />;
}

FlightLogsPage.title = 'Flight Logs';
