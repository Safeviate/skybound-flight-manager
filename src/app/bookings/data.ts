
'use server';

import { db } from '@/lib/firebase';
import { collection, query, getDocs, orderBy, where } from 'firebase/firestore';
import type { Aircraft, Booking } from '@/lib/types';

export async function getBookingsPageData(companyId: string) {
    if (!companyId) return { aircraftList: [], bookingsList: [] };
    
    const aircraftQuery = query(
        collection(db, `companies/${companyId}/aircraft`), 
        where('status', '!=', 'Archived'),
        orderBy('status'),
        orderBy('tailNumber')
    );
    
    const bookingsQuery = query(
        collection(db, `companies/${companyId}/bookings`),
        orderBy('date'),
        orderBy('startTime')
    );
    
    const [aircraftSnapshot, bookingsSnapshot] = await Promise.all([
        getDocs(aircraftQuery),
        getDocs(bookingsQuery),
    ]);
    
    const aircraftList = aircraftSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Aircraft));
    const bookingsList = bookingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));

    return { aircraftList, bookingsList };
}
