

'use client';

import { MyDashboardPageContent } from './my-dashboard-page-content';
import type { Booking } from '@/lib/types';
import { useUser } from '@/context/user-provider';
import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot, or, and } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';

export default function MyDashboardPage() {
    const { user, company } = useUser();
    const [bookings, setBookings] = useState<Booking[]>([]);
    
    useEffect(() => {
        if (!user || !company) return;

        const bookingsQuery = query(
            collection(db, `companies/${company.id}/bookings`),
            and(
                or(
                    where('student', '==', user.name),
                    where('instructor', '==', user.name)
                ),
                where('date', '>=', format(new Date(), 'yyyy-MM-dd'))
            ),
            orderBy('date'),
            orderBy('startTime')
        );

        const unsubscribe = onSnapshot(bookingsQuery, (snapshot) => {
            const bookingsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
            setBookings(bookingsList);
        });

        return () => unsubscribe();

    }, [user, company]);

    return (
        <MyDashboardPageContent initialBookings={bookings} />
    );
}

MyDashboardPage.title = 'My Dashboard';
