
'use client';

import { TrainingSchedulePageContent } from './training-schedule-client';
import { getSchedulePageData } from './data';
import { useUser } from '@/context/user-provider';
import { useState, useEffect } from 'react';
import type { Aircraft, Booking, User } from '@/lib/types';


export default function TrainingSchedulePage() {
    const { company, loading: userLoading } = useUser();
    const [initialData, setInitialData] = useState<{
        aircraft: Aircraft[],
        bookings: Booking[],
        users: User[],
        hireAndFly: User[],
    }>({ aircraft: [], bookings: [], users: [], hireAndFly: [] });

    useEffect(() => {
        async function loadData() {
            if (company) {
                const data = await getSchedulePageData(company.id);
                setInitialData(data);
            }
        }
        if (!userLoading) {
            loadData();
        }
    }, [company, userLoading]);

    return <TrainingSchedulePageContent 
            initialAircraft={initialData.aircraft}
            initialBookings={initialData.bookings}
            initialUsers={initialData.users}
            initialHireAndFly={initialData.hireAndFly}
         />;
}

TrainingSchedulePage.title = "Schedule";
