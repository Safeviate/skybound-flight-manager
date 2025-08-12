
'use server';

import { db } from '@/lib/firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import type { Company } from '@/lib/types';

export async function getCompaniesPageData(): Promise<Company[]> {
    const companiesQuery = query(collection(db, `companies`));
    const snapshot = await getDocs(companiesQuery);
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Company));
}
