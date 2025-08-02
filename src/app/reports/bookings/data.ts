
'use server';

import { db } from '@/lib/firebase';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import type { Booking } from '@/lib/types';

export async function getBookingsPageData(companyId: string): Promise<Booking[]> {
    if (!companyId) return [];
    
    const bookingsQuery = query(collection(db, `companies/${companyId}/bookings`), orderBy('date', 'desc'));
    const bookingsSnapshot = await getDocs(bookingsQuery);
    return bookingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
}

