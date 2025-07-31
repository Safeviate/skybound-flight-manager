
import { db } from '@/lib/firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import type { Aircraft, Checklist } from '@/lib/types';

export async function getAircraftPageData(companyId: string) {
    const aircraftQuery = query(collection(db, `companies/${companyId}/aircraft`));
    
    const [aircraftSnapshot] = await Promise.all([
        getDocs(aircraftQuery),
    ]);
    
    const aircraftList = aircraftSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Aircraft));

    return { aircraftList };
}
