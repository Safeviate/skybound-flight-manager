
import { getQualityPageData } from './data';
import { QualityPageContent } from './quality-page-content';
import type { QualityAudit, AuditScheduleItem, AuditChecklist, User } from '@/lib/types';

async function getInitialData(companyId: string) {
    if (!companyId) {
        return { auditsList: [], scheduleList: [], checklistsList: [], personnelList: [] };
    }
    try {
        const data = await getQualityPageData(companyId);
        return data || { auditsList: [], scheduleList: [], checklistsList: [], personnelList: [] };
    } catch (error) {
        console.error("Failed to fetch initial data for quality page:", error);
        return { auditsList: [], scheduleList: [], checklistsList: [], personnelList: [] };
    }
}

export default async function QualityPageContainer() {
    const companyId = 'skybound-aero';
    const { auditsList, scheduleList, checklistsList, personnelList } = await getInitialData(companyId);
    
    return <QualityPageContent 
                initialAudits={auditsList} 
                initialSchedule={scheduleList}
                initialChecklists={checklistsList} 
                initialPersonnel={personnelList}
            />;
}

QualityPageContainer.title = 'Quality Assurance';
