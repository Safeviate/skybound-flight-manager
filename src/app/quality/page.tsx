
import { getQualityPageData } from './data';
import { QualityPageContent } from './quality-page-content';
import type { QualityAudit, AuditScheduleItem } from '@/lib/types';

async function getInitialData(companyId: string) {
    try {
        const { auditsList, scheduleList } = await getQualityPageData(companyId);
        return { auditsList, scheduleList };
    } catch (error) {
        console.error("Failed to fetch initial data for quality page:", error);
        return { auditsList: [], scheduleList: [] };
    }
}

export default async function QualityPageContainer() {
    // In a real app, you'd get the companyId from the user's session
    const companyId = 'skybound-aero'; // Placeholder
    const { auditsList, scheduleList } = await getInitialData(companyId);
    
    return <QualityPageContent initialAudits={auditsList} initialSchedule={scheduleList} />;
}

QualityPageContainer.title = 'Quality Assurance';
