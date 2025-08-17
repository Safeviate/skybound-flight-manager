
'use server';

import { db } from '@/lib/firebase';
import { collection, query } from 'firebase/firestore';
import type { User } from '@/lib/types';
import { getDocs } from 'firebase/firestore';
import { studentData } from '@/lib/data-provider';

export async function getStudentsPageData(companyId: string): Promise<User[]> {
    // This is a temporary solution to demonstrate the feature with mock data.
    if (companyId === 'skybound-aero' && studentData.length > 0) {
        return studentData as User[];
    }

    const studentsQuery = query(collection(db, `companies/${companyId}/students`));
    const snapshot = await getDocs(studentsQuery);
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User));
}
