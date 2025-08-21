

import { getSafetyPageData } from './data';
import { SafetyPageContent } from './safety-page-content';
import type { SafetyReport, Risk, Booking, ManagementOfChange } from '@/lib/types';

async function getInitialData(companyId: string) {
    try {
        const { reportsList, risksList, bookingsList, mocList } = await getSafetyPageData(companyId);
        return { reportsList, risksList, bookingsList, mocList };
    } catch (error) {
        console.error("Failed to fetch initial data for safety page:", error);
        return { reportsList: [], risksList: [], bookingsList: [], mocList: [] };
    }
}


export default async function SafetyPageContainer() {
    const companyId = 'skybound-aero';
    const { reportsList, risksList, bookingsList, mocList } = await getInitialData(companyId);

    return (
        <SafetyPageContent 
            initialReports={reportsList} 
            initialRisks={risksList}
            initialBookings={bookingsList}
            initialMoc={mocList}
        />
    )
}

SafetyPageContainer.title = 'Safety Management System';
