
import { getQualityPageData } from './data';
import { QualityPageContent } from './quality-page-content';
import type { QualityAudit, AuditScheduleItem } from '@/lib/types';

async function getInitialData(companyId: string) {
    if (!companyId) {
        return { auditsList: [], scheduleList: [] };
    }
    try {
        const data = await getQualityPageData(companyId);
        return data || { auditsList: [], scheduleList: [] };
    } catch (error) {
        console.error("Failed to fetch initial data for quality page:", error);
        return { auditsList: [], scheduleList: [] };
    }
}

export default async function QualityPageContainer() {
    const companyId = 'skybound-aero';
    const { auditsList, scheduleList } = await getInitialData(companyId);
    
    return <QualityPageContent initialAudits={auditsList} initialSchedule={scheduleList} />;
}

QualityPageContainer.title = 'Quality Assurance';
