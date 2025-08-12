
'use client';

import { MyDashboardPageContent } from './my-dashboard-page-content';
import type { Booking } from '@/lib/types';
import { useUser } from '@/context/user-provider';
import { useEffect, useState, useCallback } from 'react';
import { getDashboardData } from './data';
import { Loader2 } from 'lucide-react';


export default function MyDashboardPage() {
    const { user, company, loading: userLoading } = useUser();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [dataLoading, setDataLoading] = useState(true);

    const fetchDashboardData = useCallback(async () => {
        if (!user || !company) return;
        setDataLoading(true);
        const { bookingsList } = await getDashboardData(company.id, user.id);
        setBookings(bookingsList);
        setDataLoading(false);
    }, [user, company]);

    useEffect(() => {
        if (!userLoading && user && company) {
            fetchDashboardData();
        }
    }, [userLoading, user, company, fetchDashboardData]);

    if (userLoading || dataLoading) {
        return (
            <main className="flex-1 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </main>
        );
    }
    
    return (
        <MyDashboardPageContent initialBookings={bookings} />
    );
}

MyDashboardPage.title = 'My Dashboard';
