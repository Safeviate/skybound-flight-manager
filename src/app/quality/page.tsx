

'use client';

import { getQualityPageData } from './data';
import { QualityPageContent } from './quality-page-content';
import type { QualityAudit, AuditScheduleItem, AuditChecklist, User, CompanyDepartment, Aircraft, UnifiedTask, CompanyAuditArea } from '@/lib/types';
import { useUser } from '@/context/user-provider';
import { useState, useEffect } from 'react';

export default function QualityPageContainer() {
    const { company, loading: userLoading } = useUser();
    const [initialData, setInitialData] = useState<{
        auditsList: QualityAudit[],
        scheduleList: AuditScheduleItem[],
        checklistsList: AuditChecklist[],
        personnelList: User[],
        departmentsList: CompanyDepartment[],
        aircraftList: Aircraft[],
        unifiedTasks: UnifiedTask[],
        auditAreasList: CompanyAuditArea[],
    }>({ auditsList: [], scheduleList: [], checklistsList: [], personnelList: [], departmentsList: [], aircraftList: [], unifiedTasks: [], auditAreasList: [] });

    useEffect(() => {
        async function loadData() {
            if (company) {
                const data = await getQualityPageData(company.id);
                setInitialData(data);
            }
        }
        if (!userLoading) {
            loadData();
        }
    }, [company, userLoading]);
    
    return <QualityPageContent 
                initialAudits={initialData.auditsList} 
                initialSchedule={initialData.scheduleList}
                initialChecklists={initialData.checklistsList} 
                initialPersonnel={initialData.personnelList}
                initialDepartments={initialData.departmentsList}
                initialAircraft={initialData.aircraftList}
                initialTasks={initialData.unifiedTasks}
                initialAuditAreas={initialData.auditAreasList}
            />;
}

QualityPageContainer.title = 'Quality Assurance';
