
'use server';

import { db } from '@/lib/firebase';
import { collection, query, getDocs, where } from 'firebase/firestore';
import type { Aircraft, Booking, User } from '@/lib/types';

export async function getDashboardData(companyId: string): Promise<{ aircraft: Aircraft[], bookings: Booking[], users: User[] }> {
    if (!companyId) {
        return { aircraft: [], bookings: [], users: [] };
    }

    try {
        const aircraftQuery = query(collection(db, `companies/${companyId}/aircraft`));
        const bookingsQuery = query(collection(db, `companies/${companyId}/bookings`));
        const usersQuery = query(collection(db, `companies/${companyId}/users`));

        const [aircraftSnapshot, bookingsSnapshot, usersSnapshot] = await Promise.all([
            getDocs(aircraftQuery),
            getDocs(bookingsQuery),
            getDocs(usersQuery),
        ]);

        const aircraft = aircraftSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Aircraft));
        const bookings = bookingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
        const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));

        return { aircraft, bookings, users };
    } catch (error) {
        console.error("Failed to fetch dashboard page data:", error);
        return { aircraft: [], bookings: [], users: [] };
    }
}
