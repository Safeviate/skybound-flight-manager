
'use client';

import { getFlightLogsPageData } from './data';
import { FlightLogsPageContent } from './flight-logs-page-content';
import { useUser } from '@/context/user-provider';
import { useState, useEffect } from 'react';
import type { Booking, User } from '@/lib/types';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function FlightLogsPage() {
    const { company, loading: userLoading } = useUser();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [dataLoading, setDataLoading] = useState(true);

    useEffect(() => {
        if (!company) {
            if (!userLoading) setDataLoading(false);
            return;
        };

        const bookingsQuery = query(
            collection(db, `companies/${company.id}/bookings`),
            where('status', '==', 'Completed'),
            orderBy('date', 'desc')
        );

        const unsubscribe = onSnapshot(bookingsQuery, (snapshot) => {
            const bookingsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
            setBookings(bookingsData);
            setDataLoading(false);
        }, (error) => {
            console.error("Error fetching real-time flight logs:", error);
            setDataLoading(false);
        });
        
        // Fetch users once, as they don't change as often
        const fetchUsers = async () => {
            const usersQuery = query(collection(db, `companies/${company.id}/users`));
            const studentsQuery = query(collection(db, `companies/${company.id}/students`));

            const [usersSnapshot, studentsSnapshot] = await Promise.all([
                getDocs(usersQuery),
                getDocs(studentsQuery)
            ]);
            
            const personnel = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
            const students = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
            setUsers([...personnel, ...students]);
        };
        fetchUsers();

        return () => unsubscribe();
    }, [company, userLoading]);

    if (dataLoading) {
        return <div className="flex-1 flex items-center justify-center"><p>Loading flight logs...</p></div>
    }

    return <FlightLogsPageContent 
        initialBookings={bookings}
        initialUsers={users}
    />;
}

FlightLogsPage.title = 'Flight Logs';
