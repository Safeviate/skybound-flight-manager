
import { AircraftPageContent } from './aircraft-page-content';
import { getAircraftPageData } from './data';
import type { Aircraft, Booking, ExternalContact } from '@/lib/types';

async function getInitialData(companyId: string): Promise<{ aircraft: Aircraft[], bookings: Booking[], contacts: ExternalContact[] }> {
    try {
        return await getAircraftPageData(companyId);
    } catch (error) {
        console.error("Failed to fetch initial data for aircraft page:", error);
        return { aircraft: [], bookings: [], contacts: [] };
    }
}


export default async function AircraftPageContainer() {
    const companyId = 'skybound-aero';
    const { aircraft, bookings, contacts } = await getInitialData(companyId);

    return <AircraftPageContent 
                initialAircraft={aircraft} 
                initialBookings={bookings} 
                initialExternalContacts={contacts} 
            />;
}

AircraftPageContainer.title = "Aircraft Management";
