
import { AircraftPageContent } from './aircraft-page-content';
import { getAircraftPageData } from './data';
import type { Aircraft } from '@/lib/types';

async function getInitialData(companyId: string): Promise<Aircraft[]> {
    try {
        return await getAircraftPageData(companyId);
    } catch (error) {
        console.error("Failed to fetch initial data for aircraft page:", error);
        return [];
    }
}


export default async function AircraftPageContainer() {
    const companyId = 'skybound-aero';
    const initialAircraft = await getInitialData(companyId);

    return <AircraftPageContent initialAircraft={initialAircraft} />;
}

AircraftPageContainer.title = "Aircraft Management";
