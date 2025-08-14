
'use server';

import { db } from '@/lib/firebase';
import { collection, query, getDocs, where } from 'firebase/firestore';
import type { Aircraft, Booking, User } from '@/lib/types';

export async function getSchedulePageData(companyId: string): Promise<{ aircraft: Aircraft[], bookings: Booking[], users: User[] }> {
    if (!companyId) {
        return { aircraft: [], bookings: [], users: [] };
    }

    try {
        const aircraftQuery = query(collection(db, `companies/${companyId}/aircraft`), where('status', '!=', 'Archived'));
        const bookingsQuery = query(collection(db, `companies/${companyId}/bookings`));
        const personnelQuery = query(collection(db, `companies/${companyId}/users`));
        const studentsQuery = query(collection(db, `companies/${companyId}/students`));

        const [aircraftSnapshot, bookingsSnapshot, personnelSnapshot, studentsSnapshot] = await Promise.all([
            getDocs(aircraftQuery),
            getDocs(bookingsQuery),
            getDocs(personnelQuery),
            getDocs(studentsQuery),
        ]);

        const aircraft = aircraftSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Aircraft));
        const bookings = bookingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
        const personnel = personnelSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        const students = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));

        const users = [...personnel, ...students];

        return { aircraft, bookings, users };
    } catch (error) {
        console.error("Failed to fetch schedule page data:", error);
        return { aircraft: [], bookings: [], users: [] };
    }
}
