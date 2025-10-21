
'use server';

import { db } from '@/lib/firebase';
import { collection, query, getDocs, where } from 'firebase/firestore';
import type { Aircraft } from '@/lib/types';

export async function getFleetTrackPageData(companyId: string): Promise<{ aircraft: Aircraft[] }> {
    if (!companyId) {
        return { aircraft: [] };
    }

    try {
        const aircraftQuery = query(collection(db, `companies/${companyId}/aircraft`));
        const [aircraftSnapshot] = await Promise.all([
            getDocs(aircraftQuery),
        ]);

        const aircraft = aircraftSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Aircraft));

        return { aircraft };
    } catch (error) {
        console.error("Failed to fetch fleet track page data:", error);
        return { aircraft: [] };
    }
}
