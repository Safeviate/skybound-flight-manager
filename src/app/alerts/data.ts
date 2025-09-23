
'use server';

import { db } from '@/lib/firebase';
import { collection, query, getDocs, orderBy, where } from 'firebase/firestore';
import type { Alert, User } from '@/lib/types';

export async function getAlertsPageData(companyId: string) {
    // Only fetch Red Tag and Yellow Tag alerts for the main alerts page
    const alertsQuery = query(
        collection(db, `companies/${companyId}/alerts`), 
        where('type', 'in', ['Red Tag', 'Yellow Tag']),
        orderBy('date', 'desc')
    );
    
    const personnelQuery = query(collection(db, `companies/${companyId}/users`));
    const studentsQuery = query(collection(db, `companies/${companyId}/students`));

    const [alertsSnapshot, personnelSnapshot, studentsSnapshot] = await Promise.all([
        getDocs(alertsQuery),
        getDocs(personnelQuery),
        getDocs(studentsQuery)
    ]);

    const alertsList = alertsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Alert));
    const personnelList = personnelSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User));
    const studentList = studentsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User));
    
    return { alertsList, allUsers: [...personnelList, ...studentList] };
}
