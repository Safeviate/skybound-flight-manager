
'use server';

import { db } from '@/lib/firebase';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import type { Aircraft, Booking, ExternalContact, TechnicalReport } from '@/lib/types';

export async function getAircraftPageData(companyId: string): Promise<{ aircraft: Aircraft[], bookings: Booking[], contacts: ExternalContact[], technicalReports: TechnicalReport[] }> {
    if (!companyId) return { aircraft: [], bookings: [], contacts: [], technicalReports: [] };
    
    const aircraftQuery = query(
        collection(db, `companies/${companyId}/aircraft`), 
        orderBy('tailNumber')
    );
    const bookingsQuery = query(collection(db, `companies/${companyId}/bookings`));
    const contactsQuery = query(collection(db, `companies/${companyId}/external-contacts`));
    const technicalReportsQuery = query(collection(db, `companies/${companyId}/technical-reports`));

    const [aircraftSnapshot, bookingsSnapshot, contactsSnapshot, technicalReportsSnapshot] = await Promise.all([
        getDocs(aircraftQuery),
        getDocs(bookingsQuery),
        getDocs(contactsQuery),
        getDocs(technicalReportsQuery),
    ]);
    
    const aircraft = aircraftSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Aircraft));
    const bookings = bookingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
    const contacts = contactsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExternalContact));
    const technicalReports = technicalReportsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TechnicalReport));

    return { aircraft, bookings, contacts, technicalReports };
}
