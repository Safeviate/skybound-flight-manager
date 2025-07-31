
import { db } from '@/lib/firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import type { Aircraft, Checklist } from '@/lib/types';

export async function getAircraftPageData(companyId: string) {
    const aircraftQuery = query(collection(db, `companies/${companyId}/aircraft`));
    const checklistQuery = query(collection(db, `companies/${companyId}/checklists`));
    
    const [aircraftSnapshot, checklistSnapshot] = await Promise.all([
        getDocs(aircraftQuery),
        getDocs(checklistQuery),
    ]);
    
    const aircraftList = aircraftSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Aircraft));
    const checklistList = checklistSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Checklist));

    return { aircraftList, checklistList };
}
