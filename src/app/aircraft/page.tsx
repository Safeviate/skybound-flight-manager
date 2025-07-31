
import { cookies } from 'next/headers';
import { getAircraftPageData } from './data';
import { AircraftPageContent } from './aircraft-page-content';

async function getInitialData() {
    const cookieStore = cookies();
    const companyId = cookieStore.get('skybound_last_company_id')?.value;
    
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
    const { aircraftList, checklistList, bookingList } = await getInitialData();

    return (
        <AircraftPageContent 
            initialFleet={aircraftList} 
            initialChecklists={checklistList} 
            initialBookings={bookingList} 
        />
    );
}

AircraftPageContainer.title = 'Aircraft Management';
