
'use server';

import { db } from '@/lib/firebase';
import { collection, query, getDocs, orderBy, where } from 'firebase/firestore';
import type { Alert } from '@/lib/types';

export async function getAlertsPageData(companyId: string) {
    // Only fetch Red Tag and Yellow Tag alerts for the main alerts page
    const alertsQuery = query(
        collection(db, `companies/${companyId}/alerts`), 
        where('type', 'in', ['Red Tag', 'Yellow Tag']),
        orderBy('date', 'desc')
    );
    
    const alertsSnapshot = await getDocs(alertsQuery);

    const alertsList = alertsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Alert));
    
    return { alertsList };
}
