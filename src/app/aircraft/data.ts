
'use server';

import { db } from '@/lib/firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import type { Aircraft } from '@/lib/types';

export async function getAircraftPageData(companyId: string): Promise<Aircraft[]> {
    const aircraftQuery = query(collection(db, `companies/${companyId}/aircraft`));
    const snapshot = await getDocs(aircraftQuery);
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Aircraft));
}
