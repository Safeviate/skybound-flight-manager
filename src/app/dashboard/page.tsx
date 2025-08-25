
'use client';

import { DashboardPageContent } from './dashboard-page-content';
import { getDashboardData } from './data';
import type { Aircraft, Booking, User } from '@/lib/types';
import { useUser } from '@/context/user-provider';
import { useEffect, useState } from 'react';


export default function DashboardPage() {
    const { company, loading: userLoading } = useUser();
    const [initialData, setInitialData] = useState<{ aircraft: Aircraft[], bookings: Booking[], users: User[], students: User[] }>({
        aircraft: [],
        bookings: [],
        users: [],
        students: [],
    });

    useEffect(() => {
        async function loadData() {
            if (company) {
                const data = await getDashboardData(company.id);
                setInitialData(data);
            }
        }
        if (!userLoading) {
            loadData();
        }
    }, [company, userLoading]);

  return <DashboardPageContent 
            initialAircraft={initialData.aircraft}
            initialBookings={initialData.bookings}
            initialUsers={initialData.users}
            initialStudents={initialData.students}
         />;
}

DashboardPage.title = "Company Dashboard";
