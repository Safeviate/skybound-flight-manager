
'use server';

import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { Aircraft } from '@/lib/types';

export async function getTrainingScheduleData(companyId: string): Promise<Aircraft[]> {
    if (!companyId) return [];
    
    const aircraftQuery = query(
        collection(db, `companies/${companyId}/aircraft`), 
        where('status', '!=', 'Archived')
    );
    
    const aircraftSnapshot = await getDocs(aircraftQuery);
    
    return aircraftSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Aircraft));
}
