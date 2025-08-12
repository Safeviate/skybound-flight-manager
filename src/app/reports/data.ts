
'use server';

import { db } from '@/lib/firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import type { Booking, Aircraft, User } from '@/lib/types';

export async function getReportsPageData(companyId: string): Promise<{ bookings: Booking[], aircraft: Aircraft[], users: User[] }> {
    if (!companyId) {
        return { bookings: [], aircraft: [], users: [] };
    }

    try {
        const bookingsQuery = query(collection(db, `companies/${companyId}/bookings`));
        const aircraftQuery = query(collection(db, `companies/${companyId}/aircraft`));
        const usersQuery = query(collection(db, `companies/${companyId}/users`));
        
        const [bookingsSnapshot, aircraftSnapshot, usersSnapshot] = await Promise.all([
            getDocs(bookingsQuery),
            getDocs(aircraftQuery),
            getDocs(usersQuery)
        ]);

        const bookings = bookingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
        const aircraft = aircraftSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Aircraft));
        const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        
        return { bookings, aircraft, users };
    } catch (error) {
        console.error("Failed to fetch reports page data:", error);
        return { bookings: [], aircraft: [], users: [] };
    }
}
