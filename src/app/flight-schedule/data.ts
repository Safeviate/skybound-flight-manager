
'use server';

import { db } from '@/lib/firebase';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import type { Aircraft, Booking } from '@/lib/types';

export async function getFlightSchedulePageData(companyId: string) {
    if (!companyId) return { aircraft: [], bookings: [] };
    
    const aircraftQuery = query(
        collection(db, `companies/${companyId}/aircraft`), 
        orderBy('tailNumber')
    );
    const bookingsQuery = query(
        collection(db, `companies/${companyId}/bookings`), 
        orderBy('date')
    );
    
    const [aircraftSnapshot, bookingsSnapshot] = await Promise.all([
        getDocs(aircraftQuery),
        getDocs(bookingsQuery)
    ]);
    
    const aircraft = aircraftSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Aircraft));
    const bookings = bookingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));

    return { aircraft, bookings };
}
