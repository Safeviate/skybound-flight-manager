'use server';

import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { User } from '@/lib/types';

export async function getPersonnelPageData(companyId: string): Promise<User[]> {
    const personnelQuery = query(collection(db, `companies/${companyId}/users`), where('role', '!=', 'Student'));
    const snapshot = await getDocs(personnelQuery);
    const personnelList = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User));
    
    // Filter out the system administrator account
    return personnelList.filter(p => p.email !== 'barry@safeviate.com');
}
