
import { getAircraftPageData } from './data';
import { AircraftPageContent } from './aircraft-page-content';
import type { Aircraft, Booking, Checklist } from '@/lib/types';

async function getInitialData(companyId: string) {
    try {
        const { aircraftList, checklistList, bookingList } = await getAircraftPageData(companyId);
        return { aircraftList, checklistList, bookingList };
    } catch (error) {
        console.error("Failed to fetch initial data for aircraft page:", error);
        return { aircraftList: [], checklistList: [], bookingList: [] };
    }
}

export default async function AircraftPageContainer() {
    // In a real app, you'd get the companyId from the user's session
    const companyId = 'skybound-aero'; // Placeholder
    const { aircraftList, checklistList, bookingList } = await getInitialData(companyId);

    return (
        <AircraftPageContent 
            initialFleet={aircraftList} 
            initialChecklists={checklistList} 
            initialBookings={bookingList} 
        />
    );
}

AircraftPageContainer.title = 'Aircraft Management';
