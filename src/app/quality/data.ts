
'use server';

import { db } from '@/lib/firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import type { QualityAudit, AuditScheduleItem } from '@/lib/types';

export async function getQualityPageData(companyId: string) {
    if (!companyId) {
        return { auditsList: [], scheduleList: [] };
    }

    try {
        const auditsQuery = query(collection(db, `companies/${companyId}/quality-audits`));
        const scheduleQuery = query(collection(db, `companies/${companyId}/audit-schedule-items`));

        const [auditsSnapshot, scheduleSnapshot] = await Promise.all([
            getDocs(auditsQuery),
            getDocs(scheduleQuery),
        ]);
        
        const auditsList = auditsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QualityAudit));
        const scheduleList = scheduleSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditScheduleItem));

        return { auditsList, scheduleList };
    } catch (error) {
        console.error("Failed to fetch quality page data:", error);
        // Return empty arrays to prevent the page from crashing on a DB error.
        return { auditsList: [], scheduleList: [] };
    }
}
