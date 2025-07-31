
import { db } from '@/lib/firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import type { Aircraft, Booking, Checklist } from '@/lib/types';

export async function getAircraftPageData(companyId: string) {
    const aircraftQuery = query(collection(db, `companies/${companyId}/aircraft`));
    const checklistQuery = query(collection(db, `companies/${companyId}/checklists`));
    const bookingQuery = query(collection(db, `companies/${companyId}/bookings`));

    const [aircraftSnapshot, checklistSnapshot, bookingSnapshot] = await Promise.all([
        getDocs(aircraftQuery),
        getDocs(checklistQuery),
        getDocs(bookingQuery)
    ]);
    
    const aircraftList = aircraftSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Aircraft));
    const checklistList = checklistSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Checklist));
    const bookingList = bookingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));

    return { aircraftList, checklistList, bookingList };
}
