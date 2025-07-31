
import { cookies } from 'next/headers';
import { getAircraftPageData } from './data';
import { AircraftPageContent } from './aircraft-page-content';
import type { Aircraft, Checklist } from '@/lib/types';

async function getInitialData() {
    const cookieStore = cookies();
    const companyId = cookieStore.get('skybound_last_company_id')?.value;
    
    if (!companyId) {
        return { aircraftList: [], checklistList: [] };
    }
    
    try {
        const { aircraftList, checklistList } = await getAircraftPageData(companyId);
        return { aircraftList, checklistList };
    } catch (error) {
        console.error("Failed to fetch initial data for aircraft page:", error);
        return { aircraftList: [], checklistList: [] };
    }
}

export default async function AircraftPageContainer() {
    const { aircraftList } = await getInitialData();

    return (
        <AircraftPageContent 
            initialFleet={aircraftList} 
        />
    );
}

AircraftPageContainer.title = 'Aircraft Management';
