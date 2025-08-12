
'use server';

import { db } from '@/lib/firebase';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import type { Aircraft, Booking, ExternalContact } from '@/lib/types';

export async function getAircraftPageData(companyId: string): Promise<{ aircraft: Aircraft[], bookings: Booking[], contacts: ExternalContact[] }> {
    if (!companyId) return { aircraft: [], bookings: [], contacts: [] };
    
    const aircraftQuery = query(
        collection(db, `companies/${companyId}/aircraft`), 
        orderBy('tailNumber')
    );
    const bookingsQuery = query(collection(db, `companies/${companyId}/bookings`));
    const contactsQuery = query(collection(db, `companies/${companyId}/external-contacts`));

    const [aircraftSnapshot, bookingsSnapshot, contactsSnapshot] = await Promise.all([
        getDocs(aircraftQuery),
        getDocs(bookingsQuery),
        getDocs(contactsQuery),
    ]);
    
    const aircraft = aircraftSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Aircraft));
    const bookings = bookingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
    const contacts = contactsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExternalContact));

    return { aircraft, bookings, contacts };
}
