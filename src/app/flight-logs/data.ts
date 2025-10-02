
'use server';

import { db } from '@/lib/firebase';
import { collection, query, getDocs, where, orderBy } from 'firebase/firestore';
import type { Booking, User } from '@/lib/types';

export async function getFlightLogsPageData(companyId: string): Promise<{ bookings: Booking[], users: User[] }> {
    if (!companyId) {
        return { bookings: [], users: [] };
    }

    try {
        const bookingsQuery = query(
            collection(db, `companies/${companyId}/aircraft-bookings`), 
            where('status', '==', 'Completed'),
            orderBy('date', 'desc')
        );
        const usersQuery = query(collection(db, `companies/${companyId}/users`));
        const studentsQuery = query(collection(db, `companies/${companyId}/students`));

        const [bookingsSnapshot, usersSnapshot, studentsSnapshot] = await Promise.all([
            getDocs(bookingsQuery),
            getDocs(usersQuery),
            getDocs(studentsQuery)
        ]);

        const bookings = bookingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
        const personnel = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        const students = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        const users = [...personnel, ...students];
        
        return { bookings, users };
    } catch (error) {
        console.error("Failed to fetch flight logs page data:", error);
        return { bookings: [], users: [] };
    }
}
