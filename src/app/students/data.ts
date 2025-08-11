'use server';

import { db } from '@/lib/firebase';
import { collection, query } from 'firebase/firestore';
import type { User } from '@/lib/types';
import { getDocs } from 'firebase/firestore';

export async function getStudentsPageData(companyId: string): Promise<User[]> {
    const studentsQuery = query(collection(db, `companies/${companyId}/students`));
    const snapshot = await getDocs(studentsQuery);
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User));
}
