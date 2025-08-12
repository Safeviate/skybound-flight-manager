
'use server';

import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, limit, and, or, doc, getDoc } from 'firebase/firestore';
import type { Booking, User } from '@/lib/types';
import { format, startOfToday } from 'date-fns';

export async function getDashboardData(companyId: string, userId: string): Promise<{ bookingsList: Booking[] }> {
    if (!companyId || !userId) {
        return { bookingsList: [] };
    }
    
    // First, get the user's name as bookings are associated by name, not ID.
    const userRef = doc(db, `companies/${companyId}/users`, userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
        console.error("Dashboard: Could not find user to fetch bookings.");
        return { bookingsList: [] };
    }
    const userName = userSnap.data().name;

    const today = format(startOfToday(), 'yyyy-MM-dd');

    const bookingsQuery = query(
        collection(db, `companies/${companyId}/bookings`),
        and(
            where('date', '>=', today),
            or(
                where('student', '==', userName),
                where('instructor', '==', userName)
            )
        ),
        orderBy('date'),
        orderBy('startTime'),
        limit(5)
    );

    const snapshot = await getDocs(bookingsQuery);
    const bookingsList = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Booking));
    
    return { bookingsList };
}
