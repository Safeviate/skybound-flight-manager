
'use server';

import { db } from '@/lib/firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import type { Aircraft } from '@/lib/types';

export async function getAircraftPageData(companyId: string): Promise<Aircraft[]> {
    // Return an empty array to ensure no old data is displayed.
    return [];
}
