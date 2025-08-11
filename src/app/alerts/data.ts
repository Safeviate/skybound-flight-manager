'use server';

import { db } from '@/lib/firebase';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import type { Alert } from '@/lib/types';

export async function getAlertsPageData(companyId: string) {
    const alertsQuery = query(collection(db, `companies/${companyId}/alerts`), orderBy('date', 'desc'));
    
    const alertsSnapshot = await getDocs(alertsQuery);

    const alertsList = alertsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Alert));
    
    return { alertsList };
}
