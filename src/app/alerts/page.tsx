
import { getAlertsPageData } from './data';
import { AlertsPageContent } from './alerts-page-content';
import type { Alert } from '@/lib/types';

async function getInitialData(companyId: string): Promise<{ alertsList: Alert[] }> {
    try {
        return await getAlertsPageData(companyId);
    } catch (error) {
        console.error("Failed to fetch initial data for alerts page:", error);
        return { alertsList: [] };
    }
}

export default async function AlertsPageContainer() {
    // In a real app, you'd get the companyId from the user's session
    const companyId = 'skybound-aero'; 
    const { alertsList } = await getInitialData(companyId);

    return <AlertsPageContent initialAlerts={alertsList} />;
}

AlertsPageContainer.title = 'Alerts & Notifications';
