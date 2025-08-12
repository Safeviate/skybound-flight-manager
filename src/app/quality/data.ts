
'use server';

import { db } from '@/lib/firebase';
import { collection, query, getDocs, where } from 'firebase/firestore';
import type { QualityAudit, AuditScheduleItem, AuditChecklist, User } from '@/lib/types';

export async function getQualityPageData(companyId: string) {
    if (!companyId) {
        return { auditsList: [], scheduleList: [], checklistsList: [], personnelList: [] };
    }

    try {
        const auditsQuery = query(collection(db, `companies/${companyId}/quality-audits`));
        const scheduleQuery = query(collection(db, `companies/${companyId}/audit-schedule-items`));
        const checklistsQuery = query(collection(db, `companies/${companyId}/audit-checklists`));
        const personnelQuery = query(collection(db, `companies/${companyId}/users`), where('role', '!=', 'Student'));

        const [auditsSnapshot, scheduleSnapshot, checklistsSnapshot, personnelSnapshot] = await Promise.all([
            getDocs(auditsQuery),
            getDocs(scheduleQuery),
            getDocs(checklistsQuery),
            getDocs(personnelQuery),
        ]);
        
        const auditsList = auditsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QualityAudit));
        const scheduleList = scheduleSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditScheduleItem));
        const checklistsList = checklistsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditChecklist));
        const personnelList = personnelSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));

        return { auditsList, scheduleList, checklistsList, personnelList };
    } catch (error) {
        console.error("Failed to fetch quality page data:", error);
        // Return empty arrays to prevent the page from crashing on a DB error.
        return { auditsList: [], scheduleList: [], checklistsList: [], personnelList: [] };
    }
}
