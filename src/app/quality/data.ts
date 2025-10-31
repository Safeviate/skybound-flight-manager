

'use server';

import { db } from '@/lib/firebase';
import { collection, query, getDocs, where } from 'firebase/firestore';
import type { QualityAudit, AuditScheduleItem, AuditChecklist, User, CompanyDepartment, Aircraft } from '@/lib/types';

export async function getQualityPageData(companyId: string) {
    if (!companyId) {
        console.error("getQualityPageData called without a companyId.");
        return { auditsList: [], scheduleList: [], checklistsList: [], personnelList: [], departmentsList: [], aircraftList: [] };
    }

    try {
        const auditsQuery = query(collection(db, `companies/${companyId}/quality-audits`));
        const scheduleQuery = query(collection(db, `companies/${companyId}/audit-schedule-items`));
        const checklistsQuery = query(collection(db, `companies/${companyId}/audit-checklists`));
        const personnelQuery = query(collection(db, `companies/${companyId}/users`), where('role', '!=', 'Student'));
        const departmentsQuery = query(collection(db, `companies/${companyId}/departments`));
        const aircraftQuery = query(collection(db, `companies/${companyId}/aircraft`));

        const [auditsSnapshot, scheduleSnapshot, checklistsSnapshot, personnelSnapshot, departmentsSnapshot, aircraftSnapshot] = await Promise.all([
            getDocs(auditsQuery),
            getDocs(scheduleQuery),
            getDocs(checklistsQuery),
            getDocs(personnelQuery),
            getDocs(departmentsQuery),
            getDocs(aircraftQuery),
        ]);
        
        const auditsList = auditsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QualityAudit));
        const scheduleList = scheduleSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditScheduleItem));
        const checklistsList = checklistsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditChecklist));
        const personnelList = personnelSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        const departmentsList = departmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CompanyDepartment));
        const aircraftList = aircraftSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Aircraft));

        return { auditsList, scheduleList, checklistsList, personnelList, departmentsList, aircraftList };
    } catch (error) {
        console.error(`Failed to fetch quality page data for company ${companyId}:`, error);
        // Return empty arrays to prevent the page from crashing on a DB error.
        return { auditsList: [], scheduleList: [], checklistsList: [], personnelList: [], departmentsList: [], aircraftList: [] };
    }
}
