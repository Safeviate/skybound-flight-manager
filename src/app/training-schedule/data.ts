
'use server';

import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { Aircraft, Booking } from '@/lib/types';

export async function getTrainingScheduleData(companyId: string): Promise<{ aircraft: Aircraft[], bookings: Booking[] }> {
    if (!companyId) return { aircraft: [], bookings: [] };
    
    const aircraftQuery = query(
        collection(db, `companies/${companyId}/aircraft`), 
        where('status', '!=', 'Archived')
    );
    
    const bookingsQuery = query(
        collection(db, `companies/${companyId}/bookings`)
    );
    
    const [aircraftSnapshot, bookingsSnapshot] = await Promise.all([
        getDocs(aircraftQuery),
        getDocs(bookingsQuery)
    ]);
    
    const aircraft = aircraftSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Aircraft));
    const bookings = bookingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));

    return { aircraft, bookings };
}
