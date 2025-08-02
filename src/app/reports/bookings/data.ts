
'use server';

import { db } from '@/lib/firebase';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import type { Booking } from '@/lib/types';

export async function getBookingsPageData(companyId: string): Promise<Booking[]> {
    if (!companyId) return [];
    
    // Return an empty array to ensure the bookings log is empty.
    return [];
}
