
'use server';

import { db } from '@/lib/firebase';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import type { Aircraft, Booking, User } from '@/lib/types';

export async function getFlightSchedulePageData(companyId: string) {
    if (!companyId) return { aircraft: [], bookings: [], personnel: [] };
    
    const aircraftQuery = query(
        collection(db, `companies/${companyId}/aircraft`), 
        orderBy('tailNumber')
    );
    const bookingsQuery = query(
        collection(db, `companies/${companyId}/bookings`), 
        orderBy('date')
    );
    const personnelQuery = query(
        collection(db, `companies/${companyId}/users`)
    );
    
    const [aircraftSnapshot, bookingsSnapshot, personnelSnapshot] = await Promise.all([
        getDocs(aircraftQuery),
        getDocs(bookingsQuery),
        getDocs(personnelQuery),
    ]);
    
    const aircraft = aircraftSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Aircraft));
    const bookings = bookingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
    const personnel = personnelSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));

    return { aircraft, bookings, personnel };
}
