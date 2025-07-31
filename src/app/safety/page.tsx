
import { getSafetyPageData } from './data';
import { SafetyPageContent } from './safety-page-content';
import type { SafetyReport, Risk, Booking, CompletedChecklist } from '@/lib/types';

async function getInitialData(companyId: string) {
    try {
        const { reportsList, risksList, bookingsList, checklistsList } = await getSafetyPageData(companyId);
        return { reportsList, risksList, bookingsList, checklistsList };
    } catch (error) {
        console.error("Failed to fetch initial data for safety page:", error);
        return { reportsList: [], risksList: [], bookingsList: [], checklistsList: [] };
    }
}


export default async function SafetyPageContainer() {
    const companyId = 'skybound-aero';
    const { reportsList, risksList, bookingsList, checklistsList } = await getInitialData(companyId);

    return (
        <SafetyPageContent 
            initialReports={reportsList} 
            initialRisks={risksList}
            initialBookings={bookingsList}
            initialChecklists={checklistsList}
        />
    )
}

SafetyPageContainer.title = 'Safety Management System';
