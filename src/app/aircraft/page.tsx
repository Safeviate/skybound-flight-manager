
import { getAircraftPageData } from './data';
import { AircraftPageContent } from './aircraft-page-content';
import type { Aircraft, Booking, Checklist } from '@/lib/types';
import { cookies } from 'next/headers';

async function getInitialData(companyId: string) {
    if (!companyId) {
        return { aircraftList: [], checklistList: [], bookingList: [] };
    }
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
    const cookieStore = cookies();
    const companyId = cookieStore.get('skybound_last_company_id')?.value || 'skybound-aero';
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
