
import { db } from '@/lib/firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import type { Aircraft, Booking } from '@/lib/types';

export async function getBookingsPageData(companyId: string) {
    const bookingsQuery = query(collection(db, `companies/${companyId}/bookings`));
    const aircraftQuery = query(collection(db, `companies/${companyId}/aircraft`));
    
    const [bookingsSnapshot, aircraftSnapshot] = await Promise.all([
        getDocs(bookingsQuery),
        getDocs(aircraftQuery)
    ]);

    const bookingsList = bookingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
    const aircraftList = aircraftSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Aircraft));
    
    return { bookingsList, aircraftList };
}
