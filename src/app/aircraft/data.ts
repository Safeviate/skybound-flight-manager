'use server';

import { db } from '@/lib/firebase';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import type { Aircraft } from '@/lib/types';

export async function getAircraftPageData(companyId: string): Promise<Aircraft[]> {
    if (!companyId) return [];
    
    const aircraftQuery = query(
        collection(db, `companies/${companyId}/aircraft`), 
        orderBy('tailNumber')
    );
    
    const aircraftSnapshot = await getDocs(aircraftQuery);
    
    return aircraftSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Aircraft));
}
