import { getAircraftPageData } from './data';
import { AircraftPageContent } from './aircraft-page-content';
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
    // In a real app, you'd get the companyId from the user's session
    const companyId = 'skybound-aero'; // Placeholder
    const initialAircraft = await getInitialData(companyId);
    
    return <AircraftPageContent initialAircraft={initialAircraft} />;
}

AircraftPageContainer.title = "Aircraft Management";
