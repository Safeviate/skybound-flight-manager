
import { getQualityPageData } from './data';
import { QualityPageContent } from './quality-page-content';
import type { QualityAudit, AuditScheduleItem, AuditChecklist } from '@/lib/types';

async function getInitialData(companyId: string) {
    if (!companyId) {
        return { auditsList: [], scheduleList: [], checklistsList: [] };
    }
    try {
        const data = await getQualityPageData(companyId);
        return data || { auditsList: [], scheduleList: [], checklistsList: [] };
    } catch (error) {
        console.error("Failed to fetch initial data for quality page:", error);
        return { auditsList: [], scheduleList: [], checklistsList: [] };
    }
}

export default async function QualityPageContainer() {
    const companyId = 'skybound-aero';
    const { auditsList, scheduleList, checklistsList } = await getInitialData(companyId);
    
    return <QualityPageContent 
                initialAudits={auditsList} 
                initialSchedule={scheduleList}
                initialChecklists={checklistsList} 
            />;
}

QualityPageContainer.title = 'Quality Assurance';
