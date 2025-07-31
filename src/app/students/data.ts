
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { User } from '@/lib/types';

export async function getStudentsPageData(companyId: string): Promise<User[]> {
    const studentsQuery = query(collection(db, `companies/${companyId}/users`), where('role', '==', 'Student'));
    const snapshot = await getDocs(studentsQuery);
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User));
}
