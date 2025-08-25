
'use client';

import { getReportsPageData } from './data';
import { ReportsPageContent } from './reports-page-content';
import { useUser } from '@/context/user-provider';
import { useState, useEffect } from 'react';
import type { Booking, Aircraft, User } from '@/lib/types';

export default function ReportsPage() {
    const { company, loading: userLoading } = useUser();
    const [initialData, setInitialData] = useState<{ bookings: Booking[], aircraft: Aircraft[], users: User[] }>({
        bookings: [],
        aircraft: [],
        users: [],
    });

    useEffect(() => {
        async function loadData() {
            if (company) {
                const data = await getReportsPageData(company.id);
                setInitialData(data);
            }
        }
        if (!userLoading) {
            loadData();
        }
    }, [company, userLoading]);

    return <ReportsPageContent 
        initialBookings={initialData.bookings}
        initialAircraft={initialData.aircraft}
        initialUsers={initialData.users}
    />;
}

ReportsPage.title = 'Advanced Analytics';
