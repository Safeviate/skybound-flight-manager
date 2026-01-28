

'use server';

import { db } from '@/lib/firebase';
import { collection, query, getDocs, where } from 'firebase/firestore';
import type { QualityAudit, AuditScheduleItem, AuditChecklist, User, CompanyDepartment, Aircraft, SafetyReport, ManagementOfChange, UnifiedTask, CompanyAuditArea } from '@/lib/types';

export async function getQualityPageData(companyId: string) {
    if (!companyId) {
        console.error("getQualityPageData called without a companyId.");
        return { 
            auditsList: [], 
            scheduleList: [], 
            checklistsList: [], 
            personnelList: [], 
            departmentsList: [], 
            aircraftList: [],
            unifiedTasks: [],
            auditAreasList: [],
        };
    }

    try {
        const auditsQuery = query(collection(db, `companies/${companyId}/quality-audits`));
        const scheduleQuery = query(collection(db, `companies/${companyId}/audit-schedule-items`));
        const checklistsQuery = query(collection(db, `companies/${companyId}/audit-checklists`));
        const personnelQuery = query(collection(db, `companies/${companyId}/users`), where('role', '!=', 'Student'));
        const departmentsQuery = query(collection(db, `companies/${companyId}/departments`));
        const aircraftQuery = query(collection(db, `companies/${companyId}/aircraft`));
        const safetyReportsQuery = query(collection(db, `companies/${companyId}/safety-reports`));
        const mocQuery = query(collection(db, `companies/${companyId}/management-of-change`));
        const auditAreasQuery = query(collection(db, `companies/${companyId}/audit-areas`));


        const [auditsSnapshot, scheduleSnapshot, checklistsSnapshot, personnelSnapshot, departmentsSnapshot, aircraftSnapshot, safetyReportsSnapshot, mocSnapshot, auditAreasSnapshot] = await Promise.all([
            getDocs(auditsQuery),
            getDocs(scheduleQuery),
            getDocs(checklistsQuery),
            getDocs(personnelQuery),
            getDocs(departmentsQuery),
            getDocs(aircraftQuery),
            getDocs(safetyReportsQuery),
            getDocs(mocQuery),
            getDocs(auditAreasQuery),
        ]);
        
        const auditsList = auditsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QualityAudit));
        const scheduleList = scheduleSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditScheduleItem));
        const checklistsList = checklistsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditChecklist));
        const personnelList = personnelSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        const departmentsList = departmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CompanyDepartment));
        const aircraftList = aircraftSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Aircraft));
        const safetyReportsList = safetyReportsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SafetyReport));
        const mocList = mocSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ManagementOfChange));
        const auditAreasList = auditAreasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CompanyAuditArea));

        const unifiedTasks: UnifiedTask[] = [];

        auditsList.forEach(audit => {
            audit.nonConformanceIssues?.forEach(issue => {
                issue.correctiveActionPlans?.forEach(plan => {
                    plan.actions.forEach(action => {
                        unifiedTasks.push({
                            id: `${audit.id}-${issue.id}-${plan.id}-${action.id}`,
                            description: action.action,
                            responsiblePerson: action.responsiblePerson,
                            dueDate: action.completionDate,
                            status: action.status,
                            sourceType: 'Quality Audit',
                            sourceId: audit.id,
                            sourceTitle: audit.auditNumber || audit.title,
                        });
                    });
                });
            });
        });

        safetyReportsList.forEach(report => {
            report.tasks?.forEach(task => {
                unifiedTasks.push({
                    id: `${report.id}-${task.id}`,
                    description: task.description,
                    responsiblePerson: task.assignedTo,
                    dueDate: task.dueDate,
                    status: task.status,
                    sourceType: 'Safety Report',
                    sourceId: report.id,
                    sourceTitle: report.reportNumber,
                });
            });
        });
        
        mocList.forEach(moc => {
            moc.phases?.forEach(phase => {
                phase.steps.forEach(step => {
                    step.hazards?.forEach(hazard => {
                        hazard.risks?.forEach(risk => {
                            risk.mitigations?.forEach(mitigation => {
                                unifiedTasks.push({
                                    id: `${moc.id}-${mitigation.id}`,
                                    description: mitigation.description,
                                    responsiblePerson: mitigation.responsiblePerson || 'N/A',
                                    dueDate: mitigation.completionDate || 'N/A',
                                    status: mitigation.status,
                                    sourceType: 'MOC',
                                    sourceId: moc.id,
                                    sourceTitle: moc.mocNumber,
                                });
                            });
                        });
                    });
                });
            });
        });

        return { auditsList, scheduleList, checklistsList, personnelList, departmentsList, aircraftList, unifiedTasks, auditAreasList };
    } catch (error) {
        console.error(`Failed to fetch quality page data for company ${companyId}:`, error);
        return { auditsList: [], scheduleList: [], checklistsList: [], personnelList: [], departmentsList: [], aircraftList: [], unifiedTasks: [], auditAreasList: [] };
    }
}
